/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
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
