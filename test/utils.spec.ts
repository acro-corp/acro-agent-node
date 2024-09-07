/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
 */

import { describe, expect, test } from "vitest";
import { breakCircularReferences, removeSensitiveKeys } from "../src/utils";

describe("removeSensitiveKeys()", () => {
  test("works with number primitive", () => {
    expect(removeSensitiveKeys(5, ["b", "c"])).toStrictEqual(5);
  });

  test("works with string primitive", () => {
    expect(removeSensitiveKeys("foo", ["b", "c"])).toStrictEqual("foo");
  });

  test("works with null", () => {
    expect(removeSensitiveKeys(null, ["b", "c"])).toStrictEqual(null);
  });

  test("works with undefined", () => {
    expect(removeSensitiveKeys(undefined, ["b", "c"])).toStrictEqual(undefined);
  });

  test("works with NaN", () => {
    expect(removeSensitiveKeys(NaN, ["b", "c"])).toStrictEqual(NaN);
  });

  test("works with an array of primitives", () => {
    expect(removeSensitiveKeys([1, 2], ["b", "c"])).toStrictEqual([1, 2]);
  });

  test("works with a single layer object", () => {
    expect(
      removeSensitiveKeys(
        {
          a: 1,
          b: "two",
          c: null,
          d: null,
          e: NaN,
          f: undefined,
        },
        ["b", "c"]
      )
    ).toStrictEqual({ a: 1, d: null, e: NaN, f: undefined });
  });

  test("works with a two layer object", () => {
    expect(
      removeSensitiveKeys(
        {
          a: 1,
          b: "two",
          c: null,
          d: {
            b: 3,
            e: "four",
          },
        },
        ["b", "c"]
      )
    ).toStrictEqual({ a: 1, d: { e: "four" } });
  });

  test("works with an array of objects", () => {
    expect(
      removeSensitiveKeys(
        [
          {
            a: 1,
            b: "two",
            c: null,
            d: {
              b: 3,
              e: "four",
            },
          },
        ],
        ["b", "c"]
      )
    ).toStrictEqual([{ a: 1, d: { e: "four" } }]);
  });

  test("works with a single layer object with arrays", () => {
    expect(
      removeSensitiveKeys(
        {
          a: 1,
          b: "two",
          c: null,
          d: [
            {
              b: 3,
              e: "four",
            },
            {
              c: "five",
              f: 6,
            },
          ],
        },
        ["b", "c"]
      )
    ).toStrictEqual({ a: 1, d: [{ e: "four" }, { f: 6 }] });
  });

  test("works with a two layer object with arrays", () => {
    expect(
      removeSensitiveKeys(
        {
          a: 1,
          b: "two",
          c: null,
          d: [
            {
              b: 3,
              e: "four",
              g: [
                {
                  b: 7,
                  h: "eight",
                },
              ],
            },
            {
              c: "five",
              f: 6,
            },
          ],
        },
        ["b", "c"]
      )
    ).toStrictEqual({
      a: 1,
      d: [{ e: "four", g: [{ h: "eight" }] }, { f: 6 }],
    });
  });

  test("works with an object with circular reference", () => {
    const obj: any = {
      a: 1,
      b: "two",
      c: null,
    };

    obj.d = obj;

    expect(removeSensitiveKeys(obj, ["b", "c"])).toStrictEqual({
      a: 1,
    });
  });

  test("works with an object with nested circular reference", () => {
    const obj: any = {
      a: 1,
      b: "two",
      c: null,
    };

    obj.d = {
      c: 3,
      e: obj,
      f: "four",
    };

    expect(removeSensitiveKeys(obj, ["b", "c"])).toStrictEqual({
      a: 1,
      d: {
        f: "four",
      },
    });
  });

  test("works with an array of objects with nested circular reference", () => {
    const obj: any = {
      a: 1,
      b: "two",
      c: null,
    };

    obj.d = {
      c: 3,
      e: obj,
      f: "four",
    };

    expect(removeSensitiveKeys([obj], ["b", "c"])).toStrictEqual([
      {
        a: 1,
        d: {
          f: "four",
        },
      },
    ]);
  });

  test("works with an object with circular reference in array", () => {
    const obj: any = {
      a: 1,
      b: "two",
      c: null,
    };

    obj.d = [obj];

    expect(removeSensitiveKeys(obj, ["b", "c"])).toStrictEqual({
      a: 1,
      d: [],
    });
  });

  test("works with an object with nested circular reference in array", () => {
    const obj: any = {
      a: 1,
      b: "two",
      c: null,
    };

    obj.d = [
      {
        c: 3,
        e: obj,
        f: "four",
      },
    ];

    expect(removeSensitiveKeys(obj, ["b", "c"])).toStrictEqual({
      a: 1,
      d: [
        {
          f: "four",
        },
      ],
    });
  });
});

