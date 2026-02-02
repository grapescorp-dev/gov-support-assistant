// 프로필 기반 지원사업 매칭률 계산

import { INTERESTS } from '../stores/useProfileStore'

// 전체 지역 매핑 (프로필 region 값 -> 키워드 배열)
// 시·도 + 주요 시·군 단위까지 포함
const REGION_KEYWORDS = {
  seoul: {
    main: ['서울', '서울특별시'],
    districts: ['강남', '서초', '송파', '강동', '마포', '영등포', '구로', '금천', '관악', '동작', '용산', '종로', '중구', '성동', '광진', '동대문', '중랑', '성북', '강북', '도봉', '노원', '은평', '서대문', '양천', '강서'],
  },
  gyeonggi: {
    main: ['경기', '경기도'],
    cities: ['성남', '수원', '용인', '화성', '고양', '안양', '부천', '평택', '김포', '파주', '양주', '광주', '하남', '의정부', '시흥', '안산', '군포', '의왕', '과천', '오산', '이천', '여주', '양평', '가평', '포천', '동두천', '연천', '광명', '안성', '구리', '남양주'],
  },
  incheon: {
    main: ['인천', '인천광역시'],
    districts: ['중구', '동구', '미추홀', '연수', '남동', '부평', '계양', '서구', '강화', '옹진'],
  },
  gangwon: {
    main: ['강원', '강원도', '강원특별자치도'],
    cities: ['춘천', '원주', '강릉', '동해', '태백', '속초', '삼척', '홍천', '횡성', '영월', '평창', '정선', '철원', '화천', '양구', '인제', '고성', '양양'],
  },
  daejeon: {
    main: ['대전', '대전광역시'],
    districts: ['동구', '중구', '서구', '유성', '대덕'],
  },
  sejong: {
    main: ['세종', '세종특별자치시'],
    districts: [],
  },
  chungbuk: {
    main: ['충북', '충청북도'],
    cities: ['청주', '충주', '제천', '보은', '옥천', '영동', '증평', '진천', '괴산', '음성', '단양'],
  },
  chungnam: {
    main: ['충남', '충청남도'],
    cities: ['천안', '아산', '공주', '보령', '서산', '논산', '계룡', '당진', '금산', '부여', '서천', '청양', '홍성', '예산', '태안'],
  },
  jeonbuk: {
    main: ['전북', '전라북도', '전북특별자치도'],
    cities: ['전주', '익산', '군산', '정읍', '남원', '김제', '완주', '진안', '무주', '장수', '임실', '순창', '고창', '부안'],
  },
  jeonnam: {
    main: ['전남', '전라남도'],
    cities: ['목포', '여수', '순천', '나주', '광양', '담양', '곡성', '구례', '고흥', '보성', '화순', '장흥', '강진', '해남', '영암', '무안', '함평', '영광', '장성', '완도', '진도', '신안'],
  },
  gwangju: {
    main: ['광주', '광주광역시'],
    districts: ['동구', '서구', '남구', '북구', '광산'],
  },
  gyeongbuk: {
    main: ['경북', '경상북도'],
    cities: ['포항', '구미', '경주', '안동', '김천', '영주', '영천', '상주', '문경', '경산', '군위', '의성', '청송', '영양', '영덕', '청도', '고령', '성주', '칠곡', '예천', '봉화', '울진', '울릉'],
  },
  gyeongnam: {
    main: ['경남', '경상남도'],
    cities: ['창원', '김해', '진주', '양산', '거제', '통영', '사천', '밀양', '함안', '거창', '창녕', '고성', '하동', '합천', '남해', '함양', '산청', '의령'],
  },
  daegu: {
    main: ['대구', '대구광역시'],
    districts: ['중구', '동구', '서구', '남구', '북구', '수성', '달서', '달성', '군위'],
  },
  busan: {
    main: ['부산', '부산광역시'],
    districts: ['중구', '서구', '동구', '영도', '부산진', '동래', '남구', '북구', '해운대', '사하', '금정', '강서', '연제', '수영', '사상', '기장'],
  },
  ulsan: {
    main: ['울산', '울산광역시'],
    districts: ['중구', '남구', '동구', '북구', '울주'],
  },
  jeju: {
    main: ['제주', '제주특별자치도'],
    cities: ['서귀포'],
  },
}

// 모든 지역 키워드를 플랫하게 추출하는 헬퍼 함수
function getAllKeywordsForRegion(regionData) {
  const keywords = [...regionData.main]
  if (regionData.districts) keywords.push(...regionData.districts)
  if (regionData.cities) keywords.push(...regionData.cities)
  return keywords
}

// ==============================================
// 유사어 매핑 (Synonym Mapping)
// ==============================================
const SYNONYMS = {
  // 기업 형태 관련
  중소기업: ['중소기업', '중소 기업', '중소벤처', 'sme', '중기업', '소기업'],
  스타트업: ['스타트업', 'start-up', 'startup', '창업기업', '창업 기업', '신생기업'],
  벤처: ['벤처', '벤처기업', '벤처 기업', 'venture'],
  소상공인: ['소상공인', '소상 공인', '영세기업', '영세 기업'],
  예비창업: ['예비창업', '예비 창업', '예비창업자', '예비 창업자', '창업예정', '창업 예정'],
  개인사업자: ['개인사업자', '개인 사업자', '1인기업', '1인 기업', '개인기업'],

  // 업력 관련
  초기창업: ['초기창업', '초기 창업', '신규창업', '신규 창업', '창업초기', '창업 초기'],

  // 인증 관련
  벤처기업: ['벤처기업', '벤처 기업', '벤처기업인증', '벤처 인증'],
  이노비즈: ['이노비즈', 'innobiz', 'inno-biz'],
  메인비즈: ['메인비즈', 'mainbiz', 'main-biz'],
  연구소: ['연구소', '기업부설연구소', '기업부설 연구소', '부설연구소', 'r&d센터'],
  특허: ['특허', '지식재산권', '지식재산', '산업재산권', 'ip', 'patent'],

  // 매출 관련
  매출: ['매출', '매출액', '연매출', '연간매출', '매출규모', '연 매출'],

  // 인원 관련
  종업원: ['종업원', '상시근로자', '상시 근로자', '직원', '인원', '고용인원', '근로자'],
}

/**
 * 유사어를 포함하여 텍스트에서 키워드 검색
 * @param {string} text - 검색 대상 텍스트
 * @param {string} keyword - 찾을 키워드
 * @returns {boolean} 매칭 여부
 */
function matchWithSynonyms(text, keyword) {
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()

  // 직접 매칭
  if (lowerText.includes(lowerKeyword)) return true

  // 유사어 매칭
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (key === lowerKeyword || synonyms.some(s => s.toLowerCase() === lowerKeyword)) {
      // 이 키워드의 유사어 그룹을 찾았으면, 모든 유사어로 검색
      if (synonyms.some(s => lowerText.includes(s.toLowerCase()))) {
        return true
      }
    }
  }

  return false
}

/**
 * 유사어 배열로 검색 (여러 키워드 중 하나라도 매칭)
 * @param {string} text - 검색 대상 텍스트
 * @param {string[]} keywords - 찾을 키워드 배열
 * @returns {boolean} 매칭 여부
 */
function matchAnyWithSynonyms(text, keywords) {
  return keywords.some(kw => matchWithSynonyms(text, kw))
}

// ==============================================
// 매출/인원 조건 추출 (Revenue/Employee Extraction)
// ==============================================

/**
 * 텍스트에서 매출 조건 추출
 * @param {string} text - 검색 대상 텍스트
 * @returns {Object|null} { min?: number, max?: number, unit: 'billion' } (억 원 단위)
 */
function extractRevenueCondition(text) {
  if (!text) return null

  const patterns = [
    // "매출 10억 이상", "매출액 50억 미만"
    /매출[액]?\s*(\d+(?:\.\d+)?)\s*억\s*(이상|이하|미만|초과)?/g,
    // "연매출 10억~50억", "매출 10~50억"
    /매출[액]?\s*(\d+(?:\.\d+)?)\s*[~\-]\s*(\d+(?:\.\d+)?)\s*억/g,
    // "매출 10억 원 이상"
    /매출[액]?\s*(\d+(?:\.\d+)?)\s*억\s*원?\s*(이상|이하|미만|초과)?/g,
  ]

  let result = null

  // 범위 패턴 먼저 확인
  const rangeMatch = text.match(/매출[액]?\s*(\d+(?:\.\d+)?)\s*[~\-]\s*(\d+(?:\.\d+)?)\s*억/)
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
      unit: 'billion'
    }
  }

  // 단일 조건 패턴
  const singleMatch = text.match(/매출[액]?\s*(\d+(?:\.\d+)?)\s*억\s*원?\s*(이상|이하|미만|초과)?/)
  if (singleMatch) {
    const value = parseFloat(singleMatch[1])
    const condition = singleMatch[2] || '이상'

    if (condition === '이상' || condition === '초과') {
      result = { min: value, unit: 'billion' }
    } else if (condition === '이하' || condition === '미만') {
      result = { max: value, unit: 'billion' }
    }
  }

  return result
}

/**
 * 텍스트에서 종업원 수 조건 추출
 * @param {string} text - 검색 대상 텍스트
 * @returns {Object|null} { min?: number, max?: number }
 */
function extractEmployeeCondition(text) {
  if (!text) return null

  // 범위 패턴
  const rangeMatch = text.match(/(상시근로자|종업원|직원|인원)\s*(\d+)\s*[~\-]\s*(\d+)\s*[명인]/)
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[2]),
      max: parseInt(rangeMatch[3])
    }
  }

  // 단일 조건 패턴
  const patterns = [
    // "상시근로자 5인 이상", "직원 10명 미만"
    /(상시근로자|종업원|직원|인원|고용인원)\s*(\d+)\s*[명인]\s*(이상|이하|미만|초과)?/,
    // "5인 이상 기업"
    /(\d+)\s*[명인]\s*(이상|이하|미만|초과)\s*(기업|사업장)?/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      // 패턴에 따라 숫자 위치가 다름
      const numIndex = match[1].match(/^\d+$/) ? 1 : 2
      const value = parseInt(match[numIndex])
      const condIndex = numIndex === 1 ? 2 : 3
      const condition = match[condIndex] || '이상'

      if (condition === '이상' || condition === '초과') {
        return { min: value }
      } else if (condition === '이하' || condition === '미만') {
        return { max: value }
      }
    }
  }

  return null
}

/**
 * 프로필 매출 값을 숫자로 변환 (억 원 단위)
 * @param {string} revenueValue - 프로필의 revenue 값
 * @returns {Object} { min: number, max: number }
 */
function parseProfileRevenue(revenueValue) {
  const mapping = {
    none: { min: 0, max: 0 },
    under1: { min: 0, max: 1 },
    '1to10': { min: 1, max: 10 },
    '10to50': { min: 10, max: 50 },
    over50: { min: 50, max: Infinity },
  }
  return mapping[revenueValue] || { min: 0, max: 0 }
}

/**
 * 프로필 종업원 수를 숫자로 변환
 * @param {string} employeeValue - 프로필의 employees 값
 * @returns {Object} { min: number, max: number }
 */
