// 기업마당 공공데이터 API 연동
// API 문서: https://www.bizinfo.go.kr/web/lay1/program/S1T175C174/apiDetail.do?id=bizinfoApi
const BIZINFO_API_URL = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do'

// 타임아웃이 있는 fetch 함수
const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

// 간단한 mock 데이터 (API 실패 시 fallback)
const fallbackMockData = [
  {
    id: 'mock-001',
    title: '2026년 AI 융합 중소기업 기술개발 지원사업',
    organization: '기업마당',
    category: ['AI', 'IT'],
    deadline: '2026-03-31',
    budget: '최대 5억원',
    eligibility: ['중소기업', 'AI 관련 기술 보유'],
    link: 'https://www.bizinfo.go.kr',
    summary: 'AI 기술을 활용한 제품/서비스 개발 중소기업 지원 (API 연결 대기 중 - mock 데이터)',
    source: 'mock',
    type: 'funding',
    tags: ['R&D', '중소기업', 'AI/데이터'],
  },
  {
    id: 'mock-002',
    title: '2026년 초기창업패키지',
    organization: 'K-스타트업',
    category: ['창업', 'ICT'],
    deadline: '2026-02-28',
    budget: '최대 1억원',
    eligibility: ['예비창업자', '창업 3년 미만'],
    link: 'https://www.k-startup.go.kr',
    summary: '예비창업자 및 초기 스타트업 대상 사업화 자금 지원 (API 연결 대기 중 - mock 데이터)',
    source: 'mock',
    type: 'funding',
    tags: ['창업/스타트업', '바우처/이용권'],
  },
  {
    id: 'mock-003',
    title: '콘텐츠 제작 지원사업',
    organization: '한국콘텐츠진흥원',
    category: ['콘텐츠', 'CT'],
    deadline: '2026-04-15',
    budget: '최대 3억원',
    eligibility: ['콘텐츠 제작사'],
    link: 'https://www.kocca.kr',
    summary: '콘텐츠 제작 및 유통 지원 (API 연결 대기 중 - mock 데이터)',
    source: 'mock',
    type: 'funding',
    tags: ['콘텐츠/미디어', '중소기업'],
  },
]

// K-Startup 공공데이터 API 연동 (창업진흥원 K-Startup 조회서비스 v2.0)
// (가이드 기준) https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01
const KSTARTUP_API_URL =
  'https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01'

// ✅ 중소벤처기업부(사업공고) API 연동 (XML)
// 사용자가 제공한 실제 호출 URL 패턴:
// https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=...&pageNo=...&numOfRows=...
const MSS_API_URL = 'https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2'

// 캐시 저장소 (메모리 캐시 - 서버리스 환경에서는 제한적)
let cache = { data: null, timestamp: null }
const CACHE_DURATION = 60 * 60 * 1000 // 1시간

// 분야 코드 매핑(현재 미사용이지만 유지)
const categoryCodeMap = {
  '01': '경영',
  '02': '금융',
  '03': '기술',
  '04': '인력',
  '05': '수출',
  '06': '내수',
  '07': '창업',
  '08': '기타',
}

// 분야를 우리 카테고리로 변환
const mapToOurCategory = (lcategory) => {
  const categoryMapping = {
    경영: ['창업'],
    금융: ['창업'],
    기술: ['IT', 'ICT'],
    인력: ['창업'],
    수출: ['창업'],
    내수: ['창업'],
    창업: ['창업'],
    기타: [],
  }
  return categoryMapping[lcategory] || []
}

// ==============================================
// 공고 타입 및 태그 분류 시스템
// ==============================================

// 확정된 태그 목록 (12개)
const VALID_TAGS = [
  'R&D',
  '수출/해외진출',
  '창업/스타트업',
  '소상공인',
  '중소기업',
  '투자/IR',
  '교육/세미나',
  '전시/로드쇼',
  '데모데이/피칭',
  '바우처/이용권',
  '입주/공간',
  '컨설팅/멘토링',
  '디지털전환',
  '제조/스마트공장',
  'AI/데이터',
  '콘텐츠/미디어',
]

// 행사형 하위 분류용 태그
const EVENT_SUB_TAGS = ['전시/로드쇼', '교육/세미나', '투자/IR', '데모데이/피칭']

