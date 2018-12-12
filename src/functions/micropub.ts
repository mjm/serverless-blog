import { CustomAuthorizerHandler } from "aws-lambda";
import * as middy from "middy";
import * as mw from "middy/middlewares";
import fetch from "node-fetch";

import * as mp from "../micropub";
import Post from "../model/post";
import { authorizer, formDataParser } from "../middlewares";
import * as scope from "../util/scope";

export const get = middy(async (event, context) => {
  console.log('got micropub request for', event.blogId);

  const q = event.queryStringParameters.q;

  if (q === "config") {
    return {
      statusCode: 200,
      body: JSON.stringify(mp.config(event))
    };
  } else if (q === "debug") {
    return {
      statusCode: 200,
      body: JSON.stringify(event)
    };
  } else if (q === "source") {
    const url = event.queryStringParameters.url;
    const result = await mp.source(url);
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: `Unrecognized Micropub query '${q}'`
      })
    };
  }
});

get
  .use(mw.httpHeaderNormalizer())
  .use(mw.cors())
  .use(authorizer());

export const post = middy(async (event, context) => {
  console.log('got micropub request for', event.blogId);

  const input = await mp.input.fromEvent(event);

  // check if the auth token has the matching scope for the action
  const scopeCheck = scope.check(event, input.action);
  if (scopeCheck) {
    return scopeCheck;
  }

  if (input.action === 'create') {
    console.log('creating post from micropub input:', input);
    const p = await mp.create(event.blogId, input);
    const loc = `https://${event.blogId}${p.permalink}`;
    return {
      statusCode: 201,
      headers: {
        Location: loc
      },
      body: ""
    };
  } else if (input.action === 'update') {
    console.log('updating post from micropub input:', input);
    await mp.update(event.blogId, input);
    return {
      statusCode: 204,
      body: ""
    };
  } else if (input.action === 'delete') {
    console.log('deleting post from micropub input:', input);
    await mp.delete(event.blogId, input);
    return {
      statusCode: 204,
      body: ""
    };
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({error: 'invalid_request'})
    };
  }
});

post
  .use(mw.httpHeaderNormalizer())
  .use(mw.cors())
  .use(authorizer())
  .use(mw.jsonBodyParser())
  .use(formDataParser());

const tokensUrl = 'https://tokens.indieauth.com/token';

export const verify: CustomAuthorizerHandler = async (event, context) => {
  const token = event.authorizationToken;
  const methodArn = event.methodArn;

  // pass the authorization header right on through to the tokens API
  const response = await fetch(tokensUrl, {
    headers: {
      Authorization: token,
      Accept: 'application/json'
    }
  });

  if (response.ok) {
    const { me, scope } = await response.json();
    console.log('allowing access for', me, 'with scopes:', scope);

    return {
      principalId: me,
      context: {
        scope
      },
      policyDocument: mp.auth.createPolicy(true, methodArn)
    };
  } else {
    console.log('could not verify token', response);
    return {
      principalId: 'unknown',
      policyDocument: mp.auth.createPolicy(false, methodArn)
    };
  }
};
