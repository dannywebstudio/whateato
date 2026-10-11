import {NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
export const runtime='nodejs';
export async function GET(){const pool=getPool();if(!pool)return NextResponse.json({ready:false,database:'not_configured'},{status:503});try{await pool.query('SELECT 1');return NextResponse.json({ready:true,database:'connected'})}catch{return NextResponse.json({ready:false,database:'unavailable'},{status:503})}}
