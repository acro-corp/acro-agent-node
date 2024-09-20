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

/**
 * This file is derived from the 'apm-agent-nodejs' project copyright by Elasticsearch B.V.
 * It has been modified to be used in the current context.
 *
 * https://github.com/elastic/apm-agent-nodejs
 *
 * Original file:
 * https://github.com/elastic/apm-agent-nodejs/blob/master/lib/instrumentation/modules/express.js
 *
 * License:
 * BSD-2-Clause, http://opensource.org/licenses/BSD-2-Clause
 */

import { satisfies } from "semver";
import { hostname } from "os";
import { get, removeSensitiveKeys } from "@acro-sdk/common-store";

import { AcroAgent } from "../agent";
import { Span } from "../span";
import { wrap } from "../wrapper";
import { populateFrameworkData } from "../utils";

const ExpressLayerPatchedSymbol = Symbol("AcroExpressLayerPatched");
const ExpressMountStackSymbol = Symbol("AcroExpressMountStack");
export const ExpressTrackSymbol = Symbol("AcroExpressTrack");
export const ExpressSensitiveKeysSymbol = Symbol("AcroExpressSensitiveKeys");

function bootstrap<T>(
  agent: AcroAgent,
  express: any,
  version: string | undefined
): T {
  // set framework
  agent.setFramework("express", version || null);

  // express 5 moves the router methods onto a prototype
  const router =
    version && satisfies(version as string, "^5")
      ? express?.Router && express?.Router.prototype
      : express?.Router;

  // express layers:
  // - 'router': router
  // - 'bound dispatch': request handler

  wrap<typeof router>(router, "route", (original: Function) => {
    return function route(path: any) {
      const route = original.apply(this, arguments);
      const layer = this.stack[this.stack.length - 1];
      patchLayer(layer, path);
      return route;
    };
  });

  wrap<typeof router>(router, "use", (original: Function) => {
    return function use(path: any) {
      const use = original.apply(this, arguments);
      const layer = this.stack[this.stack.length - 1];
      patchLayer(layer, typeof path === "string" && path);
      return use;
    };
  });

  // set default to track only params & query
  agent.setTrackDefaults({
    request: {
      params: true,
      query: true,
      body: true,
    },
  });

  return express;

  // hoisted helper functions below

  /**
   * Pushes a value onto an array key of an object, initializing if necessary
   * @param {object} obj
   * @param {string} prop
   * @param {any} value
   */
  function safePush(obj: any, prop: any, value: any) {
    if (!obj[prop]) {
      obj[prop] = [];
    }
    obj[prop].push(value);
  }

  /**
   * Gets the full route path (with param names) from an Express Request object.
   * @param {express.Request} req
   * @returns {string} path
   */
  function getFullRoute(req: any) {
    const paramToKeyMap = Object.entries(
      (req.params as Record<string, string>) || {}
    ).reduce(
      (
        map: Record<string, string>,
        [key, value]: [key: string, value: string]
      ) => {
        return { ...map, [value]: `:${key}` };
      },
      {}
    );

    return (req.originalUrl || "")
      .split("?")?.[0]
      ?.split("/")
      .map((part: string) => paramToKeyMap[part] || part)
      .join("/");
  }

  /**
   * Gets the client IP address from an Express Request object.
   * @param {express.Request} req
   * @returns {string} ip
   */
  function getIp(req: any) {
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.socket?.socket?.remoteAddress
    );
  }

  /**
   * Gets the logged in user ID (if appropriate) from an Express Request object.
   * If the agents.USER.userId is passed into the framework options, it's used;
   * otherwise we look in some standard places.
   * @param {express.Request} req
   * @returns {string} ip
   */
  function getUserId(frameworkOptions: any, req: any) {
    const userId = frameworkOptions?.agents?.USER?.userId
      ? get(req, frameworkOptions?.agents?.USER?.userId)
      : req.userId ||
        req.user?.id ||
        req.session?.userId ||
        req.session?.user?.id ||
        req.auth?.userId ||
        req.auth?.user?.id;

    if (userId) {
      return userId.toString();
    }
  }

  function patchLayer(layer: any, layerPath: any) {
    if (!layer[ExpressLayerPatchedSymbol]) {
      layer[ExpressLayerPatchedSymbol] = true;

      wrap(layer, "handle", function (original: any) {
        // ignore error middleware since it'll trigger handle later anyway
        if (original.length === 4) {
          return original;
        }

        const handle = function (req: any, res: any, next: any) {
          agent.context?.runOnce({}, () => {
            wrap(res, "end", (original: any) => {
              return function end() {
                const span = agent.context?.getData();

                let time;

                if (span?.startHrTime) {
                  const diff = process.hrtime(span?.startHrTime);
                  time =
                    Math.round(1e6 * (diff[0] * 1e3 + diff[1] * 1e-6)) / 1e6;
                }

                const timestamp = span?.start || new Date().toISOString();

                const frameworkOptions = agent.getFrameworkOptions("express");
                const frameworkData = populateFrameworkData(
                  frameworkOptions,
                  req
                );

                const action = agent.createAction({
                  timestamp,
                  traceIds: [span?.traceId || ""].filter((v) => v),
                  action: {
                    type: "HTTP",
                    verb: req.method,
                    object: getFullRoute(req),
                  },
                  agents: [
                    {
                      type: "USER",
                      id: getUserId(frameworkOptions, req),
                      meta: {
                        ip: getIp(req),
                        userAgent: req.get("User-Agent"),
                        ...(frameworkData?.agents?.USER?.meta || {}),
                      },
                    },
                    {
                      type: "SERVICE",
                      id: hostname(),
                      meta: { hostname: hostname() },
                    },
                  ],
                  request: {
                    params: removeSensitiveKeys(
                      req?.params,
                      req[ExpressSensitiveKeysSymbol]
                    ),
                    query: removeSensitiveKeys(
                      req?.query,
                      req[ExpressSensitiveKeysSymbol]
                    ),
                    body: removeSensitiveKeys(
                      req?.body,
                      req[ExpressSensitiveKeysSymbol]
                    ),
                  },
                  response: {
                    status: res.statusCode?.toString(),
                    time,
                  },
                  changes: span?.changes,
                });

                agent.logger?.debug(
                  `express.createAction: ${JSON.stringify(
                    action
                  )} – shouldTrack=${agent.shouldTrackAction(action)}`
                );

                if (
                  req[ExpressTrackSymbol] !== false &&
                  (agent.shouldTrackAction(action) ||
                    req[ExpressTrackSymbol] === true) // force track
                ) {
                  agent.trackAction(action);
                }

                return original.apply(this, arguments);
              };
            });

            if (!layer.route && layerPath && typeof next === "function") {
              safePush(req, ExpressMountStackSymbol, layerPath);

              arguments[2] = function (nextArg: any) {
                if (!nextArg || nextArg === "route" || nextArg === "router") {
                  req[ExpressMountStackSymbol].pop();
                }
                return next.apply(this, arguments);
              };
            }

            return original.apply(this, arguments);
          });
        };

        return handle;
      });
    }
  }
}

export default bootstrap;
