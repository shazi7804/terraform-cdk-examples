import { Construct } from 'constructs';
import { Resource } from 'cdktf';
import {
    IamRole,
    IamRolePolicyAttachment,
    IamPolicy } from '../../.gen/providers/aws';

export interface AwsIamProps {
    readonly name: string;
    readonly region: string;
    readonly prefix?: string;
}

export class AwsIam extends Resource {
    constructor(scope: Construct, name: string, props: AwsIamProps ) {
        super(scope, name);

        // const current = new DataAwsCallerIdentity(this, 'current');

        const clusterAutoscalerPolicy = new IamPolicy(this, 'ClusterAutoscalerPolicy', {
            name: 'cluster-autoscaler',
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: [
                        'autoscaling:DescribeAutoScalingGroups',
                        'autoscaling:DescribeAutoScalingInstances',
                        'autoscaling:DescribeLaunchConfigurations',
                        'autoscaling:DescribeTags',
                        'autoscaling:SetDesiredCapacity',
                        'autoscaling:TerminateInstanceInAutoScalingGroup'
                    ],
                    Resource: "*"
                }]
            })
        });

        // IAM Role for cluster-autoscaler/cluster-autoscaler
        const eksClusterAutoScalerRole = new IamRole(this, 'EksClusterAutoScaler', {
            name: 'eks-cluster-autoscaler-' + props.region,
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: {
                        Service: "eks.amazonaws.com"
                    },
                    Action: "sts:AssumeRole",
                    Sid: ""
                }]
            })
        });

        new IamRolePolicyAttachment(this, 'eksClusterAutoScalerRoleAttachPolicy', {
            role: eksClusterAutoScalerRole.name as string,
            policyArn: clusterAutoscalerPolicy.arn
        });


    }
}