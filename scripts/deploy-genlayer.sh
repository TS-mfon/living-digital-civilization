#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
password_file="${HOME}/.genlayer/ldc-studionet-deployer.password"
cd "$root"
genlayer network set studionet
genlayer account use ldc-studionet-deployer
if (($#)); then
  output="$(genlayer "$@" < "$password_file")"
  printf '%s\n' "$output"
  if [[ "${1}" == write ]] && [[ "$output" != *"execution_result: 'SUCCESS'"* ]]; then
    printf 'GenLayer write receipt did not report successful contract execution.\n' >&2
    exit 1
  fi
else
  output="$(genlayer deploy --contract contracts/genlayer/institutional_evaluator.py < "$password_file")"
  printf '%s\n' "$output"
  if [[ "$output" != *"execution_result: 'SUCCESS'"* ]]; then
    printf 'GenLayer deployment receipt did not report successful contract execution.\n' >&2
    exit 1
  fi
fi