// 행사(event) 타입 판별 키워드
const EVENT_KEYWORDS = [
  '전시', '박람회', 'expo', '로드쇼', '상담회', '바이어', '밋업', '네트워킹',
  '세미나', '교육', '특강', '아카데미', '워크숍', '캠프', '원데이',
  '데모데이', 'demo day', 'demoday', 'ir', '피칭', 'pitching', 'showcase',
  '컨퍼런스', '포럼', '설명회', '간담회'
]

// 안내(info) 타입 판별 키워드
const INFO_KEYWORDS = [
  '안내', '공지', '갱신', '변경', '연장', '정정', '취소', '재공고',
  '결과 발표', '선정 결과', '확인 안내'
]

// 태그 분류 규칙 (키워드 → 태그)
const TAG_RULES = {
  'R&D': ['r&d', '연구개발', '기술개발', '과제', '주관연구', '공동연구', '연구개발비', '기술혁신'],
  '수출/해외진출': ['수출', '해외', '글로벌', '현지', '바이어', '진출', '로드쇼', 'kotra', '무역', '해외마케팅'],
  '창업/스타트업': ['창업', '스타트업', '초기창업', '도약', '예비창업', '액셀러레이터', '팁스', 'tips', '벤처'],
  '소상공인': ['소상공인', '스마트상점', '전통시장', '소공인', '영세'],
  '중소기업': ['중소기업', 'sme', '중견기업'],
  '투자/IR': ['투자', 'ir', 'vc', '투자유치', '엔젤', '시드'],
  '교육/세미나': ['세미나', '교육', '특강', '아카데미', '워크숍', '캠프', '원데이', '강좌', '연수'],
  '전시/로드쇼': ['전시', '박람회', 'expo', '로드쇼', '상담회', '바이어상담', '밋업', '네트워킹'],
  '데모데이/피칭': ['데모데이', 'demo day', 'demoday', '피칭', 'pitching', 'showcase', '발표대회'],
  '바우처/이용권': ['바우처', '이용권', '쿠폰', '포인트'],
  '입주/공간': ['입주', '공간', '센터', '사무실', '보육', '인큐베이팅', '창업공간'],
  '컨설팅/멘토링': ['컨설팅', '멘토링', '코칭', '자문', '진단'],
  '디지털전환': ['디지털 전환', '디지털전환', 'dx', 'ax', '클라우드', 'ai 전환', '스마트화'],
  '제조/스마트공장': ['스마트공장', '제조', '공장', '고도화', '자동화', '생산성'],
  'AI/데이터': ['ai', '인공지능', '머신러닝', '데이터', '빅데이터', '딥러닝'],
  '콘텐츠/미디어': ['콘텐츠', '미디어', '영상', '게임', '음악', 'k-pop', 'kpop', '웹툰', '애니메이션', '방송'],
}

/**
 * 공고 타입 판별 (funding | event | info | unknown)
 * @param {Object} item - 공고 객체
 * @returns {string} 타입
 */
const determineAnnouncementType = (item) => {
  const searchText = [
    item.title || '',
    item.summary || '',
    (item.eligibility || []).join(' '),
    item.organization || '',
  ].join(' ').toLowerCase()

  // 1. info 타입 체크 (순수 안내성)
  const hasInfoKeyword = INFO_KEYWORDS.some(kw => searchText.includes(kw))
  const hasFundingKeyword = ['지원', '모집', '선정', '사업화', '자금', '비용 지원', '구축'].some(kw => searchText.includes(kw))

  if (hasInfoKeyword && !hasFundingKeyword) {
    return 'info'
  }

  // 2. event 타입 체크 (행사형)
  const hasEventKeyword = EVENT_KEYWORDS.some(kw => searchText.includes(kw))
  if (hasEventKeyword) {
    // 행사 키워드가 강하게 있고, 지원금 성격이 아닌 경우
    const strongEventPatterns = [
      '참가', '참여', '신청', '개최', '행사', '일정',
      '세미나 안내', '교육 안내', '전시회', '박람회 참가'
    ]
    const isStrongEvent = strongEventPatterns.some(p => searchText.includes(p))

    if (isStrongEvent || !hasFundingKeyword) {
      return 'event'
    }
  }

  // 3. funding 타입 (기본값)
  return 'funding'
}

/**
 * 공고에서 태그 추출 (최대 5개)
 * @param {Object} item - 공고 객체
 * @returns {string[]} 태그 배열
 */
