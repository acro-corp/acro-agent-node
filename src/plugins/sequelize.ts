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

import { AcroAgent } from "../agent";
import { wrap } from "../wrapper";
import { Span } from "../span";

function bootstrap<T>(
  agent: AcroAgent,
  sequelize: any,
  version: string | undefined
): T {
  wrap<typeof sequelize.Sequelize.prototype>(
    sequelize.Sequelize.prototype,
    "query",
    wrapQuery
  );

  return sequelize;

  function wrapQuery(original: Function) {
    return function query() {
      // sequelize handles raw SQL and model-based create queries differently.
      // for raw SQL & updates/deletes we rely on the underlying adapter (mysql or mysql2).
      // for model-based creates only we will track in this plugin

      const span = agent?.context?.getData();

      // run the query
      const result = original.apply(this, arguments);

      // wrap the result promise if model-based query
      wrap<typeof result>(result, "then", (original: Function) => {
        return function then(cb: Function) {
          // we grab the span here since somehow the wrapped callback
          // below gets rid of the context in some cases.
          // TODO: figure out why and how to prevent
          const span = agent?.context?.getSpan();

          if (typeof cb === "function") {
            arguments[0] = (result: any, ...args: any) => {
              trackChange(span, result);

              return cb.apply(this, [result, ...args]);
            };
          }

          return original.apply(this, arguments);
        };
      });

      return result;

      function trackChange(span: Span | undefined, result: any) {
        if (!result?.["$modelOptions"]) {
          // if not model query, just return
          return;
        }

        agent?.logger?.debug(
          `sequelize.trackChange: ${JSON.stringify(result)}`
        );

        span?.trackChange({
          id: result?.id?.toString(),
          model:
            result?.["$modelOptions"]?.tableName ||
            result?.["$modelOptions"]?.name?.plural ||
            result?.["$modelOptions"]?.name?.singular,
          operation: result?.isNewRecord ? "create" : "update",
          before: result?._previousDataValues
            ? JSON.parse(JSON.stringify(result?._previousDataValues))
            : null,
          after: result?.dataValues
            ? JSON.parse(JSON.stringify(result?.dataValues))
            : null,
          ...(result?._changed
            ? {
                meta: {
                  changed: result?._changed,
                },
              }
            : {}),
        });
      }
    };
  }
}

export default bootstrap;
