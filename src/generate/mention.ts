import { runtime } from "nunjucks";
import Mention from "../model/mention";
import { DecoratedMention, MentionKind } from "./types";

export function decorate(mention: Mention): DecoratedMention;
export function decorate(mentions: Mention[]): DecoratedMention[];

export function decorate(mentionOrArray: Mention | Mention[]): DecoratedMention | DecoratedMention[] {
  if (mentionOrArray.constructor === Array) {
    const mentions = mentionOrArray as Mention[];
    return mentions.map((p) => decorate(p));
  } else {
    const m = mentionOrArray as Mention;
    const item = m.item;

    let rendered: string | runtime.SafeString = "";
    if (item.content) {
      if (typeof item.content === "string") {
        rendered = item.content;
      } else if (typeof item.content.html === "string") {
        rendered = new runtime.SafeString(item.content.html);
      }
    }

    const decorated: DecoratedMention = {
      type: item.type,
      kind: mentionKind(m),
      url: item.url,
      content: rendered,
      published: m.publishedDate,
      author: item.author,
    };
    return decorated;
  }
}

function mentionKind(m: Mention): MentionKind {
  if ("in-reply-to" in m.item) {
    return "reply";
  } else if ("like-of" in m.item) {
    return "like";
  } else {
    return "mention";
  }
}
