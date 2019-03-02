import * as DynamoDB from "aws-sdk/clients/dynamodb";
import { format, parse } from "date-fns";
import * as httpError from "http-errors";
import * as rs from "randomstring";
import slug from "slug";
import { URL } from "url";

import * as mf from "../util/microformats";
import { archive } from "./cache";
import { db, tableName } from "./db";
import Mention, { MentionItemData } from "./mention";

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

  [propName: string]: any;

  get publishedDate(): Date | null { return this.getDate("published"); }
  get updatedDate(): Date | null { return this.getDate("updated"); }

  get properties(): string[] {
    return Object.keys(this).filter((k) => !Post.nonPropertyKeys.includes(k));
  }

  get permalink(): string {
    return "/" + this.shortPath + "/";
  }

  get url(): string {
    return `https://${this.blogId}${this.permalink}`;
  }

  get shortPath(): string {
    return (this.path || "").replace(/^posts\//, "");
  }

  static get singularKeys(): string[] {
    return mf.singularKeys;
  }

  public static readonly nonPropertyKeys: string[] = [
    "blogId",
    "path",
    "type",
    "mentionCount",
  ];

  public static make(obj: PostData): Post {
    return Object.create(Post.prototype, Object.getOwnPropertyDescriptors(obj));
  }

  public static async all(blogId: string): Promise<Post[]> {
    return await this.fetchList(blogId, {});
  }

  public static async recent(blogId: string): Promise<Post[]> {
    return await this.fetchList(blogId, { limit: 20 });
  }

  public static async forMonth(blogId: string, month: string): Promise<Post[]> {
    const start = `${month}-00`;
    const end = `${month}-99`;

    console.log(`getting posts between ${start} and ${end}`);
    return await this.fetchList(blogId, {
      between: {
        start,
        end,
      },
    });
  }

  public static async fetchList(blogId: string, options: {[key: string]: any}): Promise<Post[]> {
    const values: DynamoDB.DocumentClient.ExpressionAttributeValueMap = { ":b": blogId };
    const query: DynamoDB.DocumentClient.QueryInput = {
      TableName: tableName,
      IndexName: "published-posts",
      ScanIndexForward: false,
      ReturnConsumedCapacity: "TOTAL",
      KeyConditionExpression: "blogId = :b",
      ExpressionAttributeValues: values,
    };

    if (options.limit) {
      query.Limit = options.limit;
    }
    if (options.between) {
      query.KeyConditionExpression += " and (published between :start and :end)";
      values[":start"] = options.between.start;
      values[":end"] = options.between.end;
    }

    const result = await db.query(query).promise();
    const items = result.Items || [];

    console.log(`listing ${items.length} blog posts consumed capacity: ${JSON.stringify(result.ConsumedCapacity)}`);

    return items.map((i) => Post.make(i as PostData));
  }

  public static async create(data: PostData): Promise<Post> {
    if (data.status === "published" && !data.published) {
      data.published = new Date().toISOString();
    }

    if (data.name === "") {
      delete data.name;
    }

    if (!data.path) {
      data.path = generatePath(data);
    } else if (!data.path.startsWith("posts/")) {
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

  public static async get(blogId: string, path: string): Promise<Post> {
    if (!path.startsWith("posts/")) {
      path = `posts/${path}`;
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
      return Post.make(result.Item as PostData);
    } else {
      throw new httpError.NotFound(`Could not find a record at path '${path}'`);
    }
  }

  public static async getByURL(url: string): Promise<Post> {
    const { blogId, path } = keyFromURL(url);
    return await this.get(blogId, path);
  }

  public static async deleteByURL(blogId: string, url: string): Promise<void> {
    const key = keyFromURL(url);
    if (blogId !== key.blogId) { return; }

    await db.delete({
      TableName: tableName,
      Key: key,
    }).promise();
  }
  public blogId: string;
  public path?: string;
  public type: string;
  public name?: string;
  public content: PostContent;
  public published?: string;
  public updated?: string;

  public mentionCount?: number;

  public status?: PostStatus;
  public slug?: string;

  public set(key: string, value: any) {
    if (value === null || value === undefined) {
      delete this[key];
    } else if (Post.singularKeys.includes(key) && value.constructor === Array) {
      this[key] = value[0];
    } else {
      this[key] = value;
    }
  }

  public getDate(prop: string): Date | null {
    if (prop in this) {
      return parse(this[prop]);
    } else {
      return null;
    }
  }

  public async save(): Promise<void> {
    console.log("saving post:", this);
    await db.put({
      TableName: tableName,
      Item: this,
    }).promise();

    if (this.publishedDate) {
      await archive.addDate(this.blogId, this.publishedDate);
    }
  }

  public async addMention(item: MentionItemData): Promise<Mention> {
    return await Mention.create(this, { item });
  }

  public async getMentions(): Promise<Mention[]> {
    return await Mention.forPost(this);
  }

  public async getMentionCount(): Promise<number> {
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
      content = (typeof data.content === "string") ? data.content : data.content.html;
    } else {
      content = rs.generate(10);
    }

    s = makeSlug(content);
    if (s.length > 40) {
      s = s.substring(0, 40);

      const i = s.lastIndexOf("-");
      s = s.substring(0, i);
    }
  }

  const published: Date = data.published ? parse(data.published) : new Date();
  const dateStr = format(published, "YYYY/MM");

  return `posts/${dateStr}/${s}`;
}

function makeSlug(str: string): string {
  return slug(str, {
    lower: true,
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
  if (path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  if (path.startsWith("/")) {
    path = path.substring(1);
  }
  path = `posts/${path}`;

  return { blogId, path };
}
