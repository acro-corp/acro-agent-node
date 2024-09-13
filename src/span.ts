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

export interface SpanData {
  traceId?: string;
  start?: string;
  startHrTime?: [number, number];
  changes?: Action["changes"];
}

export class Span {
  _data: SpanData;

  constructor(data?: SpanData | null) {
    this._data = {
      start: new Date().toISOString(),
      startHrTime: process.hrtime(),
      ...(data || {}),
    };
  }

  set(data?: SpanData | null) {
    this._data = {
      ...this._data,
      ...(data || {}),
    };
  }

  trackChange(change?: NonNullable<Action["changes"]>[0]) {
    if (change) {
      this._data.changes = [...(this._data.changes || []), change];
    }
  }

  data() {
    return this._data;
  }
}
