import Busboy from "busboy";
import * as querystring from "querystring";
import { APIGatewayProxyEvent } from "aws-lambda";

import Post from "../model/post";
import Uploader from "../micropub/upload";

export type MicropubInput = MicropubCreateInput | MicropubUpdateInput | MicropubDeleteInput;

export interface MicropubCreateInput {
  action: "create";

  "mp-slug"?: string;
  type: string;
  name?: string;
  content?: string;
  published?: string;

  [propName: string]: any;
}

export type PropertyMap = {[key: string]: any[]};

export interface MicropubUpdateInput {
  action: "update";

  url: string;
  replace?: PropertyMap;
  add?: PropertyMap;
  delete?: string[] | PropertyMap;
}

export interface MicropubDeleteInput {
  action: "delete";

  url: string;
}

export async function fromEvent(blogId: string, event: APIGatewayProxyEvent): Promise<MicropubInput> {
  const contentType = event.headers['content-type'] || '';

  if (contentType.startsWith('application/x-www-form-urlencoded')
      || contentType.startsWith('multipart/form-data')) {
    return await handleFormRequest(blogId, event);
  } else if (contentType.startsWith('application/json')) {
    return handleJsonRequest(event.body);
  }

  console.log('input has unexpected content type', contentType);
  return null;
}

async function handleFormRequest(blogId: string, event: APIGatewayProxyEvent): Promise<MicropubInput> {
  let input: MicropubCreateInput = {
    action: "create",
    type: null
  };

  const uploader = new Uploader(blogId);

  await new Promise<void>((resolve, reject) => {
    const busboy = new Busboy({ headers: event.headers });

    busboy.on('field', (field, value) => {
      console.log('Got form field', field, value);
      if (field === 'h') {
        input.type = value;
      } else if (field.endsWith('[]')) {
        const key = field.slice(0, -2);
        if (input[key]) {
          input[key].push(value);
        } else {
          input[key] = [value];
        }
      } else {
        input[field] = value;
      }
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log('Got file upload', fieldname, filename);
      if (fieldname != 'photo' && fieldname != 'photo[]') {
        file.resume();
        reject(new Error(`file uploads for "${fieldname}" property are not supported`));
      } else {
        uploader.upload(file, mimetype);
      }
    });

    busboy.on('finish', () => {
      console.log('Done processing form');
      resolve();
    });

    busboy.write(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    busboy.end();
  });

  const urls = await uploader.uploadedUrls();
  if (urls.length > 0) {
    input.photo = urls;
  }

  console.log('Got input from multipart request', input);
  return input;
}

function handleJsonRequest(body: string): MicropubInput {
  const parsedJson = JSON.parse(body);
  console.log('Got JSON for Micropub:', parsedJson);
  if ('type' in parsedJson) {
    console.log('Found type key in JSON, treating as a create');
    const type = parsedJson.type[0].replace(/^h-/, '');
    let input: MicropubCreateInput = {
      action: "create",
      ...parsedJson.properties,
      type
    };

    // we only expect a single value for some
    singularize(input, Post.singularKeys);

    return input;
  } else if (parsedJson.action === 'update') {
    return parsedJson as MicropubUpdateInput;
  } else if (parsedJson.action === 'delete') {
    return parsedJson as MicropubDeleteInput;
  }
}

function singularize(input: MicropubCreateInput, keys: string[]) {
  for (let key of keys) {
    if (key in input) {
      input[key] = input[key][0];
    }
  }
}
