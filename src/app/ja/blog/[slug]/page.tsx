import type {Metadata} from 'next';
import BlogStory,{generateMetadata as baseMetadata} from '@/app/blog/[slug]/page';
import {findPublishedBlog} from '@/lib/blog-public';
import {notFound} from 'next/navigation';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;
 const story=await findPublishedBlog(slug,'ja');
 if(!story||story.locale!=='ja')return {title:'Not found',robots:{index:false,follow:false}};
 return baseMetadata({params:Promise.resolve({slug}),searchParams:Promise.resolve({hl:'ja'})});
}
export default async function JapaneseStory({params}:Props){
 const {slug}=await params;
 const story=await findPublishedBlog(slug,'ja');
 if(!story||story.locale!=='ja')notFound();
 return BlogStory({params:Promise.resolve({slug}),searchParams:Promise.resolve({hl:'ja'})});
}
