import { Feed } from "feed";

import * as site from "../model/site";
import { DecoratedPost } from "./types";

export function generateFeed(siteConfig: site.Config, posts: DecoratedPost[]): Feed {
  const siteUrl = `https://${siteConfig.blogId}/`
  let feed = new Feed({
    id: siteUrl,
    link: siteUrl,
    title: siteConfig.title,
    copyright: `2018 ${siteConfig.author.name}`,
    feed: `${siteUrl}feed.atom`,
    feedLinks: {
      json: `${siteUrl}feed.json`
    },
    author: {
      name: siteConfig.author.name,
      email: siteConfig.author.email,
      link: siteUrl
    }
  });

  posts.forEach(p => {
    const url = `${siteUrl}${p.permalink.substring(1)}`;
    feed.addItem({
      title: p.name,
      link: url,
      id: url,
      date: p.published,
      published: p.published,
      content: p.content.toString()
    });
  });

  return feed;
}
