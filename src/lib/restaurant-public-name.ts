// Public-facing restaurant name normalization. Never overwrite permit/source names.
// Remove ONLY leading legal entity designators; leave brand, middle parentheses
// and other genuine trading names intact. Source identity remains in name_ko.
const leadingLegalMarker=/^\s*(?:(?:\(\s*주\s*\)|㈜|주식회사|\(\s*유\s*\)|유한회사)\s*)+/u;

export function restaurantPublicName(value:string|null|undefined):string{
  const original=(value||'').trim();
  const cleaned=original.replace(leadingLegalMarker,'').trim();
  // Identity-safe: never turn a legal-only record into a blank name.
  return cleaned||original;
}
