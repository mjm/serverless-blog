import { runtime } from "nunjucks";

export interface DecoratedPost {
  type: string;
  path: string;
  name?: string;
  content: runtime.SafeString;
  published: Date | null;
  photo?: string[];
  syndication?: string[];
  permalink: string;
  mentionCount?: number;
}

export type MentionKind = "reply" | "like" | "mention";

export interface DecoratedMention {
  type: string;
  kind: MentionKind;
  url: string;
  content: string | runtime.SafeString;
  published?: Date | null;
  author?: any; // TODO maybe run this through a decorator
}

export interface DecoratedPage {
  path: string;
  name: string;
  content: runtime.SafeString;
  permalink: string;
}
