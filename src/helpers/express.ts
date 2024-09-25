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

import { Action } from "@acro-sdk/common-store";
import {
  ExpressActionSymbol,
  ExpressSensitiveKeysSymbol,
  ExpressTrackSymbol,
} from "../plugins/express";

/**
 * Middleware that forces an Express route to be tracked, and allows
 * explicit instructions to remove certain sensitive keys.
 * @param {string[]} sensitiveKeys
 * @returns
 */
export function acroTrackExpress(sensitiveKeys?: string[]) {
  return (req: any, _res: any, next: (err?: Error, data?: any) => void) => {
    req[ExpressTrackSymbol] = true;
    req[ExpressSensitiveKeysSymbol] = sensitiveKeys;
    next();
  };
}

/**
 * Middleware that forces an Express route to be ignored.
 * @returns
 */
export function acroIgnoreExpress() {
  return (req: any, _res: any, next: (err?: Error, data?: any) => void) => {
    req[ExpressTrackSymbol] = false;
    next();
  };
}

/**
 * Attaches a some action data to the current Express request context.
 * @returns
 */
export function acroActionExpress(req: any, action: Action) {
  req[ExpressActionSymbol] = action;
}
