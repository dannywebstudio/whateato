import Link from 'next/link';
import {auth,authReady} from '@/auth';
import {loginWithGoogle,logout,deleteAccount} from './actions';

export const dynamic='force-dynamic';
export const metadata={title:'Account | WhatEatO',robots:{index:false,follow:false}};

export default async function AccountPage(){
  const ready=authReady();
  const session=ready?await auth():null;
  return <main className="content">
    <h1>WhatEatO 계정</h1>
    <p className="hint">리뷰 작성에 필요한 최소한의 로그인만 제공합니다.</p>
    {!ready&&<div className="empty">
      Google 로그인을 준비하고 있습니다. 서버 설정이 완료되면 사용할 수 있습니다.
    </div>}
    {ready&&!session?.user?.id&&<section className="result">
      <strong>Google로 로그인</strong>
      <span>요청 권한: 기본 로그인 확인(openid) 및 이메일 확인(email).</span>
      <span>DB에는 Google의 고유 계정 식별자만 저장합니다. 이메일, 이름, 프로필 사진은 저장하지 않습니다.</span>
      <form action={loginWithGoogle}><button className="chip" type="submit">Google 계정으로 계속하기 →</button></form>
    </section>}
    {ready&&session?.user?.id&&<>
      <section className="result">
        <strong>로그인 완료</strong>
        <span>식당 후기 작성이 가능합니다. 리뷰는 검토 후 공개됩니다.</span>
        <form action={logout}><button className="chip" type="submit">로그아웃</button></form>
      </section>
      <section className="result" aria-label="회원 탈퇴">
        <strong>계정 및 리뷰 삭제</strong>
        <span>탈퇴하면 내부 로그인 계정과 직접 작성한 모든 리뷰가 영구 삭제됩니다.</span>
        <span>아래 칸에 DELETE를 입력한 뒤 탈퇴를 눌러주세요.</span>
        <form action={deleteAccount}>
          <label htmlFor="confirmation">삭제 확인</label>
          <input id="confirmation" name="confirmation" placeholder="DELETE" required pattern="DELETE" autoComplete="off" />
          <button className="chip" type="submit">계정 및 리뷰 삭제</button>
        </form>
      </section>
    </>}
    <p className="hint">로그인 전에 <Link className="simple-link" href="/privacy">개인정보 처리 안내</Link>를 확인해 주세요.</p>
    <Link className="simple-link" href="/">← WhatEatO 홈</Link>
  </main>;
}
