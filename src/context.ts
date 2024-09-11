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
import { AsyncLocalStorage } from "async_hooks";
import { v4 } from "uuid";

export interface Context {
  traceId?: string;
  startHrTime?: [number, number];
  start?: string;
  action?: Action;
}

export class ContextManager {
  // _asyncLocalStorage does not support Node.js < 14.
  // TODO: Need to do a separate implementation using AsyncHooks
  private _asyncLocalStorage: AsyncLocalStorage<Context>;

  constructor() {
    this._asyncLocalStorage = new AsyncLocalStorage();
  }

  active(): AsyncLocalStorage<Context> {
    return this._asyncLocalStorage ?? {};
  }

  runOnce(context: Context | null, next: Function) {
    if (this.active()?.getStore()?.traceId) {
      return next();
    }

    this.active().run(
      {
        traceId: `acro-${v4()}`,
        ...(context || {}),
      },
      () => next()
    );
  }

  get() {
    return this.active().getStore();
  }

  enable(): this {
    return this;
  }

  disable(): this {
    this._asyncLocalStorage.disable();
    return this;
  }
}
