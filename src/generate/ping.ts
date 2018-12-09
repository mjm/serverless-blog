import { URL } from "url";
import * as xmlrpc from "xmlrpc";

import { Config } from "../model/site";

export default async function sendPings(site: Config): Promise<void> {
  if (!site.pings) {
    return;
  }

  for (const pingUrl of site.pings) {
    const isSecure = pingUrl.startsWith('https'); // hacky but fine
    // I wish it figured this out from the URL for us.
    const client = isSecure ? xmlrpc.createSecureClient(pingUrl) : xmlrpc.createClient(pingUrl);

    await sendPing(client, site);
  }
}

async function sendPing(client, site: Config): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const title = site.title;
    const url = `https://${site.blogId}/`;

    client.methodCall('weblogUpdates.ping', [title, url], err => {
      if (err) {
        reject(err)
      } else {
        resolve();
      }
    });
  });
}
