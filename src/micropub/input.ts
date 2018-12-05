import * as querystring from "querystring";
import { APIGatewayProxyEvent } from "aws-lambda";

export type MicropubInput = MicropubCreateInput | MicropubUpdateInput | MicropubDeleteInput;

export interface MicropubCreateInput {
  action: "create";

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

export function fromEvent(event: APIGatewayProxyEvent): MicropubInput {
  const contentType = event.headers['content-type'] || '';
  console.log('input has content type', contentType);

  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    let parsedQs = querystring.parse(event.body) as any;
    console.log('Got query string input:', parsedQs);
    const type = parsedQs.h;
    delete parsedQs.h;

    // url encoded requests are always creates
    return {...parsedQs, type, action: "create"};
  } else if (contentType.startsWith('application/json')) {
    const parsedJson = JSON.parse(event.body);
    console.log('Got JSON for Micropub:', parsedJson);
    if ('type' in parsedJson) {
      console.log('Found type key in JSON, treating as a create');
      const type = parsedJson.type[0].replace(/^h-/, '');
      let input: MicropubCreateInput = {
        action: "create",
        ...parsedJson.properties,
        type
      };

      // we only expect a single value for these keys
      singularize(input, [
        'name',
        'content',
        'published'
      ]);

      return input;
    } else if (parsedJson.action === 'update') {
      // TODO
      return parsedJson as MicropubUpdateInput;
    } else if (parsedJson.action === 'delete') {
      // TODO
      return parsedJson as MicropubDeleteInput;
    }
  }

  return null;
}

function singularize(input: MicropubCreateInput, keys: string[]) {
  for (let key of keys) {
    if (key in input) {
      input[key] = input[key][0];
    }
  }
}