function parseProfileEmployees(employeeValue) {
  const mapping = {
    none: { min: 0, max: 0 },
    '1to5': { min: 1, max: 5 },
    '5to10': { min: 5, max: 10 },
    '10to50': { min: 10, max: 50 },
    over50: { min: 50, max: Infinity },
  }
  return mapping[employeeValue] || { min: 0, max: 0 }
}

/**
 * 프로필이 공고의 매출 조건을 충족하는지 확인
 * @param {Object} profileRevenue - { min, max }
 * @param {Object} announcementCondition - { min?, max? }
 * @returns {boolean}
 */
function meetsRevenueCondition(profileRevenue, announcementCondition) {
  if (!announcementCondition) return true // 조건 없으면 통과

  // 공고가 "매출 X억 이상" 요구 → 프로필 최소 매출이 X 이상이어야 함
  if (announcementCondition.min !== undefined) {
    if (profileRevenue.max < announcementCondition.min) return false
  }

  // 공고가 "매출 X억 이하/미만" 요구 → 프로필 최대 매출이 X 이하여야 함
  if (announcementCondition.max !== undefined) {
    if (profileRevenue.min > announcementCondition.max) return false
  }

  return true
}

/**
 * 프로필이 공고의 종업원 조건을 충족하는지 확인
 * @param {Object} profileEmployees - { min, max }
 * @param {Object} announcementCondition - { min?, max? }
 * @returns {boolean}
 */
function meetsEmployeeCondition(profileEmployees, announcementCondition) {
  if (!announcementCondition) return true

  if (announcementCondition.min !== undefined) {
    if (profileEmployees.max < announcementCondition.min) return false
  }

  if (announcementCondition.max !== undefined) {
    if (profileEmployees.min > announcementCondition.max) return false
  }

  return true
}

// 모든 지역 키워드 (지역 제한 감지용)
const ALL_REGION_KEYWORDS = Object.values(REGION_KEYWORDS).flatMap((regionData) =>
  getAllKeywordsForRegion(regionData)
)

// 지역 코드 -> 한글 이름 매핑
const REGION_NAMES = {
  seoul: '서울',
  gyeonggi: '경기',
  incheon: '인천',
  gangwon: '강원',
  daejeon: '대전',
  sejong: '세종',
  chungbuk: '충북',
  chungnam: '충남',
  jeonbuk: '전북',
  jeonnam: '전남',
  gwangju: '광주',
  gyeongbuk: '경북',
  gyeongnam: '경남',
  daegu: '대구',
  busan: '부산',
  ulsan: '울산',
  jeju: '제주',
}

/**
 * 지역 코드를 한글 이름으로 변환
 * @param {string} regionCode - 지역 코드 (예: 'seoul')
 * @param {string} detectedCity - 감지된 시·군·구명 (선택)
 * @returns {string} 한글 지역명 (예: '서울' 또는 '경기 김포')
 */
export function getRegionName(regionCode, detectedCity) {
  const regionName = REGION_NAMES[regionCode] || regionCode
  if (detectedCity) {
    return `${regionName} ${detectedCity}`
  }
  return regionName
}

/**
 * 공고에서 지역 제한 정보 추출
 * @param {Object} announcement - 공고 객체
 * @returns {Object} { type: 'nationwide' | 'restricted' | 'unknown', region?: string, detectedCity?: string }
 */
export function extractRegionRestriction(announcement) {
  // hashTags 제외 - 모든 지역이 나열되어 있어 신뢰도 낮음
  const text = [
    announcement.title || '',
    announcement.summary || '',
    announcement.organization || '',
    (announcement.eligibility || []).join(' '),
  ]
    .join(' ')
    .toLowerCase()

  // 전국 대상 키워드 확인
  if (
    text.includes('전국') ||
    text.includes('지역무관') ||
    text.includes('지역 무관') ||
    text.includes('전 지역')
  ) {
    return { type: 'nationwide' }
  }

  // 제목에서 [지역명] 패턴 확인 (예: "[강원] 2026년...")
  const titleText = (announcement.title || '').toLowerCase()
  for (const [regionKey, regionData] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of regionData.main) {
      if (titleText.includes(`[${kw}]`)) {
        return {
          type: 'restricted',
          region: regionKey,
          detectedCity: undefined,
        }
      }
    }
  }

  // 1단계: 가장 구체적인 패턴 먼저 확인 (특별자치도/시, ~에 본사 등)
  for (const [regionKey, regionData] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of regionData.main) {
      const specificPatterns = [
        `${kw}특별자치도`, // "전북특별자치도"
        `${kw}특별자치시`, // "세종특별자치시"
        `${kw}특별시`, // "서울특별시"
        `${kw}광역시`, // "부산광역시"
        `${kw}에 본사`, // "전북에 본사"
        `${kw}에 사업장`, // "전북에 사업장"
        `${kw}에 연구소`,
        `${kw}에 공장`,
        `${kw} 소재기업`, // "전북 소재기업"
        `${kw} 소재 기업`,
      ]

      if (specificPatterns.some((pattern) => text.includes(pattern))) {
        return {
          type: 'restricted',
          region: regionKey,
          detectedCity: undefined,
        }
      }
    }
  }

  // 2단계: 일반적인 지역 제한 패턴 확인
  for (const [regionKey, regionData] of Object.entries(REGION_KEYWORDS)) {
    const allKeywords = getAllKeywordsForRegion(regionData)

    for (const kw of allKeywords) {
      // 다양한 지역 제한 패턴 확인 (도내 패턴 제거 - 너무 일반적)
      const patterns = [
        `${kw} 소재`,
        `${kw} 지역`,
        `${kw}시 소재`,
        `${kw}도 소재`,
        `${kw}군 소재`,
        `${kw}구 소재`,
        `${kw} 기업`,
        `${kw} 창업`,
        `${kw} 스타트업`,
        `${kw}지역`,
        `${kw}내 `,
        `${kw} 내 `,
        `${kw}도내`,
        `${kw} 도내`,
        `${kw} 중소기업`,
        `${kw} 소상공인`,
        `${kw} 벤처`,
        `${kw}테크노파크`,
        `${kw}창조경제`,
        `${kw}경제진흥원`,
        `${kw}정보산업진흥원`,
        `${kw}콘텐츠진흥원`,
        `${kw}바이오`, // "전북바이오융합산업진흥원" 등
        `${kw}특별자치도 소재`,
        `${kw}특별자치도 내`,
        `${kw}특별자치시 소재`,
        `${kw}특별자치시 내`,
        `${kw}특별시 소재`,
        `${kw}특별시 내`,
        `${kw}광역시 소재`,
        `${kw}광역시 내`,
      ]

      if (patterns.some((pattern) => text.includes(pattern))) {
        return {
          type: 'restricted',
          region: regionKey,
          detectedCity: !regionData.main.includes(kw) ? kw : undefined,
        }
      }
    }
  }

  // 3단계: 기관명에 지역이 포함된 경우 - 지역 제한 공고로 처리
  // (예: "강원테크노파크", "대구창조경제혁신센터", "김포시청")
  const orgText = (announcement.organization || '').toLowerCase()
  for (const [regionKey, regionData] of Object.entries(REGION_KEYWORDS)) {
    const allKeywords = getAllKeywordsForRegion(regionData)

    for (const kw of allKeywords) {
      if (orgText.includes(kw)) {
        return {
          type: 'restricted',
          region: regionKey,
          detectedCity: !regionData.main.includes(kw) ? kw : undefined,
        }
      }
    }
  }

  return { type: 'unknown' }
}

// ==============================================
// Hard Filter (자격 검증) - 점수 계산 전 필터링
// ==============================================
// 목적: 사용자가 실제로 지원 가능한 공고만 추천 영역에 노출
// 원칙: Hard Filter는 "high confidence 조건"만 제외에 사용
// medium/low는 excludedReasons(로그)만 남기고 isEligible을 false로 만들지 않음

/**
 * Confidence 레벨 정의
 * - high: 확정적 조건 (Hard Filter 제외 트리거 가능)
 * - medium: 가능성 높은 조건 (로그만, 제외 안함)
 * - low: 불확실한 조건 (로그만, 제외 안함)
 */
const CONFIDENCE = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

/**
 * 제외 우선순위 (P0가 가장 높음)
 */
const PRIORITY = {
  P0: 0, // 명시적 제외조건 (exclusionText)
  P1: 1, // 기업형태 불일치
  P2: 2, // 지역 불일치
  P3: 3, // 업력 불일치
  P4: 4, // 인증/필수요건
}

/**
 * 완화/허용 표현 - 이 표현이 있으면 필수 조건이 아닐 가능성 높음
 */
const ALLOW_PHRASES = [
  '지원 가능',
  '지원가능',
  '도 가능',
  '도 지원',
  '포함',
  '해당 가능',
  '우대',
  '가점',
  '참고',
  '권장',
  '선택',
  '해당 시',
  '할 수 있음',
  '있는 경우',
  '경우 가능',
  '도 참여',
  '참여 가능',
]

/**
 * 강한 제외 표현 - 이 표현만 high confidence로 처리
 */
const STRONG_EXCLUSION_PATTERNS = {
  corpOnly: [
    /법인만/,
    /법인에\s*한함?/,
    /법인기업에\s*한함?/,
    /법인\s*한정/,
  ],
  soleExcluded: [
    /개인\s*사업자?\s*(제외|불가|불포함)/,
    /개인사업자는?\s*(제외|불가)/,
  ],
  preliminaryExcluded: [
    /예비\s*창업자?\s*(제외|불가|불포함)/,
    /예비\s*창업\s*(제외|불가)/,
  ],
  preliminaryOnly: [
    /예비\s*창업자?\s*(만|전용|에\s*한함?)(?!.{0,10}(가능|우대|가점|포함))/,
    /예비\s*창업자?\s*한정/,
  ],
  nonprofitExcluded: [
    /비영리\s*(단체)?\s*(제외|불가|불포함)/,
  ],
  midsizeExcluded: [
    /중견\s*기업\s*(제외|불가|불포함)/,
    /대기업\s*(제외|불가|불포함)/,
  ],
}

/**
 * 제외 사유 코드 정의
 */
