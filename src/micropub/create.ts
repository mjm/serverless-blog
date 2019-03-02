import Post, { PostData } from "../model/post";
import { MicropubCreateInput } from "./input";

export default async function create(blogId: string, input: MicropubCreateInput): Promise<Post> {
  const newPost: PostData = {
    ...input,
    blogId,
    type: input.type,
    name: input.name || "",
    content: input.content || "",
    published: input.published,
  };

  // Don't bring the action from the Micropub input
  delete newPost.action;

  // Don't include an access token if it was passed in the body
  delete newPost.access_token;

  translateKey(newPost, "mp-slug", "slug");
  translateKey(newPost, "post-status", "status");
  newPost.status = newPost.status || "published";

  return await Post.create(newPost);
}

function translateKey(o: {[key: string]: any}, oldKey: string, newKey: string) {
  if (o[oldKey]) {
    o[newKey] = o[oldKey];
    delete o[oldKey];
  }
}
