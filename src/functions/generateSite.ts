import { APIGatewayProxyHandler, DynamoDBStreamHandler } from 'aws-lambda';

import generate from "../generate";

export async function handle(event, context) {
  if (event.Records) {
    return await handleDynamoDBTrigger(event, context, undefined);
  } else {
    return await handleHttp(event, context, undefined);
  }
};

const handleHttp: APIGatewayProxyHandler = async (event, context) => {
  const { blogId } = JSON.parse(event.body);
  await generate(blogId);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "success",
      message: "Your website was generated successfully."
    })
  }
};

const handleDynamoDBTrigger: DynamoDBStreamHandler = async (event, context) => {
  let blogIds = new Set();

  // collect the unique IDs of the blogs that were affected
  event.Records.forEach(r => {
    const blogId = r.dynamodb.Keys.blogId.S;
    blogIds.add(blogId);
  });

  // generate the sites of each affected blog
  const generateSites = [...blogIds].map(generate);
  await Promise.all(generateSites);
};
