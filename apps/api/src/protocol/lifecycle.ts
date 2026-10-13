export type LifecycleStatus = 'active' | 'archived';
export interface Vitals { health: number; energy: number; age: number; experience: number; legacyScore: number; status: LifecycleStatus }
export interface LifecycleEvent { type: 'epoch.tick' | 'agent.archived' | 'agent.seeded'; agentId: string; epoch: number; detail?: string }
export interface LivingAgent { id: string; parentId: string | null; traits: Readonly<Record<string, number>>; vitals: Vitals }

/** Deterministic epoch transition. Values are clamped and an archived agent never acts again. */
export function tickAgent(agent: LivingAgent, epoch: number, upkeep = 1): { agent: LivingAgent; events: LifecycleEvent[] } {
  if (agent.vitals.status === 'archived') return { agent, events: [] };
  if (!Number.isFinite(upkeep) || upkeep < 0) throw new RangeError('upkeep must be a finite non-negative number');
  const energy = Math.max(0, agent.vitals.energy - upkeep);
  const health = Math.max(0, Math.min(100, agent.vitals.health - (energy === 0 ? 2 : 0)));
  const archived = health === 0;
  const next = { ...agent, vitals: { ...agent.vitals, health, energy, age: agent.vitals.age + 1, experience: agent.vitals.experience + 1, status: archived ? 'archived' as const : 'active' as const } };
  const events: LifecycleEvent[] = [{ type: 'epoch.tick', agentId: agent.id, epoch }];
  if (archived) events.push({ type: 'agent.archived', agentId: agent.id, epoch, detail: 'health reached zero' });
  return { agent: next, events };
}

export function seedOffspring(parent: LivingAgent, childId: string, threshold = 100): LivingAgent {
  if (parent.vitals.status !== 'active' || parent.vitals.legacyScore < threshold) throw new Error('agent is not qualified to reproduce');
  return { id: childId, parentId: parent.id, traits: { ...parent.traits }, vitals: { health: 100, energy: 50, age: 0, experience: 0, legacyScore: 0, status: 'active' } };
}
