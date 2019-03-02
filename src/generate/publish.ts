import * as path from "path";

import S3 from "aws-sdk/clients/s3";
import beeline from "honeycomb-beeline";
import * as mime from "mime-types";

import { Config } from "../model/site";

const s3 = new S3();

export default async function publish(siteConfig: Config, filePath: string, body: string): Promise<void> {
  const span = beeline.startSpan({
    "name": "publish file",
    "site.blog_id": siteConfig.blogId,
    "publish.key": filePath,
    "publish.byte_count": Buffer.byteLength(body),
  });

  await s3.putObject({
    ACL: "public-read",
    Body: body,
    Bucket: siteConfig.blogId, // TODO use a key in the config for this
    ContentType: mime.contentType(path.basename(filePath)) || undefined,
    Key: filePath,
  }).promise();

  beeline.finishSpan(span);
}