const EXCLUSION_CODES = {
  // 기업 형태 관련
  COMPANY_TYPE_CORP_ONLY: 'COMPANY_TYPE_CORP_ONLY',
  COMPANY_TYPE_PRELIMINARY_ONLY: 'COMPANY_TYPE_PRELIMINARY_ONLY',
  COMPANY_TYPE_SOLE_EXCLUDED: 'COMPANY_TYPE_SOLE_EXCLUDED',
  COMPANY_TYPE_PRELIMINARY_EXCLUDED: 'COMPANY_TYPE_PRELIMINARY_EXCLUDED',
  COMPANY_TYPE_MIDSIZE_EXCLUDED: 'COMPANY_TYPE_MIDSIZE_EXCLUDED',
  COMPANY_TYPE_NONPROFIT_EXCLUDED: 'COMPANY_TYPE_NONPROFIT_EXCLUDED',
  COMPANY_TYPE_SMALLBIZ_ONLY: 'COMPANY_TYPE_SMALLBIZ_ONLY',

  // 업력 관련
  BUSINESS_AGE_EXCEEDED: 'BUSINESS_AGE_EXCEEDED',
  BUSINESS_AGE_INSUFFICIENT: 'BUSINESS_AGE_INSUFFICIENT',
  BUSINESS_AGE_PRELIMINARY_ONLY: 'BUSINESS_AGE_PRELIMINARY_ONLY',
  BUSINESS_AGE_ESTABLISHED_ONLY: 'BUSINESS_AGE_ESTABLISHED_ONLY',

  // 지역 관련
  REGION_MISMATCH: 'REGION_MISMATCH',

  // 매출/인원 관련
  REVENUE_MIN_NOT_MET: 'REVENUE_MIN_NOT_MET',
  REVENUE_MAX_EXCEEDED: 'REVENUE_MAX_EXCEEDED',
  EMPLOYEE_MIN_NOT_MET: 'EMPLOYEE_MIN_NOT_MET',
  EMPLOYEE_MAX_EXCEEDED: 'EMPLOYEE_MAX_EXCEEDED',

  // 인증/필수요건 관련
  CERTIFICATION_VENTURE_REQUIRED: 'CERTIFICATION_VENTURE_REQUIRED',
  CERTIFICATION_INNOBIZ_REQUIRED: 'CERTIFICATION_INNOBIZ_REQUIRED',
  CERTIFICATION_MAINBIZ_REQUIRED: 'CERTIFICATION_MAINBIZ_REQUIRED',
  CERTIFICATION_RESEARCH_REQUIRED: 'CERTIFICATION_RESEARCH_REQUIRED',
  CERTIFICATION_PATENT_REQUIRED: 'CERTIFICATION_PATENT_REQUIRED',

  // 명시적 제외 조건
  EXPLICIT_EXCLUSION: 'EXPLICIT_EXCLUSION',
}

/**
 * 텍스트에 allowPhrase가 포함되어 있는지 확인
 * @param {string} text - 검사할 텍스트
 * @returns {boolean}
 */
function hasAllowPhrase(text) {
  const lowerText = text.toLowerCase()
  return ALLOW_PHRASES.some(phrase => lowerText.includes(phrase.toLowerCase()))
}

/**
 * 패턴 주변 컨텍스트(±40자)에 allowPhrase가 있는지 확인
 * @param {string} text - 전체 텍스트
 * @param {RegExp} pattern - 찾을 패턴
 * @param {number} contextSize - 컨텍스트 크기 (기본 40자)
 * @returns {boolean}
 */
function hasAllowPhraseNearPattern(text, pattern, contextSize = 40) {
  const match = text.match(pattern)
  if (!match) return false

  const matchIndex = match.index
  const start = Math.max(0, matchIndex - contextSize)
  const end = Math.min(text.length, matchIndex + match[0].length + contextSize)
  const context = text.slice(start, end)

  return hasAllowPhrase(context)
}

/**
 * source별 기본 confidence 결정
 * @param {string} source - 공고 소스 (mss_api, bizinfo, kstartup 등)
 * @param {string} ruleType - 규칙 타입 (companyType, age, region, exclusion, mandatory)
 * @returns {string} confidence level
 */
function getBaseConfidenceBySource(source, ruleType) {
  // mss_api는 parsed 필드가 풍부하므로 기본 high
  if (source === 'mss_api') {
    return CONFIDENCE.HIGH
  }

  // bizinfo/kstartup은 규칙 타입에 따라 다름
  if (source === 'bizinfo' || source === 'kstartup') {
    // 업력 조건은 title/summary만으로 판단하면 오탐 많음 → 기본 low
    if (ruleType === 'age') {
      return CONFIDENCE.LOW
    }
    // 기업형태 중 강한 제외 표현은 medium (추가 검증 필요)
    if (ruleType === 'companyType') {
      return CONFIDENCE.MEDIUM
    }
  }

  return CONFIDENCE.MEDIUM
}

/**
 * 기업 형태 라벨 매핑
 */
const COMPANY_TYPE_LABELS = {
  preliminary: '예비창업자',
  sole: '개인사업자',
  sme: '법인(중소기업)',
  midsize: '법인(중견기업)',
  nonprofit: '비영리단체',
}

// ==============================================
// buildHardRequirements: 공고에서 자격 요건 추출 (confidence 포함)
// ==============================================

/**
 * 공고에서 Hard Filter 요건을 추출 (confidence 포함)
 * @param {Object} announcement - 공고 객체
 * @returns {Object} { companyType, age, region, exclusions, mandatory }
 */
export function buildHardRequirements(announcement) {
  if (!announcement) {
    return {
      companyType: { required: [], excluded: [], confidence: CONFIDENCE.LOW },
      age: { confidence: CONFIDENCE.LOW },
      region: { type: 'unknown', confidence: CONFIDENCE.LOW },
      exclusions: { matches: [], confidence: CONFIDENCE.LOW },
      mandatory: { matches: [], confidence: CONFIDENCE.LOW },
    }
  }

  const source = announcement.source || 'unknown'

  // 텍스트 소스 분리 (confidence 판단용)
  const titleSummary = [
    announcement.title || '',
    announcement.summary || '',
  ].join(' ').toLowerCase()

  const parsedText = [
    announcement.parsed?.eligibilityText || '',
    announcement.parsed?.exclusionText || '',
    announcement.parsed?.mandatoryText || '',
  ].join(' ').toLowerCase()

  const fullText = [
    titleSummary,
    ...(announcement.eligibility || []),
    ...(announcement.category || []),
    ...(announcement.tags || []),
    parsedText,
  ].join(' ').toLowerCase()

  const hasParsedData = parsedText.length > 10

  // 1. 기업형태 요건 추출
  const companyTypeReq = extractCompanyTypeRequirementsWithConfidence(
    fullText,
    titleSummary,
    parsedText,
    source,
    hasParsedData
  )

  // 2. 업력 요건 추출
  const ageReq = extractBusinessAgeRequirementsWithConfidence(
    fullText,
    titleSummary,
    parsedText,
    source,
    hasParsedData
  )

  // 3. 지역 요건 추출
  const regionReq = extractRegionRequirementsWithConfidence(announcement, source)

  // 4. 명시적 제외조건 추출
  const exclusionsReq = extractExclusionsWithConfidence(
    announcement.parsed?.exclusionText || '',
    source
  )

  // 5. 필수요건 추출
  const mandatoryReq = extractMandatoryWithConfidence(
    announcement.parsed?.mandatoryText || '',
    announcement.parsed?.exclusionText || '',
    source
  )

  return {
    companyType: companyTypeReq,
    age: ageReq,
    region: regionReq,
    exclusions: exclusionsReq,
    mandatory: mandatoryReq,
    _source: source,
    _hasParsedData: hasParsedData,
  }
}

/**
 * 기업형태 요건 추출 (confidence 포함)
 */
function extractCompanyTypeRequirementsWithConfidence(fullText, titleSummary, parsedText, source, hasParsedData) {
  const result = {
    required: [],
    excluded: [],
    confidence: CONFIDENCE.LOW,
    details: [],
  }

  // 강한 제외 표현 체크 (high confidence 후보)
  const checkStrongPattern = (patterns, type, code, message) => {
    for (const pattern of patterns) {
      if (pattern.test(fullText)) {
        // 주변에 allowPhrase가 있으면 confidence 낮춤
        const hasAllow = hasAllowPhraseNearPattern(fullText, pattern)

        // 판단: parsed 텍스트에 있으면 high, title/summary만이면 medium
        let confidence = CONFIDENCE.MEDIUM
        if (hasParsedData && pattern.test(parsedText) && !hasAllow) {
          confidence = CONFIDENCE.HIGH
        } else if (source === 'mss_api' && !hasAllow) {
          confidence = CONFIDENCE.HIGH
        } else if (hasAllow) {
          confidence = CONFIDENCE.LOW
        }

        // 강한 제외 표현(제외/불가)은 source 무관하게 high 가능
        if (/제외|불가|불포함/.test(pattern.source) && !hasAllow) {
          confidence = CONFIDENCE.HIGH
        }

        result.details.push({ type, code, message, confidence, hasAllow })

        // 가장 높은 confidence 유지
        if (confidence === CONFIDENCE.HIGH) {
          result.confidence = CONFIDENCE.HIGH
        } else if (confidence === CONFIDENCE.MEDIUM && result.confidence !== CONFIDENCE.HIGH) {
          result.confidence = CONFIDENCE.MEDIUM
        }

        return { matched: true, confidence }
      }
    }
    return { matched: false }
  }

  // 법인만 가능
  const corpCheck = checkStrongPattern(
    STRONG_EXCLUSION_PATTERNS.corpOnly,
    'corpOnly',
    EXCLUSION_CODES.COMPANY_TYPE_CORP_ONLY,
    '법인기업에 한함'
  )
  if (corpCheck.matched) {
    result.required.push('corporation')
    if (corpCheck.confidence === CONFIDENCE.HIGH) {
      result.excluded.push('preliminary', 'sole')
    }
  }

  // 개인사업자 제외
  const soleCheck = checkStrongPattern(
    STRONG_EXCLUSION_PATTERNS.soleExcluded,
    'soleExcluded',
    EXCLUSION_CODES.COMPANY_TYPE_SOLE_EXCLUDED,
    '개인사업자 제외'
  )
  if (soleCheck.matched && soleCheck.confidence === CONFIDENCE.HIGH) {
    result.excluded.push('sole')
  }

  // 예비창업자 제외
  const prelimExcCheck = checkStrongPattern(
    STRONG_EXCLUSION_PATTERNS.preliminaryExcluded,
    'preliminaryExcluded',
    EXCLUSION_CODES.COMPANY_TYPE_PRELIMINARY_EXCLUDED,
    '예비창업자 제외'
  )
  if (prelimExcCheck.matched && prelimExcCheck.confidence === CONFIDENCE.HIGH) {
    result.excluded.push('preliminary')
  }

  // 예비창업자 전용
  const prelimOnlyCheck = checkStrongPattern(
    STRONG_EXCLUSION_PATTERNS.preliminaryOnly,
    'preliminaryOnly',
    EXCLUSION_CODES.COMPANY_TYPE_PRELIMINARY_ONLY,
    '예비창업자 전용'
  )
  if (prelimOnlyCheck.matched) {
    result.required.push('preliminary')
  }

  // 비영리 제외
  const nonprofitCheck = checkStrongPattern(
    STRONG_EXCLUSION_PATTERNS.nonprofitExcluded,
    'nonprofitExcluded',
    EXCLUSION_CODES.COMPANY_TYPE_NONPROFIT_EXCLUDED,
    '비영리단체 제외'
  )
  if (nonprofitCheck.matched && nonprofitCheck.confidence === CONFIDENCE.HIGH) {
    result.excluded.push('nonprofit')
  }

  // 중견기업 제외
  const midsizeCheck = checkStrongPattern(
    STRONG_EXCLUSION_PATTERNS.midsizeExcluded,
    'midsizeExcluded',
    EXCLUSION_CODES.COMPANY_TYPE_MIDSIZE_EXCLUDED,
    '중견기업/대기업 제외'
  )
  if (midsizeCheck.matched && midsizeCheck.confidence === CONFIDENCE.HIGH) {
    result.excluded.push('midsize')
  }

  // 소상공인 전용 - 항상 LOW (확정 불가)
  const smallbizPatterns = [
    /소상공인\s*(만|전용|에\s*한|한정|대상)/,
    /소상공인에\s*한함?/,
  ]
  if (smallbizPatterns.some(p => p.test(fullText))) {
    result.details.push({
      type: 'smallbizOnly',
      code: EXCLUSION_CODES.COMPANY_TYPE_SMALLBIZ_ONLY,
      message: '소상공인 대상 (확정 불가 - 상시근로자 수 필요)',
      confidence: CONFIDENCE.LOW, // 항상 LOW - 소상공인 판정은 상시근로자 수 필요
    })
    // result.required.push('smallbusiness') -- 추가하지 않음
  }

  result.excluded = [...new Set(result.excluded)]
  result.required = [...new Set(result.required)]

  return result
}

