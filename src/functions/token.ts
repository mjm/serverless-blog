import { Context } from "aws-lambda";
import * as httpError from "http-errors";
import middy from "middy";
import * as mw from "middy/middlewares";
import fetch from "node-fetch";
import * as qs from "querystring";

import { createToken } from "../micropub/auth";
import { errorHandler, formDataParser, honeycomb } from "../middlewares";

export const create = middy(async (event: any, context: Context) => {
  const { code, me, client_id, redirect_uri } = event.body;
  // TODO this should be discovered from the `me` site
  const authUrl = "https://indieauth.com/auth";

  const resp = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: qs.stringify({ code, me, client_id, redirect_uri }),
  });
  const body = await resp.json();
  if (!resp.ok) {
    throw new httpError.Unauthorized(body.error_description);
  }

  const token = createToken(body.me, body.scope);
  return {
    statusCode: 200,
    body: JSON.stringify({
      me: body.me,
      scope: body.scope,
      access_token: token,
      token_type: "Bearer",
    }),
  };
});

create
  .use(honeycomb())
  .use(errorHandler())
  .use(mw.httpHeaderNormalizer())
  .use(mw.cors())
  .use(formDataParser());