const extractTags = (item) => {
  const searchText = [
    item.title || '',
    item.summary || '',
    (item.eligibility || []).join(' '),
    item.organization || '',
    item.hashTags || '',
  ].join(' ').toLowerCase()

  const matchedTags = []

  // 태그 규칙에 따라 매칭
  for (const [tag, keywords] of Object.entries(TAG_RULES)) {
    if (keywords.some(kw => searchText.includes(kw))) {
      matchedTags.push(tag)
    }
  }

  // 중복 제거 및 최대 5개로 제한
  const uniqueTags = [...new Set(matchedTags)]
  return uniqueTags.slice(0, 5)
}

/**
 * 공고에 type과 tags 필드 추가
 * @param {Object} item - 변환된 공고 객체
 * @returns {Object} type과 tags가 추가된 공고 객체
 */
const enrichWithTypeAndTags = (item) => {
  const type = determineAnnouncementType(item)
  const tags = extractTags(item)

  return {
    ...item,
    type,
    tags,
  }
}

// ==============================================
// 기존 카테고리 추출 함수 (유지)
// ==============================================

// 텍스트에서 카테고리 키워드 추출 (제목, 설명, 해시태그 등)
const extractCategoriesFromText = (text) => {
  if (!text) return []
  const categories = []
  const lowerText = String(text).toLowerCase()

  // AI 관련 키워드
  if (
    lowerText.includes('ai') ||
    lowerText.includes('인공지능') ||
    lowerText.includes('머신러닝') ||
    lowerText.includes('딥러닝') ||
    lowerText.includes('자연어처리') ||
    lowerText.includes('nlp') ||
    lowerText.includes('빅데이터') ||
    lowerText.includes('데이터분석')
  ) {
    categories.push('AI')
  }

  // ICT 관련 키워드
  if (
    lowerText.includes('ict') ||
    lowerText.includes('정보통신') ||
    lowerText.includes('디지털') ||
    lowerText.includes('클라우드') ||
    lowerText.includes('사물인터넷') ||
    lowerText.includes('iot') ||
    lowerText.includes('5g') ||
    lowerText.includes('블록체인')
  ) {
    categories.push('ICT')
  }

  // IT 관련 키워드
  if (
    lowerText.includes('소프트웨어') ||
    lowerText.includes('sw개발') ||
    lowerText.includes('시스템') ||
    lowerText.includes('네트워크') ||
    lowerText.includes('보안') ||
    lowerText.includes('플랫폼') ||
    lowerText.includes('앱개발') ||
    lowerText.includes('웹개발')
  ) {
    categories.push('IT')
  }

  // 콘텐츠/CT 관련 키워드
  if (
    lowerText.includes('콘텐츠') ||
    lowerText.includes('content') ||
    lowerText.includes('미디어') ||
    lowerText.includes('방송') ||
    lowerText.includes('영상') ||
    lowerText.includes('영화') ||
    lowerText.includes('애니메이션') ||
    lowerText.includes('웹툰') ||
    lowerText.includes('만화')
  ) {
    categories.push('콘텐츠')
  }

  // CT(문화기술) 관련 키워드
  if (
    lowerText.includes('문화기술') ||
    lowerText.includes('게임') ||
    lowerText.includes('vr') ||
    lowerText.includes('ar') ||
    lowerText.includes('xr') ||
    lowerText.includes('메타버스') ||
    lowerText.includes('실감콘텐츠')
  ) {
    categories.push('CT')
  }

  // 음악 관련 키워드
  if (
    lowerText.includes('음악') ||
    lowerText.includes('music') ||
    lowerText.includes('음원') ||
    lowerText.includes('뮤직') ||
    lowerText.includes('k-pop') ||
    lowerText.includes('kpop') ||
    lowerText.includes('공연') ||
    lowerText.includes('아티스트')
  ) {
    categories.push('음악')
  }

  // 창업 관련 키워드
  if (
    lowerText.includes('창업') ||
    lowerText.includes('스타트업') ||
    lowerText.includes('startup') ||
    lowerText.includes('예비창업') ||
    lowerText.includes('초기창업') ||
    lowerText.includes('벤처') ||
    lowerText.includes('액셀러레이터') ||
    lowerText.includes('사업화')
  ) {
    categories.push('창업')
  }

  // 수출 관련 키워드
  if (
    lowerText.includes('수출') ||
    lowerText.includes('해외진출') ||
    lowerText.includes('해외 진출') ||
    lowerText.includes('글로벌') ||
    lowerText.includes('무역') ||
    lowerText.includes('바이어') ||
    lowerText.includes('수출바우처') ||
    lowerText.includes('해외마케팅') ||
    lowerText.includes('해외 마케팅') ||
    lowerText.includes('현지화') ||
    lowerText.includes('fta')
  ) {
    categories.push('수출')
  }

  // R&D 관련 키워드
  if (
    lowerText.includes('r&d') ||
    lowerText.includes('연구개발') ||
    lowerText.includes('연구 개발') ||
    lowerText.includes('기술개발') ||
    lowerText.includes('기술 개발') ||
    lowerText.includes('과제') ||
    lowerText.includes('연구비') ||
    lowerText.includes('기초연구') ||
    lowerText.includes('응용연구') ||
    lowerText.includes('산학협력') ||
    lowerText.includes('기업부설연구소')
  ) {
    categories.push('R&D')
  }

  return [...new Set(categories)] // 중복 제거
}

