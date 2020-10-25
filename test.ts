var tags: any = {};

const _eksClusterName: string = "kubernetes.io/cluster/" + 'dsdad'

// const clusterTags: any = {
//     _eksClusterName: 'shared',
//     "kubernetes.io/role/internal-elb": '1'
// }
// const clusterTags: any = {}
tags[_eksClusterName!] = "shared";
tags["kubernetes.io/role/internal-elb"] = '1';
tags['kubernetes.io/role/elb'] = '1';

const commonTags: any = {
    'CreateBy': "cdktf",
    'SampleFrom': "https://github.com/shazi7804"
};

tags = {...tags, ...commonTags}

console.log(tags)