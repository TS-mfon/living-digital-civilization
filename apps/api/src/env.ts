import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  DEMO_MODE: z.enum(['true','false']).default('true'),
  API_KEY_PEPPER: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  DATABASE_URL: z.string().optional().refine((value)=>!value||/^postgres(ql)?:\/\//i.test(value),'Must be a PostgreSQL connection URL.'),
  POSTGRES_URL: z.string().optional().refine((value)=>!value||/^postgres(ql)?:\/\//i.test(value),'Must be a PostgreSQL connection URL.'),
  DATABASE_PATH: z.string().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  CORS_ORIGIN: z.string().optional(),
  BASE_RPC_URL: z.string().optional().refine((value)=>!value||/^https?:\/\//i.test(value),'Must be an http(s) RPC URL.'),
  BASE_CHAIN_ID: z.coerce.number().int().positive().default(84532),
  BASE_REGISTRY_ADDRESS: z.string().optional().refine((value)=>!value||/^0x[0-9a-fA-F]{40}$/.test(value),'Must be a 20-byte hex address.'),
  BASE_RELAYER_PRIVATE_KEY: z.string().optional().refine((value)=>!value||/^0x[0-9a-fA-F]{64}$/.test(value),'Must be a 32-byte hex private key.'),
  GENLAYER_EVALUATOR_ADDRESS: z.string().optional().refine((value)=>!value||/^0x[0-9a-fA-F]{40}$/.test(value),'Must be a 20-byte hex address.'),
  GENLAYER_RELAYER_PRIVATE_KEY: z.string().optional().refine((value)=>!value||/^0x[0-9a-fA-F]{64}$/.test(value),'Must be a 32-byte hex private key.'),
  GENLAYER_NETWORK: z.string().default('studionet'),
  VERCEL: z.string().optional(),
}).superRefine((value,ctx)=>{
  if(value.NODE_ENV==='production'&&(!value.API_KEY_PEPPER||value.API_KEY_PEPPER.length<32))ctx.addIssue({code:'custom',path:['API_KEY_PEPPER'],message:'Set a random secret of at least 32 characters.'});
  if(value.VERCEL&&!(value.DATABASE_URL||value.POSTGRES_URL))ctx.addIssue({code:'custom',path:['DATABASE_URL'],message:'Vercel deployments need durable PostgreSQL storage.'});
  if(value.DEMO_MODE==='false'){
    for(const key of ['BASE_REGISTRY_ADDRESS','BASE_RELAYER_PRIVATE_KEY','GENLAYER_EVALUATOR_ADDRESS','GENLAYER_RELAYER_PRIVATE_KEY'] as const)if(!value[key])ctx.addIssue({code:'custom',path:[key],message:`Required when DEMO_MODE=false.`});
  }
});

const result=schema.safeParse(process.env);
if(!result.success){const details=result.error.issues.map(issue=>`${issue.path.join('.')||'environment'}: ${issue.message}`).join('\n');throw new Error(`Invalid LDC environment:\n${details}`);}
export const env=result.data;
