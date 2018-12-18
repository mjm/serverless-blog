import * as httpError from "http-errors";
import middy from "middy";
import * as mw from "middy/middlewares";

import Page from "../model/page";
import { authorizer, errorHandler } from "../middlewares";

export const all = middy(async (event, context) => {
  const pages = await Page.all(event.blogId);

  const data = pages.map(p => p.data);
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
});

all
  .use(errorHandler())
  .use(mw.cors())
  .use(authorizer());

export const get = middy(async (event, context) => {
  const path = decodeURIComponent(event.pathParameters.path);
  const page = await Page.get(event.blogId, path);
  if (!page) {
    throw new httpError.NotFound(`No page found with path '${path}'`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(page.data)
  }
});

get
  .use(errorHandler())
  .use(mw.cors())
  .use(authorizer());
