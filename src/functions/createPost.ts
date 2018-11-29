import { APIGatewayProxyHandler } from 'aws-lambda';

import * as post from "../model/post";

export const handle: APIGatewayProxyHandler = async (event, context) => {
  const body = JSON.parse(event.body);
  const createdPost: post.Post = await post.create(body);

  return {
    statusCode: 200,
    body: JSON.stringify(createdPost),
  };
}
