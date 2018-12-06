import { MicropubDeleteInput } from "./input";
import Post from "../model/post";

export default async function deletePost(blogId: string, input: MicropubDeleteInput): Promise<void> {
  await Post.deleteByURL(blogId, input.url);
}
