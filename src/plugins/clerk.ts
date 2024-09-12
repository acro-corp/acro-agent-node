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

function bootstrap<T>(
  agent: AcroAgent,
  clerk: any,
  version: string | undefined
): T {
  // we don't need to wrap any Clerk function calls
  // instead, just use the existence of the Clerk library
  // to dictate if we should be sending a clerk userId
  // along with each action.

  // this is similar to instantiating the client with
  // new AcroAgent({
  //   ...
  //   frameworks: {
  //     express: {
  //       agents: {
  //         USER: {
  //           meta: {
  //             clerkUserId: (req) => req.auth?.userId
  //           }
  //         }
  //       }
  //     }
  //   },
  //   ...
  // });

  const expressFrameworkOptions = agent.getFrameworkOptions("express") || {};
  agent.setFrameworkOptions("express", {
    ...(expressFrameworkOptions || {}),
    agents: {
      ...(expressFrameworkOptions?.agents || {}),
      USER: {
        ...(expressFrameworkOptions?.agents?.USER || {}),
        meta: {
          ...(expressFrameworkOptions?.agents?.USER?.meta || {}),
          clerkUserId: (req: any) => req.auth?.userId,
        },
      },
    },
  });

  return clerk;
}

export default bootstrap;
