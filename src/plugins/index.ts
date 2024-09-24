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

import ExpressPlugin from "./express";
import ClerkPlugin from "./clerk";
import MysqlPlugin from "./mysql";
import Mysql2Plugin from "./mysql2";

export const PLUGINS = [
  {
    plugin: ExpressPlugin,
    importPaths: ["express"],
  },
  {
    plugin: ClerkPlugin,
    importPaths: ["@clerk/clerk-sdk-node"],
  },
  // the prisma require() hook is never called ?_?
  // {
  //   plugin: PrismaPlugin,
  //   importPaths: ["@prisma/client"],
  // },
  {
    plugin: MysqlPlugin,
    importPaths: ["mysql"],
  },
  {
    plugin: Mysql2Plugin,
    importPaths: ["mysql2"],
  },
];

export function getImportPaths() {
  return PLUGINS.reduce(
    (p, plugin) => p.concat(plugin.importPaths),
    [] as string[]
  );
}

export function getPlugin(name: string) {
  return PLUGINS.find((plugin) => plugin.importPaths?.includes(name))?.plugin;
}