describe("breakCircularReferences()", () => {
  test("works with number primitive", () => {
    expect(breakCircularReferences(5)).toStrictEqual(5);
  });

  test("works with string primitive", () => {
    expect(breakCircularReferences("foo")).toStrictEqual("foo");
  });

  test("works with null", () => {
    expect(breakCircularReferences(null)).toStrictEqual(null);
  });

  test("works with undefined", () => {
    expect(breakCircularReferences(undefined)).toStrictEqual(undefined);
  });

  test("works with NaN", () => {
    expect(breakCircularReferences(NaN)).toStrictEqual(NaN);
  });

  test("works with an array of primitives", () => {
    expect(breakCircularReferences([1, 2])).toStrictEqual([1, 2]);
  });

  test("works with a single layer object", () => {
    expect(
      breakCircularReferences({
        a: 1,
        b: "two",
        c: null,
        d: NaN,
        e: undefined,
      })
    ).toStrictEqual({
      a: 1,
      b: "two",
      c: null,
      d: NaN,
      e: undefined,
    });
  });

  test("works with an array of objects", () => {
    expect(
      breakCircularReferences([
        {
          a: 1,
          b: "two",
          c: null,
          d: NaN,
          e: undefined,
        },
      ])
    ).toStrictEqual([
      {
        a: 1,
        b: "two",
        c: null,
        d: NaN,
        e: undefined,
      },
    ]);
  });

  test("works with a two layer object", () => {
    expect(
      breakCircularReferences({
        a: 1,
        b: "two",
        c: {
          d: 3,
          e: "four",
        },
      })
    ).toStrictEqual({
      a: 1,
      b: "two",
      c: {
        d: 3,
        e: "four",
      },
    });
  });

  test("works with a single layer object with arrays", () => {
    expect(
      breakCircularReferences({
        a: 1,
        b: [
          {
            c: 3,
          },
          {
            d: "five",
          },
        ],
      })
    ).toStrictEqual({
      a: 1,
      b: [
        {
          c: 3,
        },
        {
          d: "five",
        },
      ],
    });
  });

  test("works with a two layer object with arrays", () => {
    expect(
      breakCircularReferences({
        a: 1,
        b: [
          {
            c: 3,
            d: [
              {
                e: 7,
              },
            ],
          },
        ],
      })
    ).toStrictEqual({
      a: 1,
      b: [
        {
          c: 3,
          d: [
            {
              e: 7,
            },
          ],
        },
      ],
    });
  });

  test("works with an object with circular reference", () => {
    const obj: any = {
      a: 1,
      b: "two",
      c: null,
    };

    obj.d = obj;

    expect(breakCircularReferences(obj)).toStrictEqual({
      a: 1,
      b: "two",
      c: null,
    });
  });

  test("works with an object with nested circular reference", () => {
    const obj: any = {
      a: 1,
      b: "two",
      c: null,
    };

    obj.d = {
      c: 3,
      e: obj,
      f: "four",
    };

    expect(breakCircularReferences(obj)).toStrictEqual({
      a: 1,
      b: "two",
      c: null,
      d: {
        c: 3,
        f: "four",
      },
    });
  });

  test("works with an array of objects with nested circular reference", () => {
    const obj: any = {
      a: 1,
      b: "two",
      c: null,
    };

    obj.d = {
      c: 3,
      e: obj,
      f: "four",
    };

    expect(breakCircularReferences([obj])).toStrictEqual([
      {
        a: 1,
        b: "two",
        c: null,
        d: {
          c: 3,
          f: "four",
        },
      },
    ]);
  });

  test("works with an object with circular reference in array", () => {
    const obj: any = {
      a: 1,
      b: "two",
      c: null,
    };

    obj.d = [obj];

    expect(breakCircularReferences(obj)).toStrictEqual({
      a: 1,
      b: "two",
      c: null,
      d: [],
    });
  });

  test("works with an object with nested circular reference in array", () => {
    const obj: any = {
      a: 1,
      b: "two",
      c: null,
    };

    obj.d = [
      {
        c: 3,
        e: obj,
        f: "four",
      },
    ];

    expect(breakCircularReferences(obj)).toStrictEqual({
      a: 1,
      b: "two",
      c: null,
      d: [
        {
          c: 3,
          f: "four",
        },
      ],
    });
  });
});
