import * as DynamoDB from "aws-sdk/clients/dynamodb";

import { db, tableName } from "./db";

type PostStatus = "draft" | "published";

export interface Post {
  blogId: string;
  path?: string;
  title?: string;
  content: string;
  publishedAt?: string;
  status?: PostStatus;

  renderedContent?: string;
}

export async function recent(blogId: string): Promise<Post[]> {
  const query = {
    TableName: tableName,
    IndexName: 'published-posts',
    KeyConditionExpression: "blogId = :b",
    ExpressionAttributeValues: {
      ":b": blogId
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

  if (data.status === "published" && !data.publishedAt) {
    data.publishedAt = new Date().toISOString();
  }

  // Don't persist the post status, it is represented by publishedAt
  delete data.status;

  await db.put({
    TableName: tableName,
    Item: data
  }).promise();

  return data;
}

function generatePath(data: Post): string {
  return '';
}
