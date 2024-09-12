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

import { describe, expect, test } from "vitest";
import {
  breakCircularReferences,
  get,
  populateFrameworkData,
  removeSensitiveKeys,
} from "../src/utils";

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

describe("get()", () => {
  test("works with static use case", () => {
    expect(
      get(
        {
          userId: "1",
          auth: {
            userId: "2",
          },
        },
        "auth.userId"
      )
    ).toStrictEqual("2");
  });

  test("works with function use case", () => {
    expect(
      get(
        {
          userId: "1",
          auth: {
            userId: "2",
          },
        },
        (req: any) => req?.auth?.userId
      )
    ).toStrictEqual("2");
  });
});

describe("populateFrameworkData()", () => {
  test("works with typical Express use case", () => {
    expect(
      populateFrameworkData(
        {
          agents: {
            USER: {
              userId: (req: any) => req.userId,
              meta: {
                ip: "127.0.0.1",
                clerkUserId: (req: any) => req.auth?.userId,
              },
            },
          },
        },
        {
          userId: "1",
          auth: {
            userId: "2",
          },
        }
      )
    ).toStrictEqual({
      agents: {
        USER: {
          userId: "1",
          meta: {
            ip: "127.0.0.1",
            clerkUserId: "2",
          },
        },
      },
    });
  });
});
