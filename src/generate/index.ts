import * as path from "path";

import * as S3 from "aws-sdk/clients/s3";
import * as nunjucks from "nunjucks";
import * as marked from "marked";
import * as mime from "mime-types";
import { parse } from "date-fns";

import * as site from "../model/site";
import * as post from "../model/post";
import embedTweets from "./embedTweets";
import { AWSLoader } from "./awsLoader";
import { generateFeed } from "./feed";
import * as helpers from "./helpers";

const s3 = new S3();

export default async function generate(blogId: string): Promise<void> {
  const siteConfig = await site.getConfig(blogId);
  const posts = await post.recent(blogId);

  const r = createRenderer(siteConfig);

  // render the content of all posts before rendering templates
  const decoratedPosts = await Promise.all(posts.map(p => renderPostContent(p)));

  let jobs = [
    generateIndex(r, siteConfig, decoratedPosts),
    generateFeeds(siteConfig, decoratedPosts),
    generatePosts(r, siteConfig, decoratedPosts)
  ];

  await Promise.all(jobs);
}

type Renderer = (name: string, context: any) => Promise<string>;

function createRenderer(siteConfig: site.Config): Renderer {
  const loader = new AWSLoader({ bucket: siteConfig.blogId });
  const env = new nunjucks.Environment(loader, { autoescape: true });

  env.addFilter('dateformat', helpers.dateformat);
  env.addFilter('feedlinks', helpers.feedLinks);
  env.addFilter('micropublinks', helpers.micropubLinks);

  return async function renderer(name: string, context: any): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      env.render(name, context, (err, rendered) => {
        if (err) {
          reject(err);
        } else {
          resolve(rendered);
        }
      });
    });
  };
}

interface DecoratedPost {
  path: string;
  title?: string;
  content: string;
  renderedContent: nunjucks.runtime.SafeString;
  publishedAt: Date;
  permalink: string;
}

async function renderPostContent(p: post.Post): Promise<DecoratedPost> {
  const embedded = await embedTweets(p.content);
  let decorated: DecoratedPost = {
    path: p.path,
    content: p.content,
    renderedContent: new nunjucks.runtime.SafeString(marked(embedded)),
    publishedAt: parse(p.publishedAt),
    permalink: post.permalink(p)
  };
  if (p.title) {
    decorated.title = p.title;
  }
  return decorated;
}

async function generateIndex(r: Renderer, siteConfig: site.Config, posts: DecoratedPost[]): Promise<void> {
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

async function generatePosts(r: Renderer, siteConfig: site.Config, posts: DecoratedPost[]): Promise<void> {
  await Promise.all(posts.map(p => generatePost(r, siteConfig, p)));
}

async function generatePost(r: Renderer, siteConfig: site.Config, p: DecoratedPost): Promise<void> {
  const body = await r('post.html', {
    site: siteConfig,
    post: p
  });

  // transform /foo/bar/ to foo/bar/index.html
  const pagePath = `${p.permalink.substring(1)}index.html`;

  console.log(`publishing ${p.path} to ${pagePath}`);
  await publish(siteConfig, pagePath, body);
}

async function publish(siteConfig: site.Config, filePath: string, body: string): Promise<void> {
  await s3.putObject({
    Bucket: siteConfig.blogId, // TODO use a key in the config for this
    Key: filePath,
    Body: body,
    ContentType: mime.contentType(path.basename(filePath)),
    ACL: 'public-read'
  }).promise();
}
