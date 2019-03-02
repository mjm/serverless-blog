import S3 from "aws-sdk/clients/s3";
import { format } from "date-fns";
import * as mime from "mime-types";
import uuid from "uuid/v4";

export default class Uploader {
  public readonly bucket: string;
  public client: S3;
  private readonly prefix: string;
  private uploads: Map<string, Array<Promise<string>>>;

  constructor(bucket: string) {
    this.bucket = bucket;
    this.client = new S3();
    this.prefix = `media/${format(new Date(), "YYYY/MM")}`;
    this.uploads = new Map();
  }

  public upload(field: string, body: Buffer, mimetype: string) {
    const ext = mimetype ? "." + mime.extension(mimetype) : "";
    const key = `${this.prefix}/${uuid()}${ext}`;

    console.log("Uploading file to", key);

    const url = this.doUpload(body, key, mimetype);
    this.saveUrl(field, url);
  }

  public async uploadedUrls(): Promise<{[key: string]: string[]}> {
    const result: {[key: string]: string[]} = {};

    for (const [field, urlPromises] of this.uploads) {
      result[field] = await Promise.all(urlPromises);
    }

    return result;
  }

  private async doUpload(body: Buffer, key: string, mimetype: string): Promise<string> {
    await this.client.putObject({
      ACL: "public-read",
      Body: body,
      Bucket: this.bucket,
      ContentType: mimetype,
      Key: key,
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
}