/**
 * 업력 요건 추출 (confidence 포함)
 */
function extractBusinessAgeRequirementsWithConfidence(fullText, titleSummary, parsedText, source, hasParsedData) {
  const result = {
    maxYears: undefined,
    minYears: undefined,
    preliminaryOnly: false,
    establishedOnly: false,
    allowPreliminary: false,
    confidence: CONFIDENCE.LOW,
    details: [],
  }

  // 패턴 매칭
  const withinPatterns = [
    { pattern: /창업\s*(\d+)\s*년\s*(이내|미만|이하)/, type: 'maxYears' },
    { pattern: /업력\s*(\d+)\s*년\s*(이내|미만|이하)/, type: 'maxYears' },
    { pattern: /(\d+)\s*년\s*(이내|미만)\s*(창업|기업)/, type: 'maxYears' },
    { pattern: /설립\s*(\d+)\s*년\s*(이내|미만)/, type: 'maxYears' },
  ]

  const overPatterns = [
    { pattern: /(\d+)\s*년\s*이상\s*(기업|업력|창업|된)/, type: 'minYears' },
    { pattern: /업력\s*(\d+)\s*년\s*이상/, type: 'minYears' },
    { pattern: /창업\s*(\d+)\s*년\s*이상/, type: 'minYears' },
  ]

  // maxYears 체크
  for (const { pattern, type } of withinPatterns) {
    const match = fullText.match(pattern)
    if (match) {
      const years = parseInt(match[1])
      const hasAllow = hasAllowPhraseNearPattern(fullText, pattern)

      // bizinfo/kstartup에서 업력 조건은 기본 LOW
      let confidence = CONFIDENCE.LOW
      if (source === 'mss_api' && hasParsedData && pattern.test(parsedText) && !hasAllow) {
        confidence = CONFIDENCE.HIGH
      } else if (hasAllow) {
        confidence = CONFIDENCE.LOW
      } else if (hasParsedData && pattern.test(parsedText)) {
        confidence = CONFIDENCE.MEDIUM
      }

      result.maxYears = years
      result.details.push({
        type,
        value: years,
        confidence,
        hasAllow,
        message: `창업 ${years}년 이내`,
      })

      if (confidence === CONFIDENCE.HIGH) {
        result.confidence = CONFIDENCE.HIGH
      } else if (confidence === CONFIDENCE.MEDIUM && result.confidence !== CONFIDENCE.HIGH) {
        result.confidence = CONFIDENCE.MEDIUM
      }
      break
    }
  }

  // minYears 체크
  for (const { pattern, type } of overPatterns) {
    const match = fullText.match(pattern)
    if (match) {
      const years = parseInt(match[1])
      const hasAllow = hasAllowPhraseNearPattern(fullText, pattern)

      let confidence = CONFIDENCE.LOW
      if (source === 'mss_api' && hasParsedData && pattern.test(parsedText) && !hasAllow) {
        confidence = CONFIDENCE.HIGH
      } else if (hasAllow) {
        confidence = CONFIDENCE.LOW
      }

      result.minYears = years
      result.details.push({
        type,
        value: years,
        confidence,
        hasAllow,
        message: `창업 ${years}년 이상`,
      })
      break
    }
  }

  // 예비창업자 전용
  const prelimOnlyPatterns = [
    /예비\s*창업자?\s*(만|전용|에\s*한함?|한정)/,
    /예비\s*창업\s*(만|전용)/,
  ]
  for (const pattern of prelimOnlyPatterns) {
    if (pattern.test(fullText)) {
      const hasAllow = hasAllowPhraseNearPattern(fullText, pattern)
      let confidence = hasAllow ? CONFIDENCE.LOW : CONFIDENCE.HIGH

      // 강한 표현은 source 무관 high
      if (/전용|한정|에\s*한함/.test(fullText.match(pattern)?.[0] || '') && !hasAllow) {
        confidence = CONFIDENCE.HIGH
      }

      result.preliminaryOnly = true
      result.maxYears = 0
      result.details.push({
        type: 'preliminaryOnly',
        confidence,
        hasAllow,
        message: '예비창업자 전용',
      })

      if (confidence === CONFIDENCE.HIGH) {
        result.confidence = CONFIDENCE.HIGH
      }
      break
    }
  }

  // 기창업자만 (사업자등록 필수)
  const establishedPatterns = [
    /기\s*창업자?\s*(만|대상|에\s*한)/,
    /사업자\s*등록\s*(필수|완료)/,
    /사업자등록증\s*(필수|보유\s*필수)/,
  ]
  for (const pattern of establishedPatterns) {
    if (pattern.test(fullText)) {
      const hasAllow = hasAllowPhraseNearPattern(fullText, pattern)
      let confidence = CONFIDENCE.MEDIUM

      if (source === 'mss_api' && hasParsedData && !hasAllow) {
        confidence = CONFIDENCE.HIGH
      }
      if (/필수/.test(pattern.source) && !hasAllow) {
        confidence = CONFIDENCE.HIGH
      }

      result.establishedOnly = true
      result.details.push({
        type: 'establishedOnly',
        confidence,
        hasAllow,
        message: '기창업자 대상 (사업자등록 필수)',
      })

      if (confidence === CONFIDENCE.HIGH) {
        result.confidence = CONFIDENCE.HIGH
      }
      break
    }
  }

  return result
}

/**
 * 지역 요건 추출 (confidence 포함)
 */
function extractRegionRequirementsWithConfidence(announcement, source) {
  const regionRestriction = extractRegionRestriction(announcement)

  let confidence = CONFIDENCE.LOW

  if (regionRestriction.type === 'restricted') {
    // 지역 제한이 명확하면 high
    // "OO시 소재 기업", "OO 지역 기업" 등은 비교적 확실한 표현
    confidence = CONFIDENCE.HIGH
  } else if (regionRestriction.type === 'nationwide') {
    confidence = CONFIDENCE.HIGH
  }

  return {
    ...regionRestriction,
    confidence,
  }
}

/**
 * 명시적 제외조건 추출 (confidence 포함)
 */
function extractExclusionsWithConfidence(exclusionText, source) {
  const result = {
    matches: [],
    confidence: CONFIDENCE.LOW,
  }

  if (!exclusionText) return result

  const lowerText = exclusionText.toLowerCase()

  // 명시적 exclusionText가 있으면 기본 HIGH (MSS API의 parsed 데이터)
  if (source === 'mss_api' && exclusionText.length > 5) {
    result.confidence = CONFIDENCE.HIGH
  }

  // 제외 패턴들
  const exclusionPatterns = [
    { pattern: /개인\s*사업자?\s*(제외|불가|불포함)/, type: 'sole', message: '개인사업자 제외' },
    { pattern: /비영리\s*(단체)?\s*(제외|불가|불포함)/, type: 'nonprofit', message: '비영리단체 제외' },
    { pattern: /중견\s*기업\s*(제외|불가|불포함)/, type: 'midsize', message: '중견기업 제외' },
    { pattern: /대기업\s*(제외|불가|불포함)/, type: 'midsize', message: '대기업 제외' },
    { pattern: /예비\s*창업자?\s*(제외|불가|불포함)/, type: 'preliminary', message: '예비창업자 제외' },
  ]

  for (const { pattern, type, message } of exclusionPatterns) {
    if (pattern.test(lowerText)) {
      result.matches.push({
        type,
        message,
        confidence: result.confidence,
      })
    }
  }

  return result
}

/**
 * 필수요건 추출 (confidence 포함)
 */
function extractMandatoryWithConfidence(mandatoryText, exclusionText, source) {
  const result = {
    matches: [],
    confidence: CONFIDENCE.LOW,
  }

  const combinedText = [mandatoryText || '', exclusionText || ''].join(' ').toLowerCase()

  if (!combinedText) return result

  // MSS API parsed 데이터는 high confidence
  if (source === 'mss_api' && combinedText.length > 5) {
    result.confidence = CONFIDENCE.HIGH
  }

  const mandatoryPatterns = [
    { pattern: /벤처\s*(기업)?\s*(인증)?\s*필수/, type: 'venture', message: '벤처기업 인증 필수' },
    { pattern: /이노비즈\s*(인증)?\s*필수/, type: 'innobiz', message: '이노비즈 인증 필수' },
    { pattern: /메인비즈\s*(인증)?\s*필수/, type: 'mainbiz', message: '메인비즈 인증 필수' },
    { pattern: /기업\s*부설\s*연구소\s*(보유)?\s*필수/, type: 'research', message: '기업부설연구소 필수' },
    { pattern: /특허\s*(보유)?\s*필수/, type: 'patent', message: '특허 보유 필수' },
  ]

  for (const { pattern, type, message } of mandatoryPatterns) {
    if (pattern.test(combinedText)) {
      result.matches.push({
        type,
        message,
        confidence: result.confidence,
      })
    }
  }

  return result
}

// ==============================================
// evaluateEligibility: 프로필과 요건 비교 (confidence 기반 판정)
// ==============================================

/**
 * 프로필과 요건을 비교하여 자격 판정
 * @param {Object} profile - 사용자 프로필
 * @param {Object} requirements - buildHardRequirements 결과
 * @returns {Object} { isEligible, excludedReason, excludedReasons }
 */
