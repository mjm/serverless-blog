import * as querystring from "querystring";
import { APIGatewayProxyEvent } from "aws-lambda";

export type MicropubInput = MicropubCreateInput | MicropubUpdateInput | MicropubDeleteInput;

export interface MicropubCreateInput {
  action: "create";

  type: string;
  name?: string;
  content?: string;
  published?: string;
}

export interface MicropubUpdateInput {
  action: "update";
}

export interface MicropubDeleteInput {
  action: "delete";
}

export function fromEvent(event: APIGatewayProxyEvent): MicropubInput {
  const contentType = event.headers['content-type'] || '';

  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    let parsedQs = querystring.parse(event.body) as any;
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
        type
      };

      const props = parsedJson.properties;
      if (props.name) {
        input.name = props.name[0];
      }
      if (props.content) {
        input.content = props.content[0];
      }
      if (props.published) {
        input.published = props.published[0];
      }
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

