import { DynamoDB } from "aws-sdk";

export const tableName: string = process.env.DYNAMODB_TABLE || "";
export const db = new DynamoDB.DocumentClient();