export function evaluateEligibility(profile, requirements) {
  const excludedReasons = [] // 모든 제외 사유 (로그용)

  if (!profile || !requirements) {
    return {
      isEligible: false,
      excludedReason: { code: 'NO_DATA', message: '프로필 또는 요건 정보 없음' },
      excludedReasons: [{ code: 'NO_DATA', message: '프로필 또는 요건 정보 없음', priority: PRIORITY.P0, confidence: CONFIDENCE.HIGH }],
    }
  }

  // 1️⃣ 명시적 제외조건 (P0 - 최우선)
  if (requirements.exclusions?.confidence === CONFIDENCE.HIGH) {
    for (const match of requirements.exclusions.matches || []) {
      if (match.type === 'sole' && profile.companyType === 'sole') {
        excludedReasons.push({
          code: EXCLUSION_CODES.COMPANY_TYPE_SOLE_EXCLUDED,
          message: match.message,
          priority: PRIORITY.P0,
          confidence: match.confidence,
        })
      }
      if (match.type === 'nonprofit' && profile.companyType === 'nonprofit') {
        excludedReasons.push({
          code: EXCLUSION_CODES.COMPANY_TYPE_NONPROFIT_EXCLUDED,
          message: match.message,
          priority: PRIORITY.P0,
          confidence: match.confidence,
        })
      }
      if (match.type === 'midsize' && profile.companyType === 'midsize') {
        excludedReasons.push({
          code: EXCLUSION_CODES.COMPANY_TYPE_MIDSIZE_EXCLUDED,
          message: match.message,
          priority: PRIORITY.P0,
          confidence: match.confidence,
        })
      }
      if (match.type === 'preliminary' && profile.companyType === 'preliminary') {
        excludedReasons.push({
          code: EXCLUSION_CODES.COMPANY_TYPE_PRELIMINARY_EXCLUDED,
          message: match.message,
          priority: PRIORITY.P0,
          confidence: match.confidence,
        })
      }
    }
  }

  // 2️⃣ 기업형태 (P1)
  if (profile.companyType && requirements.companyType) {
    const compReq = requirements.companyType

    // HIGH confidence 제외 조건만 적용
    if (compReq.confidence === CONFIDENCE.HIGH) {
      // 제외 목록에 포함
      if (compReq.excluded.includes(profile.companyType)) {
        excludedReasons.push({
          code: `COMPANY_TYPE_${profile.companyType.toUpperCase()}_EXCLUDED`,
          message: `${COMPANY_TYPE_LABELS[profile.companyType]}는 지원 대상에서 제외`,
          priority: PRIORITY.P1,
          confidence: CONFIDENCE.HIGH,
        })
      }

      // 법인만 가능
      if (compReq.required.includes('corporation')) {
        if (profile.companyType === 'preliminary' || profile.companyType === 'sole') {
          excludedReasons.push({
            code: EXCLUSION_CODES.COMPANY_TYPE_CORP_ONLY,
            message: '법인기업에 한함 (개인사업자/예비창업자 불가)',
            priority: PRIORITY.P1,
            confidence: CONFIDENCE.HIGH,
          })
        }
      }

      // 예비창업자 전용
      if (compReq.required.includes('preliminary')) {
        if (profile.companyType !== 'preliminary') {
          excludedReasons.push({
            code: EXCLUSION_CODES.COMPANY_TYPE_PRELIMINARY_ONLY,
            message: '예비창업자 대상 공고 (기창업 기업 불가)',
            priority: PRIORITY.P1,
            confidence: CONFIDENCE.HIGH,
          })
        }
      }
    }

    // 소상공인 전용은 항상 로그만 (confidence LOW 고정)
    const smallbizDetail = compReq.details?.find(d => d.type === 'smallbizOnly')
    if (smallbizDetail) {
      excludedReasons.push({
        code: EXCLUSION_CODES.COMPANY_TYPE_SMALLBIZ_ONLY,
        message: smallbizDetail.message,
        priority: PRIORITY.P1,
        confidence: CONFIDENCE.LOW, // 절대 제외 트리거 안함
      })
    }
  }

  // 3️⃣ 지역 (P2)
  if (profile.region && requirements.region) {
    const regionReq = requirements.region

    if (regionReq.type === 'restricted' && regionReq.confidence === CONFIDENCE.HIGH) {
      if (profile.region !== regionReq.region) {
        const regionName = getRegionName(regionReq.region, regionReq.detectedCity)
        excludedReasons.push({
          code: EXCLUSION_CODES.REGION_MISMATCH,
          message: `${regionName} 소재 기업만 지원 가능`,
          priority: PRIORITY.P2,
          confidence: CONFIDENCE.HIGH,
        })
      }
    }
  }

  // 4️⃣ 업력 (P3)
  if (profile.businessAge && requirements.age) {
    const ageReq = requirements.age
    const profileYears = parseBusinessAgeYears(profile.businessAge)

    // HIGH confidence인 경우에만 제외 트리거
    if (ageReq.confidence === CONFIDENCE.HIGH) {
      // 예비창업자 전용
      if (ageReq.preliminaryOnly && !profileYears.isPreliminary) {
        excludedReasons.push({
          code: EXCLUSION_CODES.BUSINESS_AGE_PRELIMINARY_ONLY,
          message: '예비창업자 전용 공고 (기창업 기업 불가)',
          priority: PRIORITY.P3,
          confidence: CONFIDENCE.HIGH,
        })
      }

      // 기창업자만
      if (ageReq.establishedOnly && profileYears.isPreliminary) {
        excludedReasons.push({
          code: EXCLUSION_CODES.BUSINESS_AGE_ESTABLISHED_ONLY,
          message: '기창업 기업 대상 공고 (사업자등록 필수)',
          priority: PRIORITY.P3,
          confidence: CONFIDENCE.HIGH,
        })
      }

      // 업력 초과
      if (ageReq.maxYears !== undefined && ageReq.maxYears > 0) {
        if (profileYears.min > ageReq.maxYears) {
          excludedReasons.push({
            code: EXCLUSION_CODES.BUSINESS_AGE_EXCEEDED,
            message: `업력 ${ageReq.maxYears}년 이내 기업만 지원 가능`,
            priority: PRIORITY.P3,
            confidence: CONFIDENCE.HIGH,
          })
        }
      }

      // 업력 부족
      if (ageReq.minYears !== undefined) {
        if (profileYears.max < ageReq.minYears) {
          excludedReasons.push({
            code: EXCLUSION_CODES.BUSINESS_AGE_INSUFFICIENT,
            message: `업력 ${ageReq.minYears}년 이상 기업만 지원 가능`,
            priority: PRIORITY.P3,
            confidence: CONFIDENCE.HIGH,
          })
        }
      }
    } else {
      // LOW/MEDIUM은 로그만
      if (ageReq.maxYears !== undefined && profileYears.min > ageReq.maxYears) {
        excludedReasons.push({
          code: EXCLUSION_CODES.BUSINESS_AGE_EXCEEDED,
          message: `업력 ${ageReq.maxYears}년 이내 조건 (미확정)`,
          priority: PRIORITY.P3,
          confidence: ageReq.confidence,
        })
      }
    }
  }

  // 5️⃣ 필수요건/인증 (P4)
  if (requirements.mandatory?.confidence === CONFIDENCE.HIGH) {
    const certifications = profile.certifications || []

    for (const match of requirements.mandatory.matches || []) {
      if (match.type === 'venture' && !certifications.includes('venture')) {
        excludedReasons.push({
          code: EXCLUSION_CODES.CERTIFICATION_VENTURE_REQUIRED,
          message: match.message,
          priority: PRIORITY.P4,
          confidence: match.confidence,
        })
      }
      if (match.type === 'innobiz' && !certifications.includes('innobiz')) {
        excludedReasons.push({
          code: EXCLUSION_CODES.CERTIFICATION_INNOBIZ_REQUIRED,
          message: match.message,
          priority: PRIORITY.P4,
          confidence: match.confidence,
        })
      }
      if (match.type === 'mainbiz' && !certifications.includes('mainbiz')) {
        excludedReasons.push({
          code: EXCLUSION_CODES.CERTIFICATION_MAINBIZ_REQUIRED,
          message: match.message,
          priority: PRIORITY.P4,
          confidence: match.confidence,
        })
      }
      if (match.type === 'research' && !certifications.includes('research')) {
        excludedReasons.push({
          code: EXCLUSION_CODES.CERTIFICATION_RESEARCH_REQUIRED,
          message: match.message,
          priority: PRIORITY.P4,
          confidence: match.confidence,
        })
      }
      if (match.type === 'patent' && !certifications.includes('patent')) {
        excludedReasons.push({
          code: EXCLUSION_CODES.CERTIFICATION_PATENT_REQUIRED,
          message: match.message,
          priority: PRIORITY.P4,
          confidence: match.confidence,
        })
      }
    }
  }

  // HIGH confidence 제외 사유만 필터링
  const highConfidenceReasons = excludedReasons.filter(r => r.confidence === CONFIDENCE.HIGH)

  // 우선순위 정렬 후 대표 1개 선택
  highConfidenceReasons.sort((a, b) => a.priority - b.priority)

  const isEligible = highConfidenceReasons.length === 0
  const excludedReason = highConfidenceReasons[0]
    ? { code: highConfidenceReasons[0].code, message: highConfidenceReasons[0].message }
    : null

  return {
    isEligible,
    excludedReason,
    excludedReasons, // 디버깅용 전체 로그
  }
}

/**
 * 공고의 기업형태 요구사항 추출 (기존 호환용 - 내부에서만 사용)
 * @param {string} text - 공고 전체 텍스트
 * @returns {Object} { required: string[], excluded: string[] }
 */
function extractCompanyTypeRequirements(text) {
  const required = []
  const excluded = []

  // ===== 법인만 가능 패턴 =====
  const corpOnlyPatterns = [
    /법인(만|에\s*한함?|기업에\s*한함?|한정|기업만|사업자만)/,
    /법인\s*(사업자)?\s*(대상|한정)/,
    /\(주\)\s*기업만/,
    /주식회사\s*(만|에\s*한)/,
  ]
  if (corpOnlyPatterns.some((p) => p.test(text))) {
    required.push('corporation')
    excluded.push('preliminary', 'sole')
  }

  // ===== 개인사업자 제외 패턴 =====
  const soleExcludedPatterns = [
    /개인\s*사업자?\s*(불가|제외|불포함|대상\s*아님)/,
    /개인\s*(제외|불가)/,
    /개인사업자는?\s*(제외|불가|해당\s*없)/,
  ]
  if (soleExcludedPatterns.some((p) => p.test(text))) {
    excluded.push('sole')
  }

  // ===== 예비창업자 제외 패턴 (기창업자만) =====
  const preliminaryExcludedPatterns = [
    /예비\s*창업자?\s*(불가|제외|불포함|대상\s*아님)/,
    /예비\s*창업\s*(제외|불가)/,
    /기\s*창업자?\s*(만|에\s*한|대상)/,
    /기\s*창업\s*기업/,
    /창업\s*기업만/,
    /기존\s*사업자/,
    /사업자\s*등록\s*(필수|완료|증\s*보유)/,
    /사업자등록증\s*(필수|보유)/,
  ]
  if (preliminaryExcludedPatterns.some((p) => p.test(text))) {
    excluded.push('preliminary')
  }

  // ===== 예비창업자 전용 패턴 =====
  const preliminaryOnlyPatterns = [
    /예비\s*창업자?\s*(만|전용|에\s*한|한정|대상)/,
    /예비\s*창업\s*(만|전용|대상)/,
    /예비\s*창업(자|팀)?\s*(한정|대상|만)/,
    /미\s*창업자/,
  ]
  if (preliminaryOnlyPatterns.some((p) => p.test(text))) {
    required.push('preliminary')
  }

  // ===== 중소기업만 (중견기업/대기업 제외) =====
  const smeOnlyPatterns = [
    /중소기업\s*(만|에\s*한|한정)/,
    /중견\s*기업\s*(제외|불가|불포함)/,
    /대기업\s*(제외|불가|불포함)/,
    /중소기업에\s*한함?/,
  ]
  if (smeOnlyPatterns.some((p) => p.test(text))) {
    excluded.push('midsize')
  }

  // ===== 비영리 제외 =====
  const nonprofitExcludedPatterns = [
    /비영리\s*(단체)?\s*(제외|불가|불포함)/,
    /영리\s*법인\s*(만|에\s*한)/,
  ]
  if (nonprofitExcludedPatterns.some((p) => p.test(text))) {
    excluded.push('nonprofit')
  }

  // ===== 소상공인 전용 =====
  const smallbizOnlyPatterns = [
    /소상공인\s*(만|전용|에\s*한|한정|대상)/,
    /소상공인에\s*한함?/,
  ]
  if (smallbizOnlyPatterns.some((p) => p.test(text))) {
    required.push('smallbusiness')
  }

  return { required: [...new Set(required)], excluded: [...new Set(excluded)] }
}

