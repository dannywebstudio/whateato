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
      <strong>접속 국가 자동 설정</strong>
      <span>방문 화면의 국가와 언어를 자동 설정하기 위해 CDN/호스팅에서 제공하는 국가 코드를 우선 사용합니다. 해당 정보가 없을 때에는 접속 IP 주소로 국가를 조회하는 외부 서비스(ipwho.is)에 IP가 일시적으로 전달될 수 있습니다. 이 조회 기능은 운영 환경변수로 끌 수 있습니다.</span>
      <span>국가 판별과 관련된 IP 원문은 WhatEatO 데이터베이스에 저장하지 않습니다. 서버는 조회 요청을 줄이기 위해 단기 해시 캐시만 유지하며, 위치를 확인할 수 없을 때에는 브라우저 언어·시간대 정보를 참고합니다. 국가나 언어를 사용자가 직접 선택하면 브라우저에 그 선택을 저장합니다.</span>
    </div>
    <div className="result">
      <strong>외부 지도 자료</strong>
      <span>기본 지도는 OpenFreeMap에서 제공하며, 브라우저가 해당 지도 서버에 직접 요청합니다. 지도 렌더링이 지원되지 않거나 실패하면 OpenStreetMap의 공식 내장 지도로 전환되어 브라우저가 openstreetmap.org에 접속할 수 있습니다. 외부 지도 서비스의 개인정보 처리방침과 이용약관을 참고하세요. WhatEatO 식당 마커·목록은 자체 인허가 데이터에 기반합니다.</span>
    </div>
    <div className="result">
      <strong>외부 리뷰 분석</strong>
      <span>계약이나 명시적 이용허락을 확인한 외부 자료만 요약에 사용합니다. 타 사이트 리뷰 원문을 무단 수집·재게시하지 않습니다.</span>
    </div>
    <div className="result">
      <strong>방문 및 검색 통계</strong>
      <span>페이지 조회·검색·식당 상세 페이지 조회 등 활동 횟수, 선택 언어, 기기 유형과 대략적인 유입 경로를 집계합니다. IP 주소·이메일·지속적인 이용자 식별자·방문자 쿠키는 이 통계 DB에 저장하지 않습니다.</span>
      <span>검색어에는 개인 정보가 포함될 수 있어 일부 입력은 기록하지 않습니다. 원본 이벤트는 30일 이내 삭제되도록 운영 작업을 구성하며, 실제 배포 전 삭제 작업의 작동을 확인합니다.</span>
      <span>방문 수는 이벤트 수이며, 고유 방문자 수나 실제 음식점 방문 횟수로 해석할 수 없습니다.</span>
    </div>
    <p className="hint">본 문서는 기술 구현 설명을 위한 초안이며 운영 전 관련 법령에 따른 고지사항과 이용약관을 추가해야 합니다.</p>
    <Link className="simple-link" href="/account">← 계정으로 돌아가기</Link>
  </main>;
}
