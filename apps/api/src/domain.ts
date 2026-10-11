export type Action = 'create' | 'evolve' | 'retire';
export type ProposalStatus = 'submitted' | 'evaluating' | 'approved' | 'rejected' | 'relaying' | 'active' | 'replaced' | 'retired' | 'failed';
export type ProposalInput = { action: Action; parentId?: string; organizationId?: string; name?: string; type?: string; purpose?: string; constitution?: string; allocation?: number };

export type ProposalRow = {
  id: string; agentId: string; action: Action; parentId: string | null; organizationId: string | null;
  name: string; type: string; purpose: string; constitution: string; allocation: number;
  status: ProposalStatus; evaluation: string | null; genlayerTx: string | null; baseTx: string | null;
  error: string | null; createdAt: string; updatedAt: string;
};

export type OrganizationRow = {
  id: string; familyId: string; parentId: string | null; previousId: string | null;
  name: string; type: string; purpose: string; constitution: string; generation: number; version: number;
  resourceUnits: number; status: 'active' | 'replaced' | 'retired'; address: string | null; createdAt: string;
};
