import { Context, CustomAuthorizerHandler } from "aws-lambda";
import beeline from "honeycomb-beeline";
import * as httpError from "http-errors";
import middy from "middy";
import * as mw from "middy/middlewares";
import fetch from "node-fetch";

import * as mp from "../micropub";
import { authorizer, errorHandler, formDataParser, honeycomb } from "../middlewares";
import Post from "../model/post";

export const get = middy(async (event: any, context: Context) => {
  console.log("got micropub request for", event.blogId);

  const q = event.queryStringParameters.q;
  beeline.addContext({ "micropub.q": q });

  if (q === "config") {
    return {
      statusCode: 200,
      body: JSON.stringify(mp.config(event)),
    };
  } else if (q === "debug") {
    return {
      statusCode: 200,
      body: JSON.stringify(event),
    };
  } else if (q === "source") {
    const url = event.queryStringParameters.url;
    beeline.addContext({ "micropub.url": url });

    const result = await mp.source(url);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  }

  throw new httpError.BadRequest(`Unrecognized Micropub query '${q}'`);
});

get
  .use(honeycomb())
  .use(errorHandler())
  .use(mw.httpHeaderNormalizer())
  .use(mw.cors())
  .use(authorizer());

export const post = middy(async (event: any, context: Context) => {
  console.log("got micropub request for", event.blogId);

  const input = await mp.input.fromEvent(event);
  beeline.addContext({ "micropub.action": input.action });

  event.scopes.require(input.action);

  if (input.action === "create") {
    console.log("creating post from micropub input:", input);
    beeline.addContext({ "micropub.type": input.type });

    const p = await mp.create(event.blogId, input);

    const loc = `https://${event.blogId}${p.permalink}`;
    beeline.addContext({ "micropub.url": loc });

    return {
      statusCode: 201,
      headers: {
        "Location": loc,
        "Access-Control-Expose-Headers": "Location",
      },
      body: "",
    };
  } else if (input.action === "update") {
    console.log("updating post from micropub input:", input);
    beeline.addContext({ "micropub.url": input.url });

    await mp.update(event.blogId, input);

    return {
      statusCode: 204,
      body: "",
    };
  } else if (input.action === "delete") {
    console.log("deleting post from micropub input:", input);
    beeline.addContext({ "micropub.url": input.url });

    await mp.delete(event.blogId, input);

    return {
      statusCode: 204,
      body: "",
    };
  }

  throw new httpError.BadRequest("Could not understand Micropub request");
});

post
  .use(honeycomb())
  .use(errorHandler())
  .use(mw.httpHeaderNormalizer())
  .use(mw.cors())
  .use(authorizer())
  .use(mw.jsonBodyParser())
  .use(formDataParser());

export const verify = middy(async (event: any, context: any) => {
  let token = event.authorizationToken || "";
  const methodArn = event.methodArn;

  console.log("Got auth token", token);

  try {
    if (!token.startsWith("Bearer ")) {
      throw new Error('Token header is not prefixed with "Bearer "');
    }

    // Strip Bearer prefix
    token = token.substring(7);

    const { me, scope } = mp.auth.verifyToken(token);
    beeline.addContext({
      "request.principal": me,
      "request.scope": scope,
    });

    console.log("allowing access for", me, "with scopes:", scope);

    return {
      principalId: me,
      context: {
        scope,
      },
      policyDocument: mp.auth.createPolicy(true, methodArn),
    };
  } catch (err) {
    console.error("could not verify token", err);
    return {
      principalId: "unknown",
      policyDocument: mp.auth.createPolicy(false, methodArn),
    };
  }
});

verify
  .use(honeycomb());
