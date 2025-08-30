// backend/src/handlers/upload.ts
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { marshall } from '@aws-sdk/util-dynamodb';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize?: number;
}

interface FileMetadata {
  userId: string;
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  uploadedAt: string;
  status: string;
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

const validateFileUpload = (data: UploadRequest): string[] => {
  const errors: string[] = [];

  if (!data.fileName || data.fileName.trim().length === 0) {
    errors.push('fileName is required');
  }

  if (!data.fileType || data.fileType.trim().length === 0) {
    errors.push('fileType is required');
  }

  if (data.fileSize && data.fileSize > 50 * 1024 * 1024) { // 50MB limit
    errors.push('File size cannot exceed 50MB');
  }

  // Allowed file types
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/json',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (data.fileType && !allowedTypes.includes(data.fileType)) {
    errors.push(`File type ${data.fileType} is not allowed`);
  }

  return errors;
};

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Upload event:', JSON.stringify(event, null, 2));

    // Get user ID from Cognito JWT token
    const userId = event.requestContext.authorizer?.claims?.sub;
    const userEmail = event.requestContext.authorizer?.claims?.email;

    if (!userId) {
      return createResponse(401, { error: 'User not authenticated' });
    }

    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const uploadData: UploadRequest = JSON.parse(event.body);

    // Validate input
    const validationErrors = validateFileUpload(uploadData);
    if (validationErrors.length > 0) {
      return createResponse(400, { errors: validationErrors });
    }

    const { fileName, fileType, fileSize = 0 } = uploadData;

    // Generate unique file ID and S3 key
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sanitizedFileName = sanitizeFileName(fileName);
    const s3Key = `users/${userId}/${fileId}_${sanitizedFileName}`;

    // Generate pre-signed URL for upload
    const putCommand = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: s3Key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: 300, // 5 minutes
    });

    // Save file metadata to DynamoDB
    const fileMetadata: FileMetadata = {
      userId,
      fileId,
      fileName,
      fileType,
      fileSize,
      s3Key,
      uploadedAt: new Date().toISOString(),
      status: 'pending_upload',
    };

    await dynamoClient.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME!,
      Item: marshall(fileMetadata),
    }));

    console.log('Upload URL generated successfully:', { fileId, s3Key });

    return createResponse(200, {
      message: 'Upload URL generated successfully',
      uploadUrl,
      fileId,
      expiresIn: 300,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return createResponse(500, {
      error: 'Failed to generate upload URL',
      details: error.message,
    });
  }
};
