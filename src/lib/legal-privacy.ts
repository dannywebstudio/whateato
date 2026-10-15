import type {SiteLanguage} from '@/lib/visitor-country';
import type {LegalDocument} from '@/components/LegalPage';

// Public-facing disclosures mirror the deployed Google OAuth / reviews / photo / geo code.
// Confirm the legal identity and actual processor contracts before calling this legally final.
export const privacyCopy:Record<SiteLanguage,LegalDocument>={
 ko:{
 title:'개인정보처리방침',
 intro:'WhatEatO는 한국의 음식점 검색, 지도, 리뷰 및 계정 기능을 제공하며 필요한 개인정보만 처리하려고 노력합니다.',
 updated:'시행일: 2026년 10월 16일',
 contactLabel:'개인정보 문의',
 sections:[
  {heading:'1. 운영자 및 문의처',paragraphs:[
   '서비스명 및 개인정보 관련 연락 창구: WhatEatO. 문의 이메일: pakrsky2@naver.com.',
   '개인정보 열람·정정·삭제, 계정 문제, 리뷰·사진 및 기타 개인정보 관련 문의는 위 연락처로 보내주세요.'
  ]},
  {heading:'2. Google 로그인과 수집 정보',paragraphs:[
   'Google 로그인 시 openid 및 email 권한을 요청합니다. Google에서 전달한 이메일 인증 여부를 로그인 과정에서 확인하지만 이메일 주소, 이름, 프로필 사진, Google 액세스·갱신 토큰은 WhatEatO의 계정 DB에 저장하지 않습니다.',
   '계정 식별과 리뷰의 작성자 확인을 위해 Google의 고유 계정 식별자(sub), WhatEatO 내부 계정 ID(UUID) 및 계정 생성 시각을 저장합니다. 로그인 세션에는 내부 계정 ID를 사용하며 세션 최대 유효기간은 7일입니다.',
   'Google 로그인 데이터는 계정 인증과 계정에 연결된 서비스 제공을 위해 사용하며, 연락처 목록이나 Google Drive 정보 등은 요청하지 않습니다.'
  ]},
  {heading:'3. 리뷰 및 업로드 사진',paragraphs:[
   '이용자가 직접 입력한 식당별 별점, 리뷰 본문, 등록·수정 시각, 검수 상태 및 연결된 식당·계정 정보를 저장합니다. 허용되는 경우 업로드한 사진과 관련 메타데이터를 이미지 저장소에 저장합니다.',
   '리뷰와 사진은 운영 검수 후 공개될 수 있습니다. Google 계정의 실명·이메일은 공개하지 않습니다. 타인의 개인정보나 권리를 침해하는 내용은 업로드하지 마세요.'
  ]},
  {heading:'4. 접속 국가, 언어 및 외부 지도',paragraphs:[
   '국가·언어 자동 선택을 위해 호스팅/CDN의 국가 코드를 우선 사용합니다. 이를 알 수 없을 때 IP 기반 국가 확인 서비스 ipwho.is에 접속 IP가 일시 전달될 수 있습니다. WhatEatO의 국가 판별 DB에는 IP 원문을 저장하지 않으며, 서버에 단기 해시 캐시를 사용할 수 있습니다.',
   '선택한 국가·언어는 브라우저에 저장될 수 있습니다. 지도 이용 시 OpenFreeMap 또는 OpenStreetMap 지도 제공 서버에 브라우저가 직접 연결될 수 있으며, 해당 업체의 정책이 적용됩니다.'
  ]},
  {heading:'5. 이용 통계와 보관 기간',paragraphs:[
   '방문·검색 통계 수집 기능이 활성화된 경우 페이지 조회, 검색, 식당 클릭, 선택 언어, 기기 유형 및 대략적인 유입 경로와 같은 이벤트를 집계합니다. 해당 통계 DB에 Google 계정 ID·이메일·IP 원문·방문자 식별 쿠키를 기록하도록 설계하지 않았습니다.',
   '통계 원본 이벤트는 30일 내 삭제되도록 보존·정리 절차를 구성했습니다. 로그인 계정과 리뷰 정보는 계정 운영 중 보관하며, 이용자가 탈퇴하거나 삭제를 요청하면 관련 DB 기록을 삭제합니다. 다만 법령상 보관 의무 및 보안·삭제 처리 과정에 따라 별도 보관이 필요한 정보가 있을 수 있습니다.',
   '사진 파일 삭제는 별도의 저장소 정리 절차에 따라 반영될 수 있습니다. 로그인 세션의 유효기간은 최대 7일입니다.'
  ]},
  {heading:'6. 외부 서비스 및 보호 조치',paragraphs:[
   '로그인에는 Google, 웹 운영에는 Hostinger, 데이터베이스에는 Neon을 사용합니다. 사진 저장, 지도 제공, IP 기반 국가 조회 서비스도 해당 기능 이용에 필요한 범위에서 관여할 수 있습니다. 각 제공자의 처리 장소와 보관 조건은 실제 계약·설정에 따라 달라질 수 있습니다.',
   'HTTPS와 접근 통제 등 보안 조치를 사용하지만 인터넷상의 어떠한 서비스도 절대적인 보안을 보장할 수는 없습니다.'
  ]},
  {heading:'7. 이용자의 권리와 변경 안내',paragraphs:[
   '계정 페이지에서 로그인 후 회원 탈퇴를 신청할 수 있으며, 개인정보 열람·정정·삭제 및 처리 관련 문의는 pakrsky2@naver.com으로 요청할 수 있습니다. Google 계정 자체를 삭제하지는 않습니다.',
   '본 방침이 변경되는 경우 이 페이지에서 개정일과 변경 내용을 안내합니다.'
  ]}
 ]},
 en:{
 title:'Privacy Policy',
 intro:'WhatEatO helps visitors discover restaurants in Korea and offers maps, Google sign-in, and moderated reviews. This policy describes how information is handled.',
 updated:'Effective: October 16, 2026',
 contactLabel:'Privacy inquiries',
 sections:[
  {heading:'1. Operator and contact',paragraphs:[
   'Service and privacy contact: WhatEatO. Email: pakrsky2@naver.com.',
   'Contact us to request access to, correction of, or deletion of personal information, or to raise account and review concerns.'
  ]},
  {heading:'2. Google sign-in',paragraphs:[
   'We request the openid and email scopes. We check whether Google has verified your email during sign-in, but do not store your email address, name, profile photo, or Google access or refresh tokens in our account database.',
   'We store your stable Google account identifier (sub), an internal WhatEatO account UUID, and account creation time to authenticate you and link your reviews. Our session uses the internal account ID and expires within seven days.',
   'Google sign-in data is used for authentication and related account features. We do not request Google Contacts, Drive, or similar account data.'
  ]},
  {heading:'3. Reviews and uploaded photos',paragraphs:[
   'When you submit a review, we store the rating, text, restaurant and account association, timestamps, and moderation status. If you upload photos, the images and necessary metadata may be stored in our object storage.',
   'Reviews and photos may become public after moderation; we do not display your Google name or email. Please do not upload others’ private information or content that infringes rights.'
  ]},
  {heading:'4. Country, language, and maps',paragraphs:[
   'To select a default language, we first use a country code supplied by our hosting/CDN. If unavailable, your IP address may be sent temporarily to ipwho.is for country lookup. We do not store the raw IP in our country-selection database, though a short-lived hashed server cache may be used.',
   'Manual country/language choices can be stored in your browser. Map features can connect your browser directly to OpenFreeMap or OpenStreetMap providers, whose own policies apply.'
  ]},
  {heading:'5. Analytics and retention',paragraphs:[
   'When anonymous analytics are enabled, we may count page views, searches, restaurant clicks, selected language, device type, and broad referral channel. The analytics database is designed not to store raw IP addresses, emails, Google account IDs, or visitor-tracking cookie IDs.',
   'Raw analytics events are configured for deletion within 30 days. Account and review records are retained while your account is active and deleted upon account closure or a valid deletion request, subject to legally required retention and technical cleanup processes.',
   'Uploaded files may require a separate storage cleanup process. Login sessions last at most seven days.'
  ]},
  {heading:'6. Service providers and security',paragraphs:[
   'Our services use Google for sign-in, Hostinger for hosting, and Neon for the database. Image storage, country lookup, and external map providers may process data needed for their respective features. Processing locations and contract terms depend on the actual service configuration.',
   'We use HTTPS and access controls, but no online service can promise absolute security.'
  ]},
  {heading:'7. Your choices and updates',paragraphs:[
   'You can close your account from the account page after signing in. For requests about your information or review/photo data, email pakrsky2@naver.com. Closing your WhatEatO account does not delete your Google account.',
   'We will update this page when our practices change and identify the revised effective date.'
  ]}
 ]},
 ja:{
 title:'プライバシーポリシー',
 intro:'WhatEatOは韓国の飲食店検索、地図、Googleログイン、審査制の口コミ機能を提供します。本ページでは個人情報の取扱いについて説明します。',
 updated:'施行日：2026年10月16日',
 contactLabel:'個人情報に関するお問い合わせ',
 sections:[
  {heading:'1. 運営者・お問い合わせ',paragraphs:[
   'サービスおよび個人情報の窓口：WhatEatO。メール：pakrsky2@naver.com。',
   '個人情報の確認・訂正・削除、アカウントや口コミに関するご相談は上記までご連絡ください。'
  ]},
  {heading:'2. Googleログイン',paragraphs:[
   'openidおよびemailの権限を要求します。ログイン時にGoogleによるメール認証の有無を確認しますが、メールアドレス、氏名、プロフィール画像、Googleのアクセストークンや更新トークンはアカウントDBに保存しません。',
   '認証と口コミの紐付けのため、Google固有のアカウント識別子（sub）、WhatEatO内部ID（UUID）、アカウント作成日時を保存します。セッションには内部IDを使用し、有効期間は最大7日です。',
   'Googleログイン情報は認証およびアカウント機能に使用し、連絡先やGoogle Driveの情報は要求しません。'
  ]},
  {heading:'3. 口コミ・投稿写真',paragraphs:[
   '投稿された評価、口コミ本文、対象店舗、アカウントとの紐付け、日時、審査状態を保存します。写真のアップロード時には画像と関連情報を画像ストレージに保存する場合があります。',
   '審査後に口コミや写真が公開されることがありますが、Googleの氏名やメールアドレスは表示しません。他人の個人情報や権利侵害となる内容は投稿しないでください。'
  ]},
  {heading:'4. 国・言語の判定と地図',paragraphs:[
   '初期表示にはホスティング/CDNの国コードを利用し、取得できない場合は国判定サービスipwho.isへ一時的にIPアドレスが送信されることがあります。国判定用DBにはIPの原文を保存しませんが、短期間のハッシュキャッシュを利用する場合があります。',
   '利用者が選択した国・言語はブラウザーに保存されることがあります。地図利用時にはOpenFreeMapまたはOpenStreetMapのサーバーへブラウザーが直接接続する場合があります。'
  ]},
  {heading:'5. 統計と保存期間',paragraphs:[
   '匿名の利用統計が有効な場合、閲覧・検索・店舗クリック数、言語、端末種類、大まかな流入経路を集計します。統計DBにはIP原文、メール、GoogleアカウントID、追跡用Cookie IDを保存しない設計です。',
   '統計イベント原本は30日以内に削除する仕組みです。アカウント・口コミ情報は利用中に保持し、退会や有効な削除依頼の際に削除します。ただし法令上の保管義務や技術的な削除処理を要する場合があります。',
   '写真ファイルの削除には別途ストレージの整理処理が必要となる場合があります。ログインセッションは最大7日です。'
  ]},
  {heading:'6. 外部サービスと安全管理',paragraphs:[
   'Google（ログイン）、Hostinger（ホスティング）、Neon（データベース）を使用します。画像保存、国判定、地図提供者も各機能に必要な情報を処理する場合があります。処理地域等は契約・設定によって異なります。',
   'HTTPSやアクセス制御を採用していますが、絶対的な安全性を保証するものではありません。'
  ]},
  {heading:'7. 利用者の権利・改定',paragraphs:[
   'ログイン後のアカウントページから退会できます。情報の確認・訂正・削除などのご請求はpakrsky2@naver.comまでご連絡ください。Googleアカウント自体は削除されません。',
   '取扱いに変更が生じた場合は本ページで施行日とともにお知らせします。'
  ]}
 ]},
 'zh-CN':{
 title:'隐私政策',
 intro:'WhatEatO 提供韩国餐厅搜索、地图、Google 登录及经过审核的用户评价。本政策说明我们如何处理相关信息。',
 updated:'生效日期：2026年10月16日',
 contactLabel:'隐私相关咨询',
 sections:[
  {heading:'1. 运营方与联系方式',paragraphs:[
   '服务及隐私联系方：WhatEatO。电子邮箱：pakrsky2@naver.com。',
   '如需查询、更正、删除个人信息，或咨询账户与评价问题，请通过上述邮箱联系。'
  ]},
  {heading:'2. Google 登录',paragraphs:[
   '我们请求 openid 和 email 权限，并在登录时确认邮箱是否已由 Google 验证，但不会在账户数据库中保存邮箱地址、姓名、头像或 Google 访问及刷新令牌。',
   '为了验证登录并关联评价，我们保存 Google 唯一账户标识（sub）、WhatEatO 内部 UUID 和账户创建时间。登录会话使用内部 ID，有效期最长为 7 天。',
   'Google 登录信息仅用于身份验证及相关账户功能，不会请求通讯录或 Google Drive 数据。'
  ]},
  {heading:'3. 评价与上传照片',paragraphs:[
   '用户提交评价时，我们保存评分、正文、对应餐厅与账户关联、时间戳及审核状态。上传照片时，图片和必要的元数据可能保存在对象存储服务中。',
   '评价和图片在审核后可能公开，但不会展示 Google 姓名和邮箱。请勿上传他人的隐私信息或侵犯他人权利的内容。'
  ]},
  {heading:'4. 国家、语言与地图',paragraphs:[
   '我们优先使用托管/CDN 提供的国家代码设置默认语言。若无法获取，您的 IP 地址可能临时发送至 ipwho.is 用于国家识别。我们不在国家识别数据库中保存原始 IP，但可能使用短期哈希缓存。',
   '手动选择的国家或语言可能保存在浏览器中。使用地图时，浏览器可能直接连接 OpenFreeMap 或 OpenStreetMap 服务，其各自的隐私政策适用。'
  ]},
  {heading:'5. 使用统计与保存期限',paragraphs:[
   '当匿名统计功能启用时，我们可能统计页面浏览、搜索、餐厅点击、语言、设备类别和大致来源。该统计数据库的设计不记录原始 IP、邮箱、Google 账户 ID 或访客追踪 Cookie ID。',
   '原始统计事件配置为在 30 天内删除。账户和评价记录在账户使用期间保留，注销账户或收到有效删除请求后删除，但可能存在法定保留义务及技术清理过程。',
   '照片文件删除可能需要另行执行存储清理流程。登录会话最长有效期为 7 天。'
  ]},
  {heading:'6. 外部服务及安全措施',paragraphs:[
   '我们使用 Google（登录）、Hostinger（托管）和 Neon（数据库）。图片存储、国家识别及地图服务商也可能处理提供相应功能所需的信息。实际处理地点与条件取决于服务配置和合同。',
   '我们采用 HTTPS 与访问控制，但任何在线服务均无法保证绝对安全。'
  ]},
  {heading:'7. 用户权利与更新',paragraphs:[
   '登录后可在账户页面申请注销。如需查询、更正、删除个人信息或处理评价、照片相关问题，请联系 pakrsky2@naver.com。注销 WhatEatO 不会删除您的 Google 账户。',
   '如处理方式发生变化，我们会在本页面更新并注明生效日期。'
  ]}
 ]}
};
