import assert from 'node:assert/strict';
import { handleMessage } from './server.mjs';

const initialized=await handleMessage({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'ldc-test',version:'1'}}});
const listed=await handleMessage({jsonrpc:'2.0',id:2,method:'tools/list'});
assert.equal(initialized.result.serverInfo.name,'ldc-agent-tools');
assert.equal(listed.result.tools.length,12);
assert.equal((await handleMessage({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'ldc_submit_proposal',arguments:{action:'create'}}})).result.isError,true);
console.log('MCP initialize, tool discovery, and argument validation passed');