// 해시태그/문자열에서 추가 카테고리 추출 (기존 함수 유지 - 호환성)
const extractCategoriesFromHashtags = (hashtags) => {
  return extractCategoriesFromText(hashtags)
}

const pad2 = (n) => String(n).padStart(2, '0')
const toYMD = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`

// 신청 기간에서 마감일 추출(강화 버전) - Bizinfo용 유지
const extractDeadline = (reqstDt) => {
  if (!reqstDt) return null
  const text = String(reqstDt)

  if (text.includes('예산소진') || text.includes('예산 소진') || text.includes('상시')) {
    return '2099-12-31'
  }

  const digits = text.replace(/\D/g, '')
  const matches8 = digits.match(/\d{8}/g)
  if (matches8 && matches8.length > 0) {
    const s = matches8[matches8.length - 1]
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }

  const re = /(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/g
  const found = []
  let m
  while ((m = re.exec(text)) !== null) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    if (y && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      found.push(toYMD(y, mo, d))
    }
  }
  if (found.length > 0) return found[found.length - 1]

  return null
}

// Bizinfo API 응답에서 item 배열 안전 추출
const extractItemsFromApiResponse = (data) => {
  if (Array.isArray(data?.jsonArray)) return data.jsonArray

  if (data?.jsonArray && typeof data.jsonArray === 'object') {
    const keys = Object.keys(data.jsonArray)
    const numericKeyCount = keys.filter((k) => /^\d+$/.test(k)).length
    if (numericKeyCount > 0) {
      return keys
        .filter((k) => /^\d+$/.test(k))
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => data.jsonArray[k])
        .filter(Boolean)
    }
  }

  const candidates = [
    data?.jsonArray?.item,
    data?.jsonArray?.channel?.item,
    data?.jsonArray?.rss?.channel?.item,
    data?.jsonArray?.items?.item,
    data?.jsonArray?.items,
    data?.items,
    data?.item,
  ]

  for (const c of candidates) {
    if (!c) continue
    if (Array.isArray(c)) return c
    if (typeof c === 'object') return [c]
  }

  return []
}

// Bizinfo 응답 -> 공통 스키마 변환(개선: 제목/설명에서 카테고리 추출)
const transformApiResponse = (items) => {
  return (items || []).map((item) => {
    const rawLcategory =
      item.pldirSportRealmLclasCodeNm || item.lcategory || item.lcategoryNm || '기타'

    const baseCategories = mapToOurCategory(rawLcategory)

    const rawHashtags = item.hashtags || item.hashTags || ''
    const title = item.pblancNm || item.title || ''
    const summary = item.bsnsSumryCn || item.description || ''

    // 제목, 설명, 해시태그에서 카테고리 추출
    const textCategories = extractCategoriesFromText(`${title} ${summary} ${rawHashtags}`)
    const allCategories = [...new Set([...baseCategories, ...textCategories])]

    const rawReqst = item.reqstBeginEndDe || item.reqstDt || ''
    const deadline = extractDeadline(rawReqst)

    const link = item.pblancUrl || item.rceptEngnHmpgUrl || item.link || ''

    const baseItem = {
      id: item.pblancId,
      title,
      organization: '기업마당',
      category: allCategories.length > 0 ? allCategories : ['창업'],
      deadline,
      budget: null,
      eligibility: item.trgetNm ? [item.trgetNm] : [],
      link,
      detailUrl: link,
      summary,
      requirements: [],
      evaluationCriteria: [],
      source: 'bizinfo_api',
      author: item.author,
      lcategory: rawLcategory,
      pubDate: item.creatPnttm || item.pubDate,
      reqstDt: rawReqst,
      hashTags: rawHashtags,
    }

    // type과 tags 추가
    return enrichWithTypeAndTags(baseItem)
  })
}

/**
 * K-Startup 응답에서 items 배열 안전 추출
 */
const extractItemsFromKstartupResponse = (data) => {
  if (Array.isArray(data?.data)) return data.data

  const candidates = [
    data?.response?.body?.items,
    data?.response?.body?.items?.item,
    data?.response?.body?.data,
    data?.items,
    data?.items?.item,
    data?.item,
  ]

  for (const c of candidates) {
    if (!c) continue
    if (Array.isArray(c)) return c
    if (typeof c === 'object') return [c]
  }

  return []
}

const normalizeYmdFromAny = (v) => {
  if (!v) return null
  const s = String(v).trim()
  if (!s) return null

  const digits = s.replace(/\D/g, '')
  if (digits.length >= 8) {
    const y = digits.slice(0, 4)
    const m = digits.slice(4, 6)
    const d = digits.slice(6, 8)
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`
    }
  }

  const m1 = s.match(/(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/)
  if (m1) return toYMD(Number(m1[1]), Number(m1[2]), Number(m1[3]))

  return null
}

