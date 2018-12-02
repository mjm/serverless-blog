export function normalize(headers: {[key: string]: string}): void {
  Object.keys(headers).forEach(k => {
    headers[k.toLowerCase()] = headers[k];
  });
}
