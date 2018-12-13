import { APIGatewayProxyResult } from "aws-lambda";
import httpError from "http-errors";

export default class ScopeBag {
  private scopes: string[];

  constructor(scope: string) {
    this.scopes = (scope || '').split(' ').filter(s => s != '');
  }

  require(...scopes: string[]): void {
    for (const s of scopes) {
      if (this.scopes.includes(s)) {
        console.log(`Current request has ${s} scope, allowing.`);
        return;
      }
    }

    this.throwError(scopes);
  }

  private throwError(scopes: string[]): void {
    let scopeText: string;
    if (scopes.length > 1) {
      scopeText = 'one of: ' + scopes.join(', ');
    } else {
      scopeText = scopes[0];
    }

    throw httpError(401, `Missing required scope: ${scopeText}. Your token has scopes: ${this.scopes.join(', ')}.`, { code: 'insufficient_scope' });
  }
}
