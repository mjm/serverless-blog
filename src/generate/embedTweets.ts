import fetch from "node-fetch";

export default async function embedTweets(str: string): Promise<string> {
  // TODO this is a pretty crummy way to match this
  const tweetRegex = /https:\/\/twitter.com\/[A-Za-z0-9_]+\/status\/\d+(?:\?s=\d+)?/g;

  let embedded = str;
  let result;
  while ((result = tweetRegex.exec(embedded)) !== null) {
    const url = result[0];
    const tweetHtml = await getTweetHtml(url);

    embedded = embedded.substring(0, result.index) + tweetHtml + embedded.substring(result.index + url.length)
    tweetRegex.lastIndex = result.index + tweetHtml.length;
  }

  return embedded;
}

async function getTweetHtml(url: string): Promise<string> {
  console.log(`attempting to embed tweet URL ${url}`);
  const oembedUrl = `https://publish.twitter.com/oembed?url=${url}`;
  const response = await fetch(oembedUrl);
  if (response.ok) {
    const json = await response.json();
    return json.html;
  } else {
    return `<a href="${url}">${url}</a>`
  }
}
