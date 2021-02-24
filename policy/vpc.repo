package terraform.security
import input as tfplan

########################
# Parameters for Policy
########################
default sg_rule_check = false

forbid_cidrs = ["0.0.0.0/0"]

#########
# Policy
#########

sg_rule_check {
  security_rules[_].values.cidr_blocks[_] != forbid_cidrs[_]
}

####################
# Terraform Library
####################

# list of all security group rule
security_rules = all_rules {
    all_rules := [ x |
                 x := tfplan.planned_values.root_module.resources[_]
                 x.type == "aws_security_group_rule"
    ]
}