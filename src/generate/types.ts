import { runtime } from "nunjucks";

export interface DecoratedPost {
  type: string;
  path: string;
  name?: string;
  content: runtime.SafeString;
  published: Date;
  permalink: string;
}

export interface DecoratedPage {
  path: string;
  name: string;
  content: string;
  renderedContent: runtime.SafeString;
  permalink: string;
}
