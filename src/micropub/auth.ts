import { PolicyDocument } from "aws-lambda";

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
