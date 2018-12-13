import * as path from "path";

import * as mime from "mime-types";
import S3 from "aws-sdk/clients/s3";

import { Config } from "../model/site";

const s3 = new S3();

export default async function publish(siteConfig: Config, filePath: string, body: string): Promise<void> {
  await s3.putObject({
    Bucket: siteConfig.blogId, // TODO use a key in the config for this
    Key: filePath,
    Body: body,
    ContentType: mime.contentType(path.basename(filePath)),
    ACL: 'public-read'
  }).promise();
}
