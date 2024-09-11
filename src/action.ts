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

export interface Action {
  timestamp: string;
  clientId?: string;
  companyId?: string;
  app?: string;
  environment?: string;
  framework?: {
    name?: string;
    version?: string;
  };
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
