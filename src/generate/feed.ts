import { Feed } from "feed";

import { Config } from "../model/site";
import * as renderer from "./renderer";
import { DecoratedPost } from "./types";

export async function generateFeed(site: Config, posts: DecoratedPost[]): Promise<Feed> {
  const r = renderer.get(site);
  const siteUrl = `https://${site.blogId}/`;
  const feed = new Feed({
    id: siteUrl,
    title: site.title,
    feed: `${siteUrl}feed.atom`,
    feedLinks: {
      json: `${siteUrl}feed.json`,
    },
    author: {
      name: site.author.name,
      email: site.author.email,
      link: siteUrl,
    },
    link: siteUrl,
    copyright: `2018 ${site.author.name}`,
  });

  for (const p of posts) {
    const content = await r(`${p.type}Feed.html`, { site, post: p });
    const url = `${siteUrl}${p.permalink.substring(1)}`;

    if (!p.published) { continue; }

    feed.addItem({
      title: p.name as any, // title should be optional but isn't
      id: url,
      link: url,
      date: p.published,
      content,
      published: p.published,
    });
  }

  return feed;
}
