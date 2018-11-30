import * as DynamoDB from "aws-sdk/clients/dynamodb";

import { db, tableName } from "./db";

export interface Post {
  blogId: string;
  path?: string;
  title?: string;
  content: string;
  renderedContent?: string;
}

export async function recent(blogId: string): Promise<Post[]> {
  const query = {
    TableName: tableName,
    KeyConditionExpression: "blogId = :b and begins_with(#p, :prefix)",
    ExpressionAttributeNames: {
      "#p": "path"
    },
    ExpressionAttributeValues: {
      ":b": blogId,
      ":prefix": 'posts/'
    },
    Limit: 15,
    ScanIndexForward: false,
    ReturnConsumedCapacity: "TOTAL"
  };

  const result = await db.query(query).promise();

  console.log(`recent blog posts consumed capacity: ${JSON.stringify(result.ConsumedCapacity)}`);

  return result.Items as Post[];
}

export async function create(data: Post): Promise<Post> {
  if (!data.path) {
    data.path = generatePath(data);
  }

  if (data.title == "") {
    delete data.title;
  }

  await db.put({
    TableName: tableName,
    Item: data
  }).promise();

  return data;
}

function generatePath(data: Post): string {
  return '';
}
