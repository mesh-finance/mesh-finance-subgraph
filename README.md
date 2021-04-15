# Introduction

This is the official subgraph repo for [Mesh Finance](https://mesh.finance).

For more information see the docs on [https://thegraph.com/docs/](https://thegraph.com/docs/)

## Setup and Deployment

1. Install dependencies

```bash
yarn
```

2. Deploy

Get the access token from your graph profile. Add it to your local machine.

```bash
graph auth https://api.thegraph.com/deploy/ <ACCESS_TOKEN>
```

For Local Deployment:

See the docs at [https://thegraph.com/docs/quick-start#local-development](https://thegraph.com/docs/quick-start#local-development)


For ropsten:

```bash
yarn prepare:ropsten && yarn codegen
yarn prepare:ropsten && yarn deploy
```

For mainnet:

```bash
yarn prepare:mainnet && yarn codegen
yarn prepare:mainnet && yarn deploy
```