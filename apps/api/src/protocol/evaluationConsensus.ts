interface EvaluationTransaction {
  statusName?: string;
  result_name?: string;
  consensus_data?: { leader_receipt?: { execution_result?: string }[] } | null;
  last_round?: { round_validators?: unknown[] };
}

export function evaluationConsensus(transaction: EvaluationTransaction): 'pending' | 'approved' | 'rejected' {
  if (transaction.statusName !== 'FINALIZED') return 'pending';
  if (transaction.result_name === 'NO_MAJORITY' || transaction.result_name === 'MAJORITY_DISAGREE') {
    if (transaction.consensus_data == null && transaction.last_round?.round_validators?.length === 0) {
      throw new Error('GenLayer finalized without validator participation; the proposal was not evaluated. No Base transaction was submitted.');
    }
    return 'rejected';
  }
  const execution = transaction.consensus_data?.leader_receipt?.[0]?.execution_result;
  if (transaction.result_name !== 'MAJORITY_AGREE' || execution !== 'SUCCESS') {
    throw new Error(`GenLayer transaction completed unsuccessfully (${transaction.result_name ?? transaction.statusName}; execution ${execution ?? 'unknown'})`);
  }
  return 'approved';
}
