.PHONY: plan

deploy-eks:
	cdktf synth
	cd cdktf.out/stacks/aws-eks/ && terraform apply

plan-eks:
	cdktf synth
	cd cdktf.out/stacks/aws-eks/ && terraform plan
