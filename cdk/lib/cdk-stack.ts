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
    
    const helloWithCounter = new HitCounter(this, "HitCounter", {
      downstream: [hello, calculateAreaFn],
      pathMappings: {
        "/api/hello": hello,
        "/api/calculate-area": calculateAreaFn
      }
    })

    // Create API Gateway with HitCounter as the handler
    const api = new LambdaRestApi(this, 'LambdaRestApi', {
      handler: helloWithCounter.handler,
      proxy: true  // Use proxy mode to pass all requests to HitCounter
    });


  }
}
