import { APIGatewayProxyHandler } from 'aws-lambda';

import * as site from "../model/site";
import Post, { PostData } from "../model/post";
import { Page } from "../model/page";
import * as generate from "../generate";
import generateSite, { GenerateSiteOptions } from "../generate";
import sendPings from "../generate/ping";

interface GenerateInput extends GenerateSiteOptions {
  blogId: string;
}

export const handleHttp: APIGatewayProxyHandler = async (event, context) => {
  const input = JSON.parse(event.body) as GenerateInput;
  await generateSite(input.blogId, input);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "success",
      message: "Your website was queued for regeneration."
    })
  }
};

export async function handleEvent(event, context): Promise<void> {
  await Promise.all(event.Records.map(handleMessage));
}

async function handleMessage(message): Promise<void> {
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

interface GeneratePostEvent extends GenerateEvent {
  post: PostData;
}

interface GeneratePageEvent extends GenerateEvent {
  page: Page;
}

interface GenerateArchiveEvent extends GenerateEvent {
  month: string;
}

const eventHandlers = {
  async generateIndex(e: GenerateIndexEvent): Promise<void> {
    await generate.index(e.site);
    await sendPings(e.site);
  },

  async generatePost(e: GeneratePostEvent): Promise<void> {
    const post = new Post(e.post);
    await generate.post(e.site, post);
  },

  async generatePage(e: GeneratePageEvent): Promise<void> {
    await generate.page(e.site, e.page);
  },

  async generateArchiveIndex(e: GenerateIndexEvent): Promise<void> {
    await generate.archiveIndex(e.site);
  },

  async generateArchiveMonth(e: GenerateArchiveEvent): Promise<void> {
    await generate.archiveMonth(e.site, e.month);
  }
};
