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
