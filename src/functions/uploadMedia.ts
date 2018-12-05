import { APIGatewayProxyHandler } from "aws-lambda";
import * as S3 from "aws-sdk/clients/s3";
import Busboy from "busboy";
import uuid from "uuid/v4";

import * as headers from "../util/headers";
import * as mp from "../micropub";

const s3 = new S3();

export const handle: APIGatewayProxyHandler = async (event, context) => {
  headers.normalize(event.headers);
  const blogId = mp.identify(event.requestContext.authorizer.principalId);
  console.log('got micropub request for', blogId);

  const uploadedFile = await upload(blogId, event);

  const url = `https://${blogId}/${uploadedFile}`;
  return {
    statusCode: 201,
    headers: {
      Location: url
    },
    body: ""
  }
};

async function upload(blogId: string, event): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const busboy = new Busboy({ headers: event.headers });
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const key = `media/${uuid()}/${filename}`;
      let buffers: Buffer[] = [];
      console.log('Uploading object to', key);

      file.on('data', chunk => buffers.push(chunk));
      file.on('end', () => {
        const buffer = Buffer.concat(buffers);

        s3.putObject({
          Bucket: blogId,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          ACL: 'public-read'
        }, (err, result) => {
          console.log('Done putting object in S3, error?', err);
          if (err) {
            reject(err);
          } else {
            resolve(key);
          }
        });
      });
    });
    busboy.on('finish', () => {
      console.log('Done uploading');
    });
    busboy.write(event.body, event.isBase64Encoded ? 'base64' : 'binary');
    busboy.end();
  });
}
