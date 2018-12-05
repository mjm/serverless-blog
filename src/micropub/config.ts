import { APIGatewayProxyEvent } from "aws-lambda";

interface MicropubConfig {
  "media-endpoint": string;
}

export default function config(event: APIGatewayProxyEvent): MicropubConfig {
  const url = 'https://blog-api.mattmoriarity.com/micropub/media';

  return {
    "media-endpoint": url
  };
}
