import * as S3 from "aws-sdk/clients/s3";
import * as nunjucks from "nunjucks";

import * as site from "./model/site";
import * as post from "./model/post";

const s3 = new S3();

const templateEnv = new nunjucks.Environment(null, { autoescape: true });
templateEnv.addFilter('permalink', generatePermalink);

const indexTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>{{ site.title }}</title>
  <link href="https://fonts.googleapis.com/css?family=Roboto|Roboto+Condensed" rel="stylesheet">
  <link href="/site.css" rel="stylesheet">
</head>
<body>
  <header>
    <h1>{{ site.title }}</h1>
  </header>
  <hr>

  {% for post in posts %}
    <article>
      <h2>{{ post.title }}</h2>
      <p>{{ post.content }}</p>
      <a href="{{ post | permalink }}">View Post</a>
    </article>
  {% else %}
    <p>No posts have been written!</p>
  {% endfor %}
</body>
</html>
`

const postTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>{{ site.title }}</title>
  <link href="https://fonts.googleapis.com/css?family=Roboto|Roboto+Condensed" rel="stylesheet">
  <link href="/site.css" rel="stylesheet">
</head>
<body>
  <header>
    <h1>{{ site.title }}</h1>
  </header>
  <hr>

  <article>
    {% if post.title %}
      <h2>{{ post.title }}</h2>
    {% endif %}
    <p>{{ post.content }}</p>
  </article>
</body>
</html>
`

export default async function generate(blogId: string): Promise<void> {
  const siteConfig = await site.getConfig(blogId);
  const posts = await post.recent(blogId);

  const body = templateEnv.renderString(indexTemplate, {
    site: siteConfig,
    posts
  });

  console.log('publishing index.html');
  await publish(siteConfig, 'index.html', body);

  const publishPosts = posts.map(p => generatePost(siteConfig, p));
  await Promise.all(publishPosts);
}

async function generatePost(siteConfig: site.Config, p: post.Post): Promise<void> {
  const body = templateEnv.renderString(postTemplate, {
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
