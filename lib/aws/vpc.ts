import { Construct } from 'constructs';
import { Resource, TerraformOutput } from 'cdktf';
// import { Vpc } from '../../.gen/modules/terraform-aws-modules/vpc/aws';
import {
    Vpc,
    Subnet,
    Route,
    RouteTable,
    RouteTableAssociation,
    InternetGateway,
    NatGateway,
    Eip,
    VpcIpv4CidrBlockAssociation } from '../../.gen/providers/aws';
import * as crypto from "crypto";

export interface AwsVpcProps {
    readonly name: string;
    readonly region: string;
    readonly cidr: string;
    readonly cidrSecondary?: string;
    readonly enableDnsHostnames?: boolean;
    readonly enableDnsSupport?: boolean;
    readonly azs: any;
    readonly privateSubnets: string[];
    readonly publicSubnets: string[];
    readonly infraSubnets?: string[];
    readonly enableNatGateway?: boolean;
    readonly singleNatGateway?: boolean;
    readonly tags?: object;
    readonly eksClusterName?: string;
}

export class AwsVpc extends Resource {
    public readonly awsVpc: Vpc;
    public readonly vpcId: string;
    public readonly awsVpcCidrSecondary: VpcIpv4CidrBlockAssociation | undefined;
    public readonly awsInternetGateway: InternetGateway;
    public readonly awsNatGateway: NatGateway | undefined;
    public readonly awsNatEip: Eip | undefined;
    public awsPrivateSubnet: Subnet | undefined;
    public privateSubnetIds: any;
    public awsPublicSubnet: Subnet | undefined;
    public publicSubnetIds: any;
    public awsTransiSubnet: Subnet | undefined;
    public transiSubnetIds: any;
    public awsInfraSubnet: Subnet | undefined;
    public infraSubnetIds: any;
    public readonly awsPublicRouteTable: RouteTable | undefined;
    public readonly awsInfraRouteTable: RouteTable[] | undefined;
    public readonly awsPrivateRouteTable: RouteTable[] | undefined;

