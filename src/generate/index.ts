import * as SQS from "aws-sdk/clients/sqs";
import beeline from "honeycomb-beeline";
import * as _ from "lodash";

import { archive } from "../model/cache";
import Page from "../model/page";
import Post from "../model/post";
import { queue, queueUrl } from "../model/queue";
import * as site from "../model/site";

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
  options = options || {};

  beeline.addContext({
    "generate.index": options.index,
    "generate.error": options.error,
    "generate.posts": JSON.stringify(options.posts),
    "generate.pages": JSON.stringify(options.pages),
    "generate.archives": JSON.stringify(options.archives),
  });

  const config = await site.getConfig(blogId);
  const requests = await planRequests(config, options);

  beeline.addContext({ "generate.request_count": requests.length });

  // only 10 messages allowed in a batch
  for (const rs of _.chunk(requests, 10)) {
    await queue.sendMessageBatch({
      QueueUrl: queueUrl,
      Entries: rs,
    }).promise();
  }
}

async function planRequests(s: site.Config,
                            options: GenerateSiteOptions): Promise<SQS.SendMessageBatchRequestEntryList> {
  const requests: SQS.SendMessageBatchRequestEntryList = [];

  const addEvent = (type: string, id: string, body?: any) => {
    requests.push({
      Id: id,
      MessageBody: JSON.stringify({ site: s, ...(body || {}) }),
      MessageAttributes: {
        eventType: { StringValue: type, DataType: "String" },
      },
    });
  };

  let posts: Post[] = [];
  if (options.posts) {
    if (options.posts === "all") {
      posts = await Post.all(s.blogId);

      // while we've already loaded all the posts, let's go rebuild the archive cache.
      await archive.rebuild(s.blogId, posts);
    } else if (options.posts === "recent") {
      posts = await Post.recent(s.blogId);
    } else {
      // It's not very cheap to do this with many post paths
      posts = await Promise.all(options.posts.map((path) => Post.get(s.blogId, path)));
    }
  }

  let pages: Page[] = [];
  if (options.pages) {
    if (options.pages === "all") {
      pages = await Page.all(s.blogId);
    } else {
      pages = await Promise.all(options.pages.map((path) => Page.get(s.blogId, path)));
    }
  }

  if (options.archives === "all") {
    options.archives = await archive.getMonths(s.blogId);
  }

  // Add the events to the list

  if (options.index) {
    addEvent("generateIndex", "index");
  }

  if (options.error) {
    addEvent("generateError", "error");
  }

  posts.forEach((p, i) => {
    addEvent("generatePost", `post-${i}`, { post: p });
  });

  pages.forEach((p, i) => {
    addEvent("generatePage", `page-${i}`, { page: p });
  });

  if (options.archives && options.archives.length > 0) {
    addEvent("generateArchiveIndex", "archive-index");
    for (const month of options.archives) {
      addEvent("generateArchiveMonth", `archive-${month}`, { month });
    }
  }

  return requests;
}
