/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
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
