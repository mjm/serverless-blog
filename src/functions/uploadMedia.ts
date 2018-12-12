import { APIGatewayProxyHandler } from "aws-lambda";
import * as S3 from "aws-sdk/clients/s3";
import Busboy from "busboy";
import * as middy from "middy";
import * as mw from "middy/middlewares";

import * as headers from "../util/headers";
import * as scope from "../util/scope";
import * as mp from "../micropub";
import Uploader from "../micropub/upload";

const s3 = new S3();

export const handle = middy(async (event, context) => {
  headers.normalize(event.headers);
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

handle.use(mw.cors());

async function upload(blogId: string, event): Promise<string[]> {
  const uploader = new Uploader(blogId);

  // wait for the form data to be processed
  await new Promise<void>((resolve, reject) => {
    const busboy = new Busboy({ headers: event.headers });
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      uploader.upload(file, mimetype);
    });
    busboy.on('finish', () => {
      console.log('Done uploading');
      resolve();
    });
    busboy.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
    busboy.end();
  });

  // then wait for the S3 uploads to complete
  return uploader.uploadedUrls();
}
