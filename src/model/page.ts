import * as DynamoDB from "aws-sdk/clients/dynamodb";

import { db, tableName } from "./db";

export interface Page {
  blogId: string;
  path: string;
  name: string;
  content: string;
}

export async function all(blogId: string): Promise<Page[]> {
  const query = {
    TableName: tableName,
    KeyConditionExpression: "blogId = :b and begins_with(#p, :pages)",
    ExpressionAttributeNames: { "#p": "path" },
    ExpressionAttributeValues: {
      ":b": blogId,
      ":pages": 'pages/'
    },
    ReturnConsumedCapacity: "TOTAL"
  }

  const result = await db.query(query).promise();

  console.log('all pages consumed capacity', result.ConsumedCapacity);

  return result.Items as Page[];
}

export async function get(blogId: string, path: string): Promise<Page> {
  if (!path.startsWith('pages/')) {
    path = `pages/${path}`;
  }

  const query = {
    TableName: tableName,
    Key: {
      blogId: blogId,
      path: path
    }
  };

  const result = await db.get(query).promise();
  return result.Item as Page;
}

export function permalink(p: Page): string {
  return '/' + p.path.replace(/^pages\//, '') + '/';
}
