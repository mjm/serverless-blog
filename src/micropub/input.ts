import * as httpError from "http-errors";

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

export async function fromEvent(event): Promise<MicropubInput> {
  if (typeof event.body === 'string') {
    throw new httpError.BadRequest(`Unexpected content type: ${event.headers['Content-Type']}`);
  }

  if ('h' in event.body) {
    return await handleFormRequest(event);
  } else {
    return handleJsonRequest(event.body);
  }
}

async function handleFormRequest(event): Promise<MicropubInput> {
  let input: MicropubCreateInput = {
    action: "create",
    type: null
  };

  for (const prop of Object.keys(event.body)) {
    const val = event.body[prop];
    if (prop === 'h') {
      input.type = val;
    } else {
      input[prop] = val;
    }
  }

  // Upload any files found in the form input
  const uploader = new Uploader(event.blogId);
  for (const { field, body, mimetype } of event.uploadedFiles) {
    uploader.upload(field, body, mimetype);
  }

  const urls = await uploader.uploadedUrls();
  input = {...input, ...urls};

  console.log('Got input from multipart request', input);
  return input;
}

function handleJsonRequest(body: any): MicropubInput {
  console.log('Got JSON for Micropub:', body);
  if ('type' in body) {
    console.log('Found type key in JSON, treating as a create');
    const type = body.type[0].replace(/^h-/, '');
    let input: MicropubCreateInput = {
      action: "create",
      ...body.properties,
      type
    };

    // we only expect a single value for some
    singularize(input, Post.singularKeys);

    return input;
  } else if (body.action === 'update') {
    return body as MicropubUpdateInput;
  } else if (body.action === 'delete') {
    return body as MicropubDeleteInput;
  }

  throw new httpError.BadRequest('Could not understand Micropub JSON request');
}

function singularize(input: MicropubCreateInput, keys: string[]) {
  for (let key of keys) {
    if (key in input) {
      input[key] = input[key][0];
    }
  }
}
