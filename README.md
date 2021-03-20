# Introduction

This is the official subgraph repo for [Mesh Finance](https://mesh.finance).

For more information see the docs on [https://thegraph.com/docs/](https://thegraph.com/docs/)

## Setup and Deployment

1. Install dependencies

```bash
yarn
```

2. 

a) For Local Testing:

See the docs at [https://thegraph.com/docs/quick-start#local-development](https://thegraph.com/docs/quick-start#local-development)


b) For ropsten:

```bash
yarn prepare:ropsten && yarn codegen
yarn prepare:ropsten && yarn deploy
```