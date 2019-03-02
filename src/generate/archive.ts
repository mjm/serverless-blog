import { format, parse } from "date-fns";

import { archive } from "../model/cache";
import Post from "../model/post";
import { Config } from "../model/site";

import { decorate } from "./post";
import publish from "./publish";
import * as renderer from "./renderer";

export async function generateIndex(site: Config): Promise<void> {
  const monthStrings = await archive.getMonths(site.blogId);
  const months = monthStrings.map(makeMonth);

  const r = renderer.get(site);

  console.log("rendering archive index");
  const body = await r("archive.html", { site, months });

  console.log("publishing archive/index.html");
  await publish(site, "archive/index.html", body);
}

export async function generateMonth(site: Config, m: string): Promise<void> {
  const ps = await Post.forMonth(site.blogId, m);
  const posts = await decorate(ps);
  const month = makeMonth(m);

  const r = renderer.get(site);

  console.log(`rendering archive month ${m}`);
  const body = await r("archiveMonth.html", { site, month, posts });

  const dest = `${month.permalink.substring(1)}index.html`;

  console.log("publishing archive", m, "to", dest);
  await publish(site, dest, body);
}

interface Month {
  date: Date;
  permalink: string;
}

function makeMonth(m: string): Month {
  const date = parse(m);
  return {
    date,
    permalink: `/${format(date, "YYYY/MM")}/`,
  };
}
