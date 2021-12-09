import { Construct } from 'constructs';
import { Resource, TerraformOutput } from 'cdktf';
import {
    EksCluster,
    // EksNodeGroup,
    IamOpenidConnectProvider,
    EksClusterIdentityOidc,
    SecurityGroup,
    IamRole,
    IamRolePolicyAttachment,
    IamPolicy } from '../../.gen/providers/aws';


export interface AwsEksGroupsProps {
    readonly name: string;
    readonly clusterName: string;
    readonly instanceType: string;
    readonly instanceCount: number;
    readonly nodeGroups?: any;
    readonly nodeGroupDefaultAmi?: string;
    readonly nodeGroupDefaultDiskSize?: number;
    readonly version: string;
    readonly vpc: string;
    readonly subnetIds: string[];
    readonly tags?: any;
    readonly environmentType: string;
}

export class AwsEksGroups extends Resource {
    constructor(scope: Construct, name: string, props: AwsEksGroupsProps ) {
        super(scope, name);

        const clusterRole = new IamRole(this, 'EksClusterRole', {
            name: props.name + '-eks-cluster-' + props.clusterName,
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

        const cloudWatchMetricsPolicy = new IamPolicy(this, 'CloudWatchMetricsPolicy', {
            name: 'CloudWatchMetricsPolicy',
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: [
                        "cloudwatch:PutMetricData"
                    ],
                    Resource: "*"
                }]
            })
        });

        const elbPolicy = new IamPolicy(this, 'ElbPolicy', {
            name: 'ElbPolicy',
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: [
                        "ec2:DescribeAccountAttributes",
                        "ec2:DescribeAddresses",
                        "ec2:DescribeInternetGateways"
                    ],
                    Resource: "*"
                }]
            })
        });

        new IamRolePolicyAttachment(this, 'CloudWatchMetricsPolicyAttach', {
            role: clusterRole.name as string,
            policyArn: cloudWatchMetricsPolicy.arn
        });

        new IamRolePolicyAttachment(this, 'ElbPolicyAttach', {
            role: clusterRole.name as string,
            policyArn: elbPolicy.arn
        });

        new IamRolePolicyAttachment(this, 'AmazonEKSClusterPolicy', {
            role: clusterRole.name as string,
            policyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
        });

        new IamRolePolicyAttachment(this, 'AmazonEKSVPCResourceController', {
            role: clusterRole.name as string,
            policyArn: "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
        });

        const ngRole = new IamRole(this, 'EksNodeGroupRole', {
            name: props.name + '-eks-nodegroup-' + props.clusterName,
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: {
                        Service: "ec2.amazonaws.com"
                    },
                    Action: "sts:AssumeRole",
                    Sid: ""
                }]
            })
        });

        new IamRolePolicyAttachment(this, 'AmazonEKSWorkerNodePolicy', {
            role: ngRole.name as string,
            policyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
        });

        new IamRolePolicyAttachment(this, 'AmazonEC2RoleforSSM', {
            role: ngRole.name as string,
            policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM"
        });

        new IamRolePolicyAttachment(this, 'AmazonEC2ContainerRegistryReadOnly', {
            role: ngRole.name as string,
            policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
        });

        new IamRolePolicyAttachment(this, 'AmazonEKS_CNI_Policy', {
            role: ngRole.name as string,
            policyArn: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
        });

        const clusterSg = new SecurityGroup(this, 'EksClusterSecurityGroup', {
            name: props.name + '-eks-cluster-' + props.clusterName,
            vpcId: props.vpc,
            egress: [{
                fromPort: 0,
                toPort: 0,
                protocol: '-1',
                cidrBlocks: ["0.0.0.0/0"]
            }],
            ingress: [{
                fromPort: 0,
                toPort: 0,
                protocol: '-1',
                cidrBlocks: ["10.0.0.0/16"]
            }]
        })

        const eks = new EksCluster(this, 'EksCluster', {
            name: props.clusterName,
            roleArn: clusterRole.arn,
            version: props.version,
            vpcConfig: [{
                subnetIds: props.subnetIds,
                securityGroupIds: [clusterSg.id]
            }],
            dependsOn: [clusterRole]
        })

        // new EksNodeGroup(this, 'EksNodeGroup', {
        //     nodeGroupName: props.name + '-eks-default',
        //     clusterName: props.clusterName,
        //     nodeRoleArn: ngRole.arn,
        //     subnetIds: props.subnetIds,
        //     remoteAccess: [{
        //         ec2SshKey: 'scottliao'
        //     }],
        //     scalingConfig: [{
        //         desiredSize: 1,
        //         maxSize: 1,
        //         minSize: 1
        //     }],
        //     dependsOn: [ngRole, eks]
        // })

        new IamOpenidConnectProvider(this, 'EksOidc', {
            clientIdList: ["sts.amazonaws.com"],
            thumbprintList: [],
            url: new EksClusterIdentityOidc(eks, 'identity[0]', 'oidc[0]').issuer
        })

        new TerraformOutput(this, 'AwsEksArn', { value: eks.endpoint })
        new TerraformOutput(this, 'AwsEksOidc', { value: eks.identity('0').oidc })
        // new TerraformOutput(this, 'AwsEksIssuer', { value: new EksClusterIdentityOidc(eks, 'thiss', '').issuer })
        
    }
}