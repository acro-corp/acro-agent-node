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
import { getAst } from "../helpers/mysql";

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
    return function query(sql: any, options: any) {
      // sequelize handles raw SQL and model-based create queries differently.
      // for raw SQL & updates/deletes we usually can rely on the underlying
      // adapter (mysql or mysql2). we track in this plugin as backup, however

      let replacementIndex = 0;
      const sqlStr = sql?.query || sql;
      // replace ? in the query with the replacement index so we can
      // apply the replacement later
      const escapedSqlStr = sqlStr?.replace(
        /\?/g,
        () => `'{{${replacementIndex++}}}'`
      );
      const ast = getAst(agent, escapedSqlStr);

      // run the query
      const result = original.apply(this, arguments);

      // we grab the span here since somehow the wrapped callbacks
      // below get rid of the context in some cases.
      // TODO: figure out why and how to prevent
      const span = agent?.context?.getSpan();

      return result.then((res: any) => {
        trackChange(span, res);
        return res;
      });

      function trackChange(span: Span | undefined, result: any) {
        // first we try to get what operation just occurred
        // we only want to track creates/updates/deletes
        let operation: string = ast?.operation;

        if (!operation) {
          if (result?.isNewRecord === true) {
            operation = "create";
          } else if (result?.isNewRecord === false) {
            operation = "update";
          }
        }

        if (!operation) {
          return;
        }

        agent?.logger?.debug(
          `sequelize.trackChange: ${JSON.stringify(result)}`
        );

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
        // use the replacements as the `after` values
        Object.keys(after).forEach((key) => {
          const match = after[key]?.match(/^\{\{([0-9]+)\}\}$/)?.[1];
          const replacement = options?.replacements?.[parseInt(match, 10)];
          if (typeof replacement !== "undefined") {
            after[key] = replacement;
          }
        });

        span?.trackChange({
          id: result?.id?.toString(),
          model:
            result?.["$modelOptions"]?.tableName ||
            result?.["$modelOptions"]?.name?.plural ||
            result?.["$modelOptions"]?.name?.singular ||
            ast?.table?.[0]?.table ||
            "",
          operation,
          before: result?._previousDataValues
            ? JSON.parse(JSON.stringify(result?._previousDataValues))
            : null,
          after: result?.dataValues
            ? JSON.parse(JSON.stringify(result?.dataValues))
            : after,
          meta: {
            sql: sqlStr,
            replacements: options?.replacements,
            ...(result?._changed
              ? {
                  changed: result?._changed,
                }
              : {}),
          },
        });
      }
    };
  }
}

export default bootstrap;
