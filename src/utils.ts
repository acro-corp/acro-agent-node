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

/**
 * Deeply gets a key inside an object, or calls a function on it
 * @param {object} object
 * @param {string | Function} getter - key to get, e.g. 'foo.bar' will get object[foo][bar]
 * @returns
 */
export function get(object: any, getter: string | ((object: any) => string)) {
  if (typeof getter === "string") {
    return (getter || "").split(".").reduce((p: any, c: any) => p?.[c], object);
  } else if (typeof getter === "function") {
    return getter(object);
  } else {
    return;
  }
}

/**
 * Gets extra data to add to the Action object from frameworkOptions
 * @param {object} frameworkOptions
 * @param {object} object – the object to parse, e.g. `req` if Express
 * @returns
 */
export function populateFrameworkData(frameworkOptions: any, object: any) {
  const frameworkData: any = {};

  Object.keys(frameworkOptions || {}).forEach((key) => {
    if (
      typeof frameworkOptions[key] === "object" &&
      frameworkOptions[key] !== null
    ) {
      // recurse if it's a sub object
      frameworkData[key] = populateFrameworkData(frameworkOptions[key], object);
    } else if (typeof frameworkOptions[key] === "function") {
      // if it's a function, call it on object
      frameworkData[key] = frameworkOptions[key](object);
    } else {
      // otherwise just set it
      frameworkData[key] = frameworkOptions[key];
    }
  });

  return frameworkData;
}

/**
 * Deeply removes a list of sensitive keys from anywhere in an object.
 * Also breaks any circular references.
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

  // if the whole object is an array
  if (Array.isArray(object)) {
    return object.map((elem) =>
      removeSensitiveKeys(elem, keys, [...(parents || []), object])
    );
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
 * Deeply breaks any circular references.
 * @param {object} object
 * @param {any[]} parents
 * @returns
 */
export function breakCircularReferences(object: any, parents?: any[]): any {
  return removeSensitiveKeys(object, [], parents);
}