/**
 * K-Startup API 응답을 공통 스키마로 변환 (개선: 제목/설명에서 카테고리 추출)
 */
const transformKstartupResponse = (items) => {
  return (items || [])
    .map((item) => {
      const title = item.biz_pbanc_nm || item.title || ''
      const org = item.pbanc_ntrp_nm || item.org_nm || item.organization || 'K-Startup'

      const start = normalizeYmdFromAny(item.pbanc_rcpt_bgng_dt || item.rcpt_bgng_dt)
      const end = normalizeYmdFromAny(item.pbanc_rcpt_end_dt || item.rcpt_end_dt)

      const deadline = end || null

      let link = item.detl_pg_url || item.detail_url || item.link || ''
      if (link && typeof link === 'string' && !/^https?:\/\//i.test(link)) {
        link = `https://${link.replace(/^\/+/, '')}`
      }

      const summary =
        item.pbanc_ctnt ||
        item.biz_intrcn ||
        item.description ||
        item.atchFileNm ||
        item.atch_file_nm ||
        ''

      // 제목, 설명에서 카테고리 추출
      const textCategories = extractCategoriesFromText(`${title} ${summary}`)
      const categories = textCategories.length > 0 ? [...new Set(['창업', ...textCategories])] : ['창업']

      const baseItem = {
        id: item.pbanc_sn || item.id || `${title}__${start || ''}__${end || ''}`,
        title,
        organization: org,
        category: categories,
        deadline,
        budget: null,
        eligibility: [],
        link,
        detailUrl: link,
        summary,
        requirements: [],
        evaluationCriteria: [],
        source: 'kstartup_api',
        author: null,
        lcategory: '창업',
        pubDate: normalizeYmdFromAny(item.pbanc_reg_dt || item.reg_dt || item.pub_date) || null,
        reqstDt: start && end ? `${start} ~ ${end}` : start || end || null,
        hashTags: '',
      }

      // type과 tags 추가
      return enrichWithTypeAndTags(baseItem)
    })
    .filter((x) => x.title)
}

/**
 * ============
 * ✅ MSS(XML) 파서 (외부 라이브러리 없이, 응답 구조에 맞춘 안전한 수준의 파싱)
 * ============
 */
const stripCdata = (s) => {
  if (!s) return ''
  return String(s)
    .replace(/^\s*<!\[CDATA\[/, '')
    .replace(/\]\]>\s*$/, '')
    .trim()
}

