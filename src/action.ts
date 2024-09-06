/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
 */

export interface Action {
  app?: string;
  environment?: string;
  framework?: {
    name?: string;
    version?: string;
  };
  clientId?: string;
  sessionId?: string;
  traceIds?: Array<string>;
  action: {
    id?: string;
    type: string;
    verb: string;
    object?: string;
  };
  agents: Array<{
    id?: string;
    type: string;
    name?: string;
    meta?: Record<string, any>;
  }>;
  targets?: Array<{
    id?: string;
    type: string;
    name?: string;
    meta?: Record<string, any>;
  }>;
  request?: Record<string, any>;
  response?: {
    status?: string;
    time?: number;
    body?: Record<string, any>;
    headers?: Record<string, any>;
  };
  meta?: Record<string, any>;
}
