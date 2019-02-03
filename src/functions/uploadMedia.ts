import { Context } from "aws-lambda";
import beeline from "honeycomb-beeline";
import * as httpError from "http-errors";
import middy from "middy";
import * as mw from "middy/middlewares";

import Uploader from "../micropub/upload";
import { authorizer, errorHandler, formDataParser, honeycomb } from "../middlewares";

export const handle = middy(async (event: any, context: Context) => {
  console.log('got micropub request for', event.blogId);
  event.scopes.require('create', 'media');

  const urls = await upload(event);
  beeline.addContext({ "upload.url": urls[0] });

  return {
    statusCode: 201,
    headers: {
      Location: urls[0],
      'Access-Control-Expose-Headers': 'Location'
    },
    body: ""
  }
});

handle
  .use(honeycomb())
  .use(errorHandler())
  .use(mw.httpHeaderNormalizer())
  .use(mw.cors())
  .use(authorizer())
  .use(formDataParser());

async function upload(event: any): Promise<string[]> {
  if (event.uploadedFiles.length !== 1) {
    throw new httpError.BadRequest(`Unexpected number of files in request: expected 1, got ${event.uploadedFiles.length}`);
  }

  const uploader = new Uploader(event.blogId);
  const { field, body, mimetype } = event.uploadedFiles[0]
  beeline.addContext({
    "upload.content_type": mimetype,
    "upload.byte_count": Buffer.byteLength(body)
  });

  if (field !== 'file') {
    throw new httpError.BadRequest(`Unexpected field name '${field}'. Field name should be 'file'.`);
  }

  uploader.upload(field, body, mimetype);

  const urls = await uploader.uploadedUrls();
  return urls.file;
}