    constructor(scope: Construct, name: string, props: AwsVpcProps ) {
        super(scope, name);

        var tags = {
            'Name': props.name,
            ...props.tags
        };

        //////////////////////////////////////////////////////////////
        //* AWS Components with VPC, Subnet, NAT Gateway.
        //////////////////////////////////////////////////////////////
        // this.awsVpc = new Vpc(this, 'VpcNetwork', {
        //     name: props.name ?? "cdktf-network",
        //     cidr: props.cidr,
        //     azs: props.azNames,
        //     privateSubnets: props.privateSubnets,
        //     publicSubnets: props.publicSubnets,
        //     intraSubnets: props.intraSubnets,
        //     enableNatGateway: props.enableNatGateway ?? true,
        //     singleNatGateway: props.singleNatGateway ?? true,
        //     enableDnsHostnames: true,
        //     tags
        // });

        this.awsVpc = new Vpc(this, 'AwsVpc', {
            cidrBlock: props.cidr ?? "10.0.0.0/16",
            enableDnsHostnames: props.enableDnsHostnames ?? true,
            enableDnsSupport: props.enableDnsSupport ?? true,
            tags,
        })
        this.vpcId = this.awsVpc.id as string

        // When you create an Amazon EKS cluster, you specify the VPC subnets for your cluster to use.
        // ** Cluster VPC considerations: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html
        var eksTags: any = {}
        if (props.eksClusterName) {
            eksTags = {
                'kubernetes.io/role/internal-elb': '1',
                'kubernetes.io/role/elb': '1'
            };

            var eksClusterName: string = 'kubernetes.io/cluster/' + props.eksClusterName;
            eksTags[eksClusterName!] = 'shared';
        }

        /////////////////////////////////////////////////////
        // Define Subnets
        if (props.publicSubnets) {
            var subnetIds = [];
            var natGatewayIds: string[] = [];

            for (const { index, subnet } of props.publicSubnets.map((subnet, index) => ({ index, subnet }))) {
                let r = crypto.createHash('sha1').update(subnet).digest('hex');

                this.awsPublicSubnet = new Subnet(this, 'AwsPublicSubnet' + r, {
                    cidrBlock: subnet,
                    availabilityZone: `\${${props.azs.fqn}.names[${index}]}`,
                    vpcId: this.vpcId,
                    tags: {
                        ...tags,
                        'Name': props.name + "-public-" + `\${${props.azs.fqn}.names[${index}]}`
                    },
                });

                // Create NAT Gateway per public subnets
                if (props.singleNatGateway == false || props.singleNatGateway == undefined) {
                    this.awsNatEip = new Eip(this, 'AwsNatEip' + r, { vpc: true })
                    this.awsNatGateway = new NatGateway(this, 'AwsNatGateway' + r, {
                        allocationId: this.awsNatEip.id!,
                        subnetId: this.awsPublicSubnet.id!,
                        dependsOn: [this.awsNatEip, this.awsPublicSubnet]
                    })
                }

                subnetIds.push(this.awsPublicSubnet.id);
                natGatewayIds.push(this.awsNatGateway!.id as string);
            }
            this.publicSubnetIds = subnetIds
        }

        if (props.privateSubnets) {
            var subnetIds = [];

            for (const { index, subnet } of props.privateSubnets.map((subnet, index) => ({ index, subnet }))) {
                let r = crypto.createHash('sha1').update(subnet).digest('hex');

                this.awsPrivateSubnet = new Subnet(this, 'AwsPrivateSubnet' + r, {
                    cidrBlock: subnet,
                    availabilityZone: `\${${props.azs.fqn}.names[${index}]}`,
                    vpcId: this.vpcId,
                    tags: {
                        ...tags,
                        ...eksTags,
                        'Name': props.name + "-private-" + `\${${props.azs.fqn}.names[${index}]}`
                    },
                });

                subnetIds.push(this.awsPrivateSubnet.id);
            }
            this.privateSubnetIds = subnetIds
        }

        if (props.infraSubnets) {
            var subnetIds = [];

            for (const { index, subnet } of props.infraSubnets.map((subnet, index) => ({ index, subnet }))) {
                let r = crypto.createHash('sha1').update(subnet).digest('hex');

                this.awsInfraSubnet = new Subnet(this, 'AwsInfraSubnet' + r, {
                    cidrBlock: subnet,
                    availabilityZone: `\${${props.azs.fqn}.names[${index}]}`,
                    vpcId: this.vpcId,
                    tags: {
                        ...tags,
                        ...eksTags,
                        'Name': props.name + "-infra-" + `\${${props.azs.fqn}.names[${index}]}`
                    },
                });

                subnetIds.push(this.awsInfraSubnet.id);
            }
            this.infraSubnetIds = subnetIds
        }


        /////////////////////////////////////////////////////
        // Define Gateways
        this.awsInternetGateway = new InternetGateway(this, 'AwsIgw', {
            vpcId: this.vpcId,
            tags,
            dependsOn: [this.awsVpc]
        })

        /////////////////////////////////////////////////////
        // Define Route Tables ans Routing
        
        // Public Routeing
        if (props.publicSubnets) {
            this.awsPublicRouteTable = new RouteTable(this, 'AwsPublicRouteTable', {
                vpcId: this.vpcId,
                tags: {
                    ...tags,
                    'Name': props.name + "-public"
                }
            })
            
            new Route(this, 'AwsPublicRouteOfIgw', {
                routeTableId: this.awsPublicRouteTable.id!,
                destinationCidrBlock: '0.0.0.0/0',
                gatewayId: this.awsInternetGateway.id!,
                dependsOn: [this.awsPublicRouteTable]
            });

            this.publicSubnetIds.map(
                (subnetId: string, index: number) => {
                    new RouteTableAssociation(this, 'AwsPublicRouteTableAssociation' + index, {
                        subnetId: subnetId,
                        routeTableId: this.awsPublicRouteTable!.id!,
                        dependsOn: [this.awsPublicRouteTable!]
                    });
            });
        }

        // Private Routeing
        if (props.privateSubnets) {
            this.awsPrivateRouteTable = natGatewayIds!.map(
                (gatewayId: string, index: number) => { 
                    const privateRouteTable = new RouteTable(this, 'AwsPrivateRouteTable' + index, { vpcId: this.vpcId })
                    new Route(this, 'AwsPrivateRouteOfNatGateway' + index, {
                        routeTableId: privateRouteTable.id!,
                        destinationCidrBlock: '0.0.0.0/0',
                        natGatewayId: gatewayId,
                        dependsOn: [privateRouteTable]
                    });
                    new RouteTableAssociation(this, 'AwsPrivateRouteTableAssociation' + index, {
                        subnetId: this.privateSubnetIds[index],
                        routeTableId: privateRouteTable.id!,
                        dependsOn: [privateRouteTable]
                    })

                    return privateRouteTable
            });
        }

        // Infra Routeing
        if (props.infraSubnets) {
            this.awsInfraRouteTable = natGatewayIds!.map(
                (gatewayId: string, index: number) => { 
                    const infraRouteTable = new RouteTable(this, 'AwsInfraRouteTable' + index, { vpcId: this.vpcId })
                    new Route(this, 'AwsInfraRouteOfNatGateway' + index, {
                        routeTableId: infraRouteTable.id!,
                        destinationCidrBlock: '0.0.0.0/0',
                        natGatewayId: gatewayId,
                        dependsOn: [infraRouteTable]
                    });
                    new RouteTableAssociation(this, 'AwsInfraRouteTableAssociation' + index, {
                        subnetId: this.infraSubnetIds[index],
                        routeTableId: infraRouteTable.id!,
                        dependsOn: [infraRouteTable]
                    })

                    return infraRouteTable
            });
        };

        /////////////////////////////////////////////////////
        // Options function
        if (props.cidrSecondary) {
            this.awsVpcCidrSecondary = new VpcIpv4CidrBlockAssociation(this, 'AwsVpcCidrSecondary', {
                cidrBlock: props.cidrSecondary,
                vpcId: this.awsVpc.id as string,
            })
            new TerraformOutput(this, 'AwsVpcSecondaryId', { value: this.awsVpcCidrSecondary?.id })
            new TerraformOutput(this, 'AwsVpcSecondaryCidr', { value: this.awsVpcCidrSecondary?.cidrBlock })
        }

        new TerraformOutput(this, 'AwsVpcId', { value: this.awsVpc.id })
        new TerraformOutput(this, 'AwsVpcCidr', { value: this.awsVpc.cidrBlock })
    }
}
  