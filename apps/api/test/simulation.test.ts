import test from 'node:test';
import assert from 'node:assert/strict';
import { tickAgent, seedOffspring, type LivingAgent } from '../src/protocol/lifecycle.js';
import { SocialGraph } from '../src/protocol/socialGraph.js';
import { GovernanceLedger } from '../src/protocol/governance.js';
import { ancestryPath, detectInstitutionalNeed, evolveLivingDNA } from '../src/protocol/needDetection.js';
import { SkillRegistry } from '../src/protocol/skillRegistry.js';
import { civilizationEvents } from '../src/protocol/eventBus.js';

test('100 epoch simulation preserves balances, records transitions, and exercises core primitives', async () => {
  let agents: LivingAgent[] = Array.from({length:10},(_,i)=>({id:`agent-${i}`,parentId:null,traits:{curiosity:i/10},vitals:{health:100,energy:150,age:0,experience:0,legacyScore:i===0?110:0,status:'active'}}));
  const balances=new Map(agents.map(a=>[a.id,1000]));const balanceTotal=[...balances.values()].reduce((a,b)=>a+b,0);
  const events: unknown[]=[];const memoryBefore=process.memoryUsage().heapUsed;const started=performance.now();
  for(let epoch=1;epoch<=100;epoch++){agents=agents.map(agent=>{const result=tickAgent(agent,epoch,1.5);events.push(...result.events);return result.agent;});}
  const elapsed=performance.now()-started;const memoryAfter=process.memoryUsage().heapUsed;
  assert.equal(agents.length,10);assert.ok(agents.every(a=>a.vitals.health>=0&&a.vitals.health<=100&&a.vitals.energy>=0));assert.equal(events.length,1000);assert.equal([...balances.values()].reduce((a,b)=>a+b,0),balanceTotal);
  console.info(`simulation: 100 epochs × 10 agents; avg tick ${(elapsed/100).toFixed(3)} ms; heap delta ${((memoryAfter-memoryBefore)/1024).toFixed(1)} KiB`);
  let survivor=agents[1]!;for(let epoch=101;epoch<=160;epoch++)survivor=tickAgent(survivor,epoch,1).agent;assert.equal(survivor.vitals.status,'archived');assert.equal(tickAgent(survivor,161).events.length,0);
  assert.equal(seedOffspring(agents[0]!, 'child').parentId,'agent-0');
  const graph=new SocialGraph();graph.interact('a','b',{trustDelta:.4,affinityDelta:.3,volume:20});graph.interact('b','a',{trustDelta:.4,affinityDelta:.3});assert.equal(graph.factions().length,1);assert.equal(graph.alliesOf('a')[0]?.transactionVolume,20);
  const ledger=new GovernanceLedger();ledger.open({id:'p',kind:'tax_adjustment',payload:{rate:2},openedAtEpoch:1,closesAtEpoch:3});ledger.vote('p','a',true,2);ledger.vote('p','b',true,2);let executed=false;assert.equal(ledger.finalize('p',3,2,()=>{executed=true}).status,'passed');assert.ok(executed);
  assert.equal(detectInstitutionalNeed({disputeRate:.3,resourceVelocity:100,transactionLoad:2,infrastructureCapacity:10})?.organizationType,'resolution');
  assert.equal(ancestryPath('leaf',new Map([['leaf','root'],['root',null]])).join('/'),'root/leaf');
  assert.equal(evolveLivingDNA({governance:{quorum:2},allocationPolicy:'fixed',operationalRules:[],revision:0},{allocationPolicy:'tranches'}).revision,1);
  const skills=new SkillRegistry();skills.register({name:'research',description:'Collect evidence',parameters:{type:'object'},prerequisites:[],execute:(x)=>x});assert.deepEqual(await skills.run('research',{query:'x'}),{query:'x'});
  let received='';const unsubscribe=civilizationEvents.subscribe(event=>{received=event.event});civilizationEvents.publish({event:'organization.created',detail:'{}',proposalId:'p',organizationId:'o',createdAt:new Date().toISOString()});unsubscribe();assert.equal(received,'organization.created');
});
