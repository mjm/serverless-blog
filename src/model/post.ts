import * as DynamoDB from "aws-sdk/clients/dynamodb";
import * as slug from "slug";

import * as format from "date-fns/format";

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
  permalink?: string;
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
  if (data.status === "published" && !data.publishedAt) {
    data.publishedAt = new Date().toISOString();
  }

  if (data.title == "") {
    delete data.title;
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

  return data;
}

function generatePath(data: Post): string {
  let s: string;
  if (data.title) {
    s = makeSlug(data.title);
  } else {
    s = makeSlug(data.content);
    if (s.length > 50) {
      const i = s.lastIndexOf('-');
      s = s.substring(0, i);
    }
  }

  const dateStr = format(data.publishedAt || new Date(), 'YYYY-MM-DD');

  return `posts/${dateStr}-${s}`;
}

function makeSlug(str: string): string {
  return slug(str, {
    lower: true
  });
}

export function permalink(p: Post): string {
  return '/' + p.path.replace(/^posts\//, '') + '/';
}
