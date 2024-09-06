/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
 */

import { Writable, WritableOptions } from "stream";
import { Logger } from "./agent";
import { Action } from "./action";

class ActionStream extends Writable {
  _applicationId: string = "";
  _secret: string = "";
  _url: string = "";
  _userAgent: string = "";
  _logger: Logger | null = null;

  constructor(
    {
      applicationId,
      secret,
      url,
      logger,
      userAgent,
    }: {
      applicationId: string;
      secret: string;
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
  }

  async _writev(chunks: { chunk: Action }[], next: Function) {
    this._logger?.debug(`ActionStream.writev: ${JSON.stringify(chunks)}`);

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
      console.log("\n\n\n fetch error", err);
      this._logger?.error(
        `ActionStream.writev Error: ${err.name} ${err.message} ${err.stack}`
      );
    }

    next();
  }
}

export { ActionStream };
