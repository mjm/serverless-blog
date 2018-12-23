import * as httpError from "http-errors";

import Post, { PostData } from "../model/post";
import { queue, webmentionQueueUrl as queueUrl } from "../model/queue";
import * as mf from "../util/microformats";

export async function enqueue(source, target): Promise<void> {
  if (!source) {
    throw new httpError.BadRequest("No 'source' parameter included in request body");
  }
  if (!target) {
    throw new httpError.BadRequest("No 'target' parameter included in request body");
  }

  const post = await Post.getByURL(target);
  if (!post) {
    throw new httpError.BadRequest("Could not find a post for the target URL");
  }

  const message = { source, target, post };
  console.log('enqueuing message', message);

  await queue.sendMessage({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
    MessageAttributes: {
      eventType: { StringValue: 'receive', DataType: 'String' }
    }
  }).promise();
}

interface ReceiveWebmentionMessage {
  source: string;
  target: string;
  post: PostData;
}

export async function handleEvent(body: ReceiveWebmentionMessage): Promise<void> {
  const { source, target } = body;
  const post = Post.make(body.post);

  console.log('handling webmention from', source);

  const data = await mf.parse(source);
  const entry = mf.getEntry(data);
  if (!entry) {
    console.error('No h-entry found at URL', source);
    return;
  }

  let item = mf.toStorage(entry);
  console.log('got webmention', item);

  if (!item.url) {
    item.url = source;
  }

  await post.addMention(item);
}
