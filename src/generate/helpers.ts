import { format } from "date-fns";
import { runtime } from "nunjucks";

import * as site from "../model/site";

export { format as dateformat };

export function micropubLinks(siteConfig: site.Config): runtime.SafeString {
  return safe(`
    <link rel="authorization_endpoint" href="https://indieauth.com/auth">
    <link rel="token_endpoint" href="https://blog-api.mattmoriarity.com/token">
    <link rel="micropub" href="https://blog-api.mattmoriarity.com/micropub">
  `);
}

export function feedLinks(siteConfig: site.Config): runtime.SafeString {
  // TODO maybe add RSS feed?
  return safe(`
    <link rel="alternate" type="application/json" href="/feed.json" title="JSON Feed">
    <link rel="alternate" type="application/atom" href="/feed.atom" title="Atom Feed">
  `);
}

function safe(str: string): runtime.SafeString {
  return new runtime.SafeString(str);
}
