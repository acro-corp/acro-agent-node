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
    _res: Response,
    next: (err?: Error, data?: any) => void
  ) => {
    req[ExpressTrackSymbol] = true;
    req[ExpressSensitiveKeysSymbol] = sensitiveKeys;
    next();
  };
}

/**
 * Middleware that forces an Express route to be ignored.
 * @returns
 */
export function acroIgnore() {
  return (
    req: Request,
    _res: Response,
    next: (err?: Error, data?: any) => void
  ) => {
    req[ExpressTrackSymbol] = false;
    next();
  };
}
