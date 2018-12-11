import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export function check(event: APIGatewayProxyEvent, scopes: string | string[]): null | APIGatewayProxyResult {
  const eventScopes = (event.requestContext.authorizer.scope || '').split(' ');
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

  const body = {
    error: 'insufficient_scope',
    error_description: `Missing required scope: ${scopeText}. Your token has scopes: ${eventScopes.join(', ')}.`
  };

  return {
    statusCode: 403,
    body: JSON.stringify(body)
  };
}
