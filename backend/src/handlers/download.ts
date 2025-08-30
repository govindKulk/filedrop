// backend/src/handlers/download.ts
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, GetItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});

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
    console.log('Download event:', JSON.stringify(event, null, 2));

    const userId = event.requestContext.authorizer?.claims?.sub;
    const fileId = event.pathParameters?.fileId;

    if (!userId) {
      return createResponse(401, { error: 'User not authenticated' });
    }

    if (!fileId) {
      return createResponse(400, { error: 'fileId is required' });
    }

    // Get file metadata from DynamoDB
    const getResult = await dynamoClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME!,
      IndexName: "fileId-index",
      KeyConditionExpression: "fileId = :fileId",
      ExpressionAttributeValues: marshall({
        ":fileId": fileId
      })
    }));

    if (!getResult.Items || getResult.Items.length === 0) {
      return createResponse(404, { error: 'File not found' });
    }

    const fileMetadata = unmarshall(getResult.Items[0]!);

    if (fileMetadata.status !== 'uploaded') {
      return createResponse(400, { error: 'File upload is not complete' });
    }

    // Generate pre-signed download URL
    const getCommand = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: fileMetadata.s3Key,
      ResponseContentDisposition: `attachment; filename="${fileMetadata.fileName}"`, // controls the download behavior of the file, prompts the user to download the file with the filename in browser.
      // and Content-Disposition is a header that specifies the presentation style of the file, which is in this case attachment to download.
    });

    const downloadUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 300, // 5 minutes
    });


    console.log('Download URL generated successfully:', { fileId, fileName: fileMetadata.fileName });

    return createResponse(200, {
      downloadUrl,
      fileName: fileMetadata.fileName,
      fileType: fileMetadata.fileType,
      fileSize: fileMetadata.actualSize || fileMetadata.fileSize,
      expiresIn: 300,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    });

  } catch (error: any) {
    console.error('Download error:', error);
    return createResponse(500, {
      error: 'Failed to generate download URL',
      details: error.message,
    });
  }
};
