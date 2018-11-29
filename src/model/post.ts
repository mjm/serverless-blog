import * as DynamoDB from "aws-sdk/clients/dynamodb";

import { db, tableName } from "./db";

export interface Post {
  blogId: string;
  path?: string;
  title: string;
  content: string;
}

export async function create(data: Post): Promise<Post> {
  if (!data.path) {
    data.path = generatePath(data);
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
