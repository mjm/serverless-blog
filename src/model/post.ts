import * as DynamoDB from "aws-sdk/clients/dynamodb";
import * as slug from "slug";
import { format, parse } from "date-fns";

import { db, tableName } from "./db";

type PostStatus = "draft" | "published";

interface PostHTMLContent {
  html: string;
}

type PostContent = string | PostHTMLContent;

export interface PostData {
  blogId: string;
  path?: string;
  type: string;
  name?: string;
  content: PostContent;
  published?: string;
  updated?: string;
  status?: PostStatus;

  [propName: string]: any;
}

export default class Post {
  private data: PostData;

  constructor(data: PostData) {
    this.data = data;
  }

  get path(): string { return this.data.path; }
  get type(): string { return this.data.type; }
  get name(): string { return this.data.name; }
  get content(): PostContent { return this.data.content; }

  get published(): Date { return this.getDate('published'); }
  get updated(): Date { return this.getDate('updated'); }

  get permalink(): string {
    return '/' + this.path.replace(/^posts\//, '') + '/';
  }

  getDate(prop: string): Date {
    if (prop in this.data) {
      return parse(this.data[prop]);
    } else {
      return null;
    }
  }

  static async recent(blogId: string): Promise<Post[]> {
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

    return result.Items.map((i: PostData) => new Post(i));
  }

  static async create(data: PostData): Promise<Post> {
    if (data.status === "published" && !data.published) {
      data.published = new Date().toISOString();
    }

    if (data.name == "") {
      delete data.name;
    }

    if (!data.path) {
      data.path = generatePath(data);
    } else if (!data.path.startsWith('posts/')) {
      data.path = `posts/${data.path}`;
    }

    // Don't persist the post status, it is represented by publishedAt
    delete data.status;

    console.log('creating post:', data);

    await db.put({
      TableName: tableName,
      Item: data
    }).promise();

    return new Post(data);
  }
}

function generatePath(data: PostData): string {
  let s: string;
  if (data.name) {
    s = makeSlug(data.name);
  } else {
    const content = (typeof data.content === 'string') ? data.content : data.content.html;
    s = makeSlug(content);
    if (s.length > 40) {
      s = s.substring(0, 40);

      const i = s.lastIndexOf('-');
      s = s.substring(0, i);
    }
  }

  const published: Date = data.published ? parse(data.published) : new Date();
  const dateStr = format(published, 'YYYY-MM-DD');

  return `posts/${dateStr}-${s}`;
}

function makeSlug(str: string): string {
  return slug(str, {
    lower: true
  });
}
