import {NextResponse} from 'next/server';
export const runtime='nodejs';
export function GET(){return NextResponse.json({status:'ok',name:'WhatEatO',databaseConfigured:Boolean(process.env.DATABASE_URL)},{headers:{'Cache-Control':'no-store'}})}
