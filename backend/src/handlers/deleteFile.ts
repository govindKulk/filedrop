import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
  },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Delete file event:', JSON.stringify(event, null, 2));

    const userId = event.requestContext.authorizer?.claims?.sub;
    const fileId = event.pathParameters?.fileId;

    if (!userId) {
      return createResponse(401, { error: 'User not authenticated' });
    }

    if (!fileId) {
      return createResponse(400, { error: 'fileId is required' });
    }

    // Get file metadata first
    const getResult = await dynamoClient.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME!,
      Key: marshall({ userId, fileId }),
    }));

    if (!getResult.Item) {
      return createResponse(404, { error: 'File not found' });
    }

    const fileMetadata = unmarshall(getResult.Item);

    // Delete from S3 (if uploaded)
    if (fileMetadata.status === 'uploaded') {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.BUCKET_NAME!,
          Key: fileMetadata.s3Key,
        }));
        console.log('File deleted from S3:', fileMetadata.s3Key);
      } catch (s3Error) {
        console.error('Failed to delete from S3:', s3Error);
        // Continue with DynamoDB deletion even if S3 fails
      }
    }

    // Delete metadata from DynamoDB
    await dynamoClient.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME!,
      Key: marshall({ userId, fileId }),
    }));

    console.log('File deleted successfully:', { fileId, fileName: fileMetadata.fileName });

    return createResponse(204, {
      message: 'File deleted successfully',
      fileId,
      fileName: fileMetadata.fileName,
      deletedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Delete file error:', error);
    return createResponse(500, {
      error: 'Failed to delete file',
      details: error.message,
    });
  }
};
