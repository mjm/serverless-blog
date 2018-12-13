import { runtime } from "nunjucks";
import marked from "marked";

import { DecoratedPage } from "./types";
import embedTweets from "./embedTweets";
import publish from "./publish";
import * as renderer from "./renderer";
import { Config } from "../model/site";
import Page from "../model/page";

export default async function generate(site: Config, page: Page): Promise<void> {
  const p = await decorate(page);

  const r = renderer.get(site);
  const body = await r('page.html', { site, page: p });

  // transform /foo/bar/ to foo/bar/index.html
  const dest = `${p.permalink.substring(1)}index.html`;

  console.log('publishing', p.path, 'to', dest);
  await publish(site, dest, body);
}

export async function decorate(page: Page): Promise<DecoratedPage>;
export async function decorate(pages: Page[]): Promise<DecoratedPage[]>;

export async function decorate(pageOrArray: Page | Page[]): Promise<DecoratedPage | DecoratedPage[]> {
  if (pageOrArray.constructor === Array) {
    const posts = pageOrArray as Page[];
    return await Promise.all(posts.map(p => decorate(p)));
  } else {
    const p = pageOrArray as Page;

    return {
      path: p.path,
      name: p.name,
      content: new runtime.SafeString(marked(p.content)),
      permalink: p.permalink
    };
  }
}
