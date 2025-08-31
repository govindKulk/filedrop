import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, SignUpCommand, InitiateAuthCommand, ConfirmSignUpCommand, EmailSendingAccountType } from '@aws-sdk/client-cognito-identity-provider';
import { EmailService } from '../services/emailService.js';

const cognitoClient = new CognitoIdentityProviderClient({});

interface SignUpRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface SignInRequest {
  email: string;
  password: string;
}

interface ConfirmSignUpRequest {
  email: string;
  confirmationCode: string;
}

const createResponse = (statusCode: number, body: { [key: string]: any }): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
  },
  body: JSON.stringify(body),
});

export const signUp = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('SignUp event:', JSON.stringify(event, null, 2));

    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { email, password, firstName, lastName }: SignUpRequest = JSON.parse(event.body);

    if (!email || !password) {
      return createResponse(400, { error: 'Email and password are required' });
    }

    const userAttributes = [
      { Name: 'email', Value: email },
    ];

    if (firstName) {
      userAttributes.push({ Name: 'given_name', Value: firstName });
    }
    if (lastName) {
      userAttributes.push({ Name: 'family_name', Value: lastName });
    }

    const command = new SignUpCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
    });

    const result = await cognitoClient.send(command);

    console.log('SignUp successful:', result);

    return createResponse(200, {
      message: 'User registered successfully. Please check your email for verification code.',
      userSub: result.UserSub,
      codeDeliveryDetails: result.CodeDeliveryDetails,
    });

  } catch (error: any) {
    console.error('SignUp error:', error);
    return createResponse(400, {
      error: error.message || 'Registration failed',
      type: error.name || 'Unknown',
    });
  }
};

export const signIn = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('SignIn event:', JSON.stringify(event, null, 2));

    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { email, password }: SignInRequest = JSON.parse(event.body);

    if (!email || password === undefined) {
      return createResponse(400, { error: 'Email and password are required' });
    }

    const command = new InitiateAuthCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const result = await cognitoClient.send(command);

    console.log('SignIn successful:', result);

    return createResponse(200, {
      message: 'Login successful',
      accessToken: result.AuthenticationResult?.AccessToken,
      idToken: result.AuthenticationResult?.IdToken,
      refreshToken: result.AuthenticationResult?.RefreshToken,
      expiresIn: result.AuthenticationResult?.ExpiresIn,
    });

  } catch (error: any) {
    console.error('SignIn error:', error);
    return createResponse(401, {
      error: error.message || 'Authentication failed',
      type: error.name || 'Unknown',
    });
  }
};

export const confirmSignUp = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('ConfirmSignUp event:', JSON.stringify(event, null, 2));

    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { email, confirmationCode }: ConfirmSignUpRequest = JSON.parse(event.body);

    if (!email || !confirmationCode) {
      return createResponse(400, { error: 'Email and confirmation code are required' });
    }

    const command = new ConfirmSignUpCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      Username: email,
      ConfirmationCode: confirmationCode,
    });

    await cognitoClient.send(command);

    console.log('Email confirmation successful');
    const emailService = new EmailService();

    let emailSuccess = false;
    try {

      const welcomeEmail = emailService.generateWelcomeEmail(email);
      const emailSent = await emailService.sendEmail(welcomeEmail);
      if (emailSent) {
        emailSuccess = true;
      }

    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }

    return createResponse(200, {
      message: 'Email confirmed successfully. You can now sign in.',
      emailSuccess,
    });

  } catch (error: any) {
    console.error('ConfirmSignUp error:', error);
    return createResponse(400, {
      error: error.message || 'Email confirmation failed',
      type: error.name || 'Unknown',
    });
  }
};
