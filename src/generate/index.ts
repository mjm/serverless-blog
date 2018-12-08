import * as path from "path";

import * as S3 from "aws-sdk/clients/s3";
import * as nunjucks from "nunjucks";
import * as marked from "marked";
import { parse } from "date-fns";

import * as site from "../model/site";
import Post from "../model/post";
import * as page from "../model/page";
import { DecoratedPost, DecoratedPage } from "./types";
import { generateFeed } from "./feed";
import * as post from "./post";
import publish from "./publish";
import * as renderer from "./renderer";

// expose the individual generator functions
export { generateIndex as archiveIndex, generateMonth as archiveMonth } from "./archive";
export { default as index } from "./home";
export { default as page } from "./page";
export { default as post } from "./post";

export interface GenerateSiteOptions {
  // Render every post instead of just the recent ones
  full?: boolean;
}

export default async function generate(blogId: string, options?: GenerateSiteOptions): Promise<void> {
  options = options || {};

  const siteConfig = await site.getConfig(blogId);
  const posts = await Post.recent(blogId);
  const pages = await page.all(blogId);

  const r = renderer.create(siteConfig);

  // render the content of all posts before rendering templates
  const decoratedPages = pages.map(p => renderPageContent(p));
  const decoratedIndexPosts = await post.decorate(posts);
  let decoratedPosts = decoratedIndexPosts;
  if (options.full) {
    const allPosts = await Post.all(blogId);
    decoratedPosts = await post.decorate(allPosts);
  }

  let jobs = [
    generateIndex(r, siteConfig, decoratedIndexPosts),
    generateFeeds(siteConfig, decoratedIndexPosts),
    generatePosts(r, siteConfig, decoratedPosts),
    generatePages(r, siteConfig, decoratedPages)
  ];

  await Promise.all(jobs);
}

function renderPageContent(p: page.Page): DecoratedPage {
  return {
    path: p.path,
    name: p.name,
    content: p.content,
    renderedContent: new nunjucks.runtime.SafeString(marked(p.content)),
    permalink: page.permalink(p)
  };
}

async function generateIndex(r: renderer.Renderer, siteConfig: site.Config, posts: DecoratedPost[]): Promise<void> {
  const body = await r('index.html', {
    site: siteConfig,
    posts
  });

  console.log('publishing index.html');
  await publish(siteConfig, 'index.html', body);
}

async function generateFeeds(siteConfig: site.Config, posts: DecoratedPost[]): Promise<void> {
  const feed = generateFeed(siteConfig, posts);

  await Promise.all([
    publish(siteConfig, 'feed.json', feed.json1()),
    publish(siteConfig, 'feed.atom', feed.atom1()),
    publish(siteConfig, 'feed.rss', feed.rss2())
  ]);
}

async function generatePosts(r: renderer.Renderer, siteConfig: site.Config, posts: DecoratedPost[]): Promise<void> {
  await Promise.all(posts.map(p => generatePost(r, siteConfig, p)));
}

async function generatePost(r: renderer.Renderer, siteConfig: site.Config, p: DecoratedPost): Promise<void> {
  const body = await r(`${p.type}.html`, {
    site: siteConfig,
    post: p
  });

  // transform /foo/bar/ to foo/bar/index.html
  const pagePath = `${p.permalink.substring(1)}index.html`;

  console.log(`publishing ${p.path} to ${pagePath}`);
  await publish(siteConfig, pagePath, body);
}

async function generatePages(r: renderer.Renderer, siteConfig: site.Config, pages: DecoratedPage[]): Promise<void> {
  await Promise.all(pages.map(p => generatePage(r, siteConfig, p)));
}

async function generatePage(r: renderer.Renderer, siteConfig: site.Config, p: DecoratedPage) {
  const body = await r('page.html', {
    site: siteConfig,
    page: p
  });

  // transform /foo/bar/ to foo/bar/index.html
  const pagePath = `${p.permalink.substring(1)}index.html`;

  console.log(`publishing ${p.path} to ${pagePath}`);
  await publish(siteConfig, pagePath, body);
}
