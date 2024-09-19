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

import { acroAgent } from "../agent";

/**
 * Prisma extension for Acro so DB actions can be tracked in context.
 * @param {Prisma} Prisma
 */
export function acroPrismaExtension(Prisma: any): any {
  acroAgent?.logger?.info("acroPrismaExtension() - adding extension");

  return Prisma.defineExtension((prisma: any) => {
    return prisma.$extends({
      query: {
        async $allOperations({ model, operation, query, args }: any) {
          // operations we care about:
          // create(), update(), upsert(), delete(), createMany(),
          // createManyAndReturn(), updateMany(), deleteMany()

          const result = (await query(args)) as any;

          try {
            switch (operation) {
              case "create":
              case "update":
              case "upsert":
                // probably the first key of result is the id
                // or maybe the first key of where
                const createId =
                  result?.[Object.keys(result)?.[0]] ||
                  args?.where?.[Object.keys(args?.where || {})?.[0]];

                acroAgent?.context?.trackChange({
                  model,
                  operation,
                  id: createId,
                  after: result,
                  ...(args?.where
                    ? {
                        meta: {
                          args: {
                            where: args?.where,
                            // don't include data since it could have secrets in it
                          },
                        },
                      }
                    : {}),
                });
                break;
              case "delete":
                // probably the first key of result is the id
                // or maybe the first key of where
                const deleteId =
                  result?.[Object.keys(result)?.[0]] ||
                  args?.where?.[Object.keys(args?.where || {})?.[0]];

                acroAgent?.context?.trackChange({
                  model,
                  operation,
                  id: deleteId,
                  ...(args?.where || result
                    ? {
                        meta: {
                          args: {
                            where: args?.where,
                          },
                          result,
                        },
                      }
                    : {}),
                });
                break;
              case "createMany":
              case "createManyAndReturn":
              case "updateMany":
              case "deleteMany":
                acroAgent?.context?.trackChange({
                  model,
                  operation,
                  meta: {
                    args,
                    result,
                  },
                });
                break;
            }
          } catch (err: any) {
            acroAgent?.logger?.error(
              `acroPrismaExtension error: ${err.name} ${err.message} ${err.stack
                ?.split("\n")
                .join(" ")}`
            );
          }

          return result;
        },
      },
    });
  });
}
