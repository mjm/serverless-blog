import { URL } from "url";

import ScopeBag from "../util/scope";

/**
 * Adds authorizer information to the event.
 *
 * New keys:
 *
 * - `blogId`: The ID of the blog the token was issued for
 * - `scopes`: An array of scopes the token was granted
 */
const authorizer = () => {
  return {
    async before(handler) {
      const authorizerData = handler.event.requestContext.authorizer;
      if (!authorizerData) {
        return;
      }

      const principalId = authorizerData.principalId;
      const hostname = new URL(principalId).hostname;
      const blogId = hostname.replace(/\.s3-website-.*/, '');
      const scopes = new ScopeBag(authorizerData.scope);

      handler.event.blogId = blogId;
      handler.event.scopes = scopes;
    }
  };
};

export default authorizer;