/**
 * 공고의 업력(사업단계) 요구사항 추출 (강화된 패턴 매칭)
 * @param {string} text - 공고 전체 텍스트
 * @returns {Object} { minYears?: number, maxYears?: number, stage?: string, preliminaryOnly?: boolean, establishedOnly?: boolean }
 */
function extractBusinessAgeRequirements(text) {
  const requirements = {}

  // ===== "창업 N년 이내/미만" 패턴 =====
  const withinPatterns = [
    /창업\s*(\d+)\s*년\s*(이내|미만|이하)/,
    /업력\s*(\d+)\s*년\s*(이내|미만|이하)/,
    /(\d+)\s*년\s*(이내|미만)\s*(창업|기업)/,
    /설립\s*(\d+)\s*년\s*(이내|미만)/,
  ]
  for (const pattern of withinPatterns) {
    const match = text.match(pattern)
    if (match) {
      requirements.maxYears = parseInt(match[1])
      break
    }
  }

  // ===== "N년 이상" 패턴 =====
  const overPatterns = [
    /(\d+)\s*년\s*이상\s*(기업|업력|창업|된)/,
    /업력\s*(\d+)\s*년\s*이상/,
    /창업\s*(\d+)\s*년\s*이상/,
    /설립\s*(\d+)\s*년\s*이상/,
  ]
  for (const pattern of overPatterns) {
    const match = text.match(pattern)
    if (match) {
      requirements.minYears = parseInt(match[1])
      break
    }
  }

  // ===== "예비창업자 또는 1년 미만" 특수 패턴 =====
  if (/예비\s*창업자?\s*(또는|및|,|·)\s*1\s*년\s*(미만|이내)/.test(text)) {
    requirements.maxYears = 1
    requirements.allowPreliminary = true
  }

  // ===== 초기창업 패턴 (3년 이내) =====
  const earlyStagePatterns = [
    /초기\s*창업/,
    /신규\s*창업/,
    /창업\s*초기/,
  ]
  if (earlyStagePatterns.some((p) => p.test(text))) {
    requirements.maxYears = requirements.maxYears || 3
    requirements.stage = 'early'
  }

  // ===== 예비창업 전용 =====
  const preliminaryOnlyPatterns = [
    /예비\s*창업자?\s*(만|전용|에\s*한|한정|대상)/,
    /예비\s*창업\s*(만|전용|대상)/,
    /미\s*창업자/,
  ]
  if (preliminaryOnlyPatterns.some((p) => p.test(text))) {
    requirements.stage = 'preliminary'
    requirements.maxYears = 0
    requirements.preliminaryOnly = true
  }

  // ===== 성장단계/도약단계 (3-7년) =====
  const growthStagePatterns = [
    /성장\s*단계/,
    /도약\s*단계/,
    /스케일\s*업/,
    /scale\s*up/i,
  ]
  if (growthStagePatterns.some((p) => p.test(text))) {
    requirements.minYears = requirements.minYears || 3
    requirements.stage = 'growth'
  }

  // ===== 기창업자만 (예비창업 제외) =====
  const establishedOnlyPatterns = [
    /기\s*창업자?\s*(만|대상|에\s*한)/,
    /사업자\s*등록\s*(필수|완료)/,
    /기존\s*사업자/,
  ]
  if (establishedOnlyPatterns.some((p) => p.test(text))) {
    requirements.establishedOnly = true
  }

  return requirements
}

/**
 * 프로필 업력을 연수로 변환
 * @param {string} businessAge - 프로필의 businessAge 값
 * @returns {Object} { min: number, max: number, isPreliminary: boolean }
 */
function parseBusinessAgeYears(businessAge) {
  const mapping = {
    preliminary: { min: 0, max: 0, isPreliminary: true },
    under1: { min: 0, max: 1, isPreliminary: false },
    '1to3': { min: 1, max: 3, isPreliminary: false },
    '3to7': { min: 3, max: 7, isPreliminary: false },
    over7: { min: 7, max: 100, isPreliminary: false },
  }
  return mapping[businessAge] || { min: 0, max: 0, isPreliminary: false }
}

/**
 * 명시적 제외 조건 추출 (exclusionText 전용)
 * @param {string} text - parsed.exclusionText
 * @param {Object} profile - 사용자 프로필
 * @returns {Object|null} { code: string, message: string } 또는 null
 */
function checkExplicitExclusions(text, profile) {
  if (!text) return null

  const lowerText = text.toLowerCase()

  // 기업형태 관련 명시적 제외
  if (profile.companyType === 'sole') {
    if (/개인\s*사업자?\s*(제외|불가|불포함|대상\s*외)/.test(lowerText)) {
      return {
        code: EXCLUSION_CODES.COMPANY_TYPE_SOLE_EXCLUDED,
        message: '개인사업자 제외 공고',
      }
    }
  }

  if (profile.companyType === 'nonprofit') {
    if (/비영리\s*(단체)?\s*(제외|불가|불포함)/.test(lowerText)) {
      return {
        code: EXCLUSION_CODES.COMPANY_TYPE_NONPROFIT_EXCLUDED,
        message: '비영리단체 제외 공고',
      }
    }
  }

  if (profile.companyType === 'midsize') {
    if (/중견\s*기업\s*(제외|불가|불포함)/.test(lowerText)) {
      return {
        code: EXCLUSION_CODES.COMPANY_TYPE_MIDSIZE_EXCLUDED,
        message: '중견기업 제외 공고',
      }
    }
    if (/대기업\s*(제외|불가|불포함)/.test(lowerText)) {
      return {
        code: EXCLUSION_CODES.COMPANY_TYPE_MIDSIZE_EXCLUDED,
        message: '대기업/중견기업 제외 공고',
      }
    }
  }

  // 타 지원사업 선정 기업 제외 (검증 불가 - 통과)
  // 채무불이행, 국세체납 등 (검증 불가 - 통과)

  return null
}

/**
 * 필수 인증/요건 확인 (mandatoryText 전용)
 * @param {string} mandatoryText - parsed.mandatoryText
 * @param {string} exclusionText - parsed.exclusionText (인증 필수 조건도 확인)
 * @param {Object} profile - 사용자 프로필
 * @returns {Object|null} { code: string, message: string } 또는 null
 */
function checkMandatoryRequirements(mandatoryText, exclusionText, profile) {
  const combinedText = [mandatoryText || '', exclusionText || ''].join(' ').toLowerCase()
  const certifications = profile.certifications || []

  // 벤처기업 인증 필수
  if (/벤처\s*(기업)?\s*(인증)?\s*필수/.test(combinedText) || /벤처\s*인증\s*(기업|필수)/.test(combinedText)) {
    if (!certifications.includes('venture')) {
      return {
        code: EXCLUSION_CODES.CERTIFICATION_VENTURE_REQUIRED,
        message: '벤처기업 인증 필수 공고',
      }
    }
  }

  // 이노비즈 인증 필수
  if (/이노비즈\s*(인증)?\s*필수/.test(combinedText) || /innobiz\s*필수/i.test(combinedText)) {
    if (!certifications.includes('innobiz')) {
      return {
        code: EXCLUSION_CODES.CERTIFICATION_INNOBIZ_REQUIRED,
        message: '이노비즈 인증 필수 공고',
      }
    }
  }

  // 메인비즈 인증 필수
  if (/메인비즈\s*(인증)?\s*필수/.test(combinedText) || /mainbiz\s*필수/i.test(combinedText)) {
    if (!certifications.includes('mainbiz')) {
      return {
        code: EXCLUSION_CODES.CERTIFICATION_MAINBIZ_REQUIRED,
        message: '메인비즈 인증 필수 공고',
      }
    }
  }

  // 기업부설연구소 필수
  if (/기업\s*부설\s*연구소\s*(보유)?\s*필수/.test(combinedText) || /연구소\s*보유\s*필수/.test(combinedText)) {
    if (!certifications.includes('research')) {
      return {
        code: EXCLUSION_CODES.CERTIFICATION_RESEARCH_REQUIRED,
        message: '기업부설연구소 보유 필수 공고',
      }
    }
  }

  // 특허 필수
  if (/특허\s*(보유)?\s*필수/.test(combinedText) || /지식재산권\s*보유\s*필수/.test(combinedText)) {
    if (!certifications.includes('patent')) {
      return {
        code: EXCLUSION_CODES.CERTIFICATION_PATENT_REQUIRED,
        message: '특허 보유 필수 공고',
      }
    }
  }

  return null
}

/**
 * Hard Filter: 프로필이 공고의 자격 조건을 충족하는지 사전 검증
 *
 * [v2] Confidence 기반 시스템:
 * - HIGH confidence 조건만 제외 트리거
 * - MEDIUM/LOW는 로그만 남기고 통과
 * - source별 신뢰도 게이트 적용
 * - allowPhrase 감지 시 confidence 하향
 *
 * @param {Object} profile - 사용자 프로필
 * @param {Object} announcement - 지원사업 공고
 * @returns {Object} { isEligible, eligible, excludedReason, excludedReasons }
 */
export function checkEligibility(profile, announcement) {
  // 기본 반환 형식 (기존 호환성 유지)
  const createResult = (isEligible, code = null, message = null, excludedReasons = []) => ({
    eligible: isEligible,
    isEligible,
    excludedReason: code ? { code, message } : null,
    ...(code ? { excludedReasonText: message } : {}),
    excludedReasons, // 디버깅용 전체 로그
  })

  if (!profile || !announcement) {
    return createResult(false, 'NO_DATA', '프로필 또는 공고 정보 없음')
  }

  // 1. 공고에서 요건 추출 (confidence 포함)
  const requirements = buildHardRequirements(announcement)

  // 2. 프로필과 요건 비교 (confidence 기반 판정)
  const evaluation = evaluateEligibility(profile, requirements)

  // 3. 결과 반환 (기존 형식 유지)
  return createResult(
    evaluation.isEligible,
    evaluation.excludedReason?.code || null,
    evaluation.excludedReason?.message || null,
    evaluation.excludedReasons || []
  )
}

/**
 * 텍스트에서 키워드 매칭 점수 계산 (서비스 정보용)
 * @param {string} profileText - 프로필 텍스트 (businessOverview, targetMarket 등)
 * @param {string} announcementText - 공고 텍스트 (title, summary 등)
 * @returns {number} 매칭된 키워드 수
 */
function calculateTextMatchScore(profileText, announcementText) {
  if (!profileText || !announcementText) return 0

  const profileLower = profileText.toLowerCase()
  const announcementLower = announcementText.toLowerCase()

  // 공통 키워드 목록
  const keywords = [
    // 기술 분야
    'ai', '인공지능', '머신러닝', '딥러닝', '빅데이터', '클라우드', '블록체인',
    'iot', '사물인터넷', '5g', 'ar', 'vr', 'xr', '메타버스',
    // IT/SW
    '소프트웨어', 'sw', '앱', '플랫폼', '웹', '모바일', 'saas',
    // 콘텐츠
    '콘텐츠', '미디어', '영상', '게임', '음악', '애니메이션', '웹툰',
    // 제조/하드웨어
    '제조', '로봇', '드론', '자동화', '스마트팩토리',
    // 바이오/헬스케어
    '바이오', '헬스케어', '의료', '제약', '진단',
    // 친환경/에너지
    '친환경', '그린', '탄소중립', '에너지', '재생에너지', 'esg',
    // 비즈니스
    '수출', '해외진출', 'b2b', 'b2c', '이커머스', '유통',
  ]

  let matchCount = 0
  keywords.forEach((keyword) => {
    if (profileLower.includes(keyword) && announcementLower.includes(keyword)) {
      matchCount++
    }
  })

  return matchCount
}

