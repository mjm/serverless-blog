import * as httpError from "http-errors";
import middy from "middy";
import * as mw from "middy/middlewares";

import { errorHandler, formDataParser } from "../middlewares";
import Post from "../model/post";
import { queue, webmentionQueueUrl as queueUrl } from "../model/queue";
import * as recv from "../webmention/receive";

export const receive = middy(async (event, context) => {
  const { source, target } = event.body;
  await recv.enqueue(source, target);

  return {
    statusCode: 202,
    body: ""
  };
});

receive
  .use(errorHandler())
  .use(formDataParser());

export async function handleEvent(event, context): Promise<void> {
  await Promise.all(event.Records.map(handleMessage));
}

async function handleMessage(message): Promise<void> {
  const { body, messageAttributes } = message;
  const parsedBody = JSON.parse(body);
  const eventType = messageAttributes.eventType.stringValue;

  const fn = eventHandlers[eventType];
  await fn(parsedBody);
}

const eventHandlers = {
  receive: recv.handleEvent
};
