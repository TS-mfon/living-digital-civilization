#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export BASE_RPC_URL="${BASE_RPC_URL:-https://base-sepolia-rpc.publicnode.com}"
cd "$root"
if [[ "${1:-}" == smoke ]]; then
  shift
  exec "$root/scripts/test-base-lifecycle.sh" "$@"
fi
forge build --root contracts/base >/dev/null
rpc_host="${BASE_RPC_URL#https://}"
rpc_host="${rpc_host%%/*}"
rpc_ip="${BASE_RPC_IP:-104.20.24.117}"
rpc() {
  curl -sS -m 30 --resolve "${rpc_host}:443:${rpc_ip}" -H 'content-type: application/json' --data-binary "$1" "$BASE_RPC_URL"
}
rpc_result() {
  printf '%s' "$1" | pnpm --filter @ldc/api exec node tools/base-deploy.mjs rpc-result
}
deployer="$(pnpm --filter @ldc/api exec node tools/base-deploy.mjs prepare)"
chain_id="$(rpc_result "$(rpc '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}')")"
[[ "$chain_id" == 0x14a34 ]] || { printf 'Expected Base Sepolia chain ID 84532; received %s\n' "$chain_id" >&2; exit 1; }
nonce="$(rpc_result "$(rpc "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionCount\",\"params\":[\"$deployer\",\"pending\"],\"id\":1}")")"
gas_price="$(rpc_result "$(rpc '{"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":1}')")"
estimate="$(rpc_result "$(curl -sS -m 30 --resolve "${rpc_host}:443:${rpc_ip}" -H 'content-type: application/json' --data-binary @/tmp/ldc-base-deploy-estimate.json "$BASE_RPC_URL")")"
pnpm --filter @ldc/api exec node tools/base-deploy.mjs sign "$nonce" "$estimate" "$gas_price" >/dev/null
raw="$(cat /tmp/ldc-base-deploy-raw)"
submission="$(rpc "{\"jsonrpc\":\"2.0\",\"method\":\"eth_sendRawTransaction\",\"params\":[\"$raw\"],\"id\":1}")"
tx_hash="$(rpc_result "$submission")"
printf 'BASE_DEPLOY_TX=%s\n' "$tx_hash"
printf '%s' "$tx_hash" > /tmp/ldc-base-deploy-tx-hash
address=''
for attempt in {1..24}; do
  response="$(rpc "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionReceipt\",\"params\":[\"$tx_hash\"],\"id\":1}")"
  if address="$(printf '%s' "$response" | pnpm --filter @ldc/api exec node tools/base-deploy.mjs receipt 2>/dev/null)"; then break; fi
  sleep 5
done
[[ -n "$address" ]] || { printf 'Base deployment receipt was not successful; transaction: %s\n' "$tx_hash" >&2; exit 1; }
printf 'BASE_REGISTRY_ADDRESS=%s\n' "$address"
