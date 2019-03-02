import { APIGatewayProxyEvent } from "aws-lambda";

interface MicropubConfig {
  "media-endpoint": string;
  "post-types": PostType[];
}

interface PostType {
  type: string;
  name: string;
}

export default function config(event: APIGatewayProxyEvent): MicropubConfig {
  const url = "https://blog-api.mattmoriarity.com/micropub/media";

  return {
    "media-endpoint": url,
    "post-types": [
      {
        type: "note",
        name: "Status Update",
      },
      {
        type: "article",
        name: "Blog Post",
      },
      {
        type: "photo",
        name: "Photo",
      },
    ],
  };
}
