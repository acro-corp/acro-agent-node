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
import { Span, SpanData } from "./span";

export interface Context {
  traceId?: string;
  span?: Span;
}

export class ContextManager {
  // _asyncLocalStorage does not support Node.js < 14.
  // TODO: Need to do a separate implementation using AsyncHooks
  private _asyncLocalStorage: AsyncLocalStorage<Context>;

  constructor() {
    this._asyncLocalStorage = new AsyncLocalStorage();
  }

  active(): AsyncLocalStorage<Context> {
    return this._asyncLocalStorage || {};
  }

  get() {
    return this.active()?.getStore?.();
  }

  runOnce(data: SpanData | null, next: Function) {
    if (this.get()?.traceId) {
      return next();
    }

    const traceId = `acro-${v4()}`;

    this.active()?.run?.(
      {
        traceId,
        span: new Span({
          ...(data || {}),
          traceId,
        }),
      },
      () => next()
    );
  }

  setData(data?: SpanData | null) {
    return this.get()?.span?.set(data);
  }

  trackChange(change: NonNullable<Action["changes"]>[0]) {
    return this.get()?.span?.trackChange(change);
  }

  getData() {
    return this.get()?.span?.data();
  }

  enable(): this {
    return this;
  }

  disable(): this {
    this._asyncLocalStorage?.disable?.();
    return this;
  }
}
