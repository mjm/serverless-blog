import { APIGatewayProxyHandler, APIGatewayProxyEvent, CustomAuthorizerHandler } from "aws-lambda";
import fetch from "node-fetch";

import * as mp from "../micropub";
import { permalink } from "../model/post";
import * as headers from "../util/headers";

export const get: APIGatewayProxyHandler = async (event, context) => {
  headers.normalize(event.headers);
  const q = event.queryStringParameters.q;

  if (q === "config") {
    return {
      statusCode: 200,
      body: JSON.stringify(config(event))
    };
  } else if (q === "debug") {
    return {
      statusCode: 200,
      body: JSON.stringify(event)
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

interface MicropubConfig {
  "media-endpoint": string;
}

function config(event: APIGatewayProxyEvent): MicropubConfig {
  // We need some properties that the type definition doesn't include
  const context = event.requestContext as any;
  const url = `https://${context.domainName}${context.path}/media`;

  return {
    "media-endpoint": url
  };
}


export const post: APIGatewayProxyHandler = async (event, context) => {
  headers.normalize(event.headers);
  const input = mp.input.fromEvent(event);
  const blogId = event.queryStringParameters.site;
  if (input.action === 'create') {
    console.log('creating post from micropub input:', input);
    const p = await mp.create(blogId, input);
    const loc = `https://${blogId}${permalink(p)}`;
    return {
      statusCode: 201,
      headers: {
        Location: loc
      },
      body: ""
    };
  } else if (input.action === 'update') {
    return {
      statusCode: 200,
      body: "Cool update bro!"
    };
  } else if (input.action === 'delete') {
    return {
      statusCode: 200,
      body: "Cool delete bro!"
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

    return {
      principalId: me,
      policyDocument: mp.auth.createPolicy(true, methodArn)
    };
  } else {
    return {
      principalId: 'unknown',
      policyDocument: mp.auth.createPolicy(false, methodArn)
    };
  }
};
