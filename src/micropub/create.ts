import { MicropubCreateInput } from "./input";
import * as post from "../model/post";

export default async function create(blogId: string, input: MicropubCreateInput): Promise<post.Post> {
  let newPost: post.Post = {
    blogId,
    title: input.name || '',
    content: input.content,
    publishedAt: input.published
  };

  // posts from Micropub are never drafts
  if (!newPost.publishedAt) {
    newPost.status = "published";
  }

  return await post.create(newPost);
}
