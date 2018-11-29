import { APIGatewayProxyHandler } from 'aws-lambda';

import generate from "../generator";

export const handle: APIGatewayProxyHandler = async (event, context) => {
  const { blogId } = JSON.parse(event.body);
  await generate(blogId);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "success",
      message: "Your website was generated successfully."
    })
  }
}
