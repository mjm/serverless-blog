import * as DynamoDB from "aws-sdk/clients/dynamodb";
import { parse } from "date-fns";
import { db, tableName } from "./db";
import Post from "./post";

export interface MentionData {
  blogId?: string;
  path?: string;
  postPath?: string;
  item: MentionItemData;
}

export interface MentionItemData {
  type: string;
  [propName: string]: any;
}

export default class Mention implements MentionData {
  blogId: string;
  path: string;
  postPath: string;
  item: MentionItemData;

  get publishedDate(): Date | null { return this.getDate('published'); }

  getDate(prop: string): Date | null {
    if (prop in this.item) {
      return parse(this.item[prop]);
    } else {
      return null;
    }
  }

  static make(obj: MentionData): Mention {
    return Object.create(Mention.prototype, Object.getOwnPropertyDescriptors(obj));
  }

  static is(obj: any): boolean {
    return typeof obj === 'object' && typeof obj.path === 'string' && obj.path.startsWith('mentions/')
  }

  static async create(post: Post, data: MentionData): Promise<Mention> {
    data.blogId = post.blogId;
    data.postPath = post.path;

    if (!data.item.published) {
      data.item.published = new Date().toISOString();
    }

    if (!data.path) {
      data.path = generatePath(post, data);
    }

    const mention = Mention.make(data);
    await mention.save();

    return mention;
  }

  async save(): Promise<void> {
    console.log('saving mention:', this);

    await db.put({
      TableName: tableName,
      Item: this
    }).promise();
  }

  static async forPost(post: Post): Promise<Mention[]> {
    const query = this.queryForPost(post);
    const result = await db.query(query).promise();
    const items = result.Items || [];

    console.log('mentions for post consumed capacity', result.ConsumedCapacity);
    return items.map((i: MentionData) => Mention.make(i));
  }

  static async countForPost(post: Post): Promise<number> {
    let query = this.queryForPost(post);
    query.Select = 'COUNT';
    const result = await db.query(query).promise();

    console.log('counting mentions for post consumed capacity', result.ConsumedCapacity);
    return result.Count || 0;
  }

  private static queryForPost(post: Post): DynamoDB.DocumentClient.QueryInput {
    const queryPath = `mentions/${post.shortPath}`;
    return {
      TableName: tableName,
      KeyConditionExpression: "blogId = :b and begins_with(#p, :post)",
      ExpressionAttributeNames: { "#p": "path" },
      ExpressionAttributeValues: {
        ":b": post.blogId,
        ":post": queryPath
      },
      ReturnConsumedCapacity: "TOTAL"
    };
  }

  async getPost(): Promise<Post> {
    return await Post.get(this.blogId, this.postPath);
  }
}

function generatePath(post: Post, data: MentionData): string {
  return `mentions/${post.shortPath}/${data.item.published}-${data.item.url}`;
}
