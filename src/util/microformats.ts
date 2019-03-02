import beeline from "honeycomb-beeline";
import Microformats from "microformat-node";
import fetch from "node-fetch";

export async function parse(url: string): Promise<any> {
  beeline.addContext({ "mf.url": url });

  const fetchTimer = beeline.startTimer("fetch");
  const resp = await fetch(url);
  const html = await resp.text();
  beeline.finishTimer(fetchTimer);

  const parseTimer = beeline.startTimer("parse");
  const result = await Microformats.getAsync({
    html,
    baseUrl: url,
    textFormat: "normalised",
  });
  beeline.finishTimer("parse");

  return result;
}

export function getEntry(data: any): any {
  const { items } = data;

  for (const item of items) {
    const type = item.type[0];
    if (type === "h-entry") {
      return item;
    }
  }

  return null;
}

export const singularKeys: string[] = [
  "url",
  "name",
  "content",
  "published",
  "updated",
  "post-status",
  "mp-slug",
  "in-reply-to",
  "repost-of",
];

interface StorableItem {
  type: string;
  [key: string]: any;
}

export function toStorage(item: any): StorableItem {
  const type = item.type[0].replace(/^h-/, "");
  const props = transformProps(item.properties);

  return { type, ...props };
}

function transformProps(item: {[key: string]: any}): {[key: string]: any} {
  const obj: {[key: string]: any} = {};

  for (const key of Object.keys(item)) {
    let val = item[key];

    val = val.map((v: any) => {
      if (typeof v === "object" && "type" in v) {
        return toStorage(v);
      } else {
        return v;
      }
    });

    if (singularKeys.includes(key)) {
      val = val[0];
    }

    obj[key] = val;
  }

  return obj;
}
