import { db, tableName } from "./db";

export interface Config {
  blogId: string;
  path: "config";
  title: string;
  author: Author;
}

interface Author {
  name: string;
  email: string;
}

export async function getConfig(blogId: string): Promise<Config> {
  let config = await db.get({
    TableName: tableName,
    Key: {
      blogId,
      path: 'config'
    }
  }).promise();

  return config.Item as Config;
}
