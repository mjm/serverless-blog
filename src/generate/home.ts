import Post from "../model/post";
import { Config } from "../model/site";
import { generateFeed } from "./feed";
import { decorate } from "./post";
import publish from "./publish";
import * as renderer from "./renderer";
import { DecoratedPost } from "./types";

export default async function generate(site: Config): Promise<void> {
  const posts = await Post.recent(site.blogId);
  const ps = await decorate(posts);

  const index = generateIndex(site, ps);
  const feeds = generateFeeds(site, ps);

  await Promise.all([index, feeds]);
}

async function generateIndex(site: Config, posts: DecoratedPost[]): Promise<void> {
  const r = renderer.get(site);

  console.log('rendering index.html');
  const body = await r('index.html', { site, posts });

  console.log('publishing index.html');
  await publish(site, 'index.html', body);
}

async function generateFeeds(site: Config, posts: DecoratedPost[]): Promise<void> {
  const r = renderer.get(site);

  console.log('generating site feed');
  const feed = generateFeed(site, posts);

  const json = publish(site, 'feed.json', feed.json1());
  const atom = publish(site, 'feed.atom', feed.atom1());
  const rss  = publish(site, 'feed.rss',  feed.rss2());

  await Promise.all([json, atom, rss]);
}
