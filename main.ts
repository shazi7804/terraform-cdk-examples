import { Construct } from 'constructs';
import { App, TerraformStack } from 'cdktf';
import { AwsProvider, DataAwsAvailabilityZones } from './.gen/providers/aws';
import { AwsVpc, AwsEksGroups } from './lib/aws';
import { AzurermProvider, ResourceGroup } from './.gen/providers/azurerm';
import { AzureNetwork, AzureAksGroups } from './lib/azure';
import './.gen/providers/random';

///////////////////////////////////////////////////////////////////
///////////////            Parameters         /////////////////////

// General
const stack_name: string = 'cdktf';
const region: string[] = ['eastus', 'us-east-1'];
const tags = {
    "CreateBy": "cdktf",
    "SampleFrom": "https://github.com/shazi7804"
};

// Network
const cidr = '10.0.0.0/16';
const privateSubnets = ["10.0.0.0/21", "10.0.8.0/21"];
const publicSubnets = ["10.0.16.0/21", "10.0.24.0/21"];
const infraSubnets = ["10.0.32.0/21", "10.0.40.0/21"];
const natSubnets: string[] = ["10.0.254.0/27"]; // Only for Azure
const enableNatGateway: boolean = true;
const singleNatGateway: boolean = true;

// Kubernetes
const kubernetesName: string = 'cdktf';
const kubernetesInstanceType: string[] = ['Standard_D2_v2', 'm4.large'];
const kubernetesInstanceCount: number[] = [1, 1];
const kubernetesDnsPrefix: string = 'cdktf-kubernetes';
const kubernetesVersion: string[] = ['1.17.11', '1.18'];
// const kubernetesPodCidr: string[] = ""

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////


class MyStack extends TerraformStack {
    constructor(scope: Construct, name: string ) {
      super(scope, name);

        ///////////////////////////////////////////////////////////////////
        ///////////////       Genral Informations     /////////////////////
        const awsProvider = new AwsProvider(this, 'aws', {
            region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
        });

        const azs = new DataAwsAvailabilityZones(this, 'azs', {
            provider: awsProvider,
            state: 'available',
        });

        new AzurermProvider(this, 'azure', {
            features: [{}]
        });

        const resourceGroup = new ResourceGroup(this, 'resource_group', {
            location: region[0],
            name: stack_name,
        });

        ///////////////////////////////////////////////////////////////////
        //////////////////         Network          ///////////////////////
        const awsVpc = new AwsVpc(this, 'awsVpc', {
            name: stack_name,
            region: region[1],
            cidr,
            azs,
            privateSubnets,
            publicSubnets,
            infraSubnets,
            enableNatGateway,
            // singleNatGateway,
            eksClusterName: kubernetesName,
            tags,
        });

        const azureNetwork = new AzureNetwork(this, 'azureNetwork', {
            name: stack_name,
            region: region[0],
            resourceGroup,
            cidr,
            azNames: azs.names,
            privateSubnets,
            publicSubnets,
            infraSubnets,
            natSubnets,
            enableNatGateway,
            singleNatGateway,
            tags,
        });

        ///////////////////////////////////////////////////////////////////
        //////////////////        Kubernetes        ///////////////////////
        
        new AwsEksGroups(this, 'awsEksGroups', {
            name: stack_name,
            clusterName: kubernetesName,
            version: kubernetesVersion[1],
            instanceType: kubernetesInstanceType[1],
            instanceCount: kubernetesInstanceCount[1],
            subnetIds: awsVpc.privateSubnetIds,
            vpc: awsVpc.vpcId,
            tags,
        });

        new AzureAksGroups(this, 'azureAksGroups', {
            name: stack_name,
            region: region[0],
            resourceGroup,
            clusterName: kubernetesName,
            version: kubernetesVersion[0],
            instanceType: kubernetesInstanceType[0],
            instanceCount: kubernetesInstanceCount[0],
            dnsPrefix: kubernetesDnsPrefix,
            azureNetwork: azureNetwork.azureNetwork,
            azurePrivateSubnetIds: azureNetwork.azurePrivateSubnetIds,
            tags,
        });
    }
}

const app = new App();
new MyStack(app, 'cdktf');
app.synth();
