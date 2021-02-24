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
    readonly isolatedSubnets?: string[];
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
    public natGatewayIds: any;
    public awsPrivateSubnet: Subnet | undefined;
    public privateSubnetIds: any;
    public readonly awsPrivateRouteTable: RouteTable[] | undefined;
    public awsPublicSubnet: Subnet | undefined;
    public publicSubnetIds: any;
    public readonly awsPublicRouteTable: RouteTable | undefined;
    public awsIsolatedSubnet: Subnet | undefined;
    public isolatedSubnetIds: any;
    public readonly awsIsolatedRouteTable: RouteTable[] | undefined;
    

    constructor(scope: Construct, name: string, props: AwsVpcProps ) {
        super(scope, name);

        var tags = {
            'Name': props.name + '/Vpc',
            ...props.tags
        };
        //////////////////////////////////////////////////////////////
        //* AWS Components with VPC, Subnet, Gateway.
        //////////////////////////////////////////////////////////////
        this.awsVpc = new Vpc(this, 'AwsVpc', {
            cidrBlock: props.cidr ?? "10.0.0.0/16",
            enableDnsHostnames: props.enableDnsHostnames ?? true,
            enableDnsSupport: props.enableDnsSupport ?? true,
            tags,
        })
        this.vpcId = this.awsVpc.id as string

        this.awsInternetGateway = new InternetGateway(this, 'AwsIgw', {
            vpcId: this.vpcId,
            tags,
            dependsOn: [this.awsVpc]
        })

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
        // Define Subnets, Routing ...
        if (props.publicSubnets) {
            var subnetIds = [];
            var natGatewayIds: string[] = [];

            // Deine public subnets
            for (const { index, subnet } of props.publicSubnets.map((subnet, index) => ({ index, subnet }))) {
                let r = crypto.createHash('sha1').update(subnet).digest('hex');

                this.awsPublicSubnet = new Subnet(this, 'AwsPublicSubnet' + r, {
                    cidrBlock: subnet,
                    availabilityZone: `\${${props.azs.fqn}.names[${index}]}`,
                    vpcId: this.vpcId,
                    tags: {
                        ...tags,
                        'Name': props.name + "/Public/" + `\${${props.azs.fqn}.names[${index}]}`
                    },
                });

                // Create NAT Gateway per public subnets
                this.awsNatEip = new Eip(this, 'AwsNatEip' + r, { vpc: true })
                this.awsNatGateway = new NatGateway(this, 'AwsNatGateway' + r, {
                    allocationId: this.awsNatEip.id!,
                    subnetId: this.awsPublicSubnet.id!,
                    dependsOn: [this.awsNatEip, this.awsPublicSubnet]
                })

                subnetIds.push(this.awsPublicSubnet.id);
                natGatewayIds.push(this.awsNatGateway!.id as string);
            }
            this.publicSubnetIds = subnetIds
            this.natGatewayIds = natGatewayIds

            const publicRouteTable = new RouteTable(this, 'AwsPublicRouteTable', {
                vpcId: this.vpcId,
                tags: {
                    ...tags,
                    'Name': props.name + "/Public"
                }
            });

            new Route(this, 'AwsPublicRouteOfIgw', {
                routeTableId: publicRouteTable.id!,
                destinationCidrBlock: '0.0.0.0/0',
                gatewayId: this.awsInternetGateway.id!,
                dependsOn: [publicRouteTable]
            });

            this.publicSubnetIds.forEach((subnetId: string, index: number) => {
                new RouteTableAssociation(this, 'AwsPublicRouteTableAssociation' + index, {
                    subnetId: subnetId,
                    routeTableId: publicRouteTable!.id!,
                    dependsOn: [publicRouteTable]
                });
            });
        }

        // Deine private subnets
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
                        'Name': props.name + "/Private/" + `\${${props.azs.fqn}.names[${index}]}`
                    },
                });

                subnetIds.push(this.awsPrivateSubnet.id);
            }
            this.privateSubnetIds = subnetIds

            this.awsPrivateRouteTable = natGatewayIds!.map(
                (gatewayId: string, index: number) => {
                    const privateRouteTable = new RouteTable(this, 'AwsPrivateRouteTable' + index, {
                        vpcId: this.vpcId,
                        tags: {
                            ...tags,
                            'Name': props.name + "/Private" + index
                        }
                    })

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

        // Define isolated subnets
        if (props.isolatedSubnets) {
            var subnetIds = [];

            for (const { index, subnet } of props.isolatedSubnets.map((subnet, index) => ({ index, subnet }))) {
                let r = crypto.createHash('sha1').update(subnet).digest('hex');

                this.awsIsolatedSubnet = new Subnet(this, 'AwsIsolatedSubnet' + r, {
                    cidrBlock: subnet,
                    availabilityZone: `\${${props.azs.fqn}.names[${index}]}`,
                    vpcId: this.vpcId,
                    tags: {
                        ...tags,
                        ...eksTags,
                        'Name': props.name + "/Isolated/" + `\${${props.azs.fqn}.names[${index}]}`
                    },
                });

                subnetIds.push(this.awsIsolatedSubnet.id);
            }
            this.isolatedSubnetIds = subnetIds

            const isolatedRouteTable = new RouteTable(this, 'AwsIsolatedRouteTable', {
                vpcId: this.vpcId,
                tags: {
                    ...tags,
                    'Name': props.name + "/Isolated"
                }
            })

            this.isolatedSubnetIds.forEach((subnetId: string, index: number) => {
                new RouteTableAssociation(this, 'AwsIsolatedRouteTableAssociation' + index, {
                    subnetId: subnetId,
                    routeTableId: isolatedRouteTable.id!,
                    dependsOn: [isolatedRouteTable]
                });
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