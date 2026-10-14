import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import {getPool} from '@/lib/db';

/** OpenID + verified email transiently; store ONLY stable Google subject in Neon. */
export function authReady(){
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_SECRET && process.env.DATABASE_URL);
}
export const {handlers,auth,signIn,signOut}=NextAuth({
  providers:[Google({
    authorization:{params:{scope:'openid email',access_type:'online',include_granted_scopes:'false'}}
  })],
  session:{strategy:'jwt',maxAge:60*60*24*7},
  pages:{signIn:'/account'},
  callbacks:{
    async signIn({account,profile}){
      if(!authReady()||account?.provider!=='google'||typeof profile?.sub!=='string'||
        profile.sub.length<6||profile.sub.length>255||profile.email_verified!==true) return false;
      const pool=getPool();
      if(!pool)return false;
      await pool.query(
        'INSERT INTO whateato_review_accounts(google_subject) VALUES($1) ON CONFLICT(google_subject) DO NOTHING',
        [profile.sub]
      );
      // Optional one-time owner bootstrap on the isolated CMS preview.
      // Only an email explicitly configured server-side AND verified by Google
      // can be bootstrapped. Never persist the email or auto-promote reviewers.
      // A pre-existing owner prevents a second automatic grant.
      const bootstrap=process.env.WHATEATO_CMS_BOOTSTRAP_GOOGLE_EMAIL?.trim().toLowerCase()||'';
      const verified=typeof profile.email==='string'?profile.email.trim().toLowerCase():'';
      if(process.env.WHATEATO_OWNER_CMS_ENABLED==='true'&&
         process.env.WHATEATO_CMS_BOOTSTRAP_ENABLED==='true'&&
         bootstrap.length>5&&bootstrap===verified){
        await pool.query(`
          INSERT INTO whateato_admin_accounts(account_id,role)
          SELECT a.id,'owner' FROM whateato_review_accounts a
          WHERE a.google_subject=$1 AND NOT EXISTS(
            SELECT 1 FROM whateato_admin_accounts WHERE role='owner' AND enabled=true)
          ON CONFLICT(account_id) DO NOTHING`,[profile.sub]);
      }
      return true;
    },
    async jwt({token,account,profile}){
      if(account?.provider==='google'&&typeof profile?.sub==='string'){
        const pool=getPool();
        if(!pool)throw new Error('Database unavailable');
        const result=await pool.query<{id:string}>(
          'SELECT id FROM whateato_review_accounts WHERE google_subject=$1',
          [profile.sub]
        );
        if(!result.rows[0])throw new Error('Account unavailable');
        token.sub=result.rows[0].id;
      }
      delete token.name;
      delete token.email;
      delete token.picture;
      return token;
    },
    async session({session,token}){
      if(typeof token.sub==='string'&&session.user){
        // Return only the internal UUID to the browser. No identity attributes.
        session.user={id:token.sub} as unknown as typeof session.user;
      }
      return session;
    }
  }
});
