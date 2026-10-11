import { useEffect, useMemo, useState } from 'react';

type Org = { id:string; familyId:string; parentId:string|null; previousId:string|null; name:string; type:string; purpose:string; constitution:string; generation:number; version:number; resourceUnits:number; status:'active'|'replaced'|'retired'; address:string|null; createdAt:string };
type Activity = { id:number; proposalId:string|null; organizationId:string|null; event:string; detail:string; createdAt:string };
type Health = { ok:boolean; mode:'demo'|'testnet'; base:string; genlayer:string };

const API = '';
const short = (value:string, start=10, end=6) => value.length > start + end + 3 ? `${value.slice(0,start)}…${value.slice(-end)}` : value;
const time = (value:string) => new Intl.DateTimeFormat('en', { hour:'2-digit', minute:'2-digit', month:'short', day:'numeric' }).format(new Date(value));
const label = (value:string) => value.replaceAll('.', ' ').replaceAll('_', ' ');

async function fetchJson<T>(path:string):Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json() as Promise<T>;
}

function StatusMark({ status }: { status:Org['status'] }) {
  return <span className={`status-mark ${status}`}><i />{status}</span>;
}

function TreeNode({ org, children, selected, onSelect, depth=0 }: { org:Org; children:Org[]; selected:string; onSelect:(id:string)=>void; depth?:number }) {
  return <div className={`tree-node depth-${Math.min(depth,3)}`}>
    <button className={`org-node ${selected===org.id?'selected':''}`} onClick={()=>onSelect(org.id)} aria-pressed={selected===org.id}>
      <div className="node-top"><span className="node-monogram">{org.name.slice(0,2).toUpperCase()}</span><StatusMark status={org.status}/></div>
      <strong>{org.name}</strong>
      <div className="node-meta"><span>{org.type}</span><span>G{org.generation} · v{org.version}</span></div>
      <small>{short(org.id,11,5)}</small>
    </button>
    {children.length>0&&<div className="tree-children">{children.map(child=><TreeNode key={child.id} org={child} children={children.filter(item=>item.parentId===child.id)} selected={selected} onSelect={onSelect} depth={depth+1}/>)}</div>}
  </div>;
}

export default function App() {
  const [organizations,setOrganizations] = useState<Org[]>([]);
  const [activity,setActivity] = useState<Activity[]>([]);
  const [health,setHealth] = useState<Health|null>(null);
  const [selected,setSelected] = useState('');
  const [loadError,setLoadError] = useState('');
  const [lastUpdated,setLastUpdated] = useState<Date|null>(null);

  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      try {
        const [orgs,events,status]=await Promise.all([fetchJson<{organizations:Org[]}>('/v1/organizations'),fetchJson<{events:Activity[]}>('/v1/activity'),fetchJson<Health>('/health')]);
        if(!alive)return;
        setOrganizations(orgs.organizations); setActivity(events.events); setHealth(status); setLoadError(''); setLastUpdated(new Date());
        setSelected(current=>current||orgs.organizations.find(org=>org.generation===0)?.id||orgs.organizations[0]?.id||'');
      } catch { if(alive)setLoadError('Cannot reach the local API. Start the services with pnpm dev.'); }
    };
    void load(); const timer=setInterval(()=>void load(),5000);
    return()=>{alive=false;clearInterval(timer);};
  },[]);

  const byId=useMemo(()=>new Map(organizations.map(org=>[org.id,org])),[organizations]);
  const root=organizations.find(org=>!org.parentId);
  const focused=byId.get(selected)||root;
  const activeCount=organizations.filter(org=>org.status==='active').length;
  const generationCount=organizations.reduce((max,org)=>Math.max(max,org.generation),0);
  const resourceTotal=organizations.filter(org=>org.status==='active').reduce((sum,org)=>sum+org.resourceUnits,0);
  const focusedChildren=focused?organizations.filter(org=>org.parentId===focused.id):[];
  const family=focused?organizations.filter(org=>org.familyId===focused.familyId).sort((a,b)=>a.version-b.version):[];

  return <main className="shell">
    <aside className="rail">
      <div className="brand-mark"><span>LD</span><i /></div>
      <div className="rail-rule" />
      <div className="rail-icon active" aria-label="Civilization overview"><span>◈</span></div>
      <div className="rail-icon" aria-label="Lineage inspection"><span>⌘</span></div>
      <div className="rail-icon" aria-label="Activity stream"><span>≋</span></div>
      <div className="rail-bottom"><span className="rail-live" /></div>
    </aside>

    <section className="workspace">
      <header className="topbar">
        <div className="crumb"><span>INSTITUTIONAL NETWORK</span><b>/</b><strong>OBSERVATORY</strong></div>
        <div className="top-status"><span className={`environment-dot ${health?.mode==='demo'?'demo':''}`} />{health?.mode==='demo'?'SIMULATED NETWORK':'TESTNET NETWORK'}<span className="top-divider"/><span className="readonly-label">◉ &nbsp;READ ONLY</span></div>
      </header>

      <div className="content">
        <div className="page-heading">
          <div><div className="eyebrow"><span className="eyebrow-line"/>CIVILIZATION / GENESIS</div><h1>Institutional<br/><em>observatory.</em></h1><p>Monitor the emergence, lineage, and condition of autonomous institutions.</p></div>
          <div className="heading-seal"><span>LD</span><small>FOUNDATION<br/>NETWORK · 001</small><i /></div>
        </div>

        {health?.mode==='demo'&&<div className="demo-banner"><span className="demo-symbol">◌</span><div><strong>Simulation mode</strong><span>Lifecycle records are local previews. No public-chain transactions have been submitted.</span></div><span className="demo-pill">DEMO</span></div>}
        {loadError&&<div className="error-banner">{loadError}</div>}

        <section className="metrics" aria-label="Network metrics">
          <div className="metric"><span className="metric-label">ACTIVE INSTITUTIONS</span><strong>{activeCount.toString().padStart(2,'0')}</strong><small><i className="metric-tick"/>Across the lineage tree</small></div>
          <div className="metric"><span className="metric-label">DEEPEST GENERATION</span><strong>{generationCount.toString().padStart(2,'0')}</strong><small>Genesis to latest descendants</small></div>
          <div className="metric"><span className="metric-label">ALLOCATED RESOURCE UNITS</span><strong>{resourceTotal.toLocaleString()}</strong><small>Available across active institutions</small></div>
          <div className="metric metric-connection"><span className="metric-label">EVALUATION / ENFORCEMENT</span><div className="connection-list"><span><i className={health?.genlayer==='configured'||health?.genlayer==='simulated'?'connected':''}/>GENLAYER <b>{health?.genlayer==='configured'?'READY':health?.genlayer==='simulated'?'SIM':'WAIT'}</b></span><span><i className={health?.base==='connected'||health?.base==='simulated'?'connected':''}/>BASE SEPOLIA <b>{health?.base==='connected'?'READY':health?.base==='simulated'?'SIM':'WAIT'}</b></span></div><small>{lastUpdated?`Synced ${time(lastUpdated.toISOString())}`:'Waiting for API'}</small></div>
        </section>

        <section className="main-grid">
          <div className="panel lineage-panel">
            <div className="panel-head"><div><span className="section-index">01 / LINEAGE</span><h2>Institutional family</h2></div><span className="count-chip">{organizations.length} REGISTERED</span></div>
            <div className="lineage-stage">
              <div className="stage-caption"><span>GENESIS ROOT</span><span>{organizations.length?`${organizations.length-1} DESCENDANT${organizations.length===2?'':'S'}`:'NO DESCENDANTS'}</span></div>
              {root?<TreeNode org={root} children={organizations.filter(org=>org.parentId===root.id)} selected={selected} onSelect={setSelected}/>:<div className="empty-state">Waiting for the Genesis organization record.</div>}
              <div className="stage-foot"><span className="legend-dot active-dot"/>Active <span className="legend-dot replaced-dot"/>Replaced <span className="legend-dot retired-dot"/>Retired</div>
            </div>
          </div>

          <div className="panel inspect-panel">
            <div className="panel-head"><div><span className="section-index">02 / INSPECTION</span><h2>Organization record</h2></div><span className="scan-icon">⌗</span></div>
            {focused?<>
              <div className="inspect-title"><span className="inspect-monogram">{focused.name.slice(0,2).toUpperCase()}</span><div><StatusMark status={focused.status}/><h3>{focused.name}</h3><span>{focused.type.toUpperCase()} · GENERATION {focused.generation}</span></div></div>
              <p className="inspect-purpose">{focused.purpose}</p>
              <div className="record-grid"><div><small>IDENTIFIER</small><strong>{short(focused.id,12,8)}</strong></div><div><small>FAMILY VERSION</small><strong>v{focused.version}</strong></div><div><small>RESOURCE UNITS</small><strong>{focused.resourceUnits.toLocaleString()}</strong></div><div><small>CHILD INSTITUTIONS</small><strong>{focusedChildren.length.toString().padStart(2,'0')}</strong></div></div>
              <div className="inspector-section"><div className="subhead"><span>CONSTITUTION HASH / TEXT</span><span className="lock-mark">⌑ IMMUTABLE RECORD</span></div><p className="constitution">{focused.constitution||'No constitution recorded.'}</p></div>
              <div className="inspector-section"><div className="subhead"><span>LINEAGE REFERENCES</span><span>{family.length} VERSION{family.length===1?'':'S'}</span></div><div className="lineage-refs">{focused.parentId&&<div><span>PARENT</span><button onClick={()=>setSelected(focused.parentId!)}>{byId.get(focused.parentId)?.name||short(focused.parentId)}</button></div>}{focused.previousId&&<div><span>PREVIOUS</span><button onClick={()=>setSelected(focused.previousId!)}>{short(focused.previousId)}</button></div>}{family.map(item=><div key={item.id}><span>V{item.version} · {item.status.toUpperCase()}</span><button onClick={()=>setSelected(item.id)}>{short(item.id)}</button></div>)}</div></div>
              {focused.address&&<div className="contract-address"><span>BASE INSTANCE</span><code>{short(focused.address,13,9)}</code></div>}
            </>:<div className="empty-state">Select an institution from the lineage view to inspect its record.</div>}
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-head"><div><span className="section-index">03 / MEMORY</span><h2>Recent institutional activity</h2></div><span className="live-tag"><i/> LIVE FEED</span></div>
          {activity.length===0?<div className="empty-activity">No lifecycle events have been recorded.</div>:<div className="activity-table"><div className="activity-header"><span>EVENT</span><span>INSTITUTION / PROPOSAL</span><span>DETAIL</span><span>TIME</span></div>{activity.slice(0,7).map(event=><ActivityRow key={event.id} event={event} byId={byId} onSelect={setSelected}/>)}</div>}
        </section>
        <footer className="footer"><span>LIVING DIGITAL CIVILIZATION <b>·</b> NETWORK MEMORY</span><span>READ MODEL · 5 SECOND REFRESH</span><span>{health?.mode==='demo'?'LOCAL SIMULATION':'BASE SEPOLIA + GENLAYER'}</span></footer>
      </div>
    </section>
  </main>;
}

function ActivityRow({event,byId,onSelect}:{event:Activity;byId:Map<string,Org>;onSelect:(id:string)=>void}) {
  let detail:Record<string,unknown>={};
  try { detail=JSON.parse(event.detail) as Record<string,unknown>; } catch { /* old index entries remain inspectable as text */ }
  const orgId=event.organizationId||String(detail.organizationId||'');
  const org=byId.get(orgId);
  const action=event.event.split('.')[1]||event.event;
  const rationale=typeof detail.rationale==='string'?detail.rationale:typeof detail.error==='string'?detail.error:'';
  const txHash=typeof detail.txHash==='string'?detail.txHash:typeof detail.baseTx==='string'?detail.baseTx:'';
  const detailText=rationale|| (txHash?`${event.event.startsWith('evaluation')?'GenLayer':'Base'} transaction · ${short(txHash,12,8)}`:typeof detail.name==='string'?detail.name:'Lifecycle state updated');
  return <div className="activity-row"><span className={`event-kind ${action}`}>{label(event.event)}</span><span>{org?<button className="text-link" onClick={()=>onSelect(org.id)}>{org.name}</button>:event.proposalId?`Proposal ${short(event.proposalId,8,4)}`:'Agent registration'}</span><span className="activity-detail">{detailText}{detail.demo===true&&<i> · simulated</i>}</span><time>{time(event.createdAt)}</time></div>;
}
