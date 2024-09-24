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

import { Parser } from "node-sql-parser";
import { AcroAgent } from "../agent";

let _parser: any;

function getParser() {
  if (!_parser) {
    _parser = new Parser();
  }

  return _parser;
}

/**
 * Gets the MySQL AST from a query
 * @param {string} sqlStr - the query statement
 * @returns
 */
export function getAst(agent: AcroAgent, sqlStr?: string) {
  if (!sqlStr || typeof sqlStr !== "string") {
    return;
  }

  let ast: any;

  try {
    ast = getParser().astify(sqlStr);
  } catch (err: any) {
    agent?.logger?.debug(`mysql.getAst error: ${err?.name} ${err?.message}`);
    return;
  }

  let operation: string = "";

  switch (ast?.type) {
    case "delete":
    case "update":
      operation = ast.type;
      break;
    case "insert":
      operation = "create";
      break;
    default:
      return;
  }

  if (operation) {
    return {
      ...ast,
      operation,
    };
  }
}
