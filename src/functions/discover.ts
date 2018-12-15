import fetch from "node-fetch";
import * as httpError from "http-errors";
import middy from "middy";
import * as mw from "middy/middlewares";
import Microformats from "microformat-node";

import { errorHandler } from "../middlewares";

export const handle = middy(async (event, context) => {
  const { url } = event.body;

  const resp = await fetch(url);
  const html = await resp.text();

  const data = await Microformats.getAsync({
    html,
    baseUrl: url,
    textFormat: 'normalised'
  });

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
});

handle
  .use(errorHandler())
  .use(mw.cors())
  .use(mw.jsonBodyParser());
