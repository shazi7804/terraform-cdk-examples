import { Construct } from 'constructs';
import { Resource, TerraformOutput } from 'cdktf';
import {
    DataAwsCallerIdentity,
    S3Bucket,
    CodecommitRepository,
    CodebuildProject,
    Codepipeline,
    IamRole,
    IamRolePolicyAttachment,
    IamPolicy } from '../../.gen/providers/aws';

export interface AwsEksDeploymentProps {
    readonly name: string;
    readonly sourceRepoName: string;
    readonly sourceRepoBranch: string;
    readonly buildProjectName: string;
    readonly prefix?: string;
    readonly environmentType: string;
    readonly region: string;
    readonly tags?: string;
}

export class AwsEksDeployment extends Resource {
    constructor(scope: Construct, name: string, props: AwsEksDeploymentProps ) {
        super(scope, name);

        const current = new DataAwsCallerIdentity(this, 'current');

        const artifact = new S3Bucket(this, 'EksDeploymentArtifact', {
            bucket: 'cdktf-sample-eks-deployment-artifact-' + props.region + '-' + current.accountId,
            acl: 'private',
            versioning: [{ enabled: true }]
        })

        const repo = new CodecommitRepository(this, 'EksDeplyoemtRepo', {
            repositoryName: props.sourceRepoName,
            description: 'Sample repository create by cdktf'
        });

        // Build stage
        const buildRole = new IamRole(this, 'EksDeplyoemtBuildRole', {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: {
                        Service: "codebuild.amazonaws.com"
                    },
                    Action: "sts:AssumeRole",
                    Sid: ""
                }]
            })
        });

        const buildPolicy = new IamPolicy(this, 'EksDeplyoemtBuildPolicy', {
            description: 'Sample policy to allow codebuild to execute buildspec and create by cdktf',
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Action: [
                            'logs:CreateLogGroup',
                            'logs:CreateLogStream',
                            'logs:PutLogEvents',
                            "ec2:CreateNetworkInterface",
                            "ec2:DescribeDhcpOptions",
                            "ec2:DescribeNetworkInterfaces",
                            "ec2:DeleteNetworkInterface",
                            "ec2:DescribeSubnets",
                            "ec2:DescribeSecurityGroups",
                            "ec2:DescribeVpcs",
                            'ecr:GetAuthorizationToken',
                            'cloudformation:ListExports'
                        ],
                        Resource: "*"
                    },
                    {
                        Effect: "Allow",
                        Action: [
                            's3:GetObject',
                            's3:GetObjectVersion',
                            's3:PutObject'
                        ],
                        Resource: artifact.arn + '/*'
                    }
                ]
            })
        });

        new IamRolePolicyAttachment(this, 'EksDeplyoemtBuildRoleAttachPolicy', {
            role: buildRole.name as string,
            policyArn: buildPolicy.arn
        });

        const build = new CodebuildProject(this, 'EksDeplyoemtBuild', {
            name: props.buildProjectName,
            environment: [{
                computeType: 'BUILD_GENERAL1_SMALL',
                type: 'LINUX_CONTAINER',
                privilegedMode: false,
                imagePullCredentialsType: 'CODEBUILD',
                image: 'aws/codebuild/amazonlinux2-x86_64-standard:3.0',
                environmentVariable: [{
                    name: 'AWS_ACCOUNT_ID',
                    value: current.accountId
                }]
            }],
            serviceRole: buildRole.name as string,
            source: [{
                type: 'CODEPIPELINE'
            }],
            sourceVersion: props.sourceRepoBranch,
            artifacts: [{
                type: 'CODEPIPELINE',
                
            }],
            logsConfig: [{
                cloudwatchLogs: [{
                    groupName: '/cdktf/samples',
                    streamName: 'eks-deployment-build-stage'
                }]
            }]
        });


        // CodePipeline stage
        const pipelineRole = new IamRole(this, 'EksDeplyoemtPipelineRole', {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: {
                        Service: "codepipeline.amazonaws.com"
                    },
                    Action: "sts:AssumeRole",
                    Sid: ""
                }]
            })
        });

        const pipelinePolicy = new IamPolicy(this, 'EksDeplyoemtPipelinePolicy', {
            description: 'Sample policy to allow codepipeline to execute and create by cdktf',
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Action: [
                            'logs:CreateLogGroup',
                            'logs:CreateLogStream',
                            'logs:PutLogEvents',
                            "ec2:CreateNetworkInterface",
                            "ec2:DescribeDhcpOptions",
                            "ec2:DescribeNetworkInterfaces",
                            "ec2:DeleteNetworkInterface",
                            "ec2:DescribeSubnets",
                            "ec2:DescribeSecurityGroups",
                            "ec2:DescribeVpcs",
                            'ecr:GetAuthorizationToken',
                            'cloudformation:ListExports'
                        ],
                        Resource: "*"
                    },
                    {
                        Effect: "Allow",
                        Action: [
                            's3:GetObject',
                            's3:GetObjectVersion',
                            's3:PutObject'
                        ],
                        Resource: artifact.arn + '/*'
                    }
                ]
            })
        });

        new IamRolePolicyAttachment(this, 'EksDeplyoemtBuildRoleAttachPolicy', {
            role: pipelineRole.name as string,
            policyArn: pipelinePolicy.arn
        });

        const pipeline = new Codepipeline(this, 'EksDeploymentPipeline', {
            name: 'cdktf-sample-eks-deployment',
            roleArn: pipelineRole.name as string,
            artifactStore: [{
                location: artifact.bucket as string,
                type: 'S3'
            }],
            stage: [
                {
                    name: 'Source',
                    action: [{
                        name: 'Source',
                        category:' Source',
                        owner: 'AWS',
                        provider: "CodeCommit",
                        version: '1',
                        outputArtifacts: ["SourceOutput"],
                    }]
                },
                {
                    name: 'Build',
                    action: [{
                        name: 'Build',
                        category:' Build',
                        owner: 'AWS',
                        provider: "CodeBuild",
                        version: '1',
                        inputArtifacts: ["SourceOutput"],
                        outputArtifacts: ["BuildOutput"],
                    }]
                }
            ]
        });

        new TerraformOutput(this, 'AwsEksDeploymentRepoName', { value: repo.repositoryName })
        new TerraformOutput(this, 'AwsEksDeploymentRepoCloneUrlHttp', { value: repo.cloneUrlHttp })
        new TerraformOutput(this, 'AwsEksDeploymentBuildProjectName', { value: build.name })
        new TerraformOutput(this, 'AwsEksDeploymentPipelineName', { value: pipeline.name })
        

    }
}