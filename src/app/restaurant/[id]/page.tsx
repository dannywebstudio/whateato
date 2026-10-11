import Link from 'next/link';
export default async function RestaurantDetail({params}:{params:Promise<{id:string}>}){await params;return <main className="content"><h1>Restaurant detail</h1><p className="hint">Restaurant details are available after verified data import.</p><Link href="/search">← Search</Link></main>}
