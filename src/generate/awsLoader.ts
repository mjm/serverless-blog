import * as S3 from "aws-sdk/clients/s3";
import * as nunjucks from "nunjucks";

const s3 = new S3();

interface Options {
  bucket: string;
}

export class AWSLoader implements nunjucks.ILoader {
  opts: Options;
  async: boolean;

  constructor(opts: Options) {
    this.opts = opts;
    this.async = true;
  }

  getSource(name: string): nunjucks.LoaderSource;
  getSource(name: string, callback: (err?: any, result?: nunjucks.LoaderSource) => void): void;

  getSource(name: string, cb?: (err?: any, result?: nunjucks.LoaderSource) => void): void | nunjucks.LoaderSource {
    s3.getObject({
      Bucket: this.opts.bucket,
      Key: `_templates/${name}`
    }, (err, result) => {
      if (err) {
        cb(err);
      } else {
        const src = result.Body.toString();
        const res = {
          src,
          path: name,
          noCache: false
        }
        cb(null, res);
      }
    });
  }
}
