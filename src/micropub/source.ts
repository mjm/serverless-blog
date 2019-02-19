import Post from "../model/post";

interface MicropubSource {
  type: string[];
  properties: {[key: string]: any[]};
}

export default async function source(url: string): Promise<MicropubSource> {
  const post = await Post.getByURL(url);
  let result: MicropubSource = {
    type: [ `h-${post.type}` ],
    properties: {
      url: [ `https://${post.blogId}${post.permalink}` ]
    }
  };

  for (let key of post.properties) {
    const val = post[key];
    if (Array.isArray(val)) {
      result.properties[key] = val;
    } else {
      result.properties[key] = [val];
    }
  }

  return result;
}
