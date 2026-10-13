export interface SocialEdge { from: string; to: string; trust: number; affinity: number; alignment: number; transactionVolume: number }
export class SocialGraph {
  private readonly edges = new Map<string, SocialEdge>();
  private key(from: string, to: string) { return `${from}\u0000${to}`; }
  interact(from: string, to: string, input: { trustDelta?: number; affinityDelta?: number; alignmentDelta?: number; volume?: number } = {}): SocialEdge {
    if (!from || !to || from === to) throw new Error('interaction requires two distinct agent ids');
    const key = this.key(from, to), old = this.edges.get(key) ?? { from, to, trust: 0.5, affinity: 0.5, alignment: 0.5, transactionVolume: 0 };
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    const next = { ...old, trust: clamp(old.trust + (input.trustDelta ?? 0)), affinity: clamp(old.affinity + (input.affinityDelta ?? 0)), alignment: clamp(old.alignment + (input.alignmentDelta ?? 0)), transactionVolume: old.transactionVolume + Math.max(0, input.volume ?? 0) };
    this.edges.set(key, next); return next;
  }
  alliesOf(id: string, limit = 10): SocialEdge[] { return [...this.edges.values()].filter(e => e.from === id).sort((a,b) => (b.trust+b.affinity+b.alignment)-(a.trust+a.affinity+a.alignment)).slice(0, limit); }
  adversariesOf(id: string, limit = 10): SocialEdge[] { return [...this.edges.values()].filter(e => e.from === id).sort((a,b) => (a.trust+a.affinity+a.alignment)-(b.trust+b.affinity+b.alignment)).slice(0, limit); }
  factions(threshold = 0.7): string[][] {
    const links = [...this.edges.values()].filter(e => (e.trust + e.affinity + e.alignment) / 3 >= threshold);
    const adjacency = new Map<string, Set<string>>();
    for (const { from, to } of links) { if (!adjacency.has(from)) adjacency.set(from,new Set()); if (!adjacency.has(to)) adjacency.set(to,new Set()); adjacency.get(from)!.add(to); adjacency.get(to)!.add(from); }
    const seen = new Set<string>(), out: string[][] = [];
    for (const node of adjacency.keys()) if (!seen.has(node)) { const stack=[node], group:string[]=[]; seen.add(node); while(stack.length){const x=stack.pop()!;group.push(x);for(const n of adjacency.get(x)!)if(!seen.has(n)){seen.add(n);stack.push(n)}} out.push(group.sort()); }
    return out;
  }
}
