import { APIGatewayProxyResult } from "aws-lambda";
import * as httpError from "http-errors";

export function check(event, scopes: string | string[]): void {
  const eventScopes = event.scopes;
  const checkScopes = (typeof scopes === 'string') ? [ scopes ] : scopes;

  console.log('checking scopes, need:', checkScopes, 'have:', eventScopes);

  for (const s of checkScopes) {
    if (eventScopes.includes(s)) {
      // null means the request should continue
      return null;
    }
  }

  console.log('scope check failed');

  let scopeText: string;
  if (checkScopes.length > 1) {
    scopeText = 'one of: ' + checkScopes.join(', ');
  } else {
    scopeText = checkScopes[0];
  }

  throw httpError(401, `Missing required scope: ${scopeText}. Your token has scopes: ${eventScopes.join(', ')}.`, { code: 'insufficient_scope' });
}
