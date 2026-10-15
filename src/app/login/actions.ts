'use server';
import {signIn,authReady} from '@/auth';
import {normalizeLocale} from '@/lib/platform-v1';
export async function loginGoogle(formData:FormData){
 if(!authReady())throw new Error('Google sign-in is unavailable');
 const locale=normalizeLocale(formData.get('hl'));
 await signIn('google',{redirectTo:'/my-page?hl='+encodeURIComponent(locale)});
}
