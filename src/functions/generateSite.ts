import { Context } from 'aws-lambda';
import middy from "middy";
import * as mw from "middy/middlewares";

import { errorHandler } from "../middlewares";
import generateSite, { GenerateSiteOptions } from "../generate";

interface GenerateInput extends GenerateSiteOptions {
  blogId: string;
}

export const handleHttp = middy(async (event: any, context: Context) => {
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
