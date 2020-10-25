// import { Construct } from 'constructs';
// import { Resource } from 'cdktf';
// import { Vpc } from '../.gen/modules/terraform-aws-modules/vpc/aws';
// import {
//     VirtualNetwork,
//     SubnetA,
//     PublicIp,
//     PublicIpPrefix,
//     NatGatewayA,
//     SubnetNatGatewayAssociation,
//     NatGatewayPublicIpAssociation } from '../.gen/providers/azurerm';
// import * as crypto from "crypto";

// export interface NetworkGroupsProps {
//     readonly name: string;
//     readonly region: string[];
//     readonly resourceGroup: any;
//     readonly cidr: string;
//     readonly azNames: any;
//     readonly privateSubnets: string[];
//     readonly publicSubnets: string[];
//     readonly natSubnets: string[];
//     readonly enableNatGateway?: boolean;
//     readonly singleNatGateway?: boolean;
// }

// export class NetworkGroups extends Resource {
//     public readonly awsNetwork: Vpc;
//     public readonly azureNetwork: VirtualNetwork;
//     public readonly azurePrivateSubnet: SubnetA | undefined;
//     public readonly azurePrivateSubnetIds: any;
//     public readonly azurePublicSubnet: SubnetA | undefined;
//     public readonly azureNatSubnet: SubnetA | undefined;
//     public readonly azureNatPublicIp: PublicIp | undefined;
//     public readonly azureNatPublicIpPrefix: PublicIpPrefix | undefined;
//     public readonly azureNatGateway: NatGatewayA | undefined;
//     public readonly azureNatSubnetNatGateway: SubnetNatGatewayAssociation | undefined;
//     public readonly azureNatGatewayIpAssociation: NatGatewayPublicIpAssociation | undefined;

//     constructor(scope: Construct, name: string, props: NetworkGroupsProps ) {
//         super(scope, name);

//         //////////////////////////////////////////////////////////////
//         //* AWS Components with VPC, Subnet, NAT Gateway.
//         //////////////////////////////////////////////////////////////
//         this.awsNetwork = new Vpc(this, 'VpcNetwork', {
//             name: props.name ?? "cdktf-network",
//             cidr: props.cidr,
//             azs: props.azNames,
//             privateSubnets: props.privateSubnets,
//             publicSubnets: props.publicSubnets,
//             enableNatGateway: props.enableNatGateway ?? true,
//             singleNatGateway: props.singleNatGateway ?? true,
//         });

//         //////////////////////////////////////////////////////////////
//         //* Azure Components with VirtualNetwork, Subnet, NAT Gateway.
//         //////////////////////////////////////////////////////////////
//         this.azureNetwork = new VirtualNetwork(this, 'AzureNetwork', {
//             name: props.name + '-vnet' ?? "cdktf-vnet",
//             location: props.region[0] ?? "eastus",
//             resourceGroupName: props.resourceGroup.name,
//             addressSpace: [props.cidr] ?? ["10.0.0.0/16"],
//             dependsOn: [props.resourceGroup]
//         });


//         // Create Azure Private Subnet
//         if (props.privateSubnets) {
//             for (let subnet of props.privateSubnets) {
//                 let r = crypto.createHash('sha1').update(subnet).digest('hex');

//                 this.azurePrivateSubnet = new SubnetA(this, 'AzurePrivateSubnet' + r, {
//                     addressPrefix: subnet,
//                     name: 'private-' + r,
//                     resourceGroupName: props.resourceGroup.name,
//                     virtualNetworkName: this.azureNetwork.name,
//                     dependsOn: [props.resourceGroup, this.azureNetwork]
//                 });

//                 var azurePrivateSubnets = [];
//                 this.azurePrivateSubnetIds = azurePrivateSubnets.push(this.azurePrivateSubnet.id);
//             }
//         }

//         // Create Azure NAT Subnet
//         if (props.natSubnets) {

//             // Enable Azure NAT Gateway
//             if (props.enableNatGateway) {
//                 this.azureNatPublicIp = new PublicIp(this, 'AzureNatIp', {
//                     name: props.name + '-nat-ip' ?? "cdktf-nat-ip",
//                     location: props.region[0] ?? "eastus",
//                     resourceGroupName: props.resourceGroup.name,
//                     allocationMethod: 'Static',
//                     sku: 'Standard',
//                     dependsOn: [props.resourceGroup]
//                 });

//                 this.azureNatGateway = new NatGatewayA(this, 'AzureNatGateway', {
//                     name: props.name + '-nat' ?? "cdktf-nat",
//                     location: props.region[0] ?? "eastus",
//                     resourceGroupName: props.resourceGroup.name,
//                     dependsOn: [props.resourceGroup]
//                 });
//                 this.azureNatGatewayIpAssociation = new NatGatewayPublicIpAssociation(this, 'AzureNatGatewayIpAssociation', {
//                     natGatewayId: this.azureNatGateway.id!,
//                     publicIpAddressId: this.azureNatPublicIp.id!,
//                     dependsOn: [this.azureNatPublicIp]
//                 });
//             }

//             for (let subnet of props.natSubnets) {
//                 let r = crypto.createHash('sha1').update(subnet).digest('hex');

//                 this.azureNatSubnet = new SubnetA(this, 'AzureNatSubnet' + r, {
//                     addressPrefix: subnet,
//                     name: 'nat-' + r,
//                     resourceGroupName: props.resourceGroup.name,
//                     virtualNetworkName: this.azureNetwork.name,
//                     dependsOn: [props.resourceGroup, this.azureNetwork]
//                 });

//                 if (props.enableNatGateway) {
//                     this.azureNatSubnetNatGateway = new SubnetNatGatewayAssociation(this, 'AzureNatSubnetNatGateway' + r, {
//                         subnetId: this.azureNatSubnet.id!,
//                         natGatewayId: this.azureNatGateway!.id!,
//                     });
//                 }
//             }
//         }

//         if (props.publicSubnets) {
//             for (let subnet of props.publicSubnets) {
//                 let r = crypto.createHash('sha1').update(subnet).digest('hex');

//                 this.azurePublicSubnet = new SubnetA(this, 'AzurePublicSubnet' + r, {
//                     addressPrefix: subnet,
//                     name: 'public-' + r,
//                     resourceGroupName: props.resourceGroup.name,
//                     virtualNetworkName: this.azureNetwork.name,
//                     dependsOn: [props.resourceGroup, this.azureNetwork]
//                 });
//             }
//         }


//     }
// }
  