/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
 */

import ExpressPlugin from "./express";

export const PLUGINS = [
  {
    plugin: ExpressPlugin,
    importPath: "express",
  },
];

export function getImportPaths() {
  return PLUGINS.map((plugin) => plugin.importPath);
}

export function getPlugin(name: string) {
  return PLUGINS.find((plugin) => plugin.importPath === name)?.plugin;
}
