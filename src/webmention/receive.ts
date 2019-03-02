import SES from "aws-sdk/clients/ses";
import * as httpError from "http-errors";

import Mention from "../model/mention";
import Post, { PostData } from "../model/post";
import { queue, queueUrl } from "../model/queue";
import * as site from "../model/site";
import * as mf from "../util/microformats";

const ses = new SES();

export async function enqueue(source: string | undefined, target: string | undefined): Promise<void> {
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
  console.log("enqueuing message", message);

  await queue.sendMessage({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
    MessageAttributes: {
      eventType: { StringValue: "webmentionReceive", DataType: "String" },
    },
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

  console.log("handling webmention from", source);

  const data = await mf.parse(source);
  const entry = mf.getEntry(data);
  if (!entry) {
    console.error("No h-entry found at URL", source);
    return;
  }

  const item = mf.toStorage(entry);
  console.log("got webmention", item);

  if (!item.url) {
    item.url = source;
  }

  const newMention = await post.addMention(item);
  await notifyAuthor(post, newMention);
}

const fromAddress = "mentions@mattmoriarity.com";

async function notifyAuthor(post: Post, mention: Mention): Promise<void> {
  const config = await site.getConfig(mention.blogId);
  if (!config.author) {
    return;
  }

  const toStr = `${config.author.name} <${config.author.email}>`;
  const fromStr = `${config.blogId} <${fromAddress}>`;

  let mentionAuthor = "Someone";
  if (mention.item.author && mention.item.author[0]) {
    mentionAuthor = mention.item.author[0].name || mentionAuthor;
  }

  let postName = post.name;
  if (!postName) {
    if (typeof post.content === "string") {
      postName = post.content.slice(0, 50) + "...";
    } else {
      postName = "Untitled";
    }
  }

  const postUrl = post.url;

  await ses.sendTemplatedEmail({
    Source: fromStr,
    Destination: {
      ToAddresses: [ toStr ],
    },
    Template: "newMention",
    TemplateData: JSON.stringify({
      mentionAuthor,
      postName,
      postUrl,
    }),
  }).promise();
}
