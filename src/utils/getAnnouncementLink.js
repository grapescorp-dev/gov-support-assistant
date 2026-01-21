// src/utils/getAnnouncementLink.js
// 공고 링크 생성 유틸리티
// - detailUrl이 있으면 세부 페이지를 우선 열되, 상대경로인 경우 기관 도메인을 붙여 절대 URL로 보정
// - detailUrl이 없으면 기관별 검색 URL 패턴을 사용하여 공고 제목이 검색된 상태로 열림
// - 검색 미지원 시 기관 기본 URL로 fallback

// 기관별 기본 URL (검색 미지원 시 fallback)
const baseUrls = {
  기업마당: 'https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do',
  'K-스타트업': 'https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do',
  중소벤처기업부: 'https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310',
  과학기술정보통신부: 'https://www.msit.go.kr/bbs/list.do?sCode=user&mId=113&mPid=112',
  문화체육관광부: 'https://www.mcst.go.kr/kor/s_notice/notice/noticeList.jsp',
  정보통신기획평가원: 'https://www.iitp.kr/kr/1/business/businessNotice/list.it',
  정보통신산업진흥원: 'https://www.nipa.kr/main/selectBbsList.do?bbsId=BBS_0000006',
  한국지능정보사회진흥원: 'https://www.nia.or.kr/site/nia_kor/ex/bbs/List.do?cbIdx=82618',
  한국인터넷진흥원: 'https://www.kisa.or.kr/401',
  한국전자통신연구원: 'https://www.etri.re.kr/kor/sub6/sub6_0101.etri',
  한국연구재단: 'https://www.nrf.re.kr/page/364?menuNo=364&bizNotGubn=notice',
  한국산업기술진흥원: 'https://www.kiat.or.kr/front/board/boardContentsListPage.do?board_id=90',
  중소벤처기업진흥공단: 'https://www.kosmes.or.kr/sbc/SH/JBI/SHJBI001M0.do',
  한국콘텐츠진흥원: 'https://www.kocca.kr/kocca/bbs/list/B0000204.do?menuNo=204897',
  예술경영지원센터: 'https://www.gokams.or.kr/02_apply/introduction.aspx',
  한국문화예술위원회: 'https://artnuri.or.kr/',
  영화진흥위원회: 'https://www.kofic.or.kr/kofic/business/prom/supportList.do',
  서울산업진흥원: 'https://www.sba.seoul.kr/Pages/BusinessApply/Posting.aspx',
  서울창업허브: 'https://seoulstartuphub.com/front/main.do',
  경기콘텐츠진흥원: 'https://www.gcon.or.kr/gcon/main/main.do',
  창업진흥원: 'https://www.kised.or.kr/menu.es?mid=a10305010000',
  기술보증기금: 'https://www.kibo.or.kr/',
}

// 기관별 도메인 베이스(상대경로 detailUrl 보정용)
// - detailUrl이 "/web/..." 같은 상대경로로 올 경우, 아래 origin을 붙여 절대 URL로 변환합니다.
// - 기관명이 매칭되지 않으면 기존 동작(상대경로 그대로 반환)을 유지합니다.
const organizationOriginMap = {
  기업마당: 'https://www.bizinfo.go.kr',
  'K-스타트업': 'https://www.k-startup.go.kr',
  중소벤처기업부: 'https://www.mss.go.kr',
  과학기술정보통신부: 'https://www.msit.go.kr',
  문화체육관광부: 'https://www.mcst.go.kr',
  정보통신기획평가원: 'https://www.iitp.kr',
  정보통신산업진흥원: 'https://www.nipa.kr',
  한국지능정보사회진흥원: 'https://www.nia.or.kr',
  한국인터넷진흥원: 'https://www.kisa.or.kr',
  한국전자통신연구원: 'https://www.etri.re.kr',
  한국연구재단: 'https://www.nrf.re.kr',
  한국산업기술진흥원: 'https://www.kiat.or.kr',
  중소벤처기업진흥공단: 'https://www.kosmes.or.kr',
  한국콘텐츠진흥원: 'https://www.kocca.kr',
  예술경영지원센터: 'https://www.gokams.or.kr',
  한국문화예술위원회: 'https://artnuri.or.kr',
  영화진흥위원회: 'https://www.kofic.or.kr',
  서울산업진흥원: 'https://www.sba.seoul.kr',
  서울창업허브: 'https://seoulstartuphub.com',
  경기콘텐츠진흥원: 'https://www.gcon.or.kr',
  창업진흥원: 'https://www.kised.or.kr',
  기술보증기금: 'https://www.kibo.or.kr',
}

// 절대 URL 여부
const isAbsoluteUrl = (url) => /^https?:\/\//i.test(String(url || ''))

// detailUrl 보정: 상대경로면 organization 도메인을 붙여 절대 URL로 변환
const normalizeDetailUrl = (organization, detailUrl) => {
  if (!detailUrl) return null

  const url = String(detailUrl).trim()
  if (!url) return null

  // 이미 절대 URL이면 그대로
  if (isAbsoluteUrl(url)) return url

  // 상대경로면 기관별 origin을 붙임
  const origin = organizationOriginMap[organization]
  if (!origin) return url // origin을 모르면 기존 동작 유지(상대경로 그대로)

  // "/path" 또는 "path" 모두 처리
  if (url.startsWith('/')) return `${origin}${url}`
  return `${origin}/${url}`
}

