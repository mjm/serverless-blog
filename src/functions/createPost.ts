import { APIGatewayProxyHandler } from 'aws-lambda';

import Post from "../model/post";

export const handle: APIGatewayProxyHandler = async (event, context) => {
  const body = JSON.parse(event.body);
  const createdPost: Post = await Post.create(body);

  return {
    statusCode: 200,
    body: JSON.stringify(createdPost),
  };
}
