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

import { Writable, WritableOptions } from "stream";
import { Logger } from "./agent";
import { Action } from "./action";
import { Engine } from "@acro-sdk/common-store";

class ActionStream extends Writable {
  _applicationId: string = "";
  _companyId: string = "";
  _secret: string = "";
  _store: Engine<any> | null = null;
  _url: string = "";
  _userAgent: string = "";
  _logger: Logger | null = null;

  constructor(
    {
      applicationId,
      companyId,
      secret,
      store,
      url,
      logger,
      userAgent,
    }: {
      applicationId: string;
      companyId?: string;
      secret: string;
      store?: Engine<any> | null;
      url?: string;
      logger: Logger;
      userAgent?: string;
    },
    streamOptions?: WritableOptions
  ) {
    super(streamOptions);

    this._applicationId = applicationId;
    this._secret = secret;
    this._logger = logger;

    if (url) {
      this._url = url;
    }

    if (userAgent) {
      this._userAgent = userAgent;
    }

    // only read companyId if you're passing in your own store
    // otherwise it's derived from applicationId
    if (store) {
      this._store = store;

      if (companyId) {
        this._companyId = companyId;
      }
    }
  }

  async _writev(chunks: { chunk: Action }[], next: Function) {
    this._logger?.debug(`ActionStream.writev: ${JSON.stringify(chunks)}`);

    // if store is passed in, prefer that
    if (this._store) {
      try {
        await this._store.createManyActions(
          chunks.map((chunk) => {
            return {
              companyId: this._companyId,
              ...(chunk?.chunk || {}),
            };
          })
        );

        this._logger?.error(
          `ActionStream.writev wrote to store: ${chunks?.length} actions`
        );
      } catch (err: any) {
        this._logger?.error(
          `ActionStream.writev Store error: ${err.name} ${err.message}}`
        );
      }

      return next();
    }

    // otherwise do HTTP call
    const action = chunks?.[0]?.chunk;
    const userAgent =
      this._userAgent ||
      `${action.app} (${action.framework?.name} @ ${action.framework?.version})`;

    try {
      const response = await fetch(this._url, {
        headers: {
          userAgent,
          "user-agent": userAgent,
          authorization: `Bearer ${this._secret}`,
        },
        method: "POST",
        body: JSON.stringify({ actions: chunks.map((chunk) => chunk.chunk) }),
      });

      if (response.ok) {
        this._logger?.debug(
          `ActionStream.writev Success: ${
            response.status
          } ${await response.json()}`
        );
      } else {
        this._logger?.error(
          `ActionStream.writev Error: ${response.status} ${JSON.stringify(
            (await response.json()) || {}
          )}`
        );
      }
    } catch (err: any) {
      this._logger?.error(
        `ActionStream.writev Error: ${err.name} ${err.message} ${err.stack}`
      );
    }

    next();
  }
}

export { ActionStream };
