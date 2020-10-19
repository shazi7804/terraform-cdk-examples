import { Construct } from 'constructs';
import { App, TerraformStack, TerraformOutput } from 'cdktf';
import { AwsProvider, DataAwsAvailabilityZones } from './.gen/providers/aws';
import { AzurermProvider, ResourceGroup } from './.gen/providers/azurerm';
import { NetworkGroups, KubernetesGroups } from './lib';

///////////////////////////////////////////////////////////////////
///////////////            Parameters         /////////////////////

// General
const stack_name: string = 'cdktf';
const region: string[] = ['eastus', 'us-east-1'];

// Network
const cidr: string = '10.0.0.0/16';
// const _cidrSecondary: string = '172.0.0.0/16';
const privateSubnets: string[] = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"];
const publicSubnets: string[] = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"];
const natSubnets: string[] = ["10.0.7.0/24"]
const enableNatGateway: boolean = true;
const singleNatGateway: boolean = true;

// Kubernetes
const kubernetesName: string = 'cdktf'
const kubernetesInstanceType: string[] = ['Standard_D2_v2'];
const kubernetesInstanceCount: number[] = [1, 1];
const kubernetesDnsPrefix: string = 'cdktf-kubernetes'
const kubernetesVersion: string[] = ['1.17.11']

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////


class MyStack extends TerraformStack {
    constructor(scope: Construct, name: string ) {
      super(scope, name);

        //////////////////////////////////////////////////////////////
        //* AWS Informations
        //////////////////////////////////////////////////////////////
        const awsProvider = new AwsProvider(this, 'aws', {
            region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
        });
        const azs = new DataAwsAvailabilityZones(this, 'azs', {
            provider: awsProvider,
            state: 'available',
        });
        

        //////////////////////////////////////////////////////////////
        //* Azure Informations
        //////////////////////////////////////////////////////////////
        new AzurermProvider(this, 'azure', {
            features: [{}]
        })

        const resourceGroup = new ResourceGroup(this, 'resource_group', {
            location: region[0],
            name: stack_name,
        });

        //////////////////////////////////////////////////////////////
        //* Resources Informations
        //////////////////////////////////////////////////////////////
        const network = new NetworkGroups(this, 'NetworkGroups', {
            name: stack_name,
            region: region,
            resourceGroup, // Only for Azure resource group
            cidr,
            azNames: azs.names,
            privateSubnets,
            publicSubnets,
            natSubnets,
            enableNatGateway,
            singleNatGateway
        });

        new TerraformOutput(this, 'AwsVpcId', { value: network.awsNetwork.vpcIdOutput })
        // new TerraformOutput(this, 'AzureNetworkId', { value: network.azureNetwork. })

        //////////////////////////////////////////////////////////////
        //* Kubernetes Informations
        //////////////////////////////////////////////////////////////
        const kubernetes = new KubernetesGroups(this, 'KubernetesGroups', {
            name: stack_name,
            region: region,
            resourceGroup, // Only for Azure resource group
            clusterName: kubernetesName,
            version: kubernetesVersion,
            instanceType: kubernetesInstanceType,
            instanceCount: kubernetesInstanceCount,
            dnsPrefix: kubernetesDnsPrefix,
        });


        new TerraformOutput(this, 'AzureKubernetesId', { value: kubernetes.azureKubernetesCluster.id })
        new TerraformOutput(this, 'AzureKubernetesName', { value: kubernetes.azureKubernetesCluster.name })
        
    }
}


const app = new App();
new MyStack(app, 'cdktf');
app.synth();
