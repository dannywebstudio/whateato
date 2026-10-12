import Link from 'next/link';
export const metadata={title:'Privacy | WhatEatO',robots:{index:false,follow:false}};
export default function Privacy(){
  return <main className="content">
    <h1>WhatEatO 개인정보 처리 안내 (개발 미리보기)</h1>
    <p className="hint">2026-10-12 기준 초안입니다. 서비스 공개 전 사업자 정보·문의처·위탁업체·보존기간을 확정해 정식 개인정보 처리방침으로 교체해야 합니다.</p>
    <div className="result">
      <strong>Google 로그인</strong>
      <span>Google에서 openid, email 범위를 요청합니다. 로그인 과정에서 이메일의 검증 여부를 확인하지만 이메일·이름·프로필 사진·Google 액세스 토큰은 DB에 저장하지 않습니다.</span>
      <span>우리 서버는 Google의 고유 계정 식별자를 별도 로그인 식별용으로 저장하며, 로그인 세션에는 WhatEatO 내부 UUID만 보관합니다.</span>
    </div>
    <div className="result">
      <strong>직접 작성한 리뷰</strong>
      <span>별점, 리뷰 내용, 작성·수정 시각 및 해당 음식점 정보를 저장합니다. 리뷰는 관리자 검토 후 공개되며 작성자의 이름과 이메일은 표시하지 않습니다.</span>
      <span>리뷰에는 본인이나 타인의 연락처 등 민감한 정보를 쓰지 마세요.</span>
    </div>
    <div className="result">
      <strong>계정 및 리뷰 삭제</strong>
      <span>로그인 후 계정 화면에서 회원 탈퇴를 선택하면 WhatEatO 계정 식별자와 직접 작성한 리뷰를 함께 삭제합니다. Google 계정 자체는 삭제되지 않습니다.</span>
    </div>
    <div className="result">
      <strong>외부 리뷰 분석</strong>
      <span>계약이나 명시적 이용허락을 확인한 외부 자료만 요약에 사용합니다. 타 사이트 리뷰 원문을 무단 수집·재게시하지 않습니다.</span>
    </div>
    <p className="hint">본 문서는 기술 구현 설명을 위한 초안이며 운영 전 관련 법령에 따른 고지사항과 이용약관을 추가해야 합니다.</p>
    <Link className="simple-link" href="/account">← 계정으로 돌아가기</Link>
  </main>;
}
