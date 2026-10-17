import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluationConsensus } from '../src/protocol/evaluationConsensus.js';

test('evaluation waits for finality even when an intermediate round agrees', () => {
  assert.equal(evaluationConsensus({ statusName: 'ACCEPTED', result_name: 'MAJORITY_AGREE' }), 'pending');
});

test('zero-validator finality is an infrastructure failure, not an evaluator rejection', () => {
  assert.throws(() => evaluationConsensus({ statusName: 'FINALIZED', result_name: 'NO_MAJORITY', consensus_data: null, last_round: { round_validators: [] } }), /without validator participation/);
});

test('validator disagreement never permits a Base relay', () => {
  assert.equal(evaluationConsensus({ statusName: 'FINALIZED', result_name: 'NO_MAJORITY', last_round: { round_validators: ['validator'] } }), 'rejected');
  assert.equal(evaluationConsensus({ statusName: 'FINALIZED', result_name: 'MAJORITY_DISAGREE' }), 'rejected');
});

test('finalized majority agreement still requires successful contract execution', () => {
  assert.throws(() => evaluationConsensus({ statusName: 'FINALIZED', result_name: 'MAJORITY_AGREE' }), /execution unknown/);
  assert.throws(() => evaluationConsensus({ statusName: 'FINALIZED', result_name: 'MAJORITY_AGREE', consensus_data: { leader_receipt: [{ execution_result: 'ERROR' }] } }), /execution ERROR/);
  assert.equal(evaluationConsensus({ statusName: 'FINALIZED', result_name: 'MAJORITY_AGREE', consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }] } }), 'approved');
});
