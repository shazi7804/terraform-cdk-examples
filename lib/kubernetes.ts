import { Construct } from 'constructs';
import { Resource } from 'cdktf';
import {
    KubernetesCluster,
    // KubernetesClusterConfig,
    // KubernetesClusterServicePrincipal,
    KubernetesClusterIdentity,
    KubernetesClusterDefaultNodePool } from '../.gen/providers/azurerm'

export interface KubernetesGroupsProps {
    readonly name: string;
    readonly region: string[];
    readonly resourceGroup: any;
    readonly clusterName: string;
    readonly dnsPrefix: string;
    readonly instanceType: string[];
    readonly instanceCount: number[];
    readonly version: string[];
}

export class KubernetesGroups extends Resource {
    // public readonly awsKubernetesCluster: Vpc;
    public readonly azureKubernetesCluster: KubernetesCluster;

    constructor(scope: Construct, name: string, props: KubernetesGroupsProps ) {
        super(scope, name);

        const identity: KubernetesClusterIdentity = { type: 'SystemAssigned'}
        const azureKubernetesPool: KubernetesClusterDefaultNodePool = {
            name: props.clusterName + 'default',
            vmSize: props.instanceType[0] ?? "Standard_D2_v2",
            nodeCount: props.instanceCount[0] ?? 1,
        }
        
        this.azureKubernetesCluster = new KubernetesCluster(this, 'AzureKubernetesCluster', {
            name: props.clusterName,
            location: props.region[0],
            resourceGroupName: props.resourceGroup.name,
            kubernetesVersion: props.version[0],
            identity: [identity],
            // servicePrincipal: [azureKubernetesServicePrincipal],
            dnsPrefix: props.dnsPrefix ?? "cdktf-kubernetes",
            defaultNodePool: [azureKubernetesPool],
            dependsOn: [props.resourceGroup.name, azureKubernetesPool],
        });
    }
}