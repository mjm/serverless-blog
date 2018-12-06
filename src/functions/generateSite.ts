import { APIGatewayProxyHandler, DynamoDBStreamHandler } from 'aws-lambda';

import generate, { GenerateSiteOptions } from "../generate";

export async function handle(event, context) {
  if (event.Records) {
    return await handleDynamoDBTrigger(event, context, undefined);
  } else {
    return await handleHttp(event, context, undefined);
  }
};

const handleHttp: APIGatewayProxyHandler = async (event, context) => {
  const input = JSON.parse(event.body);
  let options: GenerateSiteOptions = {};
  if (input.full) {
    options.full = true;
  }
  await generate(input.blogId, options);

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
  const generateSites = [...blogIds].map(id => generate(id));
  await Promise.all(generateSites);
};
