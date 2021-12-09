import { Construct } from 'constructs';
import { Resource } from 'cdktf';
import {
    LambdaFunction,
    IamRole,
    IamRolePolicyAttachment } from '../../.gen/providers/aws';

export interface AwsLambdaProps {
    readonly name: string;
    readonly prefix?: string;
    readonly environmentType: string;

}

export class AwsLambda extends Resource {
    constructor(scope: Construct, name: string, props: AwsLambdaProps ) {
        super(scope, name);

        const lambdaSubstractRole = new IamRole(this, 'LambdaSubstractRole', {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Action: "sts:AssumeRole",
                    Principal: {
                        Service: "lambda.amazonaws.com"
                    },
                    Effect: "Allow",
                    Sid: ""
                }]
            })
        });

        new IamRolePolicyAttachment(this, 'LambdaRoleAttachLambdaExecutePolicy', {
            role: lambdaSubstractRole.name as string,
            policyArn: 'arn:aws:iam::aws:policy/AWSLambdaExecute'
        });

        //////////////////////////////////////////////////
        // Define Lambda
        // substract lambda 
        new LambdaFunction(this, 'LambdaSubstract', {
            functionName: props.prefix + '-eks-lambda-substract-one',
            handler: 'index.lambda_handler',
            runtime: 'python3.7',
            timeout: 60,
            role: lambdaSubstractRole.arn,
            s3Bucket: 'terraform-serverless-sample-us-east-1-381354187112',
            s3Key: 'v1.0.0/substract.zip',
        });

    }
}
