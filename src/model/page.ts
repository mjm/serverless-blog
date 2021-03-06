import * as DynamoDB from "aws-sdk/clients/dynamodb";
import * as httpError from "http-errors";

import { db, tableName } from "./db";

export interface PageData {
  blogId: string;
  path: string;
  name: string;
  content: string;
}

export default class Page implements PageData {

  get permalink(): string {
    return "/" + this.path.replace(/^pages\//, "") + "/";
  }

  public static make(obj: PageData): Page {
    return Object.create(Page.prototype, Object.getOwnPropertyDescriptors(obj));
  }

  public static async all(blogId: string): Promise<Page[]> {
    const query = {
      TableName: tableName,
      KeyConditionExpression: "blogId = :b and begins_with(#p, :pages)",
      ExpressionAttributeNames: { "#p": "path" },
      ExpressionAttributeValues: {
        ":b": blogId,
        ":pages": "pages/",
      },
      ReturnConsumedCapacity: "TOTAL",
    };

    const result = await db.query(query).promise();
    const items = result.Items || [];

    console.log("all pages consumed capacity", result.ConsumedCapacity);

    return items.map((i) => Page.make(i as PageData));
  }

  public static async get(blogId: string, path: string): Promise<Page> {
    if (!path.startsWith("pages/")) {
      path = `pages/${path}`;
    }

    const query = {
      TableName: tableName,
      Key: {
        blogId,
        path,
      },
    };

    const result = await db.get(query).promise();
    if (result.Item) {
      return Page.make(result.Item as PageData);
    } else {
      throw new httpError.NotFound(`Could not find a record at path '${path}'`);
    }
  }

  public static async deleteByPath(blogId: string, path: string): Promise<void> {
    if (!path.startsWith("pages/")) {
      path = `pages/${path}`;
    }

    await db.delete({
      TableName: tableName,
      Key: { blogId, path },
    }).promise();
  }
  public blogId: string;
  public path: string;
  public name: string;
  public content: string;

  public async save(): Promise<void> {
    console.log("saving page:", this);
    await db.put({
      TableName: tableName,
      Item: this,
    }).promise();
  }
}
