-- Staging-first: server-side debit ledger for Google API free-tier safety.
-- Only billable SKU families specifically implemented by our guarded wrappers.
-- A separate quota row per UTC day/month; failed Google HTTP calls are still
-- counted conservatively as billed attempts; never refund automatically.
CREATE TABLE IF NOT EXISTS whateato_google_budget_usage_v1 (
 period_key text NOT NULL CHECK(period_key ~ '^20[0-9]{2}-[0-9]{2}(-[0-9]{2})?$'),
 sku text NOT NULL CHECK(sku IN('places_text_search_pro','translation_nmt_chars')),
 used_units bigint NOT NULL DEFAULT 0 CHECK(used_units>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(period_key,sku)
);
CREATE TABLE IF NOT EXISTS whateato_google_budget_requests_v1 (
 month_key text NOT NULL CHECK(month_key ~ '^20[0-9]{2}-[0-9]{2}$'),
 sku text NOT NULL CHECK(sku IN('places_text_search_pro','translation_nmt_chars')),
 request_key text NOT NULL CHECK(length(request_key) BETWEEN 8 AND 190),
 charged_units bigint NOT NULL CHECK(charged_units>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(month_key,sku,request_key)
);
COMMENT ON TABLE whateato_google_budget_requests_v1 IS
 'Each distinct API work item can consume Google quota only once per UTC month; not a Google billing system of record.';
