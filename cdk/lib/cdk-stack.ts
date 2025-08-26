import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';


export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const calculateAreaFn = new Function(this, 'CalculateArea', {
      runtime: Runtime.NODEJS_22_X,
      handler: 'hello.handler',
      code: Code.fromAsset('lambda')
    })

    const lambdaRestApi = new LambdaRestApi(this, 'LambdaRestApi', {
      handler: calculateAreaFn,
      proxy: false
    });

    lambdaRestApi.root.addResource('api').addResource('calculate-area').addMethod('GET');


  }
}
