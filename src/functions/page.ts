import * as httpError from "http-errors";
import middy from "middy";
import * as mw from "middy/middlewares";

import Page from "../model/page";
import { authorizer, errorHandler } from "../middlewares";

export const all = middy(async (event, context) => {
  const pages = await Page.all(event.blogId);

  return {
    statusCode: 200,
    body: JSON.stringify(pages)
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
    body: JSON.stringify(page)
  }
});

get
  .use(errorHandler())
  .use(mw.cors())
  .use(authorizer());

export const update = middy(async (event, context) => {
  const path = decodeURIComponent(event.pathParameters.path);
  const page = await Page.get(event.blogId, path);
  if (!page) {
    throw new httpError.NotFound(`No page found with path '${path}'`);
  }

  page.name = event.body.name;
  page.content = event.body.content;

  await page.save();

  return {
    statusCode: 204,
    body: ""
  };
});

update
  .use(errorHandler())
  .use(mw.cors())
  .use(authorizer())
  .use(mw.jsonBodyParser());
