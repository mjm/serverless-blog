import * as middy from "middy";
import * as mw from "middy/middlewares";

import * as scope from "../util/scope";
import Uploader from "../micropub/upload";
import { authorizer, formDataParser } from "../middlewares";

export const handle = middy(async (event, context) => {
  console.log('got micropub request for', event.blogId);

  const scopeCheck = scope.check(event, ['create', 'media']);
  if (scopeCheck) {
    return scopeCheck;
  }

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
  .use(mw.httpHeaderNormalizer())
  .use(mw.cors())
  .use(authorizer())
  .use(formDataParser());

async function upload(event): Promise<string[]> {
  const uploader = new Uploader(event.blogId);
  for (const { field, body, mimetype } of event.uploadedFiles) {
    // TODO blow up if there's more than one or if field != 'file'
    uploader.upload(field, body, mimetype);
  }

  const urls = await uploader.uploadedUrls();
  return urls.file;
}
