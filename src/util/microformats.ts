import fetch from "node-fetch";
import Microformats from "microformat-node";

export async function parse(url: string, event?: any): Promise<any> {
  if (event) {
    event.addField("mf.url", url);
  }

  let start = Date.now();

  const resp = await fetch(url);
  const html = await resp.text();

  if (event) {
    event.addField("mf.fetch_ms", Date.now() - start);
  }

  start = Date.now();

  const result = await Microformats.getAsync({
    html,
    baseUrl: url,
    textFormat: 'normalised'
  });

  if (event) {
    event.addField("mf.parse_ms", Date.now() - start);
  }

  return result;
}

export function getEntry(data: any): any {
  const { items } = data;

  for (let item of items) {
    const type = item.type[0];
    if (type === 'h-entry') {
      return item;
    }
  }

  return null;
}

export const singularKeys: string[] = [
  'url',
  'name',
  'content',
  'published',
  'updated',
  'post-status',
  'mp-slug',
  'in-reply-to',
  'repost-of'
];

interface StorableItem {
  type: string;
  [key: string]: any;
}

export function toStorage(item: any): StorableItem {
  const type = item.type[0].replace(/^h-/, '');
  const props = transformProps(item.properties);

  return { type, ...props };
}

function transformProps(item: {[key: string]: any}): {[key: string]: any} {
  let obj: {[key: string]: any} = {};

  for (let key of Object.keys(item)) {
    let val = item[key];

    val = val.map((v: any) => {
      if (typeof v === 'object' && 'type' in v) {
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
