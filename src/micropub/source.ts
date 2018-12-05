import Post from "../model/post";

interface MicropubSource {
  type: string[];
  properties: {[key: string]: any[]};
}

export default async function source(url: string): Promise<MicropubSource> {
  const post = await Post.getByURL(url);
  let result = {
    type: [ `h-${post.type}` ],
    properties: {}
  };

  for (let key of post.properties) {
    const val = post.get(key);
    if (val.constructor === Array) {
      result.properties[key] = val;
    } else {
      result.properties[key] = [val];
    }
  }

  return result;
}
