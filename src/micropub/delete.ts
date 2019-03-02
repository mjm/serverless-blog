import Post from "../model/post";
import { MicropubDeleteInput } from "./input";

export default async function deletePost(blogId: string, input: MicropubDeleteInput): Promise<void> {
  await Post.deleteByURL(blogId, input.url);
}