// ==============================================
// Relevance Gate & Industry Mismatch 상수
// ==============================================

/**
 * Relevance Gate: 도메인 적합도 최소 기준
 * - interestMatchScore + serviceKeywordScore 합이 이 값 미만이면 점수 상한 적용
 */
const RELEVANCE_THRESHOLD = 12

/**
 * Relevance Gate 미달 시 점수 상한
 * - 추천 목록(30점 이상)에 포함되지 않도록 49점으로 제한
 */
const RELEVANCE_GATE_CAP = 49

/**
 * Industry Mismatch Penalty: 업종 불일치 시 감점
 * - 강한 불일치(제조/시설/공간): -35점
 * - 일반 불일치: -25점
 */
const INDUSTRY_MISMATCH_PENALTY_STRONG = -35
const INDUSTRY_MISMATCH_PENALTY_NORMAL = -25

/**
 * Stage Boost: 예비창업자 + 초기검증 키워드 가점
 */
const STAGE_BOOST_PRELIMINARY = 12

/**
 * 업종 특화 키워드 그룹 (공고에서 탐지)
 * - 해당 키워드가 공고에 있고, 프로필에 관련 interests가 없으면 패널티 적용
 * - penaltyLevel: 'strong' | 'normal' - 패널티 강도
 */
const INDUSTRY_SPECIFIC_KEYWORDS = {
  // 전통 제조/공방 업종 (강한 패널티)
  traditionalManufacturing: {
    keywords: ['가죽', '피혁', '봉제', '원단', '섬유', '직물', '의류', '패션', '신발', '가방', '액세서리', '잡화',
               '공방', '수공예', '공예품', '도자기', '목공', '가구', '소공인', '제조장비', '금형',
               '주물', '주조', '단조', '도금', '절삭', '용접', '판금', '프레스', '열처리'],
    allowedInterests: ['manufacturing', 'fashion', 'smartfactory'],
    penaltyLevel: 'strong',
  },
  // 시설/공간/입주 (강한 패널티 - 디지털 서비스와 명확히 불일치)
  facilitySpace: {
    keywords: ['입주', '입주공간', '공유오피스', '창업공간', '창작공간', '제조공간', '공장', '작업장', '작업실',
               '시설', '설비', '장비임대', '장비지원', '장비대여', '기자재', '공간지원', '공간임대'],
    allowedInterests: ['manufacturing', 'smartfactory'],
    penaltyLevel: 'strong',
  },
  // 식품/요식업
  food: {
    keywords: ['식품', '요식업', '외식업', '음식점', '식당', '베이커리', '제과', '제빵', '정육', '수산', '농수산',
               '반찬', '도시락', '케이터링', '프랜차이즈', '가맹점'],
    allowedInterests: ['foodtech', 'bio'],
    penaltyLevel: 'normal',
  },
  // 건설/건축 (강한 패널티)
  construction: {
    keywords: ['건설', '건축', '시공', '토목', '리모델링', '배관', '전기공사', '소방', '조경'],
    allowedInterests: ['manufacturing', 'smartfactory'],
    penaltyLevel: 'strong',
  },
  // 농업/축산
  agriculture: {
    keywords: ['농업', '축산', '양계', '양돈', '낙농', '작물', '재배', '농기계', '비료', '사료', '종자'],
    allowedInterests: ['foodtech', 'bio', 'smartfarm'],
    penaltyLevel: 'normal',
  },
  // 미용/뷰티 (오프라인)
  beauty: {
    keywords: ['미용실', '헤어샵', '네일샵', '피부관리실', '에스테틱', '뷰티샵'],
    allowedInterests: ['fashion', 'bio', 'healthcare'],
    penaltyLevel: 'normal',
  },
}

/**
 * 예비창업자 Stage Boost 키워드
 * - 공고에 이 키워드가 있고 프로필이 예비창업자면 가점
 */
const PRELIMINARY_STAGE_KEYWORDS = [
  '예비창업', '예비 창업', '예비창업자', '창업준비', '창업 준비',
  '아이디어', '아이디어 검증', 'poc', '초기검증', '초기 검증',
  '사업화', '사업화 지원', '시제품', '프로토타입', 'mvp',
  '창업교육', '창업 교육', '멘토링', '액셀러레이팅',
  '데모데이', '데모 데이', 'ir', '투자유치',
]

/**
 * 프로필 텍스트에서 업종 신호가 있는지 확인
 * @param {Object} profile - 프로필
 * @param {string[]} industryKeywords - 업종 키워드 목록
 * @returns {boolean} 프로필에 해당 업종 신호가 있는지
 */
function hasIndustrySignalInProfile(profile, industryKeywords) {
  const profileText = [
    profile.serviceName || '',
    profile.businessOverview || '',
    profile.targetMarket || '',
  ].join(' ').toLowerCase()

  return industryKeywords.some(kw => profileText.includes(kw.toLowerCase()))
}

/**
 * 프로필 interests에 허용된 interests가 있는지 확인
 * @param {Object} profile - 프로필
 * @param {string[]} allowedInterests - 허용된 interests 목록
 * @returns {boolean}
 */
function hasAllowedInterest(profile, allowedInterests) {
  if (!profile.interests || profile.interests.length === 0) return false
  return allowedInterests.some(ai => profile.interests.includes(ai))
}

/**
 * 프로필과 공고를 비교하여 매칭률 계산
 *
 * [v2] Relevance Gate + Industry Mismatch Penalty 추가
 * - 도메인 적합도(관심분야+키워드 매칭)가 THRESHOLD 미만이면 점수 상한 적용
 * - 업종 특화 공고에 무관한 프로필은 패널티 적용
 *
 * @param {Object} profile - 사용자 프로필
 * @param {Object} announcement - 지원사업 공고
 * @returns {number} 0-100 사이의 매칭률
 */
