import Link from 'next/link';
import type {SiteLanguage} from '@/lib/visitor-country';
import styles from './LegalPage.module.css';
export type LegalDocument={
 title:string;intro:string;updated:string;
 sections:ReadonlyArray<{heading:string;paragraphs:ReadonlyArray<string>}>;
 contactLabel:string;
};
export default function LegalPage({doc,locale}:{doc:LegalDocument;locale:SiteLanguage}){
 return <main className={styles.page} lang={locale}>
  <div className={styles.inner}>
   <span className={styles.eyebrow}>WHATEATO · LEGAL</span>
   <h1 className={styles.title}>{doc.title}</h1>
   <p className={styles.intro}>{doc.intro}</p>
   <p className={styles.date}>{doc.updated}</p>
   {doc.sections.map((section,i)=><section className={styles.section} key={i}>
    <h2>{section.heading}</h2>
    {section.paragraphs.map((paragraph,j)=><p key={j}>{paragraph}</p>)}
   </section>)}
   <Link href={'/contact?hl='+encodeURIComponent(locale)} className={styles.contact}>{doc.contactLabel} →</Link>
  </div>
 </main>;
}
