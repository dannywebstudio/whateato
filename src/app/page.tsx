import SearchBox from '@/components/SearchBox';
export default function Home(){
 return <main className="home"><section className="hero">
  <h1><span className="brand-signature hero-signature">
   <span className="brand-w">W</span>hat
  </span><span className="hero-accent">EatO</span></h1>
  <p>Find your next favorite place to eat in Korea.</p>
  <SearchBox/>
 </section></main>;
}
