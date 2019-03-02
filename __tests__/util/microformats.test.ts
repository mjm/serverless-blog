import * as mf from "../../src/util/microformats";

describe("convert MF item to DB storage", () => {
  test("an item with no properties", () => {
    const item = {
      type: ["h-entry"],
      properties: {},
    };
    expect(mf.toStorage(item)).toEqual({ type: "entry" });
  });

  test("an item with a name", () => {
    const item = {
      type: ["h-entry"],
      properties: {
        name: ["This is a post name"],
      },
    };
    expect(mf.toStorage(item)).toEqual({
      type: "entry",
      name: "This is a post name",
    });
  });

  test("an item with string content", () => {
    const item = {
      type: ["h-entry"],
      properties: {
        content: ["This is some #content"],
      },
    };
    expect(mf.toStorage(item)).toEqual({
      type: "entry",
      content: "This is some #content",
    });
  });

  test("an item with a non-singular property", () => {
    const item = {
      type: ["h-entry"],
      properties: {
        photo: [
          "https://example.com/foo.jpg",
        ],
      },
    };

    expect(mf.toStorage(item)).toEqual({
      type: "entry",
      photo: [
        "https://example.com/foo.jpg",
      ],
    });
  });

  test("an item with an embedded item as a property", () => {
    const item = {
      type: ["h-entry"],
      properties: {
        author: [
          {
            type: ["h-card"],
            properties: {
              name: ["John Appleseed"],
            },
          },
        ],
      },
    };

    expect(mf.toStorage(item)).toEqual({
      type: "entry",
      author: [{
        type: "card",
        name: "John Appleseed",
      }],
    });
  });
});
