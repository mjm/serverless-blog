import { Feed } from "feed";

import { Config } from "../model/site";
import { DecoratedPost } from "./types";
import * as renderer from "./renderer";

export async function generateFeed(site: Config, posts: DecoratedPost[]): Promise<Feed> {
  const r = renderer.get(site);
  const siteUrl = `https://${site.blogId}/`
  let feed = new Feed({
    id: siteUrl,
    link: siteUrl,
    title: site.title,
    copyright: `2018 ${site.author.name}`,
    feed: `${siteUrl}feed.atom`,
    feedLinks: {
      json: `${siteUrl}feed.json`
    },
    author: {
      name: site.author.name,
      email: site.author.email,
      link: siteUrl
    }
  });

  for (const p of posts) {
    const content = await r(`${p.type}Feed.html`, { site, post: p });
    const url = `${siteUrl}${p.permalink.substring(1)}`;

    feed.addItem({
      title: p.name,
      link: url,
      id: url,
      date: p.published,
      published: p.published,
      content: content
    });
  }

  return feed;
}
