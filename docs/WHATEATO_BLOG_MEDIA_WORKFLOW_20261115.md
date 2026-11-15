# WhatEatO 블로그 사진 업로드 · 사용 권한 승인

## 기본 규칙

- **신규 발행 글**은 게시권 승인된 대표사진(`cover`) **1장**과 각 언어 본문에서 참조하는 서로 다른 본문사진(`inline`) **2장 이상**이 필요하다.
- 영어(en), 한국어(ko), 일본어(ja), 중국어 간체(zh-CN) **4개 언어 모두** 본문사진 2장을 포함한다. 같은 승인 사진 2장을 네 언어에서 재사용할 수 있다.
- 기존 발행 글과 기존 사진 데이터는 자동으로 변경하거나 비공개 처리하지 않는다. 기존 발행 글을 업데이트할 때에도 확인된 사진을 점진적으로 추가하는 것을 권장한다.
- 새 이미지의 초기 상태는 `pending`이다. `approved`로 변경하기 전에는 공개 이미지 URL에서 제공되지 않는다.
- 이미지 파일은 기존 S3 호환 스토리지의 `media/blog/{image UUID}.webp`에 저장하고 Neon에는 기록과 소유권 근거를 남긴다. Blob은 DB에 직접 넣지 않는다.
- 외부 이미지를 구글에서 발견했다는 사실은 사용 허락을 의미하지 않는다. 라이선스 조건, 상업적 재사용·수정 가능 여부, 크레디트 요구 사항을 이미지별로 확인한다.

## ChatGPT MCP 작업 순서

1. `whateato_save_blog_draft`로 4개 언어 초안을 먼저 저장한다. (기존 글이면 revision 먼저 조회)
2. `whateato_upload_blog_image`로 사진을 업로드한다.
   - `slug`, `media_role` = `cover` 또는 `inline`
   - MIME = JPEG/PNG/WebP, base64 원본(최대 약 6MB), 권장 320×240 이상
   - `alt_text`, `source_kind` = `ai_generated` / `owner_original` / `licensed`
   - `provenance_note`: 실제 제작 방식·촬영자·라이선스 확인 경위. AI 생성 이미지에는 이를 명시한다.
   - `licensed`는 실제 이미지 원본 `source_url`과 사용권 근거 `rights_reference`의 HTTPS URL 모두 필수. URL을 지어내면 안 된다.
   - `ai_generated`/ `owner_original`에는 없는 외부 URL을 지어 넣지 않는다. 두 URL은 빈 문자열 가능. 확실한 출처 URL이 있다면 기록한다.
   - `rights_confirmed=true`는 업로드자가 해당 권리의 진위를 확인했음을 뜻하지만 **아직 승인 완료가 아니다**.
   - 큰 파일이나 MCP JSON 전송이 막힐 때는 기존 관리자 CMS의 멀티파트 사진 업로드를 이용한다.
3. 사용자가 **해당 사진의 권한을 실제로 확인하고 승인하라고 요청한 뒤**, `whateato_review_blog_image_rights`를 호출한다. `decision=approve`, `owner_rights_attested=true`.
4. `whateato_blog_media_status`로 승인된 사진 UUID를 읽는다.
5. 초안의 네 언어 `translations.<locale>.blocks`에 `type=image, image_id=<승인된 inline UUID>, caption`을 각각 2개 이상 연결하고 `whateato_save_blog_draft`로 다시 저장한다. 커버는 승인된 `cover` 사진에서 자동 선택된다.
6. `whateato_blog_media_status`의 `ready_for_three_image_publication=true`를 확인한다.
7. 사용자의 **명시적 게시 요청**이 있을 때만 `whateato_publish_blog`로 발행한다.

## 관리자 CMS 대안

`https://whateato.com/admin`의 블로그 편집기에서도 기존 업로드·승인·본문삽입 기능을 그대로 사용할 수 있다. 업로드 시 출처 유형과 제작/권리 메모를 입력하고 Owner가 사진 원본, 사용권 증거, 프리뷰를 검토한 뒤 개별 승인한다.

## 배포 순서와 운영상 주의점

1. Neon 운영 브랜치에 `db/migrations/20261115_blog_media_provenance.sql` 1회 적용(기존 데이터 삭제하지 않는 확장).
2. 다음 변수가 Hostinger에 이미 유효하게 설정되어 있어야 한다.
   - `WHATEATO_S3_ENDPOINT`
   - `WHATEATO_S3_BUCKET`
   - `WHATEATO_S3_ACCESS_KEY_ID`
   - `WHATEATO_S3_SECRET_ACCESS_KEY`
   - `WHATEATO_S3_REGION` (필요 시)
   - 기존 Google Owner OAuth 및 `WHATEATO_BLOG_AGENT_ENABLED=true`
3. GitHub `release/hostinger-launch-v1` 변경사항을 Hostinger에 재배포한다.
4. ChatGPT MCP 도구 목록을 새로고침하거나 재연결해 신규 도구 3개가 나타나는지 확인한다.
5. 발행이 아닌 **테스트 초안 1개 / 테스트용 사진 1개**만 먼저 업로드·승인한 뒤 상태를 확인한다. 권한을 확인하지 않은 다른 사람의 사진으로 테스트하지 않는다.
6. 미디어 수가 0인 현재 운영 데이터는 그대로 유지한다. 실제 업로드·S3 읽기 및 공개 이미지 URL은 재배포 후에만 실서버에서 확인 가능하다.

## 주의

AI로 생성한 식당·음식 이미지는 특정 매장에서 촬영한 사실 사진으로 표현하지 않는다. 본문 캡션에 'AI 생성 이미지'로 구분한다. 외부 사진은 별도 검토 후 사용한다. 이미지 권한의 법적 적합성을 자동 판단하거나 무조건 승인하지 않는다.
