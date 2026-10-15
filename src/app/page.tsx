import SearchBox from '@/components/SearchBox';
import {HomeTagline} from '@/components/LocalizedChromeText';
export default function Home(){
 return <main className="home"><section className="hero">
  <h1><span className="brand-signature hero-signature">
   <span className="brand-w">W</span>hat
  </span><span className="hero-accent">EatO</span></h1>
  <HomeTagline/>
  <SearchBox/>
 </section></main>;
}
