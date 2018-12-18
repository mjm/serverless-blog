import * as _ from 'lodash';
import { DynamoDBStreamHandler, DynamoDBStreamEvent } from 'aws-lambda';
import { Converter } from 'aws-sdk/clients/dynamodb';
import * as SQS from 'aws-sdk/clients/sqs';

import * as site from "../model/site";
import { queue, generateQueueUrl as queueUrl } from "../model/queue";

export const dbTrigger: DynamoDBStreamHandler = async (event, context) => {
  const recordsByBlogId = collectRecords(event);

  for (const [blogId, records] of recordsByBlogId) {
    // many requests will need this info, so we should preload it
    const config = await site.getConfig(blogId);
    const requests = planRequests(config, records);

    for (const rs of _.chunk(requests, 10)) {
      await queue.sendMessageBatch({
        QueueUrl: queueUrl,
        Entries: rs
      }).promise();
    }
  }
};

function collectRecords(event: DynamoDBStreamEvent): Map<string, any> {
  let records = new Map<string, any>();

  for (let r of event.Records) {
    const blogId = r.dynamodb.Keys.blogId.S;
    let rs = records.get(blogId);
    if (!rs) {
      rs = [];
      records.set(blogId, rs);
    }

    if (r.dynamodb.NewImage) {
      rs.push(Converter.unmarshall(r.dynamodb.NewImage));
    }
  }

  return records;
}

function planRequests(site: site.Config, records: any[]): SQS.SendMessageBatchRequestEntryList {
  let requests: SQS.SendMessageBatchRequestEntryList = [];
  let includeIndex = false;

  const addEvent = (type, id, body?) => {
    requests.push({
      Id: id,
      MessageBody: JSON.stringify({ site, ...(body || {}) }),
      MessageAttributes: {
        eventType: { StringValue: type, DataType: 'String' }
      }
    });
  };

  let archiveMonths = new Set<string>();
  records.forEach((r, i) => {
    console.log('got record', r);
    if (r.path.startsWith('posts/')) {
      includeIndex = true;

      addEvent('generatePost', `record-${i}`, { post: r });

      if (r.published) {
        // grab the year and month: YYYY-MM
        archiveMonths.add(r.published.substr(0, 7));
      }
    } else if (r.path.startsWith('pages/')) {
      addEvent('generatePage', `record-${i}`, { page: r });
    } else if (r.path === 'cache/archive') {
      addEvent('generateArchiveIndex', `archive-index-${i}`);
    }
  });

  for (const month of archiveMonths) {
    addEvent('generateArchiveMonth', `archive-${month}`, { month });
  }

  if (includeIndex) {
    addEvent('generateIndex', 'index');
  }

  return requests;
}
