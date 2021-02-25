import { Construct } from 'constructs';
import { App, TerraformStack, S3Backend } from 'cdktf';
import { AwsProvider, DataAwsAvailabilityZones } from './.gen/providers/aws';
import { AwsVpc,
         AwsIam,
         AwsEksGroups,
         AwsEksDeployment } from './lib/aws';
// import { AzurermProvider, ResourceGroup } from './.gen/providers/azurerm';
// import { AzureNetwork, AzureAksGroups } from './lib/azure';

const config = require('config');
const stackName = config.get('StackName');
const tags = config.get('Tags');

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

class MyStack extends TerraformStack {
    constructor(scope: Construct, name: string ) {
      super(scope, name);

        ///////////////////////////////////////////////////////////////////
        ///////////////       Genral Informations     /////////////////////
        new S3Backend(this, {
            bucket: config.get('Backend.Bucket'),
            key: config.get('Backend.Key'),
            region: config.get('Backend.Region'),
        });
        
        const awsProvider = new AwsProvider(this, 'aws', {
            region: config.get('Providers.Aws.Regions')[0],
        });

        const azs = new DataAwsAvailabilityZones(this, 'azs', {
            provider: awsProvider,
            state: 'available',
        });

        // new AzurermProvider(this, 'azure', {
        //     features: [{}]
        // });

        // const resourceGroup = new ResourceGroup(this, 'resource_group', {
        //     location: config.get('Providers.Azure.Regions')[0],
        //     name: stackName,
        // });

        ///////////////////////////////////////////////////////////////////
        //////////////////       Permissions        ///////////////////////
        new AwsIam(this, 'awsIam', {
            name: stackName,
            region: config.get('Providers.Aws.Regions')[0],
        });

        ///////////////////////////////////////////////////////////////////
        //////////////////         Network          ///////////////////////
        const awsVpc = new AwsVpc(this, 'awsVpc', {
            name: stackName,
            region: config.get('Providers.Aws.Regions')[0],
            cidr: config.get('Providers.Aws.Vpc.cidr'),
            azs,
            privateSubnets: config.get('Providers.Aws.Vpc.privateSubnets'),
            publicSubnets: config.get('Providers.Aws.Vpc.publicSubnets'),
            isolatedSubnets: config.get('Providers.Aws.Vpc.isolatedSubnets'),
            enableNatGateway: config.get('Providers.Aws.Vpc.enableNatGateway'),
            eksClusterName: config.get('Providers.Aws.Eks.name'),
            tags,
        });

        // const azureNetwork = new AzureNetwork(this, 'azureNetwork', {
        //     name: stackName,
        //     region: config.get('Providers.Azure.Regions')[0],
        //     resourceGroup,
        //     cidr: config.get('Providers.Azure.Network.cidr'),
        //     azNames: azs.names,
        //     privateSubnets: config.get('Providers.Azure.Network.privateSubnets'),
        //     publicSubnets: config.get('Providers.Azure.Network.publicSubnets'),
        //     infraSubnets: config.get('Providers.Azure.Network.infraSubnets'),
        //     natSubnets: config.get('Providers.Azure.Network.natSubnets'),
        //     enableNatGateway: config.get('Providers.Azure.Network.enableNatGateway'),
        //     tags,
        // });

        ///////////////////////////////////////////////////////////////////
        //////////////////        Kubernetes        ///////////////////////
        new AwsEksGroups(this, 'awsEksGroups', {
            name: stackName,
            clusterName: config.get('Providers.Aws.Eks.name'),
            version: config.get('Providers.Aws.Eks.version'),
            instanceType: config.get('Providers.Aws.Eks.instanceType')[0],
            instanceCount: config.get('Providers.Aws.Eks.instanceCount'),
            subnetIds: awsVpc.privateSubnetIds,
            vpc: awsVpc.vpcId,
            environmentType: config.get('Providers.Aws.Eks.instanceCount'),
            tags,
        });

        // new AzureAksGroups(this, 'azureAksGroups', {
        //     name: stackName,
        //     region: config.get('Providers.Azure.Regions')[0],
        //     resourceGroup,
        //     clusterName: config.get('Providers.Azure.Aks.name'),
        //     version: config.get('Providers.Azure.Aks.version'),
        //     instanceType: config.get('Providers.Azure.Aks.instanceType')[0],
        //     instanceCount: config.get('Providers.Azure.Aks.instanceCount'),
        //     dnsPrefix: config.get('Providers.Azure.Aks.dnsPrefix'),
        //     azureNetwork: azureNetwork.azureNetwork,
        //     azurePrivateSubnetIds: azureNetwork.azurePrivateSubnetIds,
        //     tags,
        // });

        ///////////////////////////////////////////////////////////////////
        //////////////////        Deployments       ///////////////////////
        new AwsEksDeployment(this, 'awsEksDeployment', {
            name: stackName,
            region: config.get('Providers.Aws.Regions')[0],
            sourceRepoName: config.get('Providers.Aws.Eks.Deployment.sourceRepoName'),
            sourceRepoBranch: config.get('Providers.Aws.Eks.Deployment.sourceRepoBranch'),
            buildProjectName: config.get('Providers.Aws.Eks.Deployment.buildProjectName'),
            environmentType: config.get('Providers.Aws.Eks.instanceCount'),
            tags,
        })
 
    }
}

const app = new App();
new MyStack(app, 'cdktf');
app.synth();
