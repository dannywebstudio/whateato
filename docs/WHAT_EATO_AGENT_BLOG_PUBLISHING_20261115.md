# WhatEatO — ChatGPT 직접 블로그 발행 (MCP + OAuth)

구현 위치: PR #72 / `feature/agent-direct-blog-publishing-20261115`

**현재 상태:** 소스 코드가 PR에 구현되어 있으나 운영 서버 배포, DB 마이그레이션,
ChatGPT 플러그인 사용자 연결은 각각 별도 작업이다. PR만으로 자동 연결되지 않는다.

## Architecture

```text
ChatGPT (user request)
  -> WhatEatO remote MCP (https://whateato.com/mcp)
  -> OAuth discovery + owner Google login + explicit consent
  -> MCP tools: status, read, save draft, publish
  -> shared service / src/lib/agent-blog-service.ts
  -> Neon: drafts, publications, audit
  -> public blog /blog/[slug] (4 languages)
```

API uses existing WhatEatO JSON format and CMS publication validations.
Images are uploaded + rights-approved through the existing owner CMS before being
referenced in the draft. Incomplete or unapproved images cannot be published.
Existing articles require `expected_revision` to prevent overwriting another edit.

## Hostinger deployment checklist

1. Verify Hostinger's actual deployment branch and merge PR #72 **only after CI success**.
   Confirm Node.js >=22 and run `npm install`, `npm run typecheck`, `npm run build`.
2. Confirm the Neon `DATABASE_URL` maps to `launch-hostinger-20261015`.
3. On that Neon branch, apply migration
   `db/migrations/20261115_blog_agent_oauth.sql` **once** after review.
   It only creates the short-lived OAuth code table and an index; it does not edit
   restaurant, user, blog, image, or publication data.
4. Set all of the following in Hostinger **private environment variables**:

   - `WHATEATO_BLOG_AGENT_ENABLED=true`
   - `WHATEATO_BLOG_OAUTH_SECRET`: new random 64-byte secret; e.g.
     `openssl rand -hex 64`
   - `WHATEATO_BLOG_AGENT_ALLOW_PUBLISH=true` only after status/read/draft tests pass.
   - `WHATEATO_OWNER_CMS_ENABLED=true` (existing CMS)
   - `NEXT_PUBLIC_SITE_URL=https://whateato.com`
   - `WHATEATO_OWNER_CANONICAL_ORIGIN=https://whateato.com`
   - Existing `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`.

   Keep the **separate REST bearer integration** disabled unless it is actually used.
   The REST API requires `WHATEATO_BLOG_AGENT_TOKEN` and
   `WHATEATO_BLOG_AGENT_ACCOUNT_ID`. The MCP OAuth flow does **not** require them.

5. Restart Hostinger Node.js process, ensure HTTPS. Never share tokens in chat or
   put them into the repository, URLs, or GitHub Actions logs.
6. **Rotate the Neon password exposed in a past conversation**, update Hostinger,
   and restart the service. Do not use database credentials as OAuth secrets.

## ChatGPT plugin connection

The remote MCP endpoint is:
`https://whateato.com/mcp`

Use ChatGPT web → Plugins → Add custom MCP server. Choose OAuth authentication.
The server advertises:

- `/.well-known/oauth-protected-resource`
- `/.well-known/oauth-authorization-server`
- `/api/agent/oauth/register`: dynamic client registration; only ChatGPT OAuth
  redirect endpoints are permitted and a client ID is signed to prevent tampering.
- `/api/agent/oauth/authorize` and `/agent/authorize`: owner consent after
  existing Google login (session is verified against enabled owner role).
- `/api/agent/oauth/token`: one-time authorization code + PKCE S256 exchange.

User must explicitly **approve consent and install/connect** in ChatGPT. This
cannot be done by merging code or supplying only a database URL.

Security scopes: `blog:read`, `blog:write`. Token lifetime 7 days;
after expiry reconnect via OAuth. Signing secret rotation revokes all tokens.
Existing WhatEatO owner account must remain enabled. No anonymous writing.

## Tools

- `whateato_blog_status(slug)` — persisted revision, publication state, URLs
- `whateato_read_blog_draft(slug)` — full owner-only four-language JSON draft
- `whateato_save_blog_draft(slug, draft, expected_revision?)` — save only
- `whateato_publish_blog(slug, draft, expected_revision?)` — publicly
  publish all four languages with user authorization and validation

The last tool is write-capable and should be used only after a clear user
instruction to publish. For existing articles, always read the latest revision
first. Confirm Klook/affiliate URLs and image rights; never invent discounts.

## HTTP-only smoke tests before plugin setup

- `GET https://whateato.com/.well-known/oauth-protected-resource` responds
  with `resource=https://whateato.com/mcp`.
- `GET https://whateato.com/.well-known/oauth-authorization-server`
  advertises PKCE S256, token endpoint, DCR and accepted scopes.
- `POST https://whateato.com/mcp` without OAuth token returns 401 with
  `WWW-Authenticate` pointing to protected resource metadata.
- Malformed client callbacks are denied during DCR.
- Owner Google login and explicit consent are required.
- Reusing an OAuth authorization code after successful token exchange fails.
- `whateato_blog_status` returns the published AREX article and current revision.
- Draft test creates an unpublished article; verify not visible publicly.
- Publishing test creates a four-language public snapshot with an audit trail.
- Modification with stale `expected_revision` fails with 409.
- Access with expired/invalid tokens fails.
- Images missing rights approval cause publication to fail.

## Legacy REST endpoint (optional)

`GET /api/v1/agent/blog?slug=...` and `POST /api/v1/agent/blog` remain
available for trusted service-to-service callers using a **different**
`WHATEATO_BLOG_AGENT_TOKEN`. For security, do not put this secret in user
messages or ChatGPT tool calls. The MCP OAuth route is the preferred ChatGPT path.

## Known limitations / next steps

- Public REST/MCP code is not activated before manual Hostinger deployment.
- Write-enabled custom MCP plugins require eligible ChatGPT workspace permissions;
  follow the current ChatGPT web UI guidance.
- This does not yet upload or rights-approve images, unpublish posts, or delete
  articles. Keep these actions in the existing owner CMS.
- OAuth DCR currently allows ChatGPT redirect domains only, intentionally.
- For future scale, add rate limits to DCR, token consent audit, and operational
  metrics. One-time codes are kept hashed in Neon and should be regularly pruned.
- A separate live browser test is required to verify production HTML, SEO and
  4-language rendering after connection.
