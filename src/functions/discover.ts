import { Context } from "aws-lambda";
import * as httpError from "http-errors";
import middy from "middy";
import * as mw from "middy/middlewares";

import { errorHandler, honeycomb } from "../middlewares";
import * as mf from "../util/microformats";

export const handle = middy(async (event: any, context: Context) => {
  const { url } = event.body;
  const data = await mf.parse(url);

  return {
    body: JSON.stringify(data),
    statusCode: 200,
  };
});

handle
  .use(honeycomb())
  .use(errorHandler())
  .use(mw.cors())
  .use(mw.jsonBodyParser());
