# WhatEatO multilingual editorial bundle and atomic publication v1

## Source languages and audiences
Every new article must ship **as one four-language bundle**:
- `en`: international English edition, including U.S. readers; the same page advertises `en-US` hreflang for U.S. search.
- `ko`: Korea / Korean readers.
- `ja`: Japan / Japanese readers, maintained from the preexisting supported locale.
- `zh-CN`: simplified Chinese readers.

The user's wording "한국, 영어, 미국, 중국" uses "English" and "U.S." as different audience labels. These are *not* two independent written languages: v1 uses one English edition for both and retains the existing Japanese version. Geographic availability inside any specific country is not guaranteed by language localization.

## ChatGPT-centered editorial workflow
1. User specifies topic and target category; ChatGPT gathers current fact-based evidence and writes a Korean/English/Japanese/Chinese article set with human-sounding local phrasing, accurate source-verified facts, proper product names, reader-first headline and SEO description, without claiming actual restaurant visits/product tests/patient experiences that did not occur.
2. Do not invent experience-based restaurant, cosmetic or medical reviews. For plastic surgery topics, give evidence-based public information or real user-authored experiences with consent; include medical risk/context, never fabricated testimonials.
3. Each locale must have its **own** title, excerpt, SEO title, SEO description, heading and substantive article blocks. No automatic English fallback or single-language publishing when preparing newly approved content. Each language may use an idiomatic localized title rather than literal translation.
4. Assistant can format one four-language JSON content package in the CMS `BlogDraft` schema:
```json
{
  "category": "restaurants",
  "tags": ["seoul", "food-guide"],
  "related_restaurant_ids": [],
  "translations": {
    "en": {"title":"...", "excerpt":"...", "seo_title":"...", "seo_description":"...", "blocks":[{"id":"en-h2-1","type":"heading","level":2,"text":"..."},{"id":"en-p-1","type":"paragraph","text":"..."}]},
    "ko": {"title":"...", "excerpt":"...", "seo_title":"...", "seo_description":"...", "blocks":[{"id":"ko-h2-1","type":"heading","level":2,"text":"..."},{"id":"ko-p-1","type":"paragraph","text":"..."}]},
    "ja": {"title":"...", "excerpt":"...", "seo_title":"...", "seo_description":"...", "blocks":[{"id":"ja-h2-1","type":"heading","level":2,"text":"..."},{"id":"ja-p-1","type":"paragraph","text":"..."}]},
    "zh-CN": {"title":"...", "excerpt":"...", "seo_title":"...", "seo_description":"...", "blocks":[{"id":"zh-h2-1","type":"heading","level":2,"text":"..."},{"id":"zh-p-1","type":"paragraph","text":"..."}]}
  }
}
```
5. Open `/admin` → **블로그 콘텐츠** → create/select a stable slug → expand **ChatGPT 작성 원고 4개 언어 한번에 가져오기** and paste JSON. The CMS locally schema-validates and loads the four languages into the editor, with no automatic publishing. If writing directly through approved connected tooling later, continue using audited draft/review/owner gates.
6. Attach any sourced, rights-verified cover and content images via CMS private upload and owner approval. Related restaurant UUIDs must match published, active directory rows.
7. Click **초안 저장** → **4개 언어 검수 요청** → owner **4개 언어 동시 발행**. Each action checks all four locales on the server even if a client bypasses the disabled buttons.
8. `whateato_blog_publications` publishes one immutable JSON snapshot per post in a PostgreSQL transaction; that snapshot contains all four localized versions, and the public endpoints only read that approved snapshot. A failed validation rolls back the whole action, never partially releasing 1–3 languages. Editing after publication leaves all old versions unchanged until reapproval.
9. The public article exposes distinct SEO canonical URLs by locale and reciprocal `hreflang` alternatives for `en`, `en-US`, `ko`, `ja`, `zh-CN`, and `x-default`. `/blog/<slug>?hl=<locale>` picks the appropriate published translation. The article language switch allows visitor choice.
10. **No recurring AI generation** runs without an explicit user request/automation and available provider credentials; the above bundle import works without a separate OpenAI API key.

## Quality gates (at minimum)
- Localized nonempty title, excerpt, SEO title/description, 1+ actual heading and meaningful body.
- English min 8 title chars, 50 excerpt, 200 body, 40 SEO description; CJK min 4 title, 22 excerpt, 110 body, 20 SEO description.
- Images must be selected and separately rights approved, no duplicate content mistakenly pasted identically into different locale tabs.
- Core CMS, existing search/map UX, existing public global design and production DB remain untouched.

## QA release
- Isolated real PostgreSQL + HTTP tests must prove missing locale/SEO blocks all release, and all four public localized pages render correct text from a **single** publication snapshot; new edits remain private.
- Deploy only to `whateato-cms-preview`, preserve original Render service and Neon production DB.
