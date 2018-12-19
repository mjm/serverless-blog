import { APIGatewayProxyHandler } from 'aws-lambda';
import middy from "middy";
import * as mw from "middy/middlewares";

import { errorHandler } from "../middlewares";
import * as site from "../model/site";
import Post, { PostData } from "../model/post";
import Page, { PageData } from "../model/page";
import * as generate from "../generate";
import generateSite, { GenerateSiteOptions } from "../generate";
import sendPings from "../generate/ping";
import * as renderer from "../generate/renderer";

interface GenerateInput extends GenerateSiteOptions {
  blogId: string;
}

export const handleHttp = middy(async (event, context) => {
  const input = event.body as GenerateInput;
  await generateSite(input.blogId, input);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "success",
      message: "Your website was queued for regeneration."
    })
  }
});

handleHttp
  .use(mw.httpHeaderNormalizer())
  .use(mw.jsonBodyParser())
  .use(errorHandler());

export async function handleEvent(event, context): Promise<void> {
  renderer.invalidate();
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
  page: PageData;
}

interface GenerateArchiveEvent extends GenerateEvent {
  month: string;
}

const eventHandlers = {
  async generateIndex(e: GenerateIndexEvent): Promise<void> {
    console.log('generating index for site', e.site.blogId);
    await generate.index(e.site);
    await sendPings(e.site);
  },

  async generatePost(e: GeneratePostEvent): Promise<void> {
    const post = Post.make(e.post);
    console.log('generating post for site', e.site.blogId, 'path', post.path);
    await generate.post(e.site, post);
  },

  async generatePage(e: GeneratePageEvent): Promise<void> {
    const page = new Page(e.page);
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
  }
};
