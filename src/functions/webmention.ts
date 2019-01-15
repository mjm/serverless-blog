import { Context } from "aws-lambda";
import middy from "middy";
import * as mw from "middy/middlewares";

import { errorHandler, formDataParser } from "../middlewares";
import * as recv from "../webmention/receive";

export const receive = middy(async (event: any, context: Context) => {
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
