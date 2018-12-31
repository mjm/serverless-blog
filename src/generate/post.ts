import { runtime } from "nunjucks";
import marked from "marked";

import { DecoratedPost } from "./types";
import embedTweets from "./embedTweets";
import { decorate as decorateMention } from "./mention";
import publish from "./publish";
import * as renderer from "./renderer";
import { Config } from "../model/site";
import Post from "../model/post";
import Mention from "../model/mention";

export default async function generate(site: Config, post: Post, mentions: Mention[]): Promise<void> {
  const p = await decorate(post);
  const ms = decorateMention(mentions);

  const r = renderer.get(site);
  const template = `${p.type}.html`;
  const body = await r(template, { site, post: p, mentions: ms });

  // transform /foo/bar/ to foo/bar/index.html
  const dest = `${p.permalink.substring(1)}index.html`;

  console.log('publishing', p.path, 'to', dest);
  await publish(site, dest, body);
}

export async function decorate(post: Post): Promise<DecoratedPost>;
export async function decorate(posts: Post[]): Promise<DecoratedPost[]>;

export async function decorate(postOrArray: Post | Post[]): Promise<DecoratedPost | DecoratedPost[]> {
  if (postOrArray.constructor === Array) {
    const posts = postOrArray as Post[];
    return await Promise.all(posts.map(p => decorate(p)));
  } else {
    const p = postOrArray as Post;
    let rendered = '';
    if (p.content) {
      if (typeof p.content === 'string') {
        const embedded = await embedTweets(p.content);
        rendered = marked(embedded);
      } else {
        rendered = p.content.html;
      }
    }

    let decorated: DecoratedPost = {
      type: p.type,
      path: p.path,
      name: p.name,
      content: new runtime.SafeString(rendered),
      published: p.publishedDate,
      photo: p.photo,
      syndication: p.syndication,
      permalink: p.permalink,
      mentionCount: p.mentionCount
    };
    return decorated;
  }
}
