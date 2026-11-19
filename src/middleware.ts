import {NextResponse,type NextRequest} from 'next/server';

/**
 * One canonical public host for every URL (including published blog and food
 * guides). The Hostinger edge should also redirect www to non-www, but its
 * current www alias has been observed returning a duplicate 200 response.
 * This application-level 308 is a safe backstop if the www Host reaches Next.
 */
export function middleware(request:NextRequest){
 const hostname=(request.headers.get('host')||request.nextUrl.hostname)
  .split(':')[0].trim().toLowerCase();
 if(hostname!=='www.whateato.com')return NextResponse.next();
 const url=request.nextUrl.clone();
 url.protocol='https:';
 url.hostname='whateato.com';
 url.port='';
 return NextResponse.redirect(url,308);
}

export const config={matcher:['/:path*']};
