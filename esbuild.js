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

import esbuild from "esbuild";
import esbuildPluginTsc from "esbuild-plugin-tsc";

const build = () => {
  esbuild.build({
    entryPoints: ["src/index.ts"],
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
