import {Pool} from 'pg';
let pool:Pool|undefined;
export function getPool(){if(!process.env.DATABASE_URL)return null;if(!pool)pool=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:3000,idleTimeoutMillis:30000});return pool}
