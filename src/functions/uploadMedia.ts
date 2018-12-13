import * as httpError from "http-errors";
import * as middy from "middy";
import * as mw from "middy/middlewares";

import Uploader from "../micropub/upload";
import { authorizer, errorHandler, formDataParser } from "../middlewares";

export const handle = middy(async (event, context) => {
  console.log('got micropub request for', event.blogId);
  event.scopes.require('create', 'media');

  const urls = await upload(event);

  return {
    statusCode: 201,
    headers: {
      Location: urls[0]
    },
    body: ""
  }
});

handle
  .use(errorHandler())
  .use(mw.httpHeaderNormalizer())
  .use(mw.cors())
  .use(authorizer())
  .use(formDataParser());

async function upload(event): Promise<string[]> {
  if (event.uploadedFiles.length !== 1) {
    throw new httpError.BadRequest(`Unexpected number of files in request: expected 1, got ${event.uploadedFiles.length}`);
  }

  const uploader = new Uploader(event.blogId);
  const { field, body, mimetype } = event.uploadedFiles[0]
  if (field !== 'file') {
    throw new httpError.BadRequest(`Unexpected field name '${field}'. Field name should be 'file'.`);
  }

  uploader.upload(field, body, mimetype);

  const urls = await uploader.uploadedUrls();
  return urls.file;
}
