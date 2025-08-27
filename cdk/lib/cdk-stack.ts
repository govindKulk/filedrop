import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import HitCounter from './hitcounter';


export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hello = new Function(this, 'hello', {
      runtime: Runtime.NODEJS_22_X,
      handler: 'hello.handler',
      code: Code.fromAsset('lambda'),
      
    })

    const calculateAreaFn = new Function(this, 'calculateAreaFunction', {
      runtime: Runtime.NODEJS_22_X,
      handler: 'area.handler',
      code: Code.fromAsset('lambda')
    })
    
    // const helloWithCounter = new HitCounter(this, "", {
    //   downstream: [hello, calculateAreaFn]
    // })

    const lambdaRestApi = new LambdaRestApi(this, 'LambdaRestApi', {
      handler: hello,
      proxy: false
    });



    lambdaRestApi.root.addResource('api').addResource('calculate-area').addMethod('GET');


  }
}
