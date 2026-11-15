# WhatEatO — ChatGPT direct blog publishing bridge (2026-11-15)

This change provides an **owner-scoped, auditable publishing API** independent
of the browser session cookie. It is not automatically live on Hostinger or
automatically connected to ChatGPT. Deploy and connect it explicitly.

## Why

Before this change, publishing through the external assistant required
manual SQL against Neon. That bypasses application-level readiness checks
and cannot be relied on as the regular editorial workflow.

The new API uses the same `parseBlogDraft`, `publishableBlog`, category,
approved-image and related-restaurant checks as the CMS, and writes the
same draft, publication snapshot and audit tables atomically.

## Server setup (Hostinger / deployment)

1. Review this branch and merge to the **actual deployed source branch**.
   Do not assume that the GitHub release branch is currently deployed.
2. In your server's private environment settings (never in Git or chat), set:
   - `WHATEATO_BLOG_AGENT_TOKEN`: random URL-safe high-entropy secret,
     minimum 40 characters. Suggested command in a private terminal:
     `openssl rand -hex 32`
   - `WHATEATO_BLOG_AGENT_ACCOUNT_ID`: UUID of an enabled WhatEatO
     `owner` account in `whateato_admin_accounts`.
   - `WHATEATO_BLOG_AGENT_ALLOW_PUBLISH=true` **only after** the
     authenticated status and draft-mode tests pass.
3. Keep `DATABASE_URL` pointed to the correct Neon branch. Set
   `NEXT_PUBLIC_SITE_URL=https://whateato.com` for returned article URLs.
4. Restart the application and inspect the deployment logs.
5. Enable TLS/HTTPS on the public origin. Never place bearer secrets
   in URLs, CMS articles, logs, ChatGPT prompts, or source control.
6. Rotate the earlier database password exposed in chat; do not reuse it
   for the blog-agent token.

To find the account UUID privately with Neon, run:

```sql
SELECT account_id::text FROM whateato_admin_accounts
WHERE role='owner' AND enabled=true;
```

The agent token is an independent permission for the owner role and can
be revoked by deleting its environment variable or disabling the owner account.

## API

`GET /api/v1/agent/blog?slug=incheon-airport-to-seoul-station`

Headers: `Authorization: Bearer <TOKEN>`

Returns the exact persisted draft revision, publication state, date, and
language URLs. `401` indicates missing/invalid agent credentials.

`POST /api/v1/agent/blog`

Headers: `Authorization: Bearer <TOKEN>`,
`Content-Type: application/json`

Body for a new article (the `draft` field is the CMS JSON package):

```json
{
  "slug": "incheon-airport-to-seoul-station",
  "mode": "draft",
  "draft": {
    "category": "transportation",
    "tags": ["arex"],
    "related_restaurant_ids": [],
    "translations": {
      "en": {"title":"...", "excerpt":"...", "seo_title":"...", "seo_description":"...", "blocks":[]},
      "ko": {"title":"...", "excerpt":"...", "seo_title":"...", "seo_description":"...", "blocks":[]},
      "ja": {"title":"...", "excerpt":"...", "seo_title":"...", "seo_description":"...", "blocks":[]},
      "zh-CN": {"title":"...", "excerpt":"...", "seo_title":"...", "seo_description":"...", "blocks":[]}
    }
  }
}
```

- Use `mode: "publish"` for full, vetted four-language publication when
  the owner has explicitly requested publication.
- For an **existing** slug, always provide the current `expected_revision`
  returned from GET. Stale revisions fail with 409 instead of overwriting
  another editor's work.
- For a new slug, omit `expected_revision`.
- `draft` saves do not change any previously published snapshot.
- Publishing validates all four locales, category, related restaurants and
  any photo UUIDs; unapproved image UUIDs cause a 409 error.
- To add images, use the existing owner CMS image upload and approval workflow
  first; this endpoint does not upload image files.
- Only methods GET and POST are supported. Delete, unpublish and role changes
  are intentionally absent.
- All mutations write owner-attributed records to `whateato_blog_audit`.
- API responses report database state; independently load the public URL
  to validate real Hostinger routing and rendering.

### Manual smoke tests

With the token set in your private terminal and the deployment complete:

```bash
curl -fSs "https://whateato.com/api/v1/agent/blog?slug=incheon-airport-to-seoul-station" \
  -H "Authorization: Bearer ${WHATEATO_BLOG_AGENT_TOKEN}"
```

Expected behavior:
- Missing token: 401.
- Invalid slug: 400.
- Existing article status: 200 with revision and published state.
- Old revision on POST: 409 and no data overwritten.
- Attempt to publish with disabled allow-publish flag: 403.
- Invalid four-language body: validation failure and no publication.
- Draft mode: new post/draft created with audit trail; public page stays hidden.
- Publish mode: all four locales published as a single version; GET says
  published true; verify the public pages in a normal browser.

**Important:** Do not run a live POST with the example incomplete body.

## Connecting from ChatGPT (separate step)

This REST endpoint is the **server-side publishing capability**. ChatGPT
cannot call an arbitrary private URL with stored credentials by itself.

After Hostinger deployment and tests, expose the authenticated operations
through a **private MCP server/plugin** with the same role boundaries. Register
it in ChatGPT Plugins, authorize the connection, and test a draft before
enabling publication. Installing/connecting the plugin requires the user's
explicit action. Do not share the secret in conversation.

Until that connection exists, the assistant may still read the linked Neon
database and maintain GitHub code, but it should **not** represent this API
as callable from the current chat or claim the API was deployed.

## Security / operational limits

- Server-to-server bearer credential; no browser session and no CORS opt-in.
- Owner UUID must remain enabled in the admin table.
- Agent bearer token is accepted only via `Authorization` header.
- Token has separate scope from the bulk-admin token or Neon DB password.
- No direct SQL supplied by the client; all SQL uses parameter binding.
- Request body bounded at 180,000 bytes.
- Recommended additional edge protection before scaling:
  rate limiting, request logs with secrets redacted, key rotation,
  a dedicated service principal and fine-grained publication approvals.
- Initial integration is **not** end-to-end operational until it is deployed
  and authorized as an actual ChatGPT tool.
