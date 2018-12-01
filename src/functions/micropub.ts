import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";

export const get: APIGatewayProxyHandler = async (event, context) => {
  const q = event.queryStringParameters.q;

  if (q === "config") {
    return {
      statusCode: 200,
      body: JSON.stringify(config(event))
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
