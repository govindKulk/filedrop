# FileDrop - Serverless File Sharing Platform

A production-ready Ephemeral File sharing platform built using AWS Serverless Stack : Lambda, S3, DynamoDb, SES, Cognito, AWS CDK, SDK for Node.js

[![AWS](<https://img.shields.io/badge/AWS-serverless-orange.svg>)](<https://aws.amazon.com/>)
[![AWS](<https://img.shields.io/badge/AWS-Lambda-purple.svg>)](<https://aws.amazon.com/>)
[![AWS](<https://img.shields.io/badge/AWS-S3-green.svg>)](<https://aws.amazon.com/>)
[![AWS](<https://img.shields.io/badge/AWS-DynamoDB-emerald.svg>)](<https://aws.amazon.com/>)
[![TypeScript](<https://img.shields.io/badge/TypeScript-5.9+-blue.svg>)](<https://www.typescriptlang.org/>)
[![Node.js](<https://img.shields.io/badge/Node.js-22+-green.svg>)](<https://nodejs.org/>)
[![CDK](<https://img.shields.io/badge/AWS%20CDK-2.0+-yellow.svg>)](<https://aws.amazon.com/cdk/>)
![npm](https://img.shields.io/npm/v/aws-sdk-js-v3?label=aws-sdk-js-v3)

## 🏗️ Architecture

FileDrop implements a serverless-first architecture using AWS managed services:

```

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Client App    │───▶│   API Gateway   │───▶│   Lambda        │
│   (Postman)     │    │   + Cognito     │    │   Functions     │
│                 │    │   Authorizer    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
│                       │
│                       ▼
│              ┌─────────────────┐
│              │                 │
│              │   Amazon S3     │
│              │   (Files)       │
│              └─────────────────┘
│                       │
▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │
│   Amazon        │    │   DynamoDB      │
│   Cognito       │    │   (Metadata)    │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
│
▼
┌─────────────────┐
│                 │
│   Amazon SES    │
│   (Email)       │
└─────────────────┘

```

### Core Services
- **API Gateway**: RESTful API with JWT authentication
- **AWS Lambda**: Serverless compute (Node.js/TypeScript)
- **Amazon Cognito**: User authentication and authorization
- **Amazon S3**: Secure file storage with pre-signed URLs
- **DynamoDB**: File metadata and user data
- **Amazon SES**: Email notifications
- **AWS CDK**: Infrastructure as Code

## 🚀 Features

### Core Functionality
- ✅ **User Management**: Registration, email verification, authentication
- ✅ **Secure File Upload**: Pre-signed URLs, type validation, size limits
- ✅ **File Management**: List, download, delete operations
- ✅ **Access Control**: JWT-based authorization, user isolation
- ✅ **Email Notifications**: Welcome emails, upload confirmations
- ✅ **Audit Trail**: Upload tracking, download counts

### Technical Features
- ✅ **Infrastructure as Code**: Complete AWS CDK implementation
- ✅ **TypeScript**: Type safety across backend and infrastructure
- ✅ **Error Handling**: Comprehensive validation and error responses
- ✅ **Security**: CORS, input sanitization, least-privilege IAM
- ✅ **Monitoring**: CloudWatch logs and metrics
- ✅ **Scalability**: Serverless auto-scaling architecture

## 📁 Project Structure

```

filedrop-aws-serverless/
├── cdk/                          # AWS CDK Infrastructure
│   ├── bin/app.ts               # CDK app entry point
│   ├── lib/filedrop-stack.ts    # Main stack definition
│   ├── package.json             # CDK dependencies
│   └── cdk.json                 # CDK configuration
├── backend/                      # Lambda Functions
│   ├── src/
│   │   ├── handlers/            # API route handlers
│   │   │   ├── auth.ts         # Authentication endpoints
│   │   │   ├── upload.ts       # File upload logic
│   │   │   ├── listFiles.ts    # File listing
│   │   │   ├── download.ts     # File download
│   │   │   └── deleteFile.ts   # File deletion
│   │   ├── services/            # Business logic
│   │   │   └── emailService.ts # Email templates and sending
│   │   └── utils/               # Shared utilities
│   ├── package.json             # Runtime dependencies
│   └── tsconfig.json           # TypeScript configuration
└── [README.md](http://readme.md/)

```

## API Docs
[Swagger Documentation](https://app.swaggerhub.com/apis/govindkulkarni-43f/Filedrop/1.0.0)
<img align="center" width="400" height="779" alt="image" src="https://github.com/user-attachments/assets/7a750e65-04ba-4a36-9a75-f87c18cb5d89" />


## 🛠️ Development Setup

### Prerequisites
- **Node.js 18+** - [Download](<https://nodejs.org/>)
- **AWS CLI** - [Installation Guide](<https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html>)
- **AWS Account** with appropriate permissions
- **Domain** for SES email (optional but recommended)

### Installation

1. **Clone Repository**
   ```
   git clone https://github.com/govindKulk/filedrop.git
   cd filedrop-aws-serverless ```

1. **Install Global Dependencies**
    
    ```
    npm install -g aws-cdk typescript
    
    ```
    
2. **Configure AWS CLI**
    
    ```
    aws configure
    # Enter: Access Key ID, Secret Access Key, Region (us-east-1).
    
    ```
    
3. **Backend Setup**
    
    ```
    cd backend
    npm install
    npm run build
    
    ```
    
4. **Infrastructure Setup**
    
    ```
    cd ../cdk
    npm install
    
    ```
    
5. **Bootstrap CDK (One-time)**
    
    ```
    cdk bootstrap
    
    ```
    

### Deployment

```

# Build backend
cd backend && npm run build

# Deploy infrastructure
cd ../cdk && cdk deploy

# Note the outputs: API URL, User Pool ID, etc.

```

### SES Email Configuration (Optional)

1. **Verify Domain in AWS SES Console**
2. **Add DNS Records to Domain Provider**
3. **Update email configuration in code**

## 📖 API Documentation

### Base URL
Get it from cloud formation outputs from cdk deploy step.

### Authentication Endpoints

### POST `/auth/signup`

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe"
}

```

**Response:**

```json
{
  "message": "User registered successfully. Please check your email for verification code.",
  "userSub": "uuid-string"
}

```

### POST `/auth/confirm`

Confirm email address with verification code.

**Request Body:**

```json
{
  "email": "user@example.com",
  "confirmationCode": "123456"
}

```

### POST `/auth/signin`

Authenticate user and receive JWT tokens.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}

```

**Response:**

```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMi..."
}

```

### Protected Endpoints

**All file operations require `Authorization: Bearer <access_token>` header.**

### POST `/files/upload`

Generate pre-signed URL for file upload.

**Request Body:**

```json
{
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 1024000
}

```

**Response:**

```json
{
  "message": "Upload URL generated successfully",
  "uploadUrl": "<https://filedrop-files-bucket.s3.amazonaws.com/>...",
  "fileId": "file_1693123456789_abc123",
  "expiresIn": 300
}

```

### POST `/files/complete`

Mark file upload as complete after S3 upload.

**Request Body:**

```json
{
  "fileId": "file_1693123456789_abc123"
}

```

### GET `/files`

List all user's files with metadata.

**Response:**

```json
{
  "files": [
    {
      "fileId": "file_1693123456789_abc123",
      "fileName": "document.pdf",
      "fileType": "application/pdf",
      "fileSize": 1024000,
      "uploadedAt": "2023-08-27T10:30:45.123Z",
      "status": "uploaded"
    }
  ],
  "totalFiles": 1,
  "uploadedFiles": 1,
  "totalSize": 1024000,
  "storageUsed": "1.00 MB"
}

```

### GET `/files/{fileId}/download`

Generate pre-signed URL for file download.

**Response:**

```json
{
  "downloadUrl": "<https://filedrop-files-bucket.s3.amazonaws.com/>...",
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 1024000,
  "expiresIn": 3600,
  "expiresAt": "2023-08-27T11:30:45.123Z"
}

```

### DELETE `/files/{fileId}`

Delete file from both S3 and DynamoDB.

**Response:**

```json
{
  "message": "File deleted successfully",
  "fileId": "file_1693123456789_abc123",
  "fileName": "document.pdf",
  "deletedAt": "2023-08-27T10:35:45.123Z"
}

```

## 💰 Cost Analysis

### AWS Free Tier Eligibility

- **Lambda**: 1M requests + 400,000 GB-seconds per month
- **DynamoDB**: 25GB storage + 200M read/write requests per month
- **S3**: 5GB storage + 20,000 GET + 2,000 PUT requests per month
- **Cognito**: 50,000 monthly active users
- **SES**: Limited free tier for emails

### Estimated Production Costs (Beyond Free Tier)

| Service | Usage | Monthly Cost |
| --- | --- | --- |
| API Gateway | 1M requests | $3.50 |
| Lambda | 1M invocations | $0.20 |
| S3 | 10GB storage | $0.23 |
| DynamoDB | On-demand pricing | $1.25/million requests |
| SES | 1,000 emails | $0.10 |

**Total estimated cost for moderate usage: ~$5-10/month**

## 🔒 Security Features

- **Authentication**: JWT tokens via AWS Cognito
- **Authorization**: API Gateway Cognito authorizers
- **Data Isolation**: User-scoped file access
- **Secure File Access**: Pre-signed URLs with expiration
- **Input Validation**: Request body and file type validation
- **CORS Configuration**: Proper cross-origin resource sharing
- **IAM Permissions**: Least-privilege access policies
- **Encryption**: S3 server-side encryption (AES-256)

## 📊 Monitoring & Observability

### CloudWatch Integration

- **Lambda Logs**: Function execution logs and errors
- **API Gateway**: Request/response logging and metrics

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://www.notion.so/LICENSE) file for details.

## 👨‍💻 Author

**Govind Kulkarni**

- **GitHub**: [@govindKulk](https://github.com/govindKulk)
- **Email**: [kulkarnigovind2003@gmail.com](mailto:kulkarnigovind2003@gmail.com)
- **LinkedIn**: [linkedin.com/in/govind-kulkarni-44aa71228](https://www.linkedin.com/in/govind-kulkarni-44aa71228/)
- **Portfolio**: [govindkulkarni.me](https://govindkulkarni.me)

## 🙏 Acknowledgments

- AWS Documentation and Best Practices
- AWS CDK Community
- Serverless Architecture Patterns
- TypeScript and Node.js Communities

---

**Built with ❤️ as a portfolio demonstration of modern serverless architecture patterns on AWS.**

