import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({});

interface FileInfo {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  status: string;
  actualSize?: number;
  completedAt?: string;
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
    console.log('List files event:', JSON.stringify(event, null, 2));

    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
      return createResponse(401, { error: 'User not authenticated' });
    }

    // Query user's files from DynamoDB
    const result = await dynamoClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME!,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
      },
      ScanIndexForward: false, // Latest first
    }));

    const files: FileInfo[] = result.Items?.map(item => {
      const fileData = unmarshall(item);
      return {
        fileId: fileData.fileId,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize || 0,
        uploadedAt: fileData.uploadedAt,
        status: fileData.status,
        actualSize: fileData.actualSize,
        completedAt: fileData.completedAt,
      };
    }) || [];

    // Calculate total storage used
    const totalSize = files
      .filter(file => file.status === 'uploaded')
      .reduce((sum, file) => sum + (file.actualSize || file.fileSize || 0), 0);

    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

    console.log('Files retrieved successfully:', { count: files.length, totalSizeMB });

    return createResponse(200, {
      files,
      totalFiles: files.length,
      uploadedFiles: files.filter(f => f.status === 'uploaded').length,
      totalSize,
      totalSizeMB,
      storageUsed: `${totalSizeMB} MB`,
    });

  } catch (error: any) {
    console.error('List files error:', error);
    return createResponse(500, {
      error: 'Failed to retrieve files',
      details: error.message,
    });
  }
};
