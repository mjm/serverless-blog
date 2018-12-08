import { URL } from "url";
import * as DynamoDB from "aws-sdk/clients/dynamodb";
import * as slug from "slug";
import { format, parse, startOfMonth, endOfMonth } from "date-fns";
import * as rs from "randomstring";

import { db, tableName } from "./db";
import { archive } from "./cache";

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

const singularKeys = [
  'name',
  'content',
  'published',
  'updated'
]

export default class Post {
  private data: PostData;

  constructor(data: PostData) {
    this.data = data;
  }

  get blogId(): string { return this.data.blogId; }
  get path(): string { return this.data.path; }
  get type(): string { return this.data.type; }
  get name(): string { return this.data.name; }
  get content(): PostContent { return this.data.content; }

  get published(): Date { return this.getDate('published'); }
  get updated(): Date { return this.getDate('updated'); }

  get properties(): string[] {
    return Object.keys(this.data).filter(k => {
      return k !== 'type' && k !== 'blogId' && k !== 'path';
    });
  }

  get(key: string): any {
    return this.data[key];
  }

  set(key: string, value: any) {
    if (value === null || value === undefined) {
      delete this.data[key];
    } else if (singularKeys.includes(key) && value.constructor === Array) {
      this.data[key] = value[0];
    } else {
      this.data[key] = value;
    }
  }

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

  static async all(blogId: string): Promise<Post[]> {
    return await this.fetchList(blogId, {});
  }

  static async recent(blogId: string): Promise<Post[]> {
    return await this.fetchList(blogId, { limit: 20 });
  }

  static async forMonth(blogId: string, month: string): Promise<Post[]> {
    const start = `${month}-00`;
    const end = `${month}-99`;

    console.log(`getting posts between ${start} and ${end}`);
    return await this.fetchList(blogId, {
      between: {
        start: start,
        end: end
      }
    });
  }

  static async fetchList(blogId: string, options: {[key: string]: any}): Promise<Post[]> {
    let query: DynamoDB.DocumentClient.QueryInput = {
      TableName: tableName,
      IndexName: 'published-posts',
      KeyConditionExpression: "blogId = :b",
      ExpressionAttributeValues: {
        ":b": blogId
      },
      ScanIndexForward: false,
      ReturnConsumedCapacity: "TOTAL"
    };

    if (options.limit) {
      query.Limit = options.limit;
    }
    if (options.between) {
      query.KeyConditionExpression += " and (published between :start and :end)";
      query.ExpressionAttributeValues[':start'] = options.between.start;
      query.ExpressionAttributeValues[':end'] = options.between.end;
    }

    const result = await db.query(query).promise();

    console.log(`listing ${result.Items.length} blog posts consumed capacity: ${JSON.stringify(result.ConsumedCapacity)}`);

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

    const post = new Post(data);
    await post.save();

    return post;
  }

  static async get(blogId: string, path: string): Promise<Post> {
    if (!path.startsWith('posts/')) {
      path = `posts/${path}`;
    }

    const query = {
      TableName: tableName,
      Key: {
        blogId: blogId,
        path: path
      }
    };

    const result = await db.get(query).promise();
    return new Post(result.Item as PostData);
  }

  static async getByURL(url: string): Promise<Post> {
    const { blogId, path } = keyFromURL(url);
    return await this.get(blogId, path);
  }

  async save(): Promise<void> {
    console.log('saving post:', this.data);
    await db.put({
      TableName: tableName,
      Item: this.data
    }).promise();

    await archive.addDate(this.blogId, this.published);
  }

  static async deleteByURL(blogId: string, url: string): Promise<void> {
    const key = keyFromURL(url);
    if (blogId !== key.blogId) { return; }

    await db.delete({
      TableName: tableName,
      Key: key
    }).promise();
  }
}

function generatePath(data: PostData): string {
  let s: string;
  if (data.name) {
    s = makeSlug(data.name);
  } else {
    let content: string;
    if (data.content) {
      content = (typeof data.content === 'string') ? data.content : data.content.html;
    } else {
      content = rs.generate(10);
    }

    s = makeSlug(content);
    if (s.length > 40) {
      s = s.substring(0, 40);

      const i = s.lastIndexOf('-');
      s = s.substring(0, i);
    }
  }

  const published: Date = data.published ? parse(data.published) : new Date();
  const dateStr = format(published, 'YYYY/MM');

  return `posts/${dateStr}/${s}`;
}

function makeSlug(str: string): string {
  return slug(str, {
    lower: true
  });
}

interface PostKey {
  blogId: string;
  path: string;
}

function keyFromURL(url: string): PostKey {
  const u = new URL(url);
  const blogId = u.hostname;
  let path = u.pathname;
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  path = `posts/${path}`;

  return { blogId, path };
}
