import { Context } from "aws-lambda";
import * as httpError from "http-errors";
import middy from "middy";
import * as mw from "middy/middlewares";

import Page from "../model/page";
import { authorizer, errorHandler, honeycomb } from "../middlewares";

export const all = middy(async (event: any, context: Context) => {
  const pages = await Page.all(event.blogId);
  event.honey.addField("page.count", pages.length);

  return {
    statusCode: 200,
    body: JSON.stringify(pages)
  };
});

all
  .use(honeycomb())
  .use(errorHandler())
  .use(mw.cors())
  .use(authorizer());

export const get = middy(async (event: any, context: Context) => {
  const path = decodeURIComponent(event.pathParameters.path);
  event.honey.addField("page.query_path", path);

  const page = await Page.get(event.blogId, path);
  event.honey.addField("page.path", page.path);

  return {
    statusCode: 200,
    body: JSON.stringify(page)
  }
});

get
  .use(honeycomb())
  .use(errorHandler())
  .use(mw.cors())
  .use(authorizer());

export const update = middy(async (event: any, context: Context) => {
  let path = decodeURIComponent(event.pathParameters.path);
  event.honey.addField("page.query_path", path);

  let page = await Page.get(event.blogId, path);

  if (page) {
    event.honey.add({
      "page.path": page.path,
      "page.action": "update"
    });

    page.name = event.body.name;
    page.content = event.body.content;
  } else {
    if (!path.startsWith('pages/')) {
      path = `pages/${path}`;
    }

    event.honey.add({
      "page.path": path,
      "page.action": "create"
    });

    page = Page.make({
      blogId: event.blogId,
      path,
      name: event.body.name,
      content: event.body.content
    });
  }

  await page.save();

  return {
    statusCode: 204,
    body: ""
  };
});

update
  .use(honeycomb())
  .use(errorHandler())
  .use(mw.cors())
  .use(authorizer())
  .use(mw.jsonBodyParser());

export const remove = middy(async (event: any, context: Context) => {
  const path = decodeURIComponent(event.pathParameters.path);
  event.honey.addField("page.query_path", path);

  await Page.deleteByPath(event.blogId, path);

  return {
    statusCode: 204,
    body: ""
  };
});

remove
  .use(honeycomb())
  .use(errorHandler())
  .use(mw.cors())
  .use(authorizer());
