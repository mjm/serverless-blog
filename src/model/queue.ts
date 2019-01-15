import SQS from "aws-sdk/clients/sqs";

export const queueUrl: string = process.env.QUEUE_URL || "";
export const queue = new SQS();
