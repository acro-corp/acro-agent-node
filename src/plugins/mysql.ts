/**
 * Copyright (C) 2024 Acro Data Solutions, Inc.

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { satisfies } from "semver";
import { Parser } from "node-sql-parser";

import { AcroAgent } from "../agent";
import { wrap } from "../wrapper";

let _parser: any;

function getParser() {
  if (!_parser) {
    _parser = new Parser();
  }

  return _parser;
}

function bootstrap<T>(
  agent: AcroAgent,
  mysql: any,
  version: string | undefined
): T {
  if (!satisfies(version || "", "^2.0.0")) {
    agent.logger?.info(`mysql: version ${version} is not supported`);
    return mysql;
  }

  wrap<typeof mysql>(mysql, "createConnection", (original: Function) => {
    return function createConnection() {
      const connection = original.apply(this, arguments);
      wrapQuery(connection);
      return connection;
    };
  });

  wrap<typeof mysql>(mysql, "createPool", (original: Function) => {
    return function createPool() {
      const pool = original.apply(this, arguments);
      wrap<typeof pool>(pool, "getConnection", wrapGetConnection);
      return pool;
    };
  });

  wrap<typeof mysql>(mysql, "createPoolCluster", (original: Function) => {
    return function createPoolCluster() {
      const cluster = original.apply(this, arguments);
      wrap<typeof cluster>(cluster, "of", (originalOf: Function) => {
        const of = originalOf.apply(this, arguments);
        wrap<typeof originalOf>(originalOf, "getConnection", wrapGetConnection);
        return of;
      });
      return cluster;
    };
  });

  return mysql;

  function wrapGetConnection(original: Function) {
    return function getConnection(arg1?: any, arg2?: any, arg3?: any) {
      // handle cases of callback passed in args 1-3
      let cb: any;
      let arg = 0;
      if (arguments.length === 1 && typeof arg1 === "function") {
        cb = arg1;
      } else if (arguments.length === 2 && typeof arg2 === "function") {
        cb = arg2;
        arg = 1;
      } else if (arguments.length === 3 && typeof arg3 === "function") {
        cb = arg3;
        arg = 2;
      }

      if (typeof cb === "function") {
        arguments[arg] = (_err: any, connection: any) => {
          return cb.apply(this, arguments);
        };
      }

      return original.apply(this, arguments);
    };
  }

  function wrapQuery(connection: any) {
    wrap<typeof connection>(connection, "query", (original: Function) => {
      return function query(sql: any, vals: any, cb: any) {
        // the mysql library can either be used with a callback as the last argument, or as an EventEmitter
        let hasCallback = false;

        // grab sql string and values to set to context
        let sqlStr: string = "";
        let values: any;

        switch (typeof sql) {
          case "string":
            sqlStr = sql;
            break;
          case "object":
            sqlStr = sql.sql;
            if (typeof sql._callback === "function") {
              sql._callback = wrapCallback(sql._callback);
            }
            break;
          case "function":
            arguments[0] = wrapCallback(sql);
            break;
        }

        if (typeof vals === "function") {
          arguments[1] = wrapCallback(vals);
        } else if (Array.isArray(vals)) {
          values = vals;
        }

        if (typeof cb === "function") {
          arguments[2] = wrapCallback(cb);
        }

        // we only care about this query if there's a change associated with it
        const ast = getAst(sqlStr) || {};

        const result = original.apply(this, arguments);

        if (!sqlStr || !ast?.operation) {
          return result;
        }

        if (!hasCallback) {
          // if EventEmitter, handle both success and error cases
          let error = false;

          return result
            .on("error", () => {
              error = true;
            })
            .on("end", () => {
              if (!error) {
                trackChange();
              }
            });
        }

        function wrapCallback(cb: Function) {
          hasCallback = true;

          return (err: any, ...args: any) => {
            if (!err && ast) {
              trackChange();
            }

            return cb.apply(this, [err, ...args]);
          };
        }

        function getAst(sqlStr?: string) {
          if (!sqlStr || typeof sqlStr !== "string") {
            return;
          }

          let ast: any;

          try {
            ast = getParser().astify(sqlStr);
          } catch (err: any) {
            agent?.logger?.debug(
              `mysql.getAst error: ${err?.name} ${err?.message}`
            );
          }

          let operation: string = "";

          switch (ast?.type) {
            case "delete":
            case "update":
              operation = ast.type;
              break;
            case "insert":
              operation = "create";
              break;
          }

          if (operation) {
            return {
              ...ast,
              operation,
            };
          }
        }

        function trackChange() {
          if (!ast?.operation) {
            // don't track if noop
            return;
          }

          agent?.logger?.debug(`mysql.trackChange: ${JSON.stringify(ast)}`);

          const after: any = {};

          switch (ast?.type) {
            case "insert":
              ast?.columns?.forEach((column: string, i: number) => {
                after[column] = ast?.values?.[0]?.value?.[i]?.value;
              });
              break;
            case "update":
              ast?.set?.forEach((set: any) => {
                after[set?.column] = set?.value?.value;
              });
              break;
          }

          agent?.context?.trackChange({
            model: ast?.table?.[0]?.table || "",
            operation: ast?.operation || "",
            ...(Object.keys(after).length ? { after } : {}),
            ...(sqlStr || values?.length
              ? {
                  meta: {
                    sql: sqlStr,
                    values,
                  },
                }
              : {}),
          });
        }
      };
    });
  }
}

export default bootstrap;
