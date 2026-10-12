'use server';
import {signIn,signOut,auth,authReady} from '@/auth';
import {getPool} from '@/lib/db';

export async function loginWithGoogle(){
  if(!authReady())throw new Error('Google login is not yet configured');
  await signIn('google',{redirectTo:'/account'});
}
export async function logout(){
  await signOut({redirectTo:'/'});
}
export async function deleteAccount(formData:FormData){
  if(!authReady())throw new Error('Login is not configured');
  if(formData.get('confirmation')!=='DELETE')throw new Error('Type DELETE to confirm');
  const session=await auth();
  const uid=session?.user?.id;
  if(!uid||!(/^[0-9a-f-]{36}$/i).test(uid))throw new Error('Login required');
  const db=getPool();
  if(!db)throw new Error('Database unavailable');
  // CASCADE removes all authored reviews; no Google email/avatar ever stored.
  await db.query('DELETE FROM whateato_review_accounts WHERE id=$1',[uid]);
  await signOut({redirectTo:'/'});
}