const decodeEntities = (s) => {
  if (!s) return ''
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

const stripHtmlTags = (s) => {
  if (!s) return ''
  return String(s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const getTagText = (xml, tag) => {
  if (!xml) return ''
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = xml.match(re)
  if (m && m[1] != null) return stripCdata(decodeEntities(m[1]))

  const reSelf = new RegExp(`<${tag}\\s*\\/\\s*>`, 'i')
  if (reSelf.test(xml)) return ''
  return ''
}

const getTagTexts = (xml, tag) => {
  if (!xml) return []
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const out = []
  let m
  while ((m = re.exec(xml)) !== null) {
    out.push(stripCdata(decodeEntities(m[1])))
  }
  return out
}

const extractMssItemsFromXml = (xml) => {
  if (!xml) return []
  const itemsBlockMatch = xml.match(/<items>([\s\S]*?)<\/items>/i)
  if (!itemsBlockMatch) return []

  const itemsBlock = itemsBlockMatch[1]
  const reItem = /<item>([\s\S]*?)<\/item>/gi
  const out = []
  let m
  while ((m = reItem.exec(itemsBlock)) !== null) out.push(m[1])
  return out
}

const parseMssXmlEnvelope = (xml) => {
  const resultCode = getTagText(xml, 'resultCode')
  const resultMsg = getTagText(xml, 'resultMsg')
  const totalCountRaw = getTagText(xml, 'totalCount')
  const numOfRowsRaw = getTagText(xml, 'numOfRows')
  const pageNoRaw = getTagText(xml, 'pageNo')

  const totalCount = totalCountRaw ? Number(totalCountRaw) : null
  const numOfRows = numOfRowsRaw ? Number(numOfRowsRaw) : null
  const pageNo = pageNoRaw ? Number(pageNoRaw) : null

  return { resultCode, resultMsg, totalCount, numOfRows, pageNo }
}

/**
 * ✅ MSS API 호출 (최신순 100개, 타임아웃 적용)
 */
const fetchMssAnnouncements = async ({ apiKey, max = 100, perPage = 100 } = {}) => {
  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: '1',
    numOfRows: String(Math.min(perPage, 100)), // 100개 요청
  })

  const url = `${MSS_API_URL}?${params.toString()}`
  const res = await fetchWithTimeout(url, {}, 15000) // 15초 타임아웃 (데이터 많아서 늘림)
  if (!res.ok) {
    throw new Error(`[MSS API] request failed: ${res.status} ${res.statusText}`)
  }

  const xml = await res.text()
  const envelope = parseMssXmlEnvelope(xml)

  if (envelope.resultCode && envelope.resultCode !== '00') {
    throw new Error(`[MSS API] resultCode=${envelope.resultCode} resultMsg=${envelope.resultMsg}`)
  }

  const itemBlocks = extractMssItemsFromXml(xml)
  return itemBlocks.slice(0, max)
}

/**
 * MSS item(XML 블록) -> 공통 스키마 변환 (개선: 제목/설명에서 카테고리 추출)
 */
const transformMssResponse = (itemBlocks) => {
  return (itemBlocks || [])
    .map((block) => {
      const itemId = getTagText(block, 'itemId')
      const title = getTagText(block, 'title') || ''
      const dataContentsRaw = getTagText(block, 'dataContents') || ''
      const applicationStartDate = normalizeYmdFromAny(getTagText(block, 'applicationStartDate'))
      const applicationEndDate = normalizeYmdFromAny(getTagText(block, 'applicationEndDate'))

      const viewUrl = getTagText(block, 'viewUrl') || ''
      const fileNames = getTagTexts(block, 'fileName')
      const fileUrls = getTagTexts(block, 'fileUrl')

      const writerName = getTagText(block, 'writerName') || null
      const writerPosition = getTagText(block, 'writerPosition') || null
      const writerPhone = getTagText(block, 'writerPhone') || null
      const writerEmail = getTagText(block, 'writerEmail') || null

      const summary = stripHtmlTags(dataContentsRaw)

      // 제목, 설명에서 카테고리 추출 (개선된 함수 사용)
      const textCategories = extractCategoriesFromText(`${title} ${summary}`)
      const categories = textCategories.length > 0 ? [...new Set(['창업', ...textCategories])] : ['창업']

      const deadline = applicationEndDate || null

      const reqstDt =
        applicationStartDate && applicationEndDate
          ? `${applicationStartDate} ~ ${applicationEndDate}`
          : applicationStartDate || applicationEndDate || null

      const baseItem = {
        id: itemId || `mss__${title}__${applicationStartDate || ''}__${applicationEndDate || ''}`,
        title,
        organization: '중소벤처기업부',
        category: categories.length ? categories : ['창업'],
        deadline,
        budget: null,
        eligibility: [],
        link: viewUrl,
        detailUrl: viewUrl,
        summary,
        requirements: [],
        evaluationCriteria: [],
        source: 'mss_api',
        author: writerName,
        lcategory: '창업',
        pubDate: null,
        reqstDt,
        hashTags: '',
        mssMeta: {
          writerName,
          writerPosition,
          writerPhone,
          writerEmail,
          files: fileNames.map((name, idx) => ({
            name,
            url: fileUrls[idx] || null,
          })),
        },
      }

      // type과 tags 추가
      return enrichWithTypeAndTags(baseItem)
    })
    .filter((x) => x.title)
}

/**
 * 통합 결과에서 중복 제거
 */
const dedupAnnouncements = (arr) => {
  const seen = new Set()
  const out = []

  for (const a of arr || []) {
    const linkKey = (a.detailUrl || a.link || '').trim()
    const fallbackKey = `${a.title || ''}__${a.organization || ''}__${a.deadline || ''}`
    const key = linkKey || fallbackKey

    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(a)
  }
  return out
}

/**
 * K-Startup 공고 목록 조회 (최신순 100개, 타임아웃 적용)
 */
const fetchKstartupAnnouncements = async ({ apiKey, max = 100, perPage = 100 } = {}) => {
  const params = new URLSearchParams({
    ServiceKey: apiKey,
    page: '1',
    perPage: String(Math.min(perPage, 100)), // 100개 요청
    returnType: 'json',
  })

  const url = `${KSTARTUP_API_URL}?${params.toString()}`
  const res = await fetchWithTimeout(url, {}, 15000) // 15초 타임아웃 (데이터 많아서 늘림)
  if (!res.ok) throw new Error(`[K-Startup API] request failed: ${res.status} ${res.statusText}`)

  const data = await res.json()
  const items = extractItemsFromKstartupResponse(data)
  return items.slice(0, max)
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  try {
    const { keyword, category, refresh, debug } = event.queryStringParameters || {}

    // 캐시 확인 (refresh=true가 아닌 경우)
    if (!refresh && cache.data && cache.timestamp && Date.now() - cache.timestamp < CACHE_DURATION) {
      console.log('[Announcements] Using cached data')
      let results = [...cache.data]

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase()
        results = results.filter(
          (p) =>
            (p.title || '').toLowerCase().includes(lowerKeyword) ||
            (p.summary || '').toLowerCase().includes(lowerKeyword)
        )
      }

      if (category) results = results.filter((p) => (p.category || []).includes(category))

      results.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline) - new Date(b.deadline)
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: results,
          total: results.length,
          cached: true,
          cacheAge: Math.round((Date.now() - cache.timestamp) / 1000),
        }),
      }
    }

    // ==========================
    // ✅ 키 분리
    // ==========================
    const bizinfoKey = process.env.BIZINFO_API_KEY || process.env.DATA_GO_KR_API_KEY
    const kstartupKey = process.env.DATA_GO_KR_API_KEY
    const mssKey = process.env.MSS_API_KEY || process.env.DATA_GO_KR_API_KEY

    // API 키가 없으면 mock 데이터 반환
    if (!bizinfoKey && !kstartupKey && !mssKey) {
      console.log('[Announcements] No API keys configured, returning mock data')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: fallbackMockData,
          total: fallbackMockData.length,
          cached: false,
          warning: 'API keys not configured. Showing mock data.',
        }),
      }
    }

    // ===============
    // 1) 기업마당 호출 (타임아웃 15초, 재시도 2회)
    // ===============
    let bizinfoItems = []
    let bizinfoError = null

    if (bizinfoKey) {
      const bizinfoParams = new URLSearchParams({
        crtfcKey: bizinfoKey,
        dataType: 'json',
        searchCnt: '100',
      })

      const maxRetries = 2
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[Bizinfo API] Fetching from API... (attempt ${attempt}/${maxRetries})`)
          const bizinfoResponse = await fetchWithTimeout(
            `${BIZINFO_API_URL}?${bizinfoParams}`,
            {},
            15000 // 15초로 타임아웃 증가
          )
          if (!bizinfoResponse.ok) {
            throw new Error(
              `Bizinfo API request failed: ${bizinfoResponse.status} ${bizinfoResponse.statusText}`
            )
          }

          const bizinfoData = await bizinfoResponse.json()
          bizinfoItems = extractItemsFromApiResponse(bizinfoData)
          bizinfoError = null // 성공 시 에러 초기화
          break // 성공하면 루프 종료
        } catch (e) {
          bizinfoError = e
          console.error(`[Bizinfo API Error] Attempt ${attempt}:`, e.message)
          if (attempt < maxRetries) {
            // 재시도 전 1초 대기
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }
      }
    }

    // ===============
    // 2) K-Startup 호출(옵션, 타임아웃 8초)
    // ===============
    let kstartupItems = []
    let kstartupError = null

    if (!kstartupKey) {
      console.warn('[K-Startup API] DATA_GO_KR_API_KEY not configured; skipping.')
    } else {
      try {
        console.log('[K-Startup API] Fetching from API...')
        kstartupItems = await fetchKstartupAnnouncements({
          apiKey: kstartupKey,
          max: 100,
          perPage: 100,
        })
      } catch (e) {
        kstartupError = e
        console.error('[K-Startup API Error]', e.message)
        kstartupItems = []
      }
    }

    // ===============
    // 3) MSS 호출(옵션, 타임아웃 8초)
    // ===============
    let mssItemBlocks = []
    let mssError = null

    if (!mssKey) {
      console.warn('[MSS API] MSS_API_KEY not configured; skipping.')
    } else {
      try {
        console.log('[MSS API] Fetching from API...')
        mssItemBlocks = await fetchMssAnnouncements({
          apiKey: mssKey,
          max: 100,
          perPage: 100,
        })
      } catch (e) {
        mssError = e
        console.error('[MSS API Error]', e.message)
        mssItemBlocks = []
      }
    }

    // 디버그: 간소화된 구조 확인
    if (debug === 'true') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          debug: {
            env: { hasBizinfoKey: !!bizinfoKey, hasKstartupKey: !!kstartupKey, hasMssKey: !!mssKey },
            bizinfo: {
              itemsLength: bizinfoItems.length,
              error: bizinfoError ? bizinfoError.message : null,
            },
            kstartup: {
              itemsLength: kstartupItems.length,
              error: kstartupError ? kstartupError.message : null,
            },
            mss: {
              itemsLength: mssItemBlocks.length,
              error: mssError ? mssError.message : null,
            },
          },
        }),
      }
    }

    // =========================
    // 4) 공통 스키마 변환 후 통합
    // =========================
    const transformedBizinfo = transformApiResponse(bizinfoItems)
    const transformedKstartup = transformKstartupResponse(kstartupItems)
    const transformedMss = transformMssResponse(mssItemBlocks)

    let combined = dedupAnnouncements([
      ...transformedBizinfo,
      ...transformedKstartup,
      ...transformedMss,
    ])

    // 모든 API가 실패하거나 데이터가 없으면 mock 데이터 사용
    if (combined.length === 0) {
      console.log('[Announcements] All APIs failed or returned empty, using mock data')
      combined = fallbackMockData
    }

    cache = { data: combined, timestamp: Date.now() }

    // 필터링 적용
    let results = [...combined]

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      results = results.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(lowerKeyword) ||
          (p.summary || '').toLowerCase().includes(lowerKeyword)
      )
    }

    if (category) results = results.filter((p) => (p.category || []).includes(category))

    // deadline 없는 건 뒤로, 있는 건 deadline 순
    results.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline) - new Date(b.deadline)
    })

    const warnings = []
    if (bizinfoError) warnings.push('Bizinfo API failed.')
    if (kstartupError) warnings.push('K-Startup API failed.')
    if (mssError) warnings.push('MSS API failed.')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: results,
        total: results.length,
        cached: false,
        totalFromApi: {
          bizinfo: bizinfoItems.length,
          kstartup: kstartupItems.length,
          mss: mssItemBlocks.length,
        },
        warnings,
      }),
    }
  } catch (error) {
    console.error('[Announcements API Error]', error)
    // 에러 발생 시에도 mock 데이터 반환 (서비스 가용성 우선)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: fallbackMockData,
        total: fallbackMockData.length,
        cached: false,
        warning: `API error: ${error.message}. Showing mock data.`,
      }),
    }
  }
}
