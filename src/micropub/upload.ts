import { Readable } from "stream";

import * as S3 from "aws-sdk/clients/s3";
import { format } from "date-fns";
import * as mime from "mime-types";
import uuid from "uuid/v4";

export default class Uploader {
  readonly bucket: string;
  client: S3;
  private readonly prefix: string;
  private uploads: Promise<string>[];

  constructor(bucket: string) {
    this.bucket = bucket;
    this.client = new S3();
    this.prefix = `media/${format(new Date(), 'YYYY/MM')}`;
    this.uploads = [];
  }

  upload(file: Readable, mimetype: string) {
    const ext = mimetype ? '.' + mime.extension(mimetype) : '';
    const key = `${this.prefix}/${uuid()}${ext}`;

    let buffers: Buffer[] = [];
    console.log('Uploading file to', key);

    file.on('data', chunk => {
      if (typeof chunk === 'string') {
        buffers.push(Buffer.from(chunk));
      } else {
        buffers.push(chunk)
      }
    });

    file.on('end', () => {
      const url = this.doUpload(Buffer.concat(buffers), key, mimetype);
      this.uploads.push(url);
    });
  }

  private async doUpload(body: Buffer, key: string, mimetype: string): Promise<string> {
    await this.client.putObject({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: mimetype,
      ACL: 'public-read'
    }).promise();

    return `https://${this.bucket}/${key}`;
  }

  uploadedUrls(): Promise<string[]> {
    return Promise.all(this.uploads);
  }
}
