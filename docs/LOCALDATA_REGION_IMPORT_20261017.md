# LOCALDATA nationwide extraction → staged Neon drafts (2026-10-17)

## Source identity and audited counts
Source: verified WhatEatO cleaned LOCALDATA general-restaurant CSV held in Library (`/WhatEatO/WhatEatO_active_only_verified.zip`). Original 699,103,898 bytes / 2,303,303 rows; `폐업` 1,627,196 removed; `영업` 676,107 records. SHA-256 of cleaned UTF-8-SIG CSV: `b3aa8b1c6e8ea108bd6ecbd06a4f46c1211d2c996265384570e0e0b1d207deec`.

| Region | Permit-open records | Raw XY populated |
|---|---:|---:|
| Incheon | 32,106 | 22,925 |
| Seoul | 120,133 | 118,415 |
| Busan | 42,089 | 41,743 |
| **Total** | **194,328** | **183,083** |

All extracted rows have at least one source address. Source X/Y is EPSG:5174 and is converted to WGS84 EPSG:4326 only after basic bounds validation. A transformed coordinate is **not independently proven to be the actual entrance**.

## Ordered wave counts (legal-dong approximation)
Stage 1 — Incheon: Dongincheon/Sinpo/Gaehang 1,110; Mansu 894; Guwol 1,745; Bupyeong 4,498; Yeongjong 2,065; Incheon remaining 21,794.

Stage 2 — Seoul: Seoul Station 608; Sinchon 934; Hongdae 3,045; Ewha 415; COEX 1,253; Seoul remaining 113,878.

Stage 3 — Busan: Gwangalli 2,309; Haeundae 2,939; Busan remaining 36,841.

Wave boundaries are practical **heuristics** based on permit lot addresses; they are not an exact tourist walking-radius analysis. Each source row maps to exactly one city and wave.

## Import guard rails
- `scripts/import_localdata_regions.py` validates full cleaned input SHA before any parsing or commit.
- `--city {인천,서울,부산} --wave N --offset N --limit N`, max **5,000** source rows per run. `--commit` is opt-in.
- On Neon writes, the job must have `NEON_DATABASE_URL` pointing to **launch-hostinger-20261015** with `whateato_region_rollout_v1` and owner-approval tables present, plus `WHATEATO_IMPORT_CONFIRM`.
- New source rows are inserted as **`business_status='unknown'`, `publication_status='draft'`**. Never write new approval rows, `published` flags, verified menus, or hours from permit-only evidence.
- Match rows via `sbiz_source_key=localdata:<관리번호>`; exact name+address matches in existing DB are skipped to protect the original 76 manually curated candidates and the public legacy restaurants. Remaining name-only collisions require manual reconciliation before public approval.
- The source lacks reliably verified daily business hours and menu pricing. These must be sourced and verified **after import**, translated to EN/JA/ZH-CN, then approved individually under the existing public gate.
- Source file and compressed archives are **not** committed to GitHub. Only business identity, address, category and validated coordinate fields are stored; no phone, staff or owner data.
- 800MB database-size soft safety cutoff and 1GB Neon Free branch limit: chunk and monitor database storage.

## Operational status
At 2026-10-17, **16** selected Dongincheon permit records have been inserted directly into launch-branch Neon as private drafts, with their source-reference IDs, confirming the database insert path. The full **194,328-row CSV extraction has been completed locally** and packaged separately. Bulk Neon loading across all waves is **not yet finished**. There are no newly approved Map venues from this particular import; prior public Map approvals are retained.

## Run after workflow exists on GitHub default branch
Actions → **WhatEatO Region Import** → Run workflow. Select city+wave, start with `write_to_neon=false`, verify reported counts, check that `NEON_DATABASE_URL` points specifically to **Neon launch-hostinger-20261015**, and rerun with `write_to_neon=true` only after verification. Start **인천 wave 1 (offset 0, limit 1110)**, then waves 2–5; use successive offsets in waves 6+ with more than 5,000 records. Never switch to Seoul/Busan until current stage has been prepared under the owner's schedule. The GitHub connector in this environment cannot dispatch workflows, so don't treat merging the code as completed bulk import.
