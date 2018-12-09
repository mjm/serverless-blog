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
      content: postContent(p)
    });
  });

  return feed;
}

// this is a workaround because feed uses the wrong key for html content
// https://github.com/jpmonette/feed/pull/81
export function fixJSONFeed(json: string): string {
  let parsed = JSON.parse(json);

  parsed.items.forEach(item => {
    item.content_html = item.html_content;
    delete item.html_content;
  });

  return JSON.stringify(parsed);
}

function postContent(p: DecoratedPost): string {
  let content = p.content.toString();

  if (p.photo) {
    for (const photo of p.photo) {
      content += `
      <figure><img src="${photo}"></figure>
      `;
    }
  }

  return content;
}
