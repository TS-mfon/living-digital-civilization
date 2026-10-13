export type PolicyKind = 'tax_adjustment' | 'zone_creation' | 'ban_law';
export interface PolicyProposal { id: string; kind: PolicyKind; payload: Record<string, unknown>; openedAtEpoch: number; closesAtEpoch: number; status: 'open' | 'passed' | 'rejected'; votes: Record<string, boolean> }
export interface GovernanceLog { proposalId: string; epoch: number; action: 'opened' | 'voted' | 'executed' | 'rejected'; detail: string }
export class GovernanceLedger {
  private proposals = new Map<string, PolicyProposal>();
  readonly logs: GovernanceLog[] = [];
  open(p: Omit<PolicyProposal,'votes'|'status'>) { if (!p.id || p.closesAtEpoch <= p.openedAtEpoch || this.proposals.has(p.id)) throw new Error('invalid proposal window or duplicate id'); const proposal={...p,votes:{},status:'open' as const};this.proposals.set(p.id,proposal);this.logs.push({proposalId:p.id,epoch:p.openedAtEpoch,action:'opened',detail:p.kind});return proposal; }
  vote(id: string, voter: string, choice: boolean, epoch: number) { const p=this.proposals.get(id);if(!p||p.status!=='open'||epoch>=p.closesAtEpoch||!voter)throw new Error('proposal is not open for voting');if(voter in p.votes)throw new Error('agent already voted');p.votes[voter]=choice;this.logs.push({proposalId:id,epoch,action:'voted',detail:`${voter}:${choice}`});return p; }
  finalize(id: string, epoch: number, quorum: number, execute: (p: PolicyProposal)=>void) { const p=this.proposals.get(id);if(!p||p.status!=='open'||epoch<p.closesAtEpoch)throw new Error('proposal voting window has not closed');const votes=Object.values(p.votes),passed=votes.length>=quorum&&votes.filter(Boolean).length>votes.length/2;p.status=passed?'passed':'rejected';if(passed){execute(p);this.logs.push({proposalId:id,epoch,action:'executed',detail:p.kind});}else this.logs.push({proposalId:id,epoch,action:'rejected',detail:'quorum or majority not reached'});return p; }
}
