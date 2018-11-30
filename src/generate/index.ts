import * as S3 from "aws-sdk/clients/s3";
import * as nunjucks from "nunjucks";
import * as marked from "marked";

import * as site from "../model/site";
import * as post from "../model/post";
import embedTweets from "./embedTweets";
import { AWSLoader } from "./awsLoader";

const s3 = new S3();

export default async function generate(blogId: string): Promise<void> {
  const siteConfig = await site.getConfig(blogId);
  const posts = await post.recent(blogId);

  // render the content of all posts before rendering templates
  await Promise.all(posts.map(p => renderPostContent(p)));

  const r = createRenderer(siteConfig);

  const body = await r('index.html', {
    site: siteConfig,
    posts
  });

  console.log('publishing index.html');
  await publish(siteConfig, 'index.html', body);

  const publishPosts = posts.map(p => generatePost(r, siteConfig, p));
  await Promise.all(publishPosts);
}

type Renderer = (name: string, context: any) => Promise<string>;

function createRenderer(siteConfig: site.Config): Renderer {
  const loader = new AWSLoader({ bucket: siteConfig.blogId });
  const env = new nunjucks.Environment(loader, { autoescape: true });
  env.addFilter('permalink', generatePermalink);

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

async function renderPostContent(p: post.Post): Promise<void> {
  const embedded = await embedTweets(p.content);
  p.renderedContent = marked(embedded);
}

async function generatePost(r: Renderer, siteConfig: site.Config, p: post.Post): Promise<void> {
  const body = await r('post.html', {
    site: siteConfig,
    post: p
  });

  // transform /foo/bar/ to foo/bar/index.html
  const pagePath = `${generatePermalink(p).substring(1)}index.html`;

  console.log(`publishing ${p.path} to ${pagePath}`);
  await publish(siteConfig, pagePath, body);
}

async function publish(siteConfig: site.Config, path: string, body: string): Promise<void> {
  await s3.putObject({
    Bucket: siteConfig.blogId, // TODO use a key in the config for this
    Key: path,
    Body: body,
    ContentType: 'text/html',
    ACL: 'public-read'
  }).promise();
}

function generatePermalink(p: post.Post): string {
  return '/' + p.path.replace(/^posts\//, '') + '/';
}
