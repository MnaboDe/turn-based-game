import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const WAITING_QUEUE_TABLE = process.env.WAITING_QUEUE_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;
const QUEUE_TTL_SECONDS = 120;

export {
  dynamoClient,
  docClient,
  WAITING_QUEUE_TABLE,
  MATCHES_TABLE,
  QUEUE_TTL_SECONDS,
};