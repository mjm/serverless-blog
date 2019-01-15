import * as _ from 'lodash';
import { DynamoDBStreamHandler, DynamoDBStreamEvent, Context } from 'aws-lambda';
import { Converter } from 'aws-sdk/clients/dynamodb';
import * as SQS from 'aws-sdk/clients/sqs';

import * as site from "../model/site";
import Post, { PostData } from "../model/post";
import Page, { PageData } from "../model/page";
import Mention from "../model/mention";
import { queue, queueUrl } from "../model/queue";

import * as generate from "../generate";
import sendPings from "../generate/ping";
import * as renderer from "../generate/renderer";

import * as receive from "../webmention/receive";

export const dbTrigger: DynamoDBStreamHandler = async (event, context) => {
  const recordsByBlogId = collectRecords(event);

  for (const [blogId, records] of recordsByBlogId) {
    // many requests will need this info, so we should preload it
    const config = await site.getConfig(blogId);
    const requests = planRequests(config, records);

    for (const rs of _.chunk(requests, 10)) {
      await queue.sendMessageBatch({
        QueueUrl: queueUrl,
        Entries: rs
      }).promise();
    }

    await processMentions(records);
  }
};

function collectRecords(event: DynamoDBStreamEvent): Map<string, any> {
  let records = new Map<string, any>();

  for (let r of event.Records) {
    if (!r.dynamodb || !r.dynamodb.Keys) {
      continue;
    }

    const blogId = r.dynamodb.Keys.blogId.S;
    if (!blogId) {
      console.warn('No blogId key in event', r.dynamodb);
      continue;
    }

    let rs = records.get(blogId);
    if (!rs) {
      rs = [];
      records.set(blogId, rs);
    }

    if (r.dynamodb.NewImage) {
      rs.push(Converter.unmarshall(r.dynamodb.NewImage));
    }
  }

  return records;
}

function planRequests(site: site.Config, records: any[]): SQS.SendMessageBatchRequestEntryList {
  let requests: SQS.SendMessageBatchRequestEntryList = [];
  let includeIndex = false;

  const addEvent = (type: string, id: string, body?: any) => {
    requests.push({
      Id: id,
      MessageBody: JSON.stringify({ site, ...(body || {}) }),
      MessageAttributes: {
        eventType: { StringValue: type, DataType: 'String' }
      }
    });
  };

  let archiveMonths = new Set<string>();
  records.forEach((r, i) => {
    console.log('got record', r);
    if (r.path.startsWith('posts/')) {
      includeIndex = true;

      addEvent('generatePost', `record-${i}`, { post: r });

      if (r.published) {
        // grab the year and month: YYYY-MM
        archiveMonths.add(r.published.substr(0, 7));
      }
    } else if (r.path.startsWith('pages/')) {
      addEvent('generatePage', `record-${i}`, { page: r });
    } else if (r.path === 'cache/archive') {
      addEvent('generateArchiveIndex', `archive-index-${i}`);
    }
  });

  for (const month of archiveMonths) {
    addEvent('generateArchiveMonth', `archive-${month}`, { month });
  }

  if (includeIndex) {
    addEvent('generateIndex', 'index');
  }

  return requests;
}

async function processMentions(records: any[]): Promise<void> {
  for (let r of records) {
    if (Mention.is(r)) {
      const mention = Mention.make(r);
      const post = await mention.getPost();
      console.log('handling mention for post', post.path);

      post.mentionCount = await post.getMentionCount();
      console.log('updating post to have mention count', post.mentionCount);

      await post.save();
    }
  }
}

export async function queueTrigger(event: any, context: Context): Promise<void> {
  renderer.invalidate();
  await Promise.all(event.Records.map(handleMessage));
}

async function handleMessage(message: any): Promise<void> {
  const { body, messageAttributes } = message;
  const parsedBody = JSON.parse(body);
  const eventType = messageAttributes.eventType.stringValue;

  const fn = eventHandlers[eventType];
  await fn(parsedBody);
}

interface GenerateEvent {
  site: site.Config;
}

interface GenerateIndexEvent extends GenerateEvent {}
interface GenerateErrorEvent extends GenerateEvent {}

interface GeneratePostEvent extends GenerateEvent {
  post: PostData;
}

interface GeneratePageEvent extends GenerateEvent {
  page: PageData;
}

interface GenerateArchiveEvent extends GenerateEvent {
  month: string;
}

const eventHandlers: {[key: string]: (e: any) => Promise<void>} = {
  async generateIndex(e: GenerateIndexEvent): Promise<void> {
    console.log('generating index for site', e.site.blogId);
    await generate.index(e.site);
    await sendPings(e.site);
  },

  async generateError(e: GenerateErrorEvent): Promise<void> {
    console.log('generating error page for site', e.site.blogId);
    await generate.error(e.site);
  },

  async generatePost(e: GeneratePostEvent): Promise<void> {
    const post = Post.make(e.post);
    console.log('generating post for site', e.site.blogId, 'path', post.path);

    const mentions = await post.getMentions();

    await generate.post(e.site, post, mentions);
  },

  async generatePage(e: GeneratePageEvent): Promise<void> {
    const page = Page.make(e.page);
    console.log('generating page for site', e.site.blogId, 'path', page.path);
    await generate.page(e.site, page);
  },

  async generateArchiveIndex(e: GenerateIndexEvent): Promise<void> {
    console.log('generating archive index for site', e.site.blogId);
    await generate.archiveIndex(e.site);
  },

  async generateArchiveMonth(e: GenerateArchiveEvent): Promise<void> {
    console.log('generating archive for site', e.site.blogId, 'month', e.month);
    await generate.archiveMonth(e.site, e.month);
  },

  webmentionReceive: receive.handleEvent
};
