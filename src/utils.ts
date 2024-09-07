/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
 */

/**
 * Deeply gets a key inside an object.
 * @param {object} object
 * @param {string} path - key to get, e.g. 'foo.bar' will get object[foo][bar]
 * @returns
 */
export function get(object: any, path: string) {
  return (path || "").split(".").reduce((p: any, c: any) => p?.[c], object);
}

/**
 * Deeply removes a list of sensitive keys from anywhere in an object.
 * Also breaks any circular dependencies.
 * @param {object} object
 * @param {string[]} keys
 * @param {any[]} parents
 * @returns
 */
export function removeSensitiveKeys(
  object: any,
  keys?: string[],
  parents?: any[]
): any {
  if (typeof object !== "object" || object === null) {
    return object;
  }

  return Object.keys(object).reduce((sanitized, key) => {
    // remove the key
    if (keys?.includes(key)) {
      return sanitized;
    }

    // if the thing at object[key] is a circular reference
    if (parents?.includes(object[key]) || object[key] === object) {
      return sanitized;
    }

    if (object[key] === null || typeof object[key] === "undefined") {
      sanitized[key] = object[key];
      return sanitized;
    }

    // if the thing at object[key] is an array
    if (Array.isArray(object[key])) {
      return {
        ...sanitized,
        [key]: object[key]
          .filter((elem) => elem !== object) // e.g. if object[key] = [object]
          .map((elem) =>
            removeSensitiveKeys(elem, keys, [...(parents || []), object])
          ),
      };
    }

    // if the thing at object[key] is an object
    if (typeof object[key] === "object") {
      return {
        ...sanitized,
        [key]: removeSensitiveKeys(object[key], keys, [
          ...(parents || []),
          object, //
        ]),
      };
    }

    // if the thing at object[key] is a primitive, just save it
    sanitized[key] = object[key];

    return sanitized;
  }, {} as any);
}

/**
 * Deeply breaks any circular dependencies.
 * @param {object} object
 * @param {any[]} parents
 * @returns
 */
export function breakCircularDependencies(object: any, parents?: any[]): any {
  return removeSensitiveKeys(object, [], parents);
}