export function calculateMatchingScore(profile, announcement) {
  if (!profile || !announcement) return 0

  let score = 0

  // 디버그용 점수 breakdown (필요시 활용)
  const breakdown = {
    interestScore: 0,
    keywordScore: 0,
    companyTypeScore: 0,
    businessAgeScore: 0,
    regionScore: 0,
    certScore: 0,
    conditionScore: 0,
    exclusionPenalty: 0,
    relevanceGateApplied: false,
    industryMismatchPenalty: 0,
    industryMismatchType: null, // 'strong' | 'normal' | null
    stageBoost: 0,
    stageBoostApplied: false,
  }

  // 통합 검색 텍스트 생성 (공고의 모든 텍스트)
  const fullSearchText = [
    announcement.title || '',
    announcement.summary || '',
    ...(announcement.eligibility || []),
    ...(announcement.category || []),
    ...(announcement.tags || []),
    announcement.parsed?.eligibilityText || '',
    announcement.parsed?.mandatoryText || '',
    ...(announcement.parsed?.tags || []),
  ].join(' ').toLowerCase()

  // 제외조건 텍스트 (별도 추출 - 감점 로직용)
  const exclusionText = (announcement.parsed?.exclusionText || '').toLowerCase()

  // ============================================================
  // 1. 관심분야/키워드 매칭 (최대 35점) - 핵심 매칭 요소
  // ============================================================

  // 1-1. 관심분야(interests) 매칭 (최대 20점)
  // INTERESTS의 keywords를 활용하여 확장 매칭
  let interestMatchCount = 0
  if (profile.interests && profile.interests.length > 0) {
    profile.interests.forEach(interestValue => {
      // INTERESTS에서 해당 관심분야의 keywords 가져오기
      const interestConfig = INTERESTS.find(i => i.value === interestValue)
      const keywords = interestConfig?.keywords || [interestValue.toLowerCase()]

      // keywords 중 하나라도 공고에 포함되면 매칭
      const isMatched = keywords.some(keyword => fullSearchText.includes(keyword.toLowerCase()))
      if (isMatched) {
        interestMatchCount++
      }
    })
    if (interestMatchCount > 0) {
      // 매칭된 관심분야 비율에 따라 점수 부여 (최대 20점)
      breakdown.interestScore = Math.min(20, (interestMatchCount / profile.interests.length) * 25)
      score += breakdown.interestScore
    }
  }

  // 1-2. 서비스명/사업개요 키워드 직접 매칭 (최대 15점)
  const profileKeywords = extractKeywordsFromProfile(profile)
  let keywordMatchCount = 0
  if (profileKeywords.length > 0) {
    profileKeywords.forEach(keyword => {
      if (fullSearchText.includes(keyword.toLowerCase())) {
        keywordMatchCount++
      }
    })
    if (keywordMatchCount > 0) {
      // 매칭된 키워드 수에 따라 점수 (키워드당 3점, 최대 15점)
      breakdown.keywordScore = Math.min(15, keywordMatchCount * 3)
      score += breakdown.keywordScore
    }
  }

  // ============================================================
  // [NEW] Relevance Score 계산 (Relevance Gate용)
  // ============================================================
  const relevanceScore = breakdown.interestScore + breakdown.keywordScore

  // ============================================================
  // 2. 기업 적격성 매칭 (최대 30점)
  // ============================================================

  // 2-1. 기업 형태 매칭 (최대 15점)
  if (profile.companyType) {
    const typeMatches = {
      preliminary: ['예비창업', '예비창업자', '창업준비'],
      sole: ['개인사업자', '소상공인', '1인기업', '1인 기업'],
      sme: ['중소기업', '스타트업', '창업기업', '벤처', '벤처기업'],
      midsize: ['중견기업'],
      nonprofit: ['비영리', '사회적기업', '협동조합'],
    }

    const matchKeywords = typeMatches[profile.companyType] || []
    if (matchAnyWithSynonyms(fullSearchText, matchKeywords)) {
      breakdown.companyTypeScore = 15
      score += 15
    }
    // 기업형태 매칭 안되면 점수 없음 (기본점수 제거)
  }

  // 2-2. 업력 매칭 (최대 15점)
  if (profile.businessAge) {
    const ageMatches = {
      preliminary: ['예비창업', '예비창업자'],
      under1: ['1년 미만', '초기창업', '1년미만', '신규창업'],
      '1to3': ['3년 미만', '3년 이내', '초기창업', '3년미만', '3년이내', '초기 창업'],
      '3to7': ['7년 미만', '7년 이내', '성장단계', '7년미만', '7년이내', '5년 이내', '5년이내'],
      over7: ['7년 이상', '10년 이상'], // 특별히 7년 이상 요구하는 경우만 매칭
    }

    const matchKeywords = ageMatches[profile.businessAge] || []
    if (matchAnyWithSynonyms(fullSearchText, matchKeywords)) {
      breakdown.businessAgeScore = 15
      score += 15
    }
    // 업력 조건이 명시되지 않은 공고는 점수 없음
  }

  // ============================================================
  // 3. 지역 매칭 (최대 15점)
  // ============================================================
  if (profile.region) {
    const regionRestriction = extractRegionRestriction(announcement)

    if (regionRestriction.type === 'nationwide') {
      // 전국 대상 공고 - 기본 점수
      breakdown.regionScore = 8
      score += 8
    } else if (regionRestriction.type === 'restricted') {
      // 특정 지역 제한 공고
      if (profile.region === regionRestriction.region) {
        // 지역 일치 - 높은 점수 (지역 맞춤 공고!)
        breakdown.regionScore = 15
        score += 15
      } else {
        // 지역 불일치 - 큰 감점 (지원 불가 가능성 높음)
        breakdown.regionScore = -20
        score -= 20
      }
    } else if (regionRestriction.type === 'preferred') {
      // 기관 소재지 기반 우대
      if (profile.region === regionRestriction.region) {
        breakdown.regionScore = 12
        score += 12
      }
      // 다른 지역이면 점수 없음 (기본점수 제거)
    }
    // 지역 정보 불명확 - 점수 없음 (기본점수 제거)
  }

  // ============================================================
  // 4. 인증/자격 매칭 (최대 10점)
  // ============================================================
  if (profile.certifications && profile.certifications.length > 0) {
    const certMatches = {
      venture: ['벤처기업', '벤처 기업', '벤처인증'],
      innobiz: ['이노비즈', 'innobiz'],
      mainbiz: ['메인비즈', 'mainbiz'],
      research: ['연구소', '기업부설연구소', '부설연구소'],
      patent: ['특허', '지식재산권', '산업재산권'],
    }

    let certScoreTemp = 0
    profile.certifications.forEach((cert) => {
      const keywords = certMatches[cert] || []
      if (matchAnyWithSynonyms(fullSearchText, keywords)) {
        certScoreTemp += 5
      }
    })
    breakdown.certScore = Math.min(10, certScoreTemp)
    score += breakdown.certScore
  }

  // ============================================================
  // 5. 매출/인원 조건 매칭 (최대 10점)
  // ============================================================
  const revenueCondition = extractRevenueCondition(fullSearchText)
  const employeeCondition = extractEmployeeCondition(fullSearchText)

  // 매출 조건 확인
  if (revenueCondition && profile.revenue) {
    const profileRevenue = parseProfileRevenue(profile.revenue)
    if (meetsRevenueCondition(profileRevenue, revenueCondition)) {
      breakdown.conditionScore += 5
      score += 5
    } else {
      // 조건 미충족 시 감점
      breakdown.conditionScore -= 10
      score -= 10
    }
  }

  // 인원 조건 확인
  if (employeeCondition && profile.employees) {
    const profileEmployees = parseProfileEmployees(profile.employees)
    if (meetsEmployeeCondition(profileEmployees, employeeCondition)) {
      breakdown.conditionScore += 5
      score += 5
    } else {
      // 조건 미충족 시 감점
      breakdown.conditionScore -= 10
      score -= 10
    }
  }

  // ============================================================
  // 6. 제외조건 감점 (parsed.exclusionText 기반)
  // ============================================================
  if (exclusionText && profile.companyType) {
    // 법인만 가능 (개인사업자/예비창업자 제외)
    if (
      (exclusionText.includes('법인만') || exclusionText.includes('법인에 한') || exclusionText.includes('법인 한정')) &&
      (profile.companyType === 'sole' || profile.companyType === 'preliminary')
    ) {
      breakdown.exclusionPenalty -= 30
      score -= 30
    }

    // 개인사업자 불가
    if (
      (exclusionText.includes('개인사업자 불가') || exclusionText.includes('개인사업자 제외') || exclusionText.includes('개인 제외')) &&
      profile.companyType === 'sole'
    ) {
      breakdown.exclusionPenalty -= 30
      score -= 30
    }

    // 예비창업자 불가 (기창업자만)
    if (
      (exclusionText.includes('예비창업자 불가') || exclusionText.includes('예비창업 제외') || exclusionText.includes('기창업자만')) &&
      profile.companyType === 'preliminary'
    ) {
      breakdown.exclusionPenalty -= 30
      score -= 30
    }

    // 중소기업만 (중견기업 제외)
    if (
      (exclusionText.includes('중소기업만') || exclusionText.includes('중견기업 제외') || exclusionText.includes('대기업 제외')) &&
      profile.companyType === 'midsize'
    ) {
      breakdown.exclusionPenalty -= 25
      score -= 25
    }
  }

  // ============================================================
  // 7. Industry Mismatch Soft Penalty (업종 불일치 감점)
  // - 공고에 업종 특화 키워드가 있고, 프로필에 해당 업종 신호가 없으면 패널티
  // - penaltyLevel에 따라 강도 조절 (strong: -35, normal: -25)
  // ============================================================
  let industryMismatchDetected = false
  let detectedPenaltyLevel = null

  for (const [industryType, config] of Object.entries(INDUSTRY_SPECIFIC_KEYWORDS)) {
    // 공고에 해당 업종 키워드가 있는지 확인
    const hasIndustryKeywordInAnnouncement = config.keywords.some(kw =>
      fullSearchText.includes(kw.toLowerCase())
    )

    if (hasIndustryKeywordInAnnouncement) {
      // 프로필에 허용된 interests가 있는지 확인
      const hasAllowedInt = hasAllowedInterest(profile, config.allowedInterests)

      // 프로필 텍스트에 해당 업종 신호가 있는지 확인
      const hasSignalInProfile = hasIndustrySignalInProfile(profile, config.keywords)

      // 둘 다 없으면 mismatch
      if (!hasAllowedInt && !hasSignalInProfile) {
        industryMismatchDetected = true
        // 가장 강한 패널티 레벨 유지
        if (config.penaltyLevel === 'strong') {
          detectedPenaltyLevel = 'strong'
        } else if (detectedPenaltyLevel !== 'strong') {
          detectedPenaltyLevel = 'normal'
        }
        // 강한 패널티면 바로 break, 아니면 다른 강한 패널티 찾기 계속
        if (detectedPenaltyLevel === 'strong') break
      }
    }
  }

  if (industryMismatchDetected) {
    const penalty = detectedPenaltyLevel === 'strong'
      ? INDUSTRY_MISMATCH_PENALTY_STRONG
      : INDUSTRY_MISMATCH_PENALTY_NORMAL
    breakdown.industryMismatchPenalty = penalty
    breakdown.industryMismatchType = detectedPenaltyLevel
    score += penalty
  }

  // ============================================================
  // 8. Stage Boost (예비창업자 단계 가점)
  // - 예비창업자 프로필 + 초기검증/사업화 키워드 공고 → 가점
  // ============================================================
  if (profile.businessAge === 'preliminary' || profile.companyType === 'preliminary') {
    const hasStageKeyword = PRELIMINARY_STAGE_KEYWORDS.some(kw =>
      fullSearchText.includes(kw.toLowerCase())
    )

    if (hasStageKeyword) {
      breakdown.stageBoost = STAGE_BOOST_PRELIMINARY
      breakdown.stageBoostApplied = true
      score += STAGE_BOOST_PRELIMINARY
    }
  }

  // ============================================================
  // 9. Relevance Gate (도메인 적합도 최소 기준)
  // - 관심분야 + 키워드 매칭 점수가 THRESHOLD 미만이면 점수 상한 적용
  // - 지역/기업형태만 일치해도 상위 노출되는 것을 방지
  // ============================================================
  let finalScore = Math.max(0, score)

  if (relevanceScore < RELEVANCE_THRESHOLD) {
    // Relevance Gate 미달 → 점수 상한 적용
    if (finalScore > RELEVANCE_GATE_CAP) {
      breakdown.relevanceGateApplied = true
      finalScore = RELEVANCE_GATE_CAP
    }
  }

  // 최종 점수 (0-100)
  // 만점 기준: 키워드(35) + 적격성(30) + 지역(15) + 인증(10) + 조건(10) = 100점
  return Math.min(100, finalScore)
}

/**
 * 프로필에서 주요 키워드 추출
 * @param {Object} profile - 사용자 프로필
 * @returns {string[]} 추출된 키워드 배열
 */
function extractKeywordsFromProfile(profile) {
  const keywords = []

  // 서비스명에서 키워드 추출
  if (profile.serviceName) {
    const serviceKeywords = profile.serviceName
      .replace(/[기반|플랫폼|서비스|시스템|솔루션]/g, ' ')
      .split(/[\s,./]+/)
      .filter(w => w.length >= 2)
    keywords.push(...serviceKeywords)
  }

  // 사업개요에서 핵심 키워드 추출
  if (profile.businessOverview) {
    // 주요 기술/산업 키워드
    const techKeywords = [
      'ai', '인공지능', '머신러닝', '딥러닝', '빅데이터', '클라우드', '블록체인',
      'iot', '사물인터넷', '5g', 'ar', 'vr', 'xr', '메타버스',
      '소프트웨어', 'sw', '앱', '플랫폼', '웹', '모바일', 'saas',
      '콘텐츠', '미디어', '영상', '게임', '음악', '음원', '애니메이션', '웹툰',
      '제조', '로봇', '드론', '자동화', '스마트팩토리',
      '바이오', '헬스케어', '의료', '제약', '진단',
      '친환경', '그린', '탄소중립', '에너지', '재생에너지', 'esg',
      '수출', '해외진출', 'b2b', 'b2c', '이커머스', '유통',
      '핀테크', '금융', '보험', '블록체인', '암호화폐',
      '교육', '에듀테크', '이러닝',
      '푸드테크', '농업', '스마트팜',
      '모빌리티', '자율주행', '전기차',
    ]

    const overviewLower = profile.businessOverview.toLowerCase()
    techKeywords.forEach(keyword => {
      if (overviewLower.includes(keyword)) {
        keywords.push(keyword)
      }
    })
  }

  // 타겟 시장에서 키워드 추출
  if (profile.targetMarket) {
    const marketKeywords = profile.targetMarket
      .split(/[\s,./]+/)
      .filter(w => w.length >= 2)
    keywords.push(...marketKeywords)
  }

  // 중복 제거
  return [...new Set(keywords)]
}

/**
 * D-day 계산
 * @param {string} deadline - 마감일 (YYYY-MM-DD)
 * @returns {number} 남은 일수 (음수면 마감됨)
 */
export function calculateDday(deadline) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)
  const diff = deadlineDate - today
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * D-day 텍스트 생성
 * @param {number} dday - 남은 일수
 * @returns {string} D-day 텍스트
 */
export function formatDday(dday) {
  if (dday < 0) return '마감'
  if (dday === 0) return 'D-Day'
  return `D-${dday}`
}

/**
 * 공고를 월별로 그룹핑
 * @param {Array} announcements - 공고 배열
 * @returns {Object} 월별 그룹 { '2024-01': [...], '2024-02': [...] }
 */
export function groupByMonth(announcements) {
  const groups = {}

  announcements.forEach((announcement) => {
    const date = new Date(announcement.deadline)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(announcement)
  })

  // 각 월별로 마감일순 정렬
  Object.keys(groups).forEach((key) => {
    groups[key].sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
  })

  return groups
}

/**
 * 월 이름 포맷팅
 * @param {string} monthKey - '2024-01' 형태
 * @returns {string} '2024년 1월'
 */
export function formatMonthName(monthKey) {
  const [year, month] = monthKey.split('-')
  return `${year}년 ${parseInt(month)}월`
}
