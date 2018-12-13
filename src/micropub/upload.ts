import S3 from "aws-sdk/clients/s3";
import { format } from "date-fns";
import * as mime from "mime-types";
import uuid from "uuid/v4";

export default class Uploader {
  readonly bucket: string;
  client: S3;
  private readonly prefix: string;
  private uploads: Map<string, Promise<string>[]>;

  constructor(bucket: string) {
    this.bucket = bucket;
    this.client = new S3();
    this.prefix = `media/${format(new Date(), 'YYYY/MM')}`;
    this.uploads = new Map();
  }

  upload(field: string, body: Buffer, mimetype: string) {
    const ext = mimetype ? '.' + mime.extension(mimetype) : '';
    const key = `${this.prefix}/${uuid()}${ext}`;

    console.log('Uploading file to', key);

    const url = this.doUpload(body, key, mimetype);
    this.saveUrl(field, url);
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

  private saveUrl(field: string, url: Promise<string>) {
    let urls = this.uploads.get(field);
    if (!urls) {
      urls = [];
      this.uploads.set(field, urls);
    }
    urls.push(url);
  }

  async uploadedUrls(): Promise<{[key: string]: string[]}> {
    let result = {};

    for (const [field, urlPromises] of this.uploads) {
      result[field] = await Promise.all(urlPromises);
    }

    return result;
  }
}
