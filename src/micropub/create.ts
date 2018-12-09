import { MicropubCreateInput } from "./input";
import Post, { PostData } from "../model/post";

export default async function create(blogId: string, input: MicropubCreateInput): Promise<Post> {
  let newPost: PostData = {
    ...input,
    blogId,
    type: input.type,
    name: input.name || '',
    content: input.content,
    published: input.published
  };

  // Don't bring the action from the Micropub input
  delete newPost.action;

  // Don't include an access token if it was passed in the body
  delete newPost.access_token;

  // posts from Micropub are never drafts
  if (!newPost.published) {
    newPost.status = "published";
  }

  if (newPost['mp-slug']) {
    newPost.slug = newPost['mp-slug'];
    delete newPost['mp-slug'];
  }

  return await Post.create(newPost);
}
