import { Config } from "../model/site";
import publish from "./publish";
import * as renderer from "./renderer";

export default async function generate(site: Config): Promise<void> {
  const r = renderer.get(site);

  console.log('rendering error.html');
  const body = await r('error.html', { site });

  console.log('publishing error.html');
  await publish(site, 'error.html', body);
}
