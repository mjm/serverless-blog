import Post from "../model/post";
import { MicropubUpdateInput, PropertyMap } from "./input";

export default async function update(blogId: string, input: MicropubUpdateInput): Promise<void> {
  const post = await Post.getByURL(input.url);
  if (post.blogId !== blogId) { return; }

  if (input.replace) {
    handleReplace(post, input.replace);
  }

  if (input.add) {
    handleAdd(post, input.add);
  }

  if (input.delete) {
    handleDelete(post, input.delete);
  }

  await post.save();
}

function handleReplace(post: Post, props: PropertyMap) {
  for (const key of Object.keys(props)) {
    post.set(key, props[key]);
  }
}

function handleAdd(post: Post, props: PropertyMap) {
  for (const key of Object.keys(props)) {
    const current = post[key];
    if (!current) {
      post.set(key, props[key]);
    } else if (current.constructor === Array) {
      post.set(key, current.concat(props[key]));
    }
  }
}

function handleDelete(post: Post, props: string[] | PropertyMap) {
  if (Array.isArray(props)) {
    for (const key of props as string[]) {
      delete post[key];
    }
  } else {
    for (const key of Object.keys(props)) {
      const current = post[key];
      if (current.constructor === Array) {
        post.set(key, current.filter((v: any) => !props[key].includes(v)));
      }
    }
  }
}
