import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Code, Function, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";


interface HitCounterProps {
    downstream: IFunction[]
    pathMappings: { [path: string]: IFunction }
}

export default class HitCounter extends Construct {

    public readonly handler: Function

    constructor(scope: Construct, id: string, props: HitCounterProps) {

        super(scope, id);

        const table = new Table(this, "Hits", {
            partitionKey: { name: "path", type: AttributeType.STRING },
            
        })

        this.handler = new Function(this, "HitCounterHandler", {
            runtime: Runtime.NODEJS_22_X,
            code: Code.fromAsset("lambda"),
            handler: "hitcounter.handler",
            environment: {
                HITS_TABLE_NAME: table.tableName,
                DOWNSTREAM_FUNCTION_NAMES: props.downstream.map(fn => fn.functionName).join(" "),
                PATH_MAPPINGS: JSON.stringify(Object.fromEntries(
                    Object.entries(props.pathMappings).map(([path, fn]) => [path, fn.functionName])
                ))
            }
        })

        table.grantReadWriteData(this.handler);

        props.downstream.forEach(fn => fn.grantInvoke(this.handler));


        

    }
}


/**
 * services:
 * 
 * cloudformation
 * s3 (coniguration)
 * iam
 * lambda
 * api-gateway
 * dynamodb
 * cloudwatch (monitoring - bydefault)
 * 
 */