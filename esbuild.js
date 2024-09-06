/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
 */

import esbuild from "esbuild";
import esbuildPluginTsc from "esbuild-plugin-tsc";

const build = () => {
  esbuild.build({
    entryPoints: ["src/agent.ts"],
    outfile: "dist/index.js",
    platform: "node",
    format: "esm",
    bundle: true,
    plugins: [
      esbuildPluginTsc({
        force: true,
      }),
    ],
  });
};

build();
