.PHONY: deploy

deploy:
	cdktf synth
	cd cdktf.out/ && terraform apply

plan:
	cdktf synth
	cd cdktf.out/ && terraform plan
