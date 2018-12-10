import { APIGatewayProxyHandler, APIGatewayProxyEvent, CustomAuthorizerHandler } from "aws-lambda";
import fetch from "node-fetch";

import * as mp from "../micropub";
import Post from "../model/post";
import * as headers from "../util/headers";

export const get: APIGatewayProxyHandler = async (event, context) => {
  headers.normalize(event.headers);
  const blogId = mp.identify(event.requestContext.authorizer.principalId);
  console.log('got micropub request for', blogId);

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
};

export const post: APIGatewayProxyHandler = async (event, context) => {
  headers.normalize(event.headers);
  const blogId = mp.identify(event.requestContext.authorizer.principalId);

  const input = await mp.input.fromEvent(blogId, event);
  console.log('got micropub request for', blogId);

  if (input.action === 'create') {
    console.log('creating post from micropub input:', input);
    const p = await mp.create(blogId, input);
    const loc = `https://${blogId}${p.permalink}`;
    return {
      statusCode: 201,
      headers: {
        Location: loc
      },
      body: ""
    };
  } else if (input.action === 'update') {
    console.log('updating post from micropub input:', input);
    await mp.update(blogId, input);
    return {
      statusCode: 204,
      body: ""
    };
  } else if (input.action === 'delete') {
    console.log('deleting post from micropub input:', input);
    await mp.delete(blogId, input);
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
};

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
    const scopes = scope.split(' ') as string[];

    const allowAccess = scopes.includes('create');
    console.log('allowing access for', me, 'in scopes', scopes);

    return {
      principalId: me,
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
