import { URL } from "url";
import * as DynamoDB from "aws-sdk/clients/dynamodb";
import * as slug from "slug";
import { format, parse } from "date-fns";
import * as rs from "randomstring";

import { db, tableName } from "./db";
import { archive } from "./cache";
import Mention, { MentionItemData } from "./mention";
import * as mf from "../util/microformats";

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

  mentionCount?: number;

  // temporary attributes, don't persist
  status?: PostStatus;
  slug?: string;

  [propName: string]: any;
}

export default class Post implements PostData {
  blogId: string;
  path?: string;
  type: string;
  name?: string;
  content: PostContent;
  published?: string;
  updated?: string;

  mentionCount?: number;

  status?: PostStatus;
  slug?: string;

  [propName: string]: any;

  get publishedDate(): Date { return this.getDate('published'); }
  get updatedDate(): Date { return this.getDate('updated'); }

  get properties(): string[] {
    return Object.keys(this).filter(k => !Post.nonPropertyKeys.includes(k));
  }

  set(key: string, value: any) {
    if (value === null || value === undefined) {
      delete this[key];
    } else if (Post.singularKeys.includes(key) && value.constructor === Array) {
      this[key] = value[0];
    } else {
      this[key] = value;
    }
  }

  get permalink(): string {
    return '/' + this.shortPath + '/';
  }

  get url(): string {
    return `https://${this.blogId}${this.permalink}`;
  }

  get shortPath(): string {
    return this.path.replace(/^posts\//, '');
  }

  getDate(prop: string): Date {
    if (prop in this) {
      return parse(this[prop]);
    } else {
      return null;
    }
  }

  static get singularKeys(): string[] {
    return mf.singularKeys;
  }

  static readonly nonPropertyKeys: string[] = [
    'blogId',
    'path',
    'type'
  ];

  static make(obj: PostData): Post {
    return Object.create(Post.prototype, Object.getOwnPropertyDescriptors(obj));
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

    return result.Items.map((i: PostData) => Post.make(i));
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

    // Don't persist the post status, it is represented by published
    delete data.status;
    // Don't persist the slug, it should be incorporated into the path
    delete data.slug;

    const post = Post.make(data);
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
    if (result.Item) {
      return Post.make(result.Item as PostData);
    } else {
      return null;
    }
  }

  static async getByURL(url: string): Promise<Post> {
    const { blogId, path } = keyFromURL(url);
    return await this.get(blogId, path);
  }

  async save(): Promise<void> {
    console.log('saving post:', this);
    await db.put({
      TableName: tableName,
      Item: this
    }).promise();

    await archive.addDate(this.blogId, this.publishedDate);
  }

  static async deleteByURL(blogId: string, url: string): Promise<void> {
    const key = keyFromURL(url);
    if (blogId !== key.blogId) { return; }

    await db.delete({
      TableName: tableName,
      Key: key
    }).promise();
  }

  async addMention(item: MentionItemData): Promise<Mention> {
    return await Mention.create(this, { item });
  }

  async getMentions(): Promise<Mention[]> {
    return await Mention.forPost(this);
  }

  async getMentionCount(): Promise<number> {
    return await Mention.countForPost(this);
  }
}

function generatePath(data: PostData): string {
  let s: string;
  if (data.slug) {
    s = data.slug;
  } else if (data.name) {
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
