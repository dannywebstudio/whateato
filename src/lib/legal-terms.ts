import type {SiteLanguage} from '@/lib/visitor-country';
import type {LegalDocument} from '@/components/LegalPage';

export const termsCopy:Record<SiteLanguage,LegalDocument>={
 ko:{
 title:'이용약관',
 intro:'WhatEatO의 음식점 검색, 지도, 리뷰 및 계정 기능을 이용할 때 적용되는 기본 이용 조건입니다.',
 updated:'시행일: 2026년 10월 16일',
 contactLabel:'서비스 문의',
 sections:[
  {heading:'1. 서비스 범위',paragraphs:[
   'WhatEatO는 국내 식당을 찾을 수 있도록 상호, 위치, 영업정보, 메뉴, 지도 및 이용자 리뷰를 제공합니다. 서비스의 일부 기능과 제공 범위는 변경되거나 중단될 수 있습니다.',
   '식당 정보는 공개 자료, 확인 자료 및 운영 검수 등을 기반으로 하며, 변경 사항이 즉시 반영되지 않을 수 있습니다.'
  ]},
  {heading:'2. 정보의 정확성 및 외부 서비스',paragraphs:[
   '영업시간, 휴무, 메뉴 가격, 주소, 평점 등은 방문 전 해당 매장에 다시 확인해 주세요. WhatEatO의 정보가 예약·방문 가능 여부를 보장하지 않습니다.',
   '지도, 외부 웹사이트, Google 로그인을 이용할 경우 관련 제공자의 별도 이용약관이나 개인정보 처리방침이 적용될 수 있습니다.'
  ]},
  {heading:'3. 계정 이용',paragraphs:[
   '리뷰 작성 등 일부 기능에는 Google 로그인이 필요합니다. 이용자는 본인의 계정을 안전하게 관리해야 하며, 타인의 계정을 무단으로 이용해서는 안 됩니다.',
   '계정 탈퇴 및 개인정보 관련 절차는 개인정보처리방침과 계정 페이지의 안내를 따릅니다.'
  ]},
  {heading:'4. 리뷰와 사진 게시 원칙',paragraphs:[
   '이용자는 직접 작성했거나 정당하게 사용할 수 있는 후기·사진만 게시해야 합니다. 허위 사실, 타인의 개인정보, 명예훼손, 저작권 침해, 광고성 스팸, 부적절한 표현을 게시하지 마세요.',
   '운영자는 서비스 보호를 위해 게시물 검수, 공개 보류, 반려 또는 삭제를 진행할 수 있습니다. 리뷰는 작성자의 의견이며 WhatEatO나 특정 식당의 공식 입장을 뜻하지 않습니다.',
   '이용자는 게시물에 대한 권리를 유지하며, 서비스에서 해당 게시물을 저장·표시·운영하는 데 필요한 범위의 비독점적 이용을 허락합니다.'
  ]},
  {heading:'5. 허용되지 않는 이용',paragraphs:[
   '서비스를 방해하거나 취약점을 악용하는 행위, 자동화된 무단 대량 수집, 타인 사칭, 정보 조작, 타인 권리 침해 등은 금지됩니다.',
   '법령 또는 본 약관에 위반되는 행위가 확인되면 게시물이나 계정의 이용을 제한할 수 있습니다.'
  ]},
  {heading:'6. 약관 변경과 문의',paragraphs:[
   '법령이 허용하는 범위에서 서비스 내용과 본 약관을 변경할 수 있으며, 중요한 변경 사항은 시행일과 함께 본 페이지에 안내합니다. 법령에 따라 이용자에게 부여되는 권리를 제한하지 않습니다.',
   '서비스·식당 정보 수정·권리침해 신고 및 이용 관련 문의: pakrsky2@naver.com.'
  ]}
 ]},
 en:{
 title:'Terms of Service',
 intro:'These terms explain the basic conditions for using WhatEatO’s restaurant search, maps, account, and review features.',
 updated:'Effective: October 16, 2026',
 contactLabel:'Contact WhatEatO',
 sections:[
  {heading:'1. The service',paragraphs:[
   'WhatEatO provides information about restaurants in Korea, including names, locations, hours, menus, maps, and user reviews. Features or availability may change.',
   'Information comes from public or otherwise verified sources and editorial review; changes at restaurants may not be reflected immediately.'
  ]},
  {heading:'2. Accuracy and third-party services',paragraphs:[
   'Check opening hours, closures, menu prices, addresses, and availability directly with the restaurant before visiting. WhatEatO does not guarantee reservations or that a restaurant is open.',
   'External map providers, websites, and Google sign-in may be governed by their own terms and privacy policies.'
  ]},
  {heading:'3. Accounts',paragraphs:[
   'Some features, including reviews, require Google sign-in. Keep your account secure and do not access anyone else’s account without permission.',
   'For account closure and personal data handling, see our Privacy Policy and account page.'
  ]},
  {heading:'4. Reviews and photos',paragraphs:[
   'Submit only reviews and photos you created or have the right to share. Do not post false claims, private information about others, defamatory material, copyright-infringing content, spam, or abusive language.',
   'To protect users and the service, we may review, withhold, reject, or remove content. Reviews represent their authors’ opinions, not WhatEatO’s or a restaurant’s official position.',
   'You retain ownership of your contributions and grant WhatEatO a non-exclusive permission to store, display, and operate them as needed for the service.'
  ]},
  {heading:'5. Prohibited use',paragraphs:[
   'Do not interfere with the service, exploit security flaws, scrape it in unauthorized bulk, impersonate others, manipulate information, or violate others’ rights.',
   'We may limit access or remove content when conduct violates these terms or applicable law.'
  ]},
  {heading:'6. Changes and contact',paragraphs:[
   'We may modify the service and these terms in accordance with applicable law, posting significant revisions and their effective dates here. These terms do not override your statutory rights.',
   'For questions, corrections to restaurant listings, or rights-related reports, contact pakrsky2@naver.com.'
  ]}
 ]},
 ja:{
 title:'利用規約',
 intro:'本規約はWhatEatOの飲食店検索、地図、アカウント、口コミ機能の利用条件を定めるものです。',
 updated:'施行日：2026年10月16日',
 contactLabel:'お問い合わせ',
 sections:[
  {heading:'1. サービスの内容',paragraphs:[
   'WhatEatOは韓国の飲食店について名称、場所、営業時間、メニュー、地図、口コミ等の情報を提供します。機能や提供範囲は変更される場合があります。',
   '情報は公開資料・確認資料・運営審査等に基づきますが、店舗の変更が即時に反映されない場合があります。'
  ]},
  {heading:'2. 正確性・外部サービス',paragraphs:[
   '訪問前に営業時間、休業日、価格、住所等を直接店舗にご確認ください。予約や営業中であることを保証するものではありません。',
   '地図、外部サイト、Googleログインには各提供者の利用規約やプライバシーポリシーが適用される場合があります。'
  ]},
  {heading:'3. アカウント',paragraphs:[
   '口コミなど一部の機能ではGoogleログインが必要です。アカウントを適切に管理し、他人のアカウントを無断で使用しないでください。',
   '退会や個人情報の取扱いについてはプライバシーポリシーおよびアカウントページをご覧ください。'
  ]},
  {heading:'4. 口コミ・写真',paragraphs:[
   '本人が作成した、または正当な権利を有する内容のみ投稿してください。虚偽情報、他人の個人情報、名誉毀損、著作権侵害、スパム、攻撃的表現は禁止します。',
   '運営者は投稿内容を審査し、公開保留・却下・削除する場合があります。口コミは投稿者の意見であり、WhatEatOや店舗の公式見解ではありません。',
   '投稿者は権利を保持しつつ、サービス運営に必要な範囲で保存・表示する非独占的な利用を許諾します。'
  ]},
  {heading:'5. 禁止行為',paragraphs:[
   'サービス妨害、脆弱性の悪用、無断での大量収集、なりすまし、情報操作、権利侵害を禁じます。',
   '規約や法令への違反が確認された場合、投稿削除や利用制限を行うことがあります。'
  ]},
  {heading:'6. 規約改定・連絡先',paragraphs:[
   '法令に従いサービスや規約を変更する場合は、重要な変更と施行日を本ページに掲載します。法令上の利用者の権利を制限するものではありません。',
   'お問い合わせ、店舗情報修正、権利侵害のご報告：pakrsky2@naver.com。'
  ]}
 ]},
 'zh-CN':{
 title:'服务条款',
 intro:'本条款说明使用 WhatEatO 餐厅搜索、地图、账户和评价功能的基本条件。',
 updated:'生效日期：2026年10月16日',
 contactLabel:'联系 WhatEatO',
 sections:[
  {heading:'1. 服务内容',paragraphs:[
   'WhatEatO 提供韩国餐厅名称、位置、营业时间、菜单、地图和用户评价等信息。功能和服务范围可能调整。',
   '信息来源包括公开资料、核实资料和运营审核，餐厅的变化可能无法立即更新。'
  ]},
  {heading:'2. 准确性及第三方服务',paragraphs:[
   '到店前请向餐厅确认营业时间、休息日、价格、地址和是否可以接待。WhatEatO 不保证餐厅营业或可预约。',
   '使用外部地图、网站和 Google 登录时，相关服务商的条款与隐私政策可能适用。'
  ]},
  {heading:'3. 账户',paragraphs:[
   '部分功能（包括发布评价）需要 Google 登录。请妥善保护账户，不得未经许可使用他人账户。',
   '注销账户和个人信息处理事项请参阅隐私政策及账户页面。'
  ]},
  {heading:'4. 评价与图片',paragraphs:[
   '仅可发布本人创作或有权分享的内容。禁止发布虚假陈述、他人隐私、诽谤、侵犯版权的内容、垃圾广告或攻击性言论。',
   '为保护用户与服务，我们可审核、暂缓、拒绝公开或删除内容。评价仅代表作者观点，不代表 WhatEatO 或餐厅的官方立场。',
   '用户保留其投稿的权利，并授予 WhatEatO 为运营服务而存储、展示和使用内容所需的非独占许可。'
  ]},
  {heading:'5. 禁止行为',paragraphs:[
   '不得干扰服务、利用安全漏洞、未经授权大规模抓取数据、冒充他人、操纵信息或侵害他人权利。',
   '如违反本条款或适用法律，我们可能删除内容或限制账户使用。'
  ]},
  {heading:'6. 条款变更与联系',paragraphs:[
   '我们可能依法修改服务及条款，并在本页面公告重要修改及生效日期。本条款不限制用户依法享有的权利。',
   '服务咨询、餐厅信息更正及权利侵害举报：pakrsky2@naver.com。'
  ]}
 ]}
};
