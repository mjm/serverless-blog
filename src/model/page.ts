import * as DynamoDB from "aws-sdk/clients/dynamodb";

import { db, tableName } from "./db";

export interface PageData {
  blogId: string;
  path: string;
  name: string;
  content: string;
}

export default class Page implements PageData {
  blogId: string;
  path: string;
  name: string;
  content: string;

  get permalink(): string {
    return '/' + this.path.replace(/^pages\//, '') + '/';
  }

  static make(obj: PageData): Page {
    return Object.create(Page.prototype, Object.getOwnPropertyDescriptors(obj));
  }

  static async all(blogId: string): Promise<Page[]> {
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

    return result.Items.map((i: PageData) => Page.make(i));
  }

  static async get(blogId: string, path: string): Promise<Page> {
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
    if (result.Item) {
      return Page.make(result.Item as PageData);
    } else {
      return null;
    }
  }

  async save(): Promise<void> {
    console.log('saving page:', this);
    await db.put({
      TableName: tableName,
      Item: this
    }).promise();
  }
}
