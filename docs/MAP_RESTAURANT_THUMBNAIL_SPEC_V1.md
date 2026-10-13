# WhatEatO — Map Restaurant Thumbnail Specification v1 (2026-10-13)

Status: owner-requested geometry reference for future backend/media implementation.

## Display dimensions
- Desktop map layout: left card thumbnail column **116 CSS px** wide, thumbnail height fills its **165 CSS px** card row. Approx. displayed ratio **116:165 (0.70:1)**, portrait.
- Mobile narrow viewport (max-width 620px): thumbnail column **106 CSS px** in a responsive-height card (not a fixed ratio).
- Map card has **5px cuisine-colored left rail** outside the thumbnail. The image must not replace or color that rail.
- With only 3 results, keep 4 fixed slots and leave the unused fourth slot empty.
- Image element: **width 100%, height 100%, object-fit: cover**. This crops intentionally; prefer visually centered composition.
- Backend recommended standardized asset: **464×660 px (2x desktop CSS size)** or higher at the same ~0.70 portrait ratio; serve a responsive, optimized WebP/AVIF derivative. This is a recommended processing output, not a demand for source photographs to arrive at that size.
- Missing image: solid **#FFFFFF** background with locale-specific text: ko `사진 준비 중`, en `Photo coming soon`, ja `写真準備中`, zh-CN `照片准备中`.
- Never use nonmatching, synthetic, or unlicensed food photos to fill the blank. Preserve author/source attribution rules for any third-party licensed imagery.
- Search-grid image has separate geometry; this document locks the **Map compact list thumbnail** only.

## Backend wiring
Store source ID, verified restaurant identity, license/permission, photographer/credit, crop focal-point and variants; do not falsely mark Google Places Photo API images as owned media. Use rights-cleared photos for persistent asset storage. Keep locale-independent media references and localized alt texts.

Implementation: `src/components/RestaurantExperienceCard.tsx`, `src/app/map/map.css`.
