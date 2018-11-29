import * as S3 from "aws-sdk/clients/s3";

import * as site from "./model/site";

const s3 = new S3();

const indexHtml: string = "<!DOCTYPE html><html><head><title>BLOG_TITLE</title></head><body><h1>BLOG_TITLE</h1><p>This is where my content will go.</p></body></html>";

export default async function generate(blogId: string): Promise<void> {
  const siteConfig = await site.getConfig(blogId);

  const body = indexHtml.replace(/BLOG_TITLE/g, siteConfig.title);

  await s3.putObject({
    Bucket: blogId, // TODO use a key in the config for this
    Key: 'index.html',
    Body: body,
    ContentType: 'text/html',
    ACL: 'public-read'
  }).promise();
}
