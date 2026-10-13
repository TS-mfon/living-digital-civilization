export interface Telemetry { disputeRate: number; resourceVelocity: number; transactionLoad: number; infrastructureCapacity: number }
export interface NeedRecommendation { organizationType: string; mission: string; allocation: number; constraints: string[]; confidence: number; source: 'heuristic'; requiresGenLayerEvaluation: true }
/** Produces a reviewable draft only. It never authorizes factory deployment. */
export function detectInstitutionalNeed(m: Telemetry): NeedRecommendation | null {
  if (Object.values(m).some(v => !Number.isFinite(v) || v < 0)) throw new RangeError('telemetry values must be finite and non-negative');
  const pressure = m.transactionLoad / Math.max(1,m.infrastructureCapacity);
  if (m.disputeRate < 0.2 && pressure < 0.8 && m.resourceVelocity > 0) return null;
  const infrastructure = pressure >= 0.8;
  return { organizationType: infrastructure ? 'infrastructure' : 'resolution', mission: infrastructure ? 'Increase shared infrastructure capacity for rising transaction demand.' : 'Resolve ecosystem disputes through transparent, reviewable case processes.', allocation: Math.max(1,Math.floor(m.resourceVelocity * (infrastructure ? 2 : 1))), constraints: ['public reporting','bounded treasury allocation','independent GenLayer evaluation before deployment'], confidence: Math.min(0.99,0.5+Math.max(m.disputeRate,pressure)*0.1), source: 'heuristic', requiresGenLayerEvaluation: true };
}

export interface ImmutableDNA { readonly genesisId: string; readonly parentId: string | null; readonly generation: number; readonly constitutionalHash: string; readonly securityRules: readonly string[] }
export interface LivingDNA { governance: Record<string, number>; allocationPolicy: string; operationalRules: string[]; revision: number }
export function evolveLivingDNA(current: LivingDNA, changes: Partial<Omit<LivingDNA,'revision'>>): LivingDNA { return { ...current, ...changes, revision: current.revision + 1 }; }
export function ancestryPath(id: string, parents: ReadonlyMap<string,string|null>): string[] { const path:string[]=[];const seen=new Set<string>();let cursor:string|null=id;while(cursor){if(seen.has(cursor))throw new Error('lineage cycle detected');seen.add(cursor);path.push(cursor);cursor=parents.get(cursor)??null;}return path.reverse(); }
