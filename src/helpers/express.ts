/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
 */

import {
  ExpressSensitiveKeysSymbol,
  ExpressTrackSymbol,
} from "../plugins/express";

// private sub-interfaces of Express ones so we don't have to include Express package
interface Request {
  [ExpressTrackSymbol]?: boolean;
  [ExpressSensitiveKeysSymbol]?: string[];
}
interface Response {}

/**
 * Middleware that forces an Express route to be tracked, and allows
 * explicit instructions to remove certain sensitive keys.
 * @param {string[]} sensitiveKeys
 * @returns
 */
export function acroTrack(sensitiveKeys?: string[]) {
  return (
    req: Request,
    res: Response,
    next: (err?: Error, data?: any) => void
  ) => {
    req[ExpressTrackSymbol] = true;
    req[ExpressSensitiveKeysSymbol] = sensitiveKeys;
    next();
  };
}
