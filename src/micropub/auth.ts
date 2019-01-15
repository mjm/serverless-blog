import { PolicyDocument } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import uuid from "uuid/v4";

const tokenSecret = Buffer.from(process.env.JWT_SECRET || '', 'base64');

export function createPolicy(allow: boolean, methodArn: string): PolicyDocument {
  return {
    Version: '2012-10-17',
    Statement: [{
      Sid: 'FirstStatement',
      Action: 'execute-api:Invoke',
      Effect: allow ? 'Allow' : 'Deny',
      Resource: methodArn
    }]
  };
}

export function createToken(me: string, scope: string): string {
  return jwt.sign({ scope: scope }, tokenSecret, {
    issuer: 'https://blog-api.mattmoriarity.com/token',
    subject: me,
    jwtid: uuid()
  });
}

export function verifyToken(token: string): TokenDetails {
  const { sub, scope } = jwt.verify(token, tokenSecret);
  return { me: sub, scope };
}

interface TokenDetails {
  me: string;
  scope: string;
}
