import { URL } from "url";

export default function identify(principalId: string): string {
  const hostname = new URL(principalId).hostname;
  return hostname.replace(/\.s3-website-.*/, '');
}
