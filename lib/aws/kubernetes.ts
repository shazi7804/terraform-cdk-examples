import { Construct } from 'constructs';
import { Resource, TerraformOutput } from 'cdktf';
import { Eks } from '../../.gen/modules/terraform-aws-modules/eks/aws';

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
    readonly subnetIds: any;
    readonly tags?: any;
}

export class AwsEksGroups extends Resource {
    public readonly awsKubernetesCluster: Eks;

    constructor(scope: Construct, name: string, props: AwsEksGroupsProps ) {
        super(scope, name);

        const nodeGroupDefault = {
            ami_type: props.nodeGroupDefaultAmi ?? "AL2_x86_64",
            disk_size: props.nodeGroupDefaultDiskSize ?? 10,
        }

        const nodeGroups = {
            spot: {
                desired_capacity: 1,
                max_capacity: 10,
                min_capacity: 1,
                instance_type: "m5.large",
                k8s_labels: {
                  Environment: "sample",
                  CreateBy: "cdktf",
                }
            }
        }

        this.awsKubernetesCluster = new Eks(this, 'AwsKubernetesCluster', {
            clusterName: props.clusterName,
            clusterVersion: props.version,
            vpcId: props.vpc,
            subnets: props.subnetIds,
            nodeGroupsDefaults: nodeGroupDefault,
            nodeGroups: props.nodeGroups ?? nodeGroups,
            manageAwsAuth: "false",
            tags: props.tags,
        });

        new TerraformOutput(this, 'AwsEksArn', { value: this.awsKubernetesCluster.clusterArnOutput })
    }
}