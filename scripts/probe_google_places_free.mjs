#!/usr/bin/env node
// HARD-LOCKED zero-charge-SKU connectivity probe.
// One call maximum; no retry; ID-only Text Search Essentials SKU.
// No database access, no data persistence, no paid fields.
const key = process.env.GOOGLE_PLACES_API_KEY;
if (!key) throw Error('Missing GOOGLE_PLACES_API_KEY GitHub secret');
const mask = 'places.id';
const endpoint = 'https://places.googleapis.com/v1/places:searchText';
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': mask
    },
    body: JSON.stringify({
      textQuery: '광화문 미진 서울 종로구',
      languageCode: 'ko',
      regionCode: 'KR',
      pageSize: 1
    }),
    signal: controller.signal
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const status = typeof errorBody?.error?.status === 'string' ? errorBody.error.status : 'UNKNOWN';
    const reasons = Array.isArray(errorBody?.error?.details)
      ? errorBody.error.details.map(x => x?.reason).filter(x => typeof x === 'string').slice(0, 3)
      : [];
    // Only standardized error identifiers, never raw messages or credential-bearing URLs.
    console.error(JSON.stringify({result: 'rejected', httpStatus: response.status, googleStatus: status, googleReasons: reasons, maxApiRequests: 1, fieldMask: mask}));
    process.exitCode = 1;
  } else {
    const data = await response.json();
    const items = Array.isArray(data.places) ? data.places : [];
    if (items.some(p => Object.keys(p).some(k => k !== 'id'))) {
      throw Error('Unexpected non-ID fields: probe refused');
    }
    console.log(JSON.stringify({
      status: 'success',
      api: 'Places API (New) Text Search',
      sku: 'Text Search Essentials (IDs Only)',
      fieldMask: mask,
      maxApiRequests: 1,
      candidates: items.length,
      storedResults: false,
      databaseWrites: false,
      paidFieldsRequested: false
    }));
  }
} finally {
  clearTimeout(timeout);
}
