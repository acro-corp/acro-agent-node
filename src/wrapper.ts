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

const AcroWrapped = Symbol("AcroWrapped");
const AcroUnwrap = Symbol("AcroUnwrap");

function wrap<T>(exports: any, name: string, fn: Function) {
  if (!exports?.[name] || !fn) {
    return;
  }

  // if already wrapped
  if (exports[name]?.[AcroWrapped]) {
    return;
  }

  const original = exports[name];
  const wrapped = fn(original, name);

  wrapped[AcroWrapped] = true;
  wrapped[AcroUnwrap] = function AcroUnwrap() {
    if (exports[name] === wrapped) {
      exports[name] = original;
      wrapped[AcroWrapped] = false;
    }
  };

  exports[name] = wrapped;

  return wrapped;
}

export { wrap };
