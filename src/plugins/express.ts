/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
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

import { AcroAgent } from "../agent";
import { wrap } from "../wrapper";
import { get, removeSensitiveKeys } from "../utils";

const ExpressLayerPatchedSymbol = Symbol("AcroExpressLayerPatched");
const ExpressMountStackSymbol = Symbol("AcroExpressMountStack");
const ExpressRequestStartSymbol = Symbol("AcroExpressRequestStart");
const ExpressRequestHrTimeSymbol = Symbol("AcroExpressRequestHrTime");
export const ExpressTrackSymbol = Symbol("AcroExpressTrack");
export const ExpressSensitiveKeysSymbol = Symbol("AcroExpressSensitiveKeys");

function bootstrap<T>(
  agent: AcroAgent,
  express: any,
  version: string | undefined
): T {
  // set framework
  agent.setFramework("express", version || null);

  // { userIdPath: 'auth.userId' }
  const frameworkOptions = agent.getFrameworkOptions("express");

  agent.logger?.debug(
    `express.frameworkOptions: ${JSON.stringify(frameworkOptions)}`
  );

  // express 5 moves the router methods onto a prototype
  const router =
    version && satisfies(version as string, "^5")
      ? express?.Router && express?.Router.prototype
      : express?.Router;

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
      body: false,
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

    return (req.baseUrl || "")
      .split("/")
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
   * If the userIdPath is passed into the framework options, it's used;
   * otherwise we look in some standard places.
   * @param {express.Request} req
   * @returns {string} ip
   */
  function getUserId(req: any) {
    return frameworkOptions?.userIdPath
      ? get(req, frameworkOptions?.userIdPath)
      : req.userId ||
          req.user?.id ||
          req.session?.userId ||
          req.session?.user?.id ||
          req.auth?.userId ||
          req.auth?.user?.id;
  }

  function patchLayer(layer: any, layerPath: any) {
    if (!layer[ExpressLayerPatchedSymbol]) {
      layer[ExpressLayerPatchedSymbol] = true;

      wrap(layer, "handle", function (original: any) {
        let handle;

        if (original.length !== 4) {
          handle = function (req: any, res: any, next: any) {
            // set start time
            if (!req[ExpressRequestHrTimeSymbol]) {
              req[ExpressRequestHrTimeSymbol] = process.hrtime();
            }
            if (!req[ExpressRequestStartSymbol]) {
              req[ExpressRequestStartSymbol] = new Date().toISOString();
            }

            wrap(res, "end", (original: any) => {
              return function end() {
                agent.logger?.debug(
                  `express.Router.Layer.handle.${layer.name} wrapped response: ${req.method} ${req.originalUrl} => ${res.statusCode}`
                );

                let time;

                if (req[ExpressRequestHrTimeSymbol]) {
                  const diff = process.hrtime(req[ExpressRequestHrTimeSymbol]);
                  time =
                    Math.round(1e6 * (diff[0] * 1e3 + diff[1] * 1e-6)) / 1e6;
                }

                const timestamp =
                  req[ExpressRequestStartSymbol] || new Date().toISOString();

                const action = agent.createAction({
                  timestamp,
                  action: {
                    type: "HTTP",
                    verb: req.method,
                    object: getFullRoute(req),
                  },
                  agents: [
                    {
                      type: "USER",
                      id: getUserId(req),
                      meta: {
                        ip: getIp(req),
                        userAgent: req.get("User-Agent"),
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
                    status: res.statusCode,
                    time,
                  },
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
          };
        } else {
          handle = function (err: Error, req: any, res: any, next: any) {
            // set start time
            if (!req[ExpressRequestStartSymbol]) {
              req[ExpressRequestStartSymbol] = process.hrtime();
            }

            agent.logger?.debug(
              `express.Router.Layer.handle.${layer.name} wrapped error: ${req.method} ${req.originalUrl} ${err.name} ${err.message}`
            );

            return original.apply(this, arguments);
          };
        }

        for (const prop in original) {
          if (Object.prototype.hasOwnProperty.call(original, prop)) {
            (handle as any)[prop] = original[prop];
          }
        }

        return handle;
      });
    }
  }
}

export default bootstrap;
