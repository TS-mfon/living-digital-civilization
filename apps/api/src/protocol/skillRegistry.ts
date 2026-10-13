export interface SkillDefinition { name: string; description: string; parameters: Record<string, unknown>; prerequisites: string[]; execute: (input: unknown, context: Record<string, unknown>) => Promise<unknown> | unknown }
export class SkillRegistry {
  private readonly skills = new Map<string,SkillDefinition>();
  register(skill: SkillDefinition) { if (!/^[a-z][a-z0-9_-]{1,48}$/.test(skill.name)||this.skills.has(skill.name)) throw new Error('invalid or duplicate skill name');this.skills.set(skill.name,skill); }
  definitions() { return [...this.skills.values()].map(({execute: _execute,...definition})=>definition); }
  async run(name: string, input: unknown, context: Record<string,unknown> = {}) { const skill=this.skills.get(name);if(!skill)throw new Error('unknown skill');return skill.execute(input,context); }
}
