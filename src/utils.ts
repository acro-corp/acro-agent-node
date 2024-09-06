/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
 */

export function get(object: any, path: string) {
  return (path || "").split(".").reduce((p: any, c: any) => p?.[c], object);
}
