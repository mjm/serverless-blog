import { Feed } from "feed";
import * as parse from 'date-fns/parse';

import * as site from "../model/site";
import * as post from "../model/post";

export function generateFeed(siteConfig: site.Config, posts: Array<any>): Feed {
  const siteUrl = `https://${siteConfig.blogId}/`
  let feed = new Feed({
    id: siteUrl,
    link: siteUrl,
    title: siteConfig.title,
    copyright: "2018 Matt Moriarity",
    feed: `${siteUrl}feed.atom`,
    feedLinks: {
      json: `${siteUrl}feed.json`
    },
    // TODO pull this information from the site config
    author: {
      name: "Matt Moriarity",
      email: "matt@mattmoriarity.com",
      link: "https://mattmoriarity.com"
    }
  });

  posts.forEach(p => {
    const url = `${siteUrl}${p.permalink.substring(1)}`;
    const publishedAt = parse(p.publishedAt);
    feed.addItem({
      title: p.title,
      link: url,
      id: url,
      date: publishedAt,
      published: publishedAt,
      content: p.renderedContent
    });
  });

  return feed;
}
