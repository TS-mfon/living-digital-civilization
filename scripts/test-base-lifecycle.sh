#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export BASE_RPC_URL="${BASE_RPC_URL:-https://base-sepolia-rpc.publicnode.com}"
export BASE_REGISTRY_ADDRESS="${BASE_REGISTRY_ADDRESS:-0x8907e46d9cc22d2ea953c3b83ab082cabf7c823f}"
cd "$root"
rpc_host="${BASE_RPC_URL#https://}"
rpc_host="${rpc_host%%/*}"
rpc_ip="${BASE_RPC_IP:-104.20.24.117}"
rpc() { curl -sS -m 30 --resolve "${rpc_host}:443:${rpc_ip}" -H 'content-type: application/json' --data-binary "$1" "$BASE_RPC_URL"; }
result() { printf '%s' "$1" | pnpm --filter @ldc/api exec node tools/base-smoke.mjs rpc-result; }
node_tool() { pnpm --filter @ldc/api exec node tools/base-smoke.mjs "$@"; }

chain_id="$(result "$(rpc '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}')")"
[[ "$chain_id" == 0x14a34 ]] || { printf 'Expected Base Sepolia chain ID 84532, got %s\n' "$chain_id" >&2; exit 1; }

read_record() {
  local organization_id="$1"
  node_tool prepare read "$organization_id" >/dev/null
  local raw
  raw="$(curl -sS -m 30 --resolve "${rpc_host}:443:${rpc_ip}" -H 'content-type: application/json' --data-binary @/tmp/ldc-base-smoke-call.json "$BASE_RPC_URL")"
  printf '%s' "$raw" | node_tool read-result record
}
read_count() {
  node_tool prepare read count >/dev/null
  local raw
  raw="$(curl -sS -m 30 --resolve "${rpc_host}:443:${rpc_ip}" -H 'content-type: application/json' --data-binary @/tmp/ldc-base-smoke-call.json "$BASE_RPC_URL")"
  printf '%s' "$raw" | node_tool read-result count
}

send_action() {
  local action="$1"; shift
  local meta from nonce gas_price estimate tx_hash receipt decoded
  meta="$(node_tool prepare "$action" "$@")"
  from="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).from)' "$meta")"
  nonce="$(result "$(rpc "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionCount\",\"params\":[\"$from\",\"pending\"],\"id\":1}")")"
  gas_price="$(result "$(rpc '{"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":1}')")"
  estimate="$(result "$(curl -sS -m 30 --resolve "${rpc_host}:443:${rpc_ip}" -H 'content-type: application/json' --data-binary @/tmp/ldc-base-smoke-estimate.json "$BASE_RPC_URL")")"
  node_tool sign "$nonce" "$estimate" "$gas_price" >/dev/null
  local raw
  raw="$(cat /tmp/ldc-base-smoke-raw)"
  tx_hash="$(result "$(rpc "{\"jsonrpc\":\"2.0\",\"method\":\"eth_sendRawTransaction\",\"params\":[\"$raw\"],\"id\":1}")")"
  printf '%s_TX=%s\n' "${action^^}" "$tx_hash"
  for attempt in {1..24}; do
    receipt="$(rpc "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionReceipt\",\"params\":[\"$tx_hash\"],\"id\":1}")"
    if decoded="$(printf '%s' "$receipt" | node_tool decode 2>/dev/null)"; then
      printf '%s\n' "$decoded"
      return 0
    fi
    sleep 5
  done
  printf 'No successful receipt for %s transaction %s\n' "$action" "$tx_hash" >&2
  return 1
}

if [[ "${1:-}" == inspect ]]; then
  genesis='0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640'
  genesis_record="$(read_record "$genesis")"
  first_record="$(read_record 0x188907da28b01b239f10a4518d1f933373c84924917e2415638828e5778a443b)"
  second_record="$(read_record 0xe5b46b25f53c5ffb7ec6683ba9efc579e2147091ce5a59d2a07fae2338794d2b)"
  count="$(read_count)"
  node -e 'const [g,v1,v2,count]=process.argv.slice(1).map(JSON.parse); if(g.resourceUnits!=="1000000"||v1.status!==1||v2.status!==2||v2.resourceUnits!=="0"||v2.previousVersionId!==v1.id||count!==3)process.exit(1); console.log("BASE_LIFECYCLE_OK: creation, evolution, retirement, lineage, and full resource return verified")' "$genesis_record" "$first_record" "$second_record" "$count"
  printf 'GENESIS=%s\nCREATED=%s\nEVOLVED=%s\nCOUNT=%s\n' "$genesis_record" "$first_record" "$second_record" "$count"
  exit 0
fi

create_result="$(send_action create)"
printf '%s\n' "$create_result"
created_id="$(node -e 'const r=JSON.parse(process.argv[1].split("\n").at(-1)); process.stdout.write(r.logs.find(x=>x.event==="OrganizationCreated").organizationId)' "$create_result")"
evolve_result="$(send_action evolve "$created_id")"
printf '%s\n' "$evolve_result"
evolved_id="$(node -e 'const r=JSON.parse(process.argv[1].split("\n").at(-1)); process.stdout.write(r.logs.find(x=>x.event==="OrganizationEvolved").organizationId)' "$evolve_result")"
retire_result="$(send_action retire "$evolved_id")"
printf '%s\n' "$retire_result"

genesis='0x2fc8d26b41cc4fd97d0c604764c27f7aa78b846ebb3f51543a833ef13fcc7640'
genesis_record="$(read_record "$genesis")"
first_record="$(read_record "$created_id")"
second_record="$(read_record "$evolved_id")"
count="$(read_count)"
node -e 'const [g,v1,v2,count]=process.argv.slice(1).map(JSON.parse); if(g.resourceUnits!=="1000000"||v1.status!==1||v2.status!==2||v2.resourceUnits!=="0"||v2.previousVersionId!==v1.id||count!==3)process.exit(1); console.log("BASE_LIFECYCLE_OK: creation, evolution, retirement, lineage, and full resource return verified")' "$genesis_record" "$first_record" "$second_record" "$count"
printf 'BASE_REGISTRY_ADDRESS=%s\n' "$BASE_REGISTRY_ADDRESS"
