## CDK on Terraform Deploy Multiple Cloud samples


## Table of contents

- [Architecture](#architecture)
- [Deployment](#deployment-steps)
- [Parameters](#parameters)
- [Test](#test)

## Architecture
###  Architecture Diagram

This architecture includes multi-cloud deployment, refer to [AWS](./img/aws.png), [Azure](./img/azure.png) and Google architecture for details.

![architecture](./img/cdktf-multi-cloud-architecture.png)

## Deployment Steps
###  Step 1. Install Terraform and CDK on Terraform

- Install Terraform (MacOS)

```
$ brew tap hashicorp/tap
$ brew install hashicorp/tap/terraform
$ terraform version
```

- Install cdktf

```bash
$ npm install -g cdktf-cli
$ cdktf --version
```

###  Step 2. Define your environment variables

###  Step 3. Create an execution plan

```bash
$ cdktf plan
```

###  Step 4. Deploy the changes configuration

```bash
$ cdktf deploy
```

## Parameters

You can customize environment parameters in [config/default.json](https://github.com/shazi7804/cdktf-samples/blob/master/config/default.json)

Parameters | Description
---------- | -----------
StackName | The parameter of this stack name. default is `cdktf`
Tags | The parameter of this stack common tags. default is `{ "CreateBy": "cdktf", "SampleFrom": "https://github.com/shazi7804" }`
Providers | The parameter of providers of this stack. type of 
