import SQS from "aws-sdk/clients/sqs";

export const generateQueueUrl: string = process.env.GENERATE_QUEUE_URL;
export const queue = new SQS();
