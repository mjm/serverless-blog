import { db, tableName } from "./db";
import Post from "./post";

export interface MentionData {
  blogId?: string;
  path?: string;
  type: string;

  [propName: string]: any;
}

export default class Mention implements MentionData {
  blogId: string;
  path?: string;
  type: string;

  [propName: string]: any;

  static make(obj: MentionData): Mention {
    return Object.create(Mention.prototype, Object.getOwnPropertyDescriptors(obj));
  }

  static async create(post: Post, data: MentionData): Promise<Mention> {
    data.blogId = post.blogId;
    data.postPath = post.path;

    if (!data.published) {
      data.published = new Date().toISOString();
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
}

function generatePath(post: Post, data: MentionData): string {
  return `mentions/${post.shortPath}/${data.published}-${data.url}`;
}
