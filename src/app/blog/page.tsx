import type {Metadata} from 'next';
export const metadata:Metadata={title:'Blog'};
export default function BlogPage(){return <main className="content"><h1>WhatEatO Blog</h1><p className="hint">Verified Korean dining guides and local food stories are coming soon.</p><div className="empty">No editorial articles have been published.</div></main>}
