import * as cdk from 'aws-cdk-lib';
import { Bucket, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as iam from 'aws-cdk-lib/aws-iam'

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // file storage buckets

    const filesBucket = new Bucket(this, "FileStorageBucket", {
      bucketName: `file-storage-bucket-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedOrigins: ["*"],
          allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST, HttpMethods.DELETE],
          allowedHeaders: ["*"],
          maxAge: 3000
        }
      ]
    })

    // file metadata storage dynamodb table
    const filesTable = new dynamodb.Table(this, "FilesMetadataTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "fileId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    filesTable.addGlobalSecondaryIndex({
      indexName: 'fileId-index',
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
    });


    // cognito user pool
    const userPool = new cognito.UserPool(this, "FileDropUserPool", {
      userPoolName: "filedrop-users",
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        phone: true
      },
      autoVerify: {
        email: true,
        phone: true
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,

    })

    const userPoolClient = new cognito.UserPoolClient(this, "FileDropUserPoolClient", {
      userPool,
      userPoolClientName: "filedrop-web-client",
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      }

    })

    // auth functions - signup
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/auth.signUp',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_POOL_ID: userPool.userPoolId,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // auth functions - login
    const signInFunction = new lambda.Function(this, 'SignInFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/auth.signIn',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_POOL_ID: userPool.userPoolId,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // auth functions - confirm
    const confirmSignUpFunction = new lambda.Function(this, 'ConfirmSignUpFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/auth.confirmSignUp',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_POOL_ID: userPool.userPoolId,
      },
      timeout: cdk.Duration.seconds(30),
    });


    // Grant Cognito permissions to Lambda
    const cognitoPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:SignUp',
        'cognito-idp:InitiateAuth',
        'cognito-idp:ConfirmSignUp',
        'cognito-idp:ResendConfirmationCode',
      ],
      resources: [userPool.userPoolArn],
    });

    authFunction.addToRolePolicy(cognitoPolicy);
    signInFunction.addToRolePolicy(cognitoPolicy);
    confirmSignUpFunction.addToRolePolicy(cognitoPolicy);

    // file upload function

    // file retrieval function.

    // file delete function

    // file auto delete rule after 5 minutes.

    // api gateway
    // API Gateway
    const api = new apigateway.RestApi(this, 'FiledropApi', {
      restApiName: 'filedrop-api',
      description: 'FileDrop Serverless File Sharing API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Auth endpoints
    const authResource = api.root.addResource('auth');
    authResource.addResource('signup').addMethod('POST',
      new apigateway.LambdaIntegration(authFunction)
    );
    authResource.addResource('signin').addMethod('POST',
      new apigateway.LambdaIntegration(signInFunction)
    );
    authResource.addResource('confirm').addMethod('POST',
      new apigateway.LambdaIntegration(confirmSignUpFunction)
    );

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'FiledropAuthorizer', {
      cognitoUserPools: [userPool],
      identitySource: 'method.request.header.Authorization',
    });

    // Upload Lambda function
    const uploadFunction = new lambda.Function(this, 'UploadFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/upload.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        BUCKET_NAME: filesBucket.bucketName,
        TABLE_NAME: filesTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant S3 and DynamoDB permissions
    filesBucket.grantReadWrite(uploadFunction);
    filesTable.grantReadWriteData(uploadFunction);

    // Protected files endpoints
    const filesResource = api.root.addResource('files');
    filesResource.addResource('upload').addMethod('POST',
      new apigateway.LambdaIntegration(uploadFunction),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // upload complete lambda function
    const uploadCompleteFunction = new lambda.Function(this, 'UploadCompleteFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/uploadComplete.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        BUCKET_NAME: filesBucket.bucketName,
        TABLE_NAME: filesTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    filesBucket.grantRead(uploadCompleteFunction);
    filesTable.grantReadWriteData(uploadCompleteFunction);

    filesResource.addResource('complete').addMethod('POST',
      new apigateway.LambdaIntegration(uploadCompleteFunction),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // --- File Management Functions / Permissions ---

    // List Files function
    const listFilesFunction = new lambda.Function(this, 'ListFilesFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/listFiles.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        TABLE_NAME: filesTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Download function
    const downloadFunction = new lambda.Function(this, 'DownloadFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/download.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        BUCKET_NAME: filesBucket.bucketName,
        TABLE_NAME: filesTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Delete function
    const deleteFileFunction = new lambda.Function(this, 'DeleteFileFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/deleteFile.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        BUCKET_NAME: filesBucket.bucketName,
        TABLE_NAME: filesTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions
    filesTable.grantReadData(listFilesFunction);
    filesBucket.grantRead(downloadFunction);
    filesTable.grantReadWriteData(downloadFunction);
    filesBucket.grantDelete(deleteFileFunction);
    filesTable.grantReadWriteData(deleteFileFunction);

    // Add endpoints
    filesResource.addMethod('GET',
      new apigateway.LambdaIntegration(listFilesFunction),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const fileResource = filesResource.addResource('{fileId}');
    fileResource.addResource('download').addMethod('GET',
      new apigateway.LambdaIntegration(downloadFunction)
    );

    fileResource.addMethod('DELETE',
      new apigateway.LambdaIntegration(deleteFileFunction),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );



    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID'
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID'
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL'
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: filesBucket.bucketName,
      description: 'S3 Bucket Name'
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: filesTable.tableName,
      description: 'DynamoDB Table Name'
    });

  }
}
