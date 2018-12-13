import DynamoDB from "aws-sdk/clients/dynamodb";
import { format } from "date-fns";

import { tableName } from "./db";

const db = new DynamoDB();

class ArchiveCache {
  private table: string;
  private key: string;

  constructor(table: string, key: string) {
    this.table = table;
    this.key = key;
  }

  async addDate(blogId: string, date: Date): Promise<void> {
    const dateString = format(date, 'YYYY-MM');

    await db.updateItem({
      TableName: tableName,
      Key: {
        blogId: { S: blogId },
        path: { S: this.path }
      },
      UpdateExpression: 'ADD months :m',
      ExpressionAttributeValues: {
        ":m": { SS: [ dateString ] }
      }
    }).promise();
  }

  async getMonths(blogId: string): Promise<string[]> {
    const result = await db.getItem({
      TableName: tableName,
      Key: {
        blogId: { S: blogId },
        path: { S: this.path }
      }
    }).promise();

    let months = result.Item.months.SS;

    // most recent months first
    months.sort((a, b) => {
      if (a > b) { return -1; }
      if (a < b) { return 1; }
      return 0;
    });

    return months;
  }

  async rebuild(blogId: string, posts?: Post[]): Promise<void> {
    if (!posts) {
      posts = await Post.all(blogId);
    }

    let months = new Set<string>();
    for (const p of posts) {
      if (p.published) {
        months.add(format(p.published, 'YYYY-MM'));
      }
    }

    await db.putItem({
      TableName: tableName,
      Item: {
        blogId: { S: blogId },
        path: { S: this.path },
        months: { SS: Array.from(months) }
      }
    }).promise();
  }

  get path(): string {
    return `cache/${this.key}`;
  }
}

export const archive = new ArchiveCache(tableName, 'archive');

import Post from "./post";
