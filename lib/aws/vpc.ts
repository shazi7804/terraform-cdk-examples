import { Construct } from 'constructs';
import { Resource, TerraformOutput, StringMap } from 'cdktf';
import { Vpc } from '../../.gen/modules/terraform-aws-modules/vpc/aws';

export interface AwsVpcProps {
    readonly name: string;
    readonly region: string;
    readonly cidr: string;
    readonly azNames: any;
    readonly privateSubnets: string[];
    readonly publicSubnets: string[];
    readonly intraSubnets?: string[];
    readonly natSubnets: string[];
    readonly enableNatGateway?: boolean;
    readonly singleNatGateway?: boolean;
    readonly tags?: any;
    readonly eksClusterName?: string;
}

export class AwsVpc extends Resource {
    public readonly awsVpc: Vpc;

    constructor(scope: Construct, name: string, props: AwsVpcProps ) {
        super(scope, name);

        var tags: any = {};

        if (props.tags)
            tags = {...tags, ...props.tags}

        // When you create an Amazon EKS cluster, you specify the VPC subnets for your cluster to use.
        // ** Cluster VPC considerations: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html
        if (props.eksClusterName) 
            var _eksClusterName: string = "kubernetes.io/cluster/" + props.eksClusterName

            tags[_eksClusterName!] = "shared";
            tags['kubernetes.io/role/internal-elb'] = '1';
            tags['kubernetes.io/role/elb'] = '1';

        //////////////////////////////////////////////////////////////
        //* AWS Components with VPC, Subnet, NAT Gateway.
        //////////////////////////////////////////////////////////////
        this.awsVpc = new Vpc(this, 'VpcNetwork', {
            name: props.name ?? "cdktf-network",
            cidr: props.cidr,
            azs: props.azNames,
            privateSubnets: props.privateSubnets,
            publicSubnets: props.publicSubnets,
            intraSubnets: props.intraSubnets,
            enableNatGateway: props.enableNatGateway ?? true,
            singleNatGateway: props.singleNatGateway ?? true,
            enableDnsHostnames: true,
            tags
        });

        new TerraformOutput(this, 'AwsVpcId', { value: this.awsVpc.vpcIdOutput })
        new TerraformOutput(this, 'AwsVpcCidr', { value: this.awsVpc.vpcCidrBlockOutput })
    }
}
  