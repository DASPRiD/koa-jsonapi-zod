import { describe, expect, it } from "vitest";
import { type Accept, parseAccept } from "../src/headers.js";

describe("parseAccept", () => {
    const validHeaders: [string, string, Accept][] = [
        ["empty", " \t ", [{ type: "*", subType: "*", parameters: {}, weight: 1, acceptExt: {} }]],
        [
            "all types",
            "*/*",
            [{ type: "*", subType: "*", parameters: {}, weight: 1, acceptExt: {} }],
        ],
        [
            "all sub-types",
            "text/*",
            [{ type: "text", subType: "*", parameters: {}, weight: 1, acceptExt: {} }],
        ],
        [
            "simple type",
            "application/json",
            [{ type: "application", subType: "json", parameters: {}, weight: 1, acceptExt: {} }],
        ],
        [
            "type with weight",
            "application/json ; q=0.5",
            [{ type: "application", subType: "json", parameters: {}, weight: 0.5, acceptExt: {} }],
        ],
        [
            "simple type",
            "application/json",
            [{ type: "application", subType: "json", parameters: {}, weight: 1, acceptExt: {} }],
        ],
        [
            "multiple types",
            "application/json,application/xml",
            [
                { type: "application", subType: "json", parameters: {}, weight: 1, acceptExt: {} },
                { type: "application", subType: "xml", parameters: {}, weight: 1, acceptExt: {} },
            ],
        ],
        [
            "type with parameter",
            "application/json ; foo=bar",
            [
                {
                    type: "application",
                    subType: "json",
                    parameters: { foo: "bar" },
                    weight: 1,
                    acceptExt: {},
                },
            ],
        ],
        [
            "type with multiple parameters",
            "application/json ; foo=bar;baz=bat",
            [
                {
                    type: "application",
                    subType: "json",
                    parameters: { foo: "bar", baz: "bat" },
                    weight: 1,
                    acceptExt: {},
                },
            ],
        ],
        [
            "type with accept ext",
            "application/json ; q=1; foo=bar; baz=bat",
            [
                {
                    type: "application",
                    subType: "json",
                    parameters: {},
                    weight: 1,
                    acceptExt: { foo: "bar", baz: "bat" },
                },
            ],
        ],
        [
            "type with all params",
            "application/json ; foo=bar;q=1; foo=baz",
            [
                {
                    type: "application",
                    subType: "json",
                    parameters: { foo: "bar" },
                    weight: 1,
                    acceptExt: { foo: "baz" },
                },
            ],
        ],
        [
            "type with quoted parameter",
            'application/json ; foo="bar\\",;baz"',
            [
                {
                    type: "application",
                    subType: "json",
                    parameters: { foo: 'bar",;baz' },
                    weight: 1,
                    acceptExt: {},
                },
            ],
        ],
        [
            "multiple types with weights",
            "application/json ; q=0.5 \t , text/plain;q=0.6",
            [
                {
                    type: "text",
                    subType: "plain",
                    parameters: {},
                    weight: 0.6,
                    acceptExt: {},
                },
                {
                    type: "application",
                    subType: "json",
                    parameters: {},
                    weight: 0.5,
                    acceptExt: {},
                },
            ],
        ],
    ];

    for (const [name, header, expected] of validHeaders) {
        it(`should match ${name}`, () => {
            const actual = parseAccept(header);
            expect(actual).toEqual(expected);
        });
    }

    const invalidHeaders: [string, string, string][] = [
        ["lonely type", "foo", "Unexpected end of header"],
        ["missing subtype", "foo/", "Could not find a token at pos 4"],
        ["invalid weight", "foo/bar; q=1.1", "Invalid weight: 1.1"],
        ["invalid quoted character", 'foo/bar; foo="\0"', "Unexpected character at pos 14"],
        ["invalid end after escape", 'foo/bar; foo="\\', "Unexpected end of header"],
        ["invalid escaped character", 'foo/bar; foo="\\\0"', "Unexpected character at pos 15"],
        ["unclosed quotes", 'foo/bar; foo="', "Unclosed quoted string"],
        [
            "invalid separator after type",
            "foo/bar bar",
            "Unexpected character at pos 8, expected separator",
        ],
        [
            "invalid separator after parameter name",
            "foo/bar; foo bar",
            'Unexpected character " " at pos 12, expected "="',
        ],
    ];

    for (const [name, header, expectedMessage] of invalidHeaders) {
        it(`should throw error on ${name}`, () => {
            expect(() => parseAccept(header)).toThrow(expectedMessage);
        });
    }
});
