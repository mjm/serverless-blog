import * as nunjucks from "nunjucks";
import S3Loader from "nunjucks-s3-loader";

import { Config } from "../model/site";
import * as helpers from "./helpers";

/**
 * A function for rendering a template for a user's site.
 *
 * @param name - The filename of the template, relative to the `_templates/`
 *               directory
 * @param context - The object whose fields will be available to the template
 * @returns The rendered content of the template
 */
export type Renderer = (name: string, context: any) => Promise<string>;

let cache = new Map<string, Renderer>();

/**
 * Gets a cached renderer for the given site.
 *
 * This allows us to reuse the renderer's template cache when processing multiple
 * generate messages in the same Lambda call.
 *
 * If no renderer existed for the site, it creates one and saves it for future calls.
 *
 * @param siteConfig - The site's `config` document
 * @returns A function that will render a template for the site
 */
export function get(siteConfig: Config): Renderer {
  const key = siteConfig.blogId;
  const cachedRenderer = cache.get(key);
  if (cachedRenderer) {
    return cachedRenderer;
  }

  const r = create(siteConfig);
  cache.set(key, r);
  return r;
}

/**
 * Creates a new renderer for the given site.
 *
 * The renderer will pull templates from the `_templates/` directory of the site's
 * S3 bucket.
 *
 * @param siteConfig - The site's `config` document
 * @returns A function that will render a template for the site
 */
export function create(siteConfig: Config): Renderer {
  const loader = new S3Loader({
    bucket: siteConfig.blogId,
    prefix: '_templates/'
  });
  const env = new nunjucks.Environment(loader, { autoescape: true });

  env.addFilter('dateformat', helpers.dateformat);
  env.addFilter('feedlinks', helpers.feedLinks);
  env.addFilter('micropublinks', helpers.micropubLinks);

  return async function renderer(name: string, context: any): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      env.render(name, context, (err, rendered) => {
        if (err) {
          reject(err);
        } else {
          resolve(rendered);
        }
      });
    });
  };
}

/**
 * Invalidates the renderer cache.
 *
 * This should be done before handling a request so that templates are up-to-date.
 * Lambda reuses processes between functions, so this is needed to be able to ensure
 * we are using the right version of the templates.
 */
export function invalidate(): void {
  cache.clear();
}
