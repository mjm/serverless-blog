import * as httpError from "http-errors";
import middy from "middy";
import * as mw from "middy/middlewares";

import { errorHandler } from "../middlewares";
import * as mf from "../util/microformats";

export const handle = middy(async (event, context) => {
  const { url } = event.body;
  const data = await mf.parse(url);

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
});

handle
  .use(errorHandler())
  .use(mw.cors())
  .use(mw.jsonBodyParser());
