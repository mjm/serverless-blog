import * as querystring from "querystring";
import { APIGatewayProxyEvent } from "aws-lambda";

export type MicropubInput = MicropubCreateInput | MicropubUpdateInput | MicropubDeleteInput;

export interface MicropubCreateInput {
  action: "create";

  h: string;
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
  const contentType = event.headers['Content-Type'];

  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    const parsedQs = querystring.parse(event.body) as any;
    // url encoded requests are always creates
    return {...parsedQs, action: "create"};
  } else if (contentType.startsWith('application/json')) {
    const parsedJson = JSON.parse(event.body);
    if ('h' in parsedJson) {
      let input: MicropubCreateInput = {
        action: "create",
        h: parsedJson.h
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

