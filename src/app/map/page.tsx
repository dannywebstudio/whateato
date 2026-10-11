import Link from 'next/link';
import SearchBox from '@/components/SearchBox';
export default function MapPage(){return <main className="content"><h1>Explore on Map</h1><SearchBox target="map"/><section className="empty-map" aria-label="Map integration preview"><span>Map view will be activated after a licensed map provider and real restaurant coordinates are connected.</span></section><Link className="simple-link" href="/">← Back to Search</Link></main>}
