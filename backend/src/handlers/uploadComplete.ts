import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});

interface UploadCompleteRequest {
  fileId: string;
}

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
  },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Upload complete event:', JSON.stringify(event, null, 2));

    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
      return createResponse(401, { error: 'User not authenticated' });
    }

    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { fileId }: UploadCompleteRequest = JSON.parse(event.body);

    if (!fileId) {
      return createResponse(400, { error: 'fileId is required' });
    }

    // Get file metadata from DynamoDB
    const getResult = await dynamoClient.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME!,
      Key: marshall({ userId, fileId }),
    }));

    if (!getResult.Item) {
      return createResponse(404, { error: 'File not found' });
    }

    const fileMetadata = unmarshall(getResult.Item);

    // Check if file exists in S3
    try {
      const headResult = await s3Client.send(new HeadObjectCommand({
        Bucket: process.env.BUCKET_NAME!,
        Key: fileMetadata.s3Key,
      }));

      // Update file status and actual size
      await dynamoClient.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME!,
        Key: marshall({ userId, fileId }),
        UpdateExpression: 'SET #status = :status, actualSize = :actualSize, completedAt = :completedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': 'uploaded',
          ':actualSize': headResult.ContentLength || 0,
          ':completedAt': new Date().toISOString(),
        }),
      }));

      console.log('File upload completed successfully:', { fileId, s3Key: fileMetadata.s3Key });

      return createResponse(200, {
        message: 'File upload completed successfully',
        fileId,
        fileName: fileMetadata.fileName,
        actualSize: headResult.ContentLength,
      });

    } catch (s3Error) {
      console.error('File not found in S3:', s3Error);
      return createResponse(400, { error: 'File was not uploaded to S3' });
    }

  } catch (error: any) {
    console.error('Upload complete error:', error);
    return createResponse(500, {
      error: 'Failed to complete upload',
      details: error.message,
    });
  }
};
