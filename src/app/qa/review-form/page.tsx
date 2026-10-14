import {notFound} from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';
export const dynamic='force-dynamic';
/** This regression harness always 404s outside the synthetic local CI fixture. */
export default function ReviewFormSyntheticQA(){
 if(process.env.WHATEATO_CI_LOCAL_FIXTURE!=='ONLY_LOCAL_EPHEMERAL')
   notFound();
 return <main style={{maxWidth:940,margin:'24px auto',padding:'0 12px'}}>
   <ReviewForm restaurantId="22222222-2222-4222-8222-222222222222" canWrite locale="en"/>
 </main>;
}
