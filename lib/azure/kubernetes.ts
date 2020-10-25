import { Construct } from 'constructs';
import { Resource, TerraformOutput } from 'cdktf';
import {
    KubernetesCluster,
    // KubernetesClusterConfig,
    // KubernetesClusterServicePrincipal,
    KubernetesClusterIdentity,
    KubernetesClusterNetworkProfile,
    // KubernetesClusterAddonProfileKubeDashboard,
    KubernetesClusterDefaultNodePool } from '../../.gen/providers/azurerm'

export interface AzureAksGroupsProps {
    readonly name: string;
    readonly region: string;
    readonly resourceGroup: any;
    readonly clusterName: string;
    readonly dnsPrefix: string;
    readonly instanceType: string;
    readonly instanceCount: number;
    readonly version: string;
    readonly azureNetwork: any;
    readonly azurePrivateSubnetIds: any;
}

export class AzureAksGroups extends Resource {
    public readonly azureKubernetesCluster: KubernetesCluster;

    constructor(scope: Construct, name: string, props: AzureAksGroupsProps ) {
        super(scope, name);

        const azureKubernetesIdentity: KubernetesClusterIdentity = { type: 'SystemAssigned'}
        
        const azureKubernetesPool: KubernetesClusterDefaultNodePool = {
            name: props.clusterName + 'default',
            vmSize: props.instanceType ?? "Standard_D2_v2",
            nodeCount: props.instanceCount ?? 1,
            enableAutoScaling: true,
            minCount: 1,
            maxCount: 10,
            vnetSubnetId: props.azurePrivateSubnetIds[0]
        }

        const azureKubernetesNetworkProfile: KubernetesClusterNetworkProfile = {
            networkPlugin: 'azure',
            networkPolicy: 'calico',
        }

        this.azureKubernetesCluster = new KubernetesCluster(this, 'AzureKubernetesCluster', {
            name: props.clusterName,
            location: props.region,
            resourceGroupName: props.resourceGroup.name,
            networkProfile: [azureKubernetesNetworkProfile],
            kubernetesVersion: props.version,
            identity: [azureKubernetesIdentity],
            dnsPrefix: props.dnsPrefix ?? "cdktf-kubernetes",
            defaultNodePool: [azureKubernetesPool],
            dependsOn: [props.resourceGroup.name, azureKubernetesPool],
        });

        new TerraformOutput(this, 'AzureAksId', { value: this.azureKubernetesCluster.id })
        new TerraformOutput(this, 'AzureAksClusterName', { value: this.azureKubernetesCluster.name })
    }
}