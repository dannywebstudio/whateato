# Restaurant deletion verification — 2026-10-13

Owner rule: compare permit identity/closure/relocation, Google Maps and Naver Maps. Delete only when sufficiently verified absent/unlisted on BOTH matching place profiles, preferably additionally supported by authoritative closure/replacement record. Never infer nonexistence from search engine index silence alone.

Investigated priority 4 cases in Neon staging:
- 두레유 old Pyeongchang30-gil 28, id 31adc115-9e51-421d-859c-54e22ce79e0c: permit managerial no 3000000-101-1999-10400, older model restaurant designation cancelled 2023-11-29 with '폐업' stated. Source https://fmr.purpleo.co.kr/view/99 . This designation is not itself primary permit closure proof. Other independent different-branch rows with same name: Bukchon-ro 65 id 59194483-1ac5-46b8-aaef-e8b48aee3be8 and Pyeongchangmunhwa-ro 84 id db6b5d56-aeee-43a5-9344-e85e67e45ea0 . Former 2018 government record for Pyeongchang30-gil 28: https://www.mogef.go.kr/nw/enw/nw_enw_s001d.do?bbtSn=706695&mid=mda700 . Current-location listing for Pyeongchangmunhwa-ro 84: https://www.tabling.co.kr/place/677cd0e466de5f069886e8c3 .
- 신선원 id 3c47f857-03f1-434b-a42b-21c460999086 address Jongno 263-1: independent listings identify 신신원 address Jongno 263, tel 02-762-6927 (different legal parcel possible). https://www.tabling.co.kr/place/677cc7ac66de5f0698752840 ; https://polle.com/place/5cMqQy/%EC%8B%A0%EC%8B%A0%EC%9B%90 . Exact permit continuity unresolved.
- copper coffee id ba36c7fb-532d-4f3d-aaa3-71100edd0a16: Polle lists as closed at 혜화로9길 7: https://polle.com/place/4kqkEX/%EC%BB%A4%ED%8D%BC%20%EC%BB%A4%ED%94%BC . Administrative closure not confirmed.
- 살구골 id 1b246b70-bb17-44b9-b121-f9903ebd9331: Polle lists as closed at 소월로 20-4: https://polle.com/place/1HDts2/%EC%82%B4%EA%B5%AC%EA%B3%A8 . Administrative closure not confirmed.

Naver Maps direct source was not accessible in current research environment (robots/access restrictions). Google Maps exact place status also not independently resolved. Therefore dual-platform nonlisting condition is NOT demonstrated for any venue and **zero records were deleted**. Keep original permit registry, quality issues, and review flags. Never auto-delete similarly named venues; use immutable UUID and permit number.

Further work: official municipal food-business status/API cross-check for exact management number, manual verified platform place ids and last-seen state, snapshot evidence, then archive/unpublish first before any irreversible delete. Public UI booking status remains excluded.
