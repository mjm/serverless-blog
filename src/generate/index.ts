import * as _ from 'lodash';
import * as SQS from 'aws-sdk/clients/sqs';

import { archive } from "../model/cache";
import Page from "../model/page";
import Post from "../model/post";
import * as site from "../model/site";
import { queue, queueUrl } from "../model/queue";

// expose the individual generator functions
export { generateIndex as archiveIndex, generateMonth as archiveMonth } from "./archive";
export { default as index } from "./home";
export { default as error } from "./error";
export { default as page } from "./page";
export { default as post } from "./post";

export interface GenerateSiteOptions {
  index?: boolean;
  error?: boolean;
  posts?: "all" | "recent" | string[];
  pages?: "all" | string[];
  archives?: "all" | string[];
}

export default async function generate(blogId: string, options?: GenerateSiteOptions): Promise<void> {
  const config = await site.getConfig(blogId);
  const requests = await planRequests(config, options || {});

  // only 10 messages allowed in a batch
  for (const rs of _.chunk(requests, 10)) {
    await queue.sendMessageBatch({
      QueueUrl: queueUrl,
      Entries: rs
    }).promise();
  }
}

async function planRequests(site: site.Config, options: GenerateSiteOptions): Promise<SQS.SendMessageBatchRequestEntryList> {
  let requests: SQS.SendMessageBatchRequestEntryList = [];

  const addEvent = (type: string, id: string, body?: any) => {
    requests.push({
      Id: id,
      MessageBody: JSON.stringify({ site, ...(body || {}) }),
      MessageAttributes: {
        eventType: { StringValue: type, DataType: 'String' }
      }
    });
  };

  let posts: Post[] = [];
  if (options.posts) {
    if (options.posts === 'all') {
      posts = await Post.all(site.blogId);

      // while we've already loaded all the posts, let's go rebuild the archive cache.
      await archive.rebuild(site.blogId, posts);
    } else if (options.posts === 'recent') {
      posts = await Post.recent(site.blogId);
    } else {
      // It's not very cheap to do this with many post paths
      posts = await Promise.all(options.posts.map(path => Post.get(site.blogId, path)));
    }
  }

  let pages: Page[] = [];
  if (options.pages) {
    if (options.pages === 'all') {
      pages = await Page.all(site.blogId);
    } else {
      pages = await Promise.all(options.pages.map(path => Page.get(site.blogId, path)));
    }
  }

  if (options.archives === 'all') {
    options.archives = await archive.getMonths(site.blogId);
  }

  // Add the events to the list

  if (options.index) {
    addEvent('generateIndex', 'index');
  }

  if (options.error) {
    addEvent('generateError', 'error');
  }

  posts.forEach((p, i) => {
    addEvent('generatePost', `post-${i}`, { post: p });
  });

  pages.forEach((p, i) => {
    addEvent('generatePage', `page-${i}`, { page: p });
  });

  if (options.archives && options.archives.length > 0) {
    addEvent('generateArchiveIndex', 'archive-index');
    for (const month of options.archives) {
      addEvent('generateArchiveMonth', `archive-${month}`, { month });
    }
  }

  return requests;
}
