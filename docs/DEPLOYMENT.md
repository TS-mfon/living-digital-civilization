# Testnet deployment

## Base Sepolia

From the repository root, deploy using the key in `/home/sudodave/.env.build`:

```sh
forge build --root contracts/base
node scripts/deploy-base.mjs
```

The deployer becomes registry owner and initial relayer. Record the printed registry address and use the same dedicated testnet key as `BASE_RELAYER_PRIVATE_KEY` in the API. The helper reads only `PRIVATE_KEY` from `LDC_BUILD_ENV` (default `/home/sudodave/.env.build`) and passes it to Foundry through the child process environment.

## GenLayer Bradbury

Select the built-in network, inspect it, then deploy:

```sh
genlayer network set testnet-bradbury && genlayer network info
node scripts/deploy-genlayer.mjs
```

The helper reads the same `PRIVATE_KEY` value from `LDC_BUILD_ENV`, imports it as a local encrypted CLI account, and inspects the deployment receipt. Record the contract address only after the receipt reports successful execution; `ACCEPTED` or `FINALIZED` alone does not prove success. Set `GENLAYER_EVALUATOR_ADDRESS` and `GENLAYER_RELAYER_PRIVATE_KEY` in the API runtime.

## Go-live checklist

- Verify Base chain ID is 84532 and the GenLayer CLI reports Bradbury.
- Verify deployment addresses from receipts; never rely only on a submitted hash.
- Confirm API environment values are private and point to testnet deployments.
- Keep `DEMO_MODE=false` only when both adapters are configured.
- Confirm operator funds and rate limits; rotate any test keys that were exposed.
