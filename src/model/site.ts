import { db, tableName } from "./db";

interface Config {
  blogId: string;
  path: "config";
  title: string;
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
