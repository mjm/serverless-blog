import * as middy from "middy";
import * as mw from "middy/middlewares";

import * as scope from "../util/scope";
import * as mp from "../micropub";
import Uploader from "../micropub/upload";
import { formDataParser } from "../middlewares";

export const handle = middy(async (event, context) => {
  const blogId = mp.identify(event.requestContext.authorizer.principalId);
  console.log('got micropub request for', blogId);

  const scopeCheck = scope.check(event, ['create', 'media']);
  if (scopeCheck) {
    return scopeCheck;
  }

  const urls = await upload(blogId, event);

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
  .use(formDataParser());

async function upload(blogId: string, event): Promise<string[]> {
  const uploader = new Uploader(blogId);
  for (const { field, body, mimetype } of event.uploadedFiles) {
    // TODO blow up if there's more than one or if field != 'file'
    uploader.upload(field, body, mimetype);
  }

  const urls = await uploader.uploadedUrls();
  return urls.file;
}
