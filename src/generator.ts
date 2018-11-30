import * as S3 from "aws-sdk/clients/s3";
import * as nunjucks from "nunjucks";

import * as site from "./model/site";

const s3 = new S3();

nunjucks.configure({ autoescaping: true });

const indexTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>{{ site.title }}</title>
</head>
<body>
  <h1>{{ site.title }}</h1>
  <p>This site was compiled with a Nunjucks template!</p>
</body>
</html>
`

export default async function generate(blogId: string): Promise<void> {
  const siteConfig = await site.getConfig(blogId);

  const body = nunjucks.renderString(indexTemplate, { site: siteConfig });

  await s3.putObject({
    Bucket: blogId, // TODO use a key in the config for this
    Key: 'index.html',
    Body: body,
    ContentType: 'text/html',
    ACL: 'public-read'
  }).promise();
}