// 검색 키워드 추출 (연도 제거, 30자 제한)
const extractKeyword = (title) => {
  return String(title || '')
    .replace(/20\d{2}년도?\s*/g, '') // 연도 제거 (2024년, 2025년도 등)
    .replace(/[\[\]()【】]/g, '') // 괄호 제거
    .trim()
    .slice(0, 30)
}

// 기관별 검색 URL 생성 함수
const searchUrlGenerators = {
  // 정부/공공 포털
  기업마당: (keyword) =>
    `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do?rows=10&cpage=1&searchKeyword=${keyword}`,

  'K-스타트업': (keyword) =>
    `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schStr=${keyword}`,

  중소벤처기업부: (keyword) =>
    `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&searchKey=1&searchVal=${keyword}`,

  과학기술정보통신부: (keyword) =>
    `https://www.msit.go.kr/bbs/list.do?sCode=user&mId=113&mPid=112&searchKey=0&searchValue=${keyword}`,

  // IT/ICT 전문기관
  정보통신기획평가원: (keyword) =>
    `https://www.iitp.kr/kr/1/business/businessNotice/list.it?searchText=${keyword}`,

  정보통신산업진흥원: (keyword) =>
    `https://www.nipa.kr/main/selectBbsList.do?bbsId=BBS_0000006&searchText=${keyword}`,

  한국지능정보사회진흥원: (keyword) =>
    `https://www.nia.or.kr/site/nia_kor/ex/bbs/List.do?cbIdx=82618&searchKey=1&searchVal=${keyword}`,

  한국인터넷진흥원: (keyword) =>
    `https://www.kisa.or.kr/401?searchKeyword=${keyword}`,

  한국연구재단: (keyword) =>
    `https://www.nrf.re.kr/page/364?menuNo=364&bizNotGubn=notice&search_keyword=${keyword}`,

  한국산업기술진흥원: (keyword) =>
    `https://www.kiat.or.kr/front/board/boardContentsListPage.do?board_id=90&searchText=${keyword}`,

  중소벤처기업진흥공단: (keyword) =>
    `https://www.kosmes.or.kr/sbc/SH/JBI/SHJBI001M0.do?searchKeyword=${keyword}`,

  한국데이터산업진흥원: (keyword) =>
    `https://www.kdata.or.kr/kr/board/notice_01/boardList.do?searchText=${keyword}`,

  // 콘텐츠/문화예술 기관
  한국콘텐츠진흥원: (keyword) =>
    `https://www.kocca.kr/kocca/bbs/list/B0000204.do?menuNo=204897&searchText=${keyword}`,

  예술경영지원센터: (keyword) =>
    `https://www.gokams.or.kr/02_apply/introduction.aspx?searchText=${keyword}`,

  영화진흥위원회: (keyword) =>
    `https://www.kofic.or.kr/kofic/business/prom/supportList.do?searchKeyword=${keyword}`,

  // 지역별 기관
  서울산업진흥원: (keyword) =>
    `https://www.sba.seoul.kr/Pages/BusinessApply/Posting.aspx?searchKeyword=${keyword}`,

  경기창조경제혁신센터: (keyword) =>
    `https://ccei.creativekorea.or.kr/gyeonggi/allim/pbanc.do?searchKeyword=${keyword}`,

  강원창조경제혁신센터: (keyword) =>
    `https://ccei.creativekorea.or.kr/gangwon/allim/pbanc.do?searchKeyword=${keyword}`,

  // 창업/투자 전문
  창업진흥원: (keyword) =>
    `https://www.kised.or.kr/menu.es?mid=a10305010000&searchKeyword=${keyword}`,
}

/**
 * 공고 링크 생성 함수
 * @param {Object} announcement - 공고 객체 (title, organization 필수, detailUrl 선택)
 * @returns {string} 세부 페이지 URL(가능 시), 검색 URL, 또는 기본 URL
 */
export function getAnnouncementLink(announcement) {
  const title = announcement?.title
  const organization = announcement?.organization
  const detailUrl = announcement?.detailUrl
  const link = announcement?.link // 일부 데이터 소스는 link만 제공할 수 있음

  // 1. detailUrl이 있으면 우선 사용 (상대경로면 기관 도메인 붙여 보정)
  const normalizedDetail = normalizeDetailUrl(organization, detailUrl)
  if (normalizedDetail) return normalizedDetail

  // 1-1. detailUrl이 없고 link가 있으면 사용 (상대경로면 기관 도메인 붙여 보정)
  const normalizedLink = normalizeDetailUrl(organization, link)
  if (normalizedLink) return normalizedLink

  // 2. 검색 키워드 추출 및 인코딩
  const keyword = encodeURIComponent(extractKeyword(title))

  // 3. 해당 기관의 검색 URL 생성 함수가 있으면 사용
  if (organization && searchUrlGenerators[organization]) {
    return searchUrlGenerators[organization](keyword)
  }

  // 4. 없으면 기본 URL 반환
  if (organization && baseUrls[organization]) {
    return baseUrls[organization]
  }

  return '#'
}

/**
 * 기관 기본 URL 반환 (검색 없이)
 * @param {string} organization - 기관명
 * @returns {string} 기관 기본 URL
 */
export function getOrganizationBaseUrl(organization) {
  return baseUrls[organization] || '#'
}

export default getAnnouncementLink
