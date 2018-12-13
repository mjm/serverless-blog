import { runtime } from "nunjucks";

export interface DecoratedPost {
  type: string;
  path: string;
  name?: string;
  content: runtime.SafeString;
  published: Date;
  photo?: string[];
  syndication?: string[];
  permalink: string;
}

export interface DecoratedPage {
  path: string;
  name: string;
  content: runtime.SafeString;
  permalink: string;
}
