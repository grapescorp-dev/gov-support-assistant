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

// ==============================================
// 3단계: 기관명 → 지역 매핑 DB
// ==============================================
// 약어, 영문명, 특수 기관명을 지역과 매핑
const ORGANIZATION_REGION_MAP = {
  // 제주
  'jdc': 'jeju',
  '제주국제자유도시': 'jeju',
  '제주창조경제혁신센터': 'jeju',
  '제주테크노파크': 'jeju',
  '제주산업진흥원': 'jeju',
  '제주영상위원회': 'jeju',
  '제주관광공사': 'jeju',

  // 강원
  '강원정보문화산업진흥원': 'gangwon',
  '강원창조경제혁신센터': 'gangwon',
  '강원테크노파크': 'gangwon',
  'gwtp': 'gangwon',

  // 경기
  '경기콘텐츠진흥원': 'gyeonggi',
  '경기창조경제혁신센터': 'gyeonggi',
  '경기테크노파크': 'gyeonggi',
  'ggtp': 'gyeonggi',
  '판교': 'gyeonggi',

  // 인천
  '인천창조경제혁신센터': 'incheon',
  '인천테크노파크': 'incheon',
  '인천경제자유구역청': 'incheon',
  'ifez': 'incheon',

  // 대전
  '대전창조경제혁신센터': 'daejeon',
  '대전테크노파크': 'daejeon',
  '대전정보문화산업진흥원': 'daejeon',

  // 세종
  '세종창조경제혁신센터': 'sejong',
  '세종테크노파크': 'sejong',

  // 충북
  '충북창조경제혁신센터': 'chungbuk',
  '충북테크노파크': 'chungbuk',
  '충북산업진흥원': 'chungbuk',

  // 충남
  '충남창조경제혁신센터': 'chungnam',
  '충남테크노파크': 'chungnam',
  '충남산업진흥원': 'chungnam',

  // 전북
  '전북창조경제혁신센터': 'jeonbuk',
  '전북테크노파크': 'jeonbuk',
  '전북산업진흥원': 'jeonbuk',
  'jbtp': 'jeonbuk',

  // 전남
  '전남창조경제혁신센터': 'jeonnam',
  '전남테크노파크': 'jeonnam',
  '전남정보문화산업진흥원': 'jeonnam',

  // 광주
  '광주창조경제혁신센터': 'gwangju',
  '광주테크노파크': 'gwangju',
  '광주정보문화산업진흥원': 'gwangju',
  'gicon': 'gwangju',

  // 경북
  '경북창조경제혁신센터': 'gyeongbuk',
  '경북테크노파크': 'gyeongbuk',
  'gbtp': 'gyeongbuk',
  '포항테크노파크': 'gyeongbuk',
  '구미전자정보기술원': 'gyeongbuk',

  // 경남
  '경남창조경제혁신센터': 'gyeongnam',
  '경남테크노파크': 'gyeongnam',
  'gntp': 'gyeongnam',
  '창원산업진흥원': 'gyeongnam',

  // 대구
  '대구창조경제혁신센터': 'daegu',
  '대구테크노파크': 'daegu',
  '대구디지털산업진흥원': 'daegu',
  'dip': 'daegu',
  'dgdip': 'daegu',

  // 부산
  '부산창조경제혁신센터': 'busan',
  '부산테크노파크': 'busan',
  '부산정보산업진흥원': 'busan',
  'bipa': 'busan',
  '부산영상위원회': 'busan',

  // 울산
  '울산창조경제혁신센터': 'ulsan',
  '울산테크노파크': 'ulsan',
  'utp': 'ulsan',

  // 서울 (구 단위 기관)
  '서울창조경제혁신센터': 'seoul',
  '서울산업진흥원': 'seoul',
  'sba': 'seoul',
  '서울시': 'seoul',
  '마포구': 'seoul',
  '강남구': 'seoul',
  '성동구': 'seoul',
  '금천구': 'seoul',
}

// 모든 지역 키워드를 플랫하게 추출하는 헬퍼 함수
function getAllKeywordsForRegion(regionData) {
  const keywords = [...regionData.main]
  if (regionData.districts) keywords.push(...regionData.districts)
  if (regionData.cities) keywords.push(...regionData.cities)
  return keywords
}

// ==============================================
// 관심분야 호환성 필터 (Interest Compatibility Filter)
// ==============================================

/**
 * 기술/IT 분야와 호환 불가능한 산업 정의
 * - 기술 기반 스타트업에게 농업/제조/건설 등은 연관성이 낮음
 */
const INCOMPATIBLE_INDUSTRIES = {
  agriculture: ['농업', '농생명', '수산', '축산', '임업', '농촌', '어업', '영농'],
  manufacturing: ['제조업', '철강', '화학', '섬유', '기계', '금속', '조선', '자동차부품'],
  traditional: ['전통시장', '골목상권', '도소매', '유통', '재래시장', '전통주'],
  construction: ['건설', '토목', '건축', '부동산', '시공', '토건'],
}

/**
 * 공고에서 호환 불가능한 산업 감지
 * @param {Object} announcement - 공고 객체
 * @returns {{ industry: string, keywords: string[] } | null}
 */
function detectIncompatibleIndustry(announcement) {
  const text = `${announcement.title || ''} ${announcement.summary || ''} ${(announcement.tags || []).join(' ')}`.toLowerCase()

  for (const [industry, keywords] of Object.entries(INCOMPATIBLE_INDUSTRIES)) {
    const matchedKeywords = keywords.filter((kw) => text.includes(kw.toLowerCase()))
    if (matchedKeywords.length > 0) {
      return { industry, keywords: matchedKeywords }
    }
  }
  return null
}

/**
 * 사용자의 기술 분야 관심사 목록
 */
const TECH_INTERESTS = ['AI', 'ICT', 'IT', 'CT', '콘텐츠', '음악', '게임', 'SW', '데이터', '클라우드', '핀테크', '블록체인']

/**
 * 범용 관심사 (산업 불문 적용 가능)
 */
const GENERAL_INTERESTS = ['창업', '수출', 'R&D', '마케팅', '투자', '인력', '컨설팅']

/**
 * 사용자 관심사와 산업 호환성 체크
 * @param {Object} profile - 사용자 프로필
 * @param {Object} announcement - 공고 객체
 * @returns {{ compatible: boolean, reason?: string }}
 */
function checkInterestCompatibility(profile, announcement) {
  const userInterests = profile?.interests || []
  if (userInterests.length === 0) return { compatible: true }

  const incompatibleIndustry = detectIncompatibleIndustry(announcement)
  if (!incompatibleIndustry) return { compatible: true }

  // 기술 분야 관심사가 있는지 확인
  const hasTechInterests = userInterests.some((i) => TECH_INTERESTS.includes(i))

  // 범용 관심사만 있는지 확인
  const hasOnlyGeneralInterests = userInterests.every((i) => GENERAL_INTERESTS.includes(i))

  // 기술 분야 관심사가 있고, 범용 관심사만 있는 게 아닌 경우 → 불일치
  if (hasTechInterests && !hasOnlyGeneralInterests) {
    return {
      compatible: false,
      reason: `기술 분야(${userInterests.filter((i) => TECH_INTERESTS.includes(i)).join(', ')})와 ${incompatibleIndustry.keywords.join('/')} 분야 공고는 연관성이 낮습니다`,
      industry: incompatibleIndustry.industry,
    }
  }

  return { compatible: true }
}

/**
 * 관심분야 매칭률 계산
 * @param {Object} profile - 사용자 프로필
 * @param {Object} announcement - 공고 객체
 * @returns {{ matchCount: number, matchRate: number }}
 */
function calculateInterestMatchRate(profile, announcement) {
  const userInterests = profile?.interests || []
  const categories = announcement.category || []
  const tags = announcement.tags || []
  const allCategories = [...categories, ...tags]

  if (userInterests.length === 0) return { matchCount: 0, matchRate: 1 }

  let matchCount = 0
  userInterests.forEach((interest) => {
    // 카테고리나 태그에 관심분야가 포함되어 있으면 매칭
    if (allCategories.some((cat) => cat.includes(interest) || interest.includes(cat))) {
      matchCount++
    }
  })

  return {
    matchCount,
    matchRate: matchCount / userInterests.length,
  }
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

  let result = null

  // 범위 패턴 먼저 확인
  const rangeMatch = text.match(/매출[액]?\s*(\d+(?:\.\d+)?)\s*[~-]\s*(\d+(?:\.\d+)?)\s*억/)
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
  const rangeMatch = text.match(/(상시근로자|종업원|직원|인원)\s*(\d+)\s*[~-]\s*(\d+)\s*[명인]/)
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

// 서울시 구 이름 -> 키워드 매핑 (useProfileStore의 SEOUL_DISTRICTS value와 일치)
const SEOUL_DISTRICT_KEYWORDS = {
  gangnam: ['강남', '강남구'],
  gangdong: ['강동', '강동구'],
  gangbuk: ['강북', '강북구'],
  gangseo: ['강서', '강서구'],
  gwanak: ['관악', '관악구'],
  gwangjin: ['광진', '광진구'],
  guro: ['구로', '구로구'],
  geumcheon: ['금천', '금천구'],
  nowon: ['노원', '노원구'],
  dobong: ['도봉', '도봉구'],
  dongdaemun: ['동대문', '동대문구'],
  dongjak: ['동작', '동작구'],
  mapo: ['마포', '마포구'],
  seodaemun: ['서대문', '서대문구'],
  seocho: ['서초', '서초구'],
  seongdong: ['성동', '성동구'],
  seongbuk: ['성북', '성북구'],
  songpa: ['송파', '송파구'],
  yangcheon: ['양천', '양천구'],
  yeongdeungpo: ['영등포', '영등포구'],
  yongsan: ['용산', '용산구'],
  eunpyeong: ['은평', '은평구'],
  jongno: ['종로', '종로구'],
  jung: ['중구'],
  jungnang: ['중랑', '중랑구'],
}

/**
 * 공고에서 지역 제외 패턴 감지 (서울 제외, 수도권 제외 등)
 * @param {string} text - 검색할 텍스트
 * @returns {Object} { hasExclusion: boolean, excludedRegions: string[], message?: string }
 */
function detectExcludedRegions(text) {
  const excludedRegions = []
  let message = null

  // 서울 제외 패턴
  const seoulExclusionPatterns = [
    /서울\s*(제외|불가|불포함|미포함)/,
    /서울(시|특별시)?\s*(제외|불가|불포함|미포함)/,
    /서울(시|특별시)?\s*및\s*\d+년\s*선정/,  // "서울특별시 및 2025년 선정 지자체"
    /(제외|불가|불포함)[^.]*서울/,
  ]
  for (const pattern of seoulExclusionPatterns) {
    if (pattern.test(text)) {
      excludedRegions.push('seoul')
      message = '서울 제외 공고'
      break
    }
  }

  // 수도권 제외 패턴
  const capitalExclusionPatterns = [
    /수도권\s*(제외|불가|불포함|미포함)/,
    /(제외|불가|불포함)[^.]*수도권/,
  ]
  for (const pattern of capitalExclusionPatterns) {
    if (pattern.test(text)) {
      excludedRegions.push('seoul', 'gyeonggi', 'incheon')
      message = '수도권 제외 공고'
      break
    }
  }

  // 비수도권 대상 패턴 (수도권 제외와 동일)
  const nonCapitalPatterns = [
    /비수도권\s*(대상|지역|기업|한정|전용)/,
    /비수도권\s*(소재|에\s*위치)/,
    /비수도권\s*(지방)?자치단체/,  // "비수도권 지방자치단체", "비수도권 자치단체"
    /지방\s*(소재|지역|기업)\s*(대상|한정|전용)/,
  ]
  for (const pattern of nonCapitalPatterns) {
    if (pattern.test(text)) {
      if (!excludedRegions.includes('seoul')) {
        excludedRegions.push('seoul', 'gyeonggi', 'incheon')
        message = '비수도권 대상 공고 (수도권 제외)'
      }
      break
    }
  }

  // 광역지방자치단체 대상 (서울 제외 가능성)
  // "11개 광역지방자치단체" 등의 패턴에서 서울이 명시적으로 제외되는 경우
  if (/광역\s*지방\s*자치\s*단체/.test(text) && /서울.*제외|제외.*서울/.test(text)) {
    if (!excludedRegions.includes('seoul')) {
      excludedRegions.push('seoul')
      message = '서울 제외 광역지자체 대상 공고'
    }
  }

  return {
    hasExclusion: excludedRegions.length > 0,
    excludedRegions,
    message,
  }
}

/**
 * 공고에서 지역 제한 정보 추출
 * [개선] fetchAnnouncements.js에서 추출한 regionMeta의 excluded 타입도 처리
 * @param {Object} announcement - 공고 객체
 * @returns {Object} { type: 'nationwide' | 'restricted' | 'excluded' | 'unknown', region?: string, excludedRegions?: string[], detectedCity?: string, detectedDistrict?: string, confidence?: string }
 */
export function extractRegionRestriction(announcement) {
  // [6단계] API 메타데이터에서 지역 정보가 있으면 최우선 사용
  // regionMeta: { regionCode, regionType, confidence, source, excludedRegions?, allowedRegions? }
  if (announcement.regionMeta) {
    const { regionCode, regionType, confidence, excludedRegions, allowedRegions } = announcement.regionMeta

    if (regionType === 'nationwide') {
      return { type: 'nationwide', confidence: confidence || 'high', fromMeta: true }
    }

    // ✅ [개선] excluded 타입 처리 (비수도권 등 특정 지역 제외)
    if (regionType === 'excluded' && excludedRegions && excludedRegions.length > 0) {
      return {
        type: 'excluded',
        excludedRegions: excludedRegions,
        excludedMessage: regionCode === 'non_capital'
          ? '비수도권 대상 공고 (수도권 제외)'
          : `특정 지역 제외 공고`,
        confidence: confidence || 'high',
        fromMeta: true,
      }
    }

    // ✅ [개선] 허용 지역 목록이 있는 restricted 타입 처리
    if (regionType === 'restricted' && allowedRegions && allowedRegions.length > 0) {
      return {
        type: 'restricted',
        region: regionCode,
        regions: allowedRegions,
        regionLabel: regionCode === 'capital' ? '수도권' : (REGION_NAMES[regionCode] || regionCode),
        confidence: confidence || 'high',
        fromMeta: true,
      }
    }

    if (regionType === 'restricted' && regionCode) {
      return {
        type: 'restricted',
        region: regionCode,
        regions: [regionCode],
        regionLabel: REGION_NAMES[regionCode] || regionCode,
        confidence: confidence || 'high',
        fromMeta: true, // 메타데이터에서 추출됨을 표시
      }
    }
  }

  // hashTags 제외 - 모든 지역이 나열되어 있어 신뢰도 낮음
  const text = [
    announcement.title || '',
    announcement.summary || '',
    announcement.organization || '',
    (announcement.eligibility || []).join(' '),
  ]
    .join(' ')
    .toLowerCase()

  const titleText = (announcement.title || '').toLowerCase()
  const originalTitle = announcement.title || ''

  // 0. 지역 제외 패턴 먼저 확인 (서울 제외, 수도권 제외 등)
  const excludedRegionsResult = detectExcludedRegions(text)
  if (excludedRegionsResult.hasExclusion) {
    return {
      type: 'excluded',
      excludedRegions: excludedRegionsResult.excludedRegions,
      excludedMessage: excludedRegionsResult.message,
      confidence: 'high',
    }
  }

  // 전국 대상 키워드 확인
  if (
    text.includes('전국') ||
    text.includes('지역무관') ||
    text.includes('지역 무관') ||
    text.includes('전 지역')
  ) {
    return { type: 'nationwide', confidence: 'high' }
  }

  // [신규] 제목 앞부분에서 지역명 감지 (가장 신뢰도 높음)
  // 예: "제주 2026년...", "강원 스타트업...", "전북특별자치도 2025년..."
  // 제목 시작 부분(첫 20자)에서 지역명이 나오면 지역 제한 공고로 판단
  const titlePrefix = originalTitle.substring(0, 30).toLowerCase()
  for (const [regionKey, regionData] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of regionData.main) {
      // 제목이 지역명으로 시작하거나, 제목 앞부분에 "지역명 + 년도/사업" 패턴
      const prefixPatterns = [
        new RegExp(`^${kw}`),                    // "제주 2026년..."
        new RegExp(`^\\[?${kw}\\]?\\s`),         // "[제주] 2026년..." 또는 "제주 "
        new RegExp(`^${kw}도?\\s*\\d{4}`),       // "제주도 2026", "강원 2025"
        new RegExp(`^${kw}(특별자치도|특별자치시|특별시|광역시|도)`), // "제주특별자치도"
      ]
      if (prefixPatterns.some(pattern => pattern.test(titlePrefix))) {
        const detectedDistrict = regionKey === 'seoul' ? detectSeoulDistrict(text) : undefined
        return {
          type: 'restricted',
          region: regionKey,
          detectedCity: undefined,
          detectedDistrict,
          confidence: 'high',
        }
      }
    }
  }

  // 제목에서 [지역명] 패턴 확인 (예: "[강원] 2026년...", "[제주] 2026년...")
  for (const [regionKey, regionData] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of regionData.main) {
      if (titleText.includes(`[${kw}]`)) {
        // 서울일 경우 구 단위 정보도 감지
        const detectedDistrict = regionKey === 'seoul' ? detectSeoulDistrict(text) : undefined
        return {
          type: 'restricted',
          region: regionKey,
          detectedCity: undefined,
          detectedDistrict,
          confidence: 'high',
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
        // 서울일 경우 구 단위 정보도 감지
        const detectedDistrict = regionKey === 'seoul' ? detectSeoulDistrict(text) : undefined
        return {
          type: 'restricted',
          region: regionKey,
          detectedCity: undefined,
          detectedDistrict,
          confidence: 'high',
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
        // 서울일 경우 구 단위 정보도 감지
        const detectedDistrict = regionKey === 'seoul' ? detectSeoulDistrict(text) : undefined
        return {
          type: 'restricted',
          region: regionKey,
          detectedCity: !regionData.main.includes(kw) ? kw : undefined,
          detectedDistrict,
          confidence: 'high',
        }
      }
    }
  }

  // 3단계: 기관명 기반 지역 추론 (ORGANIZATION_REGION_MAP 우선 체크)
  const orgText = (announcement.organization || '').toLowerCase()

  // 3-1: 약어/영문명/특수 기관명 매핑 먼저 체크 (예: JDC → 제주, SBA → 서울)
  for (const [orgKeyword, regionKey] of Object.entries(ORGANIZATION_REGION_MAP)) {
    if (orgText.includes(orgKeyword.toLowerCase())) {
      const detectedDistrict = regionKey === 'seoul' ? detectSeoulDistrict(text) : undefined
      return {
        type: 'restricted',
        region: regionKey,
        detectedCity: undefined,
        detectedDistrict,
        confidence: 'high', // 명시적 매핑은 high confidence
        matchedOrg: orgKeyword, // 디버깅용
      }
    }
  }

  // 3-2: 기존 로직 - 기관명에 지역 키워드가 포함된 경우
  // (예: "강원테크노파크", "대구창조경제혁신센터", "김포시청")
  for (const [regionKey, regionData] of Object.entries(REGION_KEYWORDS)) {
    const allKeywords = getAllKeywordsForRegion(regionData)

    for (const kw of allKeywords) {
      if (orgText.includes(kw)) {
        // 서울일 경우 구 단위 정보도 감지
        const detectedDistrict = regionKey === 'seoul' ? detectSeoulDistrict(text) : undefined
        return {
          type: 'restricted',
          region: regionKey,
          detectedCity: !regionData.main.includes(kw) ? kw : undefined,
          detectedDistrict,
          confidence: 'medium', // 기관명 기반은 medium (지역 기관이지만 전국 대상일 수 있음)
        }
      }
    }
  }

  // [신규] 4단계: 제목/본문에 지역명이 단독으로 포함된 경우 (medium confidence)
  // 위의 패턴에 매칭되지 않았지만 지역명이 명확히 포함된 경우
  // 예: "제주 창업지원사업", "강원도 기업 지원"
  for (const [regionKey, regionData] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of regionData.main) {
      // 제목에 지역명이 포함되어 있고, 전국 대상이 아닌 경우
      if (titleText.includes(kw)) {
        // "전국", "지역무관" 등이 함께 있으면 제외
        if (text.includes('전국') || text.includes('지역무관') || text.includes('지역 무관')) {
          continue
        }
        const detectedDistrict = regionKey === 'seoul' ? detectSeoulDistrict(text) : undefined
        return {
          type: 'restricted',
          region: regionKey,
          detectedCity: undefined,
          detectedDistrict,
          confidence: 'medium', // 단순 키워드 포함은 medium
        }
      }
    }
  }

  return { type: 'unknown', confidence: 'low' }
}

/**
 * AI 분류 결과에서 지역 정보 추출 (4단계: AI 지역 분류 통합)
 * - classifyAnnouncement API의 regionRestriction 결과를 extractRegionRestriction 형식으로 변환
 *
 * @param {Object} aiClassification - AI 분류 결과 (regionRestriction 포함)
 * @returns {Object|null} extractRegionRestriction 형식의 결과 또는 null
 */
export function convertAiRegionToRestriction(aiClassification) {
  if (!aiClassification?.regionRestriction) {
    return null
  }

  const { type, region, confidence } = aiClassification.regionRestriction

  // confidence 변환 (0-100 → high/medium/low)
  let confidenceLevel = 'low'
  if (confidence >= 80) {
    confidenceLevel = 'high'
  } else if (confidence >= 50) {
    confidenceLevel = 'medium'
  }

  if (type === 'nationwide') {
    return { type: 'nationwide', confidence: confidenceLevel }
  }

  if (type === 'restricted' && region) {
    return {
      type: 'restricted',
      region,
      regions: [region],
      regionLabel: REGION_NAMES[region] || region,
      confidence: confidenceLevel,
      fromAI: true, // AI 분류 결과임을 표시
    }
  }

  return { type: 'unknown', confidence: 'low' }
}

/**
 * 지역 추출 (패턴 매칭 + AI 분류 통합)
 * - 1차: 패턴 매칭으로 지역 추출 시도
 * - 2차: unknown인 경우 AI 분류 결과 활용 (있으면)
 *
 * @param {Object} announcement - 공고 객체
 * @param {Object} aiClassification - AI 분류 결과 (optional, regionRestriction 포함)
 * @returns {Object} 지역 제한 정보
 */
export function extractRegionRestrictionWithAI(announcement, aiClassification = null) {
  // 1차: 패턴 매칭
  const patternResult = extractRegionRestriction(announcement)

  // 패턴 매칭 성공 시 반환
  if (patternResult.type !== 'unknown') {
    return patternResult
  }

  // 2차: AI 분류 결과 활용 (있으면)
  if (aiClassification?.regionRestriction) {
    const aiResult = convertAiRegionToRestriction(aiClassification)
    if (aiResult && aiResult.type !== 'unknown') {
      console.log(`[extractRegionWithAI] Using AI result for ${announcement.id}: ${aiResult.region}`)
      return aiResult
    }
  }

  // 둘 다 unknown인 경우
  return patternResult
}

/**
 * 텍스트에서 서울시 구 단위 정보 감지
 * @param {string} text - 검색 대상 텍스트
 * @returns {string|undefined} 감지된 구 코드 (예: 'gangnam') 또는 undefined
 */
function detectSeoulDistrict(text) {
  const lowerText = text.toLowerCase()
  for (const [districtKey, keywords] of Object.entries(SEOUL_DISTRICT_KEYWORDS)) {
    for (const kw of keywords) {
      // "강남구", "강남 지역", "강남구 소재" 등의 패턴 감지
      const patterns = [
        `${kw}구`,
        `${kw} 지역`,
        `${kw}구 소재`,
        `${kw} 소재`,
        `${kw}구 기업`,
        `${kw}구 창업`,
        `${kw}구청`,
        `[${kw}]`, // 제목 패턴
      ]
      if (patterns.some((pattern) => lowerText.includes(pattern))) {
        return districtKey
      }
    }
  }
  return undefined
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
 * Hard Filter 표준화된 라벨 (v2)
 * - 새로운 반환 구조에서 사용
 * - hardFailReasons/hardUnknownReasons에 포함
 */
export const HARD_FILTER_LABELS = {
  REGION_MISMATCH: 'REGION_MISMATCH',           // 지역 불일치
  TARGET_MISMATCH: 'TARGET_MISMATCH',           // 기업형태/업력 불일치
  COMPANY_SIZE_MISMATCH: 'COMPANY_SIZE_MISMATCH', // 기업규모 불일치
  INDUSTRY_MISMATCH: 'INDUSTRY_MISMATCH',       // 업종 불일치
  DUPLICATE_BENEFIT_RESTRICTION: 'DUPLICATE_BENEFIT_RESTRICTION', // 중복수혜 제한
  DEADLINE_PASSED: 'DEADLINE_PASSED',           // 마감일 경과
  MISSING_ELIGIBILITY_TEXT: 'MISSING_ELIGIBILITY_TEXT', // 지원자격 텍스트 없음
  EXTRACTION_LOW_CONFIDENCE: 'EXTRACTION_LOW_CONFIDENCE', // 추출 신뢰도 낮음
  MISSING_DATA: 'MISSING_DATA',                 // 프로필/공고 데이터 없음
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
 * source별 기본 confidence 결정 (향후 확장용)
 * @param {string} source - 공고 소스 (mss_api, bizinfo, kstartup 등)
 * @param {string} ruleType - 규칙 타입 (companyType, age, region, exclusion, mandatory)
 * @returns {string} confidence level
 */
// eslint-disable-next-line no-unused-vars
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
// eslint-disable-next-line no-unused-vars
function extractRegionRequirementsWithConfidence(announcement, _source) {
  const regionRestriction = extractRegionRestriction(announcement)

  let confidence = CONFIDENCE.LOW

  if (regionRestriction.type === 'restricted') {
    // 지역 제한이 명확하면 high
    // "OO시 소재 기업", "OO 지역 기업" 등은 비교적 확실한 표현
    confidence = CONFIDENCE.HIGH
  } else if (regionRestriction.type === 'nationwide') {
    confidence = CONFIDENCE.HIGH
  } else if (regionRestriction.type === 'excluded') {
    // 지역 제외가 명확하면 high (서울 제외, 수도권 제외 등)
    confidence = CONFIDENCE.HIGH
  }

  // 서울 구 단위 제한 정보 포함
  const result = {
    ...regionRestriction,
    confidence,
  }

  // 서울 구 단위가 감지된 경우 regions 배열에 추가
  if (regionRestriction.region === 'seoul' && regionRestriction.detectedDistrict) {
    result.regions = ['seoul']
    result.detectedDistrict = regionRestriction.detectedDistrict
    result.regionLabel = getSeoulDistrictLabel(regionRestriction.detectedDistrict)
  } else if (regionRestriction.region) {
    result.regions = [regionRestriction.region]
    result.regionLabel = REGION_NAMES[regionRestriction.region] || regionRestriction.region
  }

  return result
}

/**
 * 서울 구 코드를 한글 라벨로 변환
 */
function getSeoulDistrictLabel(districtCode) {
  const labels = {
    gangnam: '강남구',
    gangdong: '강동구',
    gangbuk: '강북구',
    gangseo: '강서구',
    gwanak: '관악구',
    gwangjin: '광진구',
    guro: '구로구',
    geumcheon: '금천구',
    nowon: '노원구',
    dobong: '도봉구',
    dongdaemun: '동대문구',
    dongjak: '동작구',
    mapo: '마포구',
    seodaemun: '서대문구',
    seocho: '서초구',
    seongdong: '성동구',
    seongbuk: '성북구',
    songpa: '송파구',
    yangcheon: '양천구',
    yeongdeungpo: '영등포구',
    yongsan: '용산구',
    eunpyeong: '은평구',
    jongno: '종로구',
    jung: '중구',
    jungnang: '중랑구',
  }
  return labels[districtCode] || districtCode
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
 * 공고의 기업형태 요구사항 추출 (향후 확장용)
 * @param {string} text - 공고 전체 텍스트
 * @returns {Object} { required: string[], excluded: string[] }
 */
// eslint-disable-next-line no-unused-vars
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
 * 공고의 업력(사업단계) 요구사항 추출 (향후 확장용)
 * @param {string} text - 공고 전체 텍스트
 * @returns {Object} { minYears?: number, maxYears?: number, stage?: string, preliminaryOnly?: boolean, establishedOnly?: boolean }
 */
// eslint-disable-next-line no-unused-vars
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
 * 명시적 제외 조건 추출 (향후 확장용)
 * @param {string} text - parsed.exclusionText
 * @param {Object} profile - 사용자 프로필
 * @returns {Object|null} { code: string, message: string } 또는 null
 */
// eslint-disable-next-line no-unused-vars
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
 * 필수 인증/요건 확인 (향후 확장용)
 * @param {string} mandatoryText - parsed.mandatoryText
 * @param {string} exclusionText - parsed.exclusionText (인증 필수 조건도 확인)
 * @param {Object} profile - 사용자 프로필
 * @returns {Object|null} { code: string, message: string } 또는 null
 */
// eslint-disable-next-line no-unused-vars
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

// ==============================================
// applyHardFilter: 새로운 Hard Filter 시스템 (v2)
// ==============================================

/**
 * 마감일 상태 체크
 * @param {Object} announcement - 공고 객체
 * @returns {{ fail: boolean, daysRemaining: number | null }}
 */
function checkDeadlineStatus(announcement) {
  if (!announcement.deadline) {
    return { fail: false, daysRemaining: null }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(announcement.deadline)
  deadlineDate.setHours(0, 0, 0, 0)
  const diff = deadlineDate - today
  const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24))

  return {
    fail: daysRemaining < 0,
    daysRemaining,
  }
}

/**
 * 지역 자격 체크
 * @param {Object} profile - 프로필
 * @param {Object} regionReq - 지역 요건
 * @returns {{ status: 'pass' | 'fail' | 'unknown', confidence: string, message?: string }}
 */
function checkRegionEligibilityForHardFilter(profile, regionReq) {
  // 전국 대상이면 무조건 통과
  if (!regionReq || regionReq.type === 'nationwide') {
    return { status: 'pass', confidence: CONFIDENCE.LOW }
  }

  // [개선] unknown 타입 처리 - 프로필에 지역 정보가 있으면 unknown으로 표시
  // (이전: 무조건 pass → 이제: 불확실함을 명시)
  if (regionReq.type === 'unknown') {
    return { status: 'unknown', confidence: CONFIDENCE.LOW }
  }

  // [추가] 지역 제외 타입 처리 (서울 제외, 수도권 제외 등)
  if (regionReq.type === 'excluded' && profile.region) {
    const profileRegion = profile.region
    const excludedRegions = regionReq.excludedRegions || []

    // 프로필 지역이 제외 목록에 포함되면 불일치
    if (excludedRegions.includes(profileRegion)) {
      return {
        status: 'fail',
        confidence: CONFIDENCE.HIGH,
        message: regionReq.excludedMessage || '해당 지역 기업 제외 공고',
      }
    }
  }

  if (regionReq.type === 'restricted' && profile.region) {
    // 지역 제한이 있고 프로필에 지역 정보가 있는 경우
    const profileRegion = profile.region
    const allowedRegions = regionReq.regions || []

    // 프로필 지역이 허용 목록에 없으면 불일치
    if (allowedRegions.length > 0 && !allowedRegions.includes(profileRegion)) {
      // [개선] confidence에 따라 다르게 처리
      // - high: 확실한 지역 제한 → fail
      // - medium: 가능성 높은 지역 제한 → fail (but lower confidence message)
      const reqConfidence = regionReq.confidence || CONFIDENCE.HIGH
      return {
        status: 'fail',
        confidence: reqConfidence,
        message: `${regionReq.regionLabel || '해당 지역'} 소재 기업 대상 공고`,
      }
    }

    // [추가] 서울 구 단위 체크: 같은 서울이지만 다른 구인 경우
    if (profileRegion === 'seoul' && regionReq.region === 'seoul' && regionReq.detectedDistrict) {
      // 프로필에 세부지역(구) 정보가 있는 경우 (subRegion 필드 사용)
      const profileDistrict = profile.subRegion || profile.seoulDistrict || profile.detailRegion
      if (profileDistrict && profileDistrict !== regionReq.detectedDistrict) {
        const districtLabel = getSeoulDistrictLabel(regionReq.detectedDistrict)
        const profileDistrictLabel = getSeoulDistrictLabel(profileDistrict)
        return {
          status: 'fail',
          confidence: CONFIDENCE.HIGH,
          message: `서울 ${districtLabel} 소재 기업만 지원 가능 (프로필: ${profileDistrictLabel})`,
        }
      }
    }
  }

  return { status: 'pass', confidence: CONFIDENCE.MEDIUM }
}

/**
 * 기업형태 자격 체크
 * @param {Object} profile - 프로필
 * @param {Object} companyTypeReq - 기업형태 요건
 * @returns {{ status: 'pass' | 'fail' | 'unknown', confidence: string, message?: string }}
 */
function checkCompanyTypeEligibilityForHardFilter(profile, companyTypeReq) {
  if (!companyTypeReq || !profile.companyType) {
    return { status: 'unknown', confidence: CONFIDENCE.LOW }
  }

  const { required, excluded, confidence } = companyTypeReq

  // HIGH confidence인 경우만 제외 처리
  if (confidence === CONFIDENCE.HIGH) {
    // 제외 목록에 포함
    if (excluded && excluded.includes(profile.companyType)) {
      const typeLabel = COMPANY_TYPE_LABELS[profile.companyType] || profile.companyType
      return {
        status: 'fail',
        confidence: CONFIDENCE.HIGH,
        message: `${typeLabel} 지원 불가`,
      }
    }

    // 필수 목록에 미포함 (법인만 가능 등)
    if (required && required.length > 0 && !required.includes(profile.companyType)) {
      // "법인만" 조건인데 개인사업자/예비창업자인 경우
      if (required.includes('corporation') && ['sole', 'preliminary'].includes(profile.companyType)) {
        return {
          status: 'fail',
          confidence: CONFIDENCE.HIGH,
          message: '법인기업만 지원 가능',
        }
      }
    }
  }

  return { status: 'pass', confidence: CONFIDENCE.MEDIUM }
}

/**
 * 업력 자격 체크
 * @param {Object} profile - 프로필
 * @param {Object} ageReq - 업력 요건
 * @returns {{ status: 'pass' | 'fail' | 'unknown', confidence: string, message?: string }}
 */
function checkBusinessAgeEligibilityForHardFilter(profile, ageReq) {
  if (!ageReq || !profile.businessAge) {
    return { status: 'unknown', confidence: CONFIDENCE.LOW }
  }

  // HIGH confidence인 경우만 제외 처리
  if (ageReq.confidence === CONFIDENCE.HIGH) {
    // 예비창업자 전용 공고인데 기창업자인 경우
    if (ageReq.preliminaryOnly && profile.businessAge !== 'preliminary') {
      return {
        status: 'fail',
        confidence: CONFIDENCE.HIGH,
        message: '예비창업자 전용 공고',
      }
    }

    // 기창업자 전용 공고인데 예비창업자인 경우
    if (ageReq.establishedOnly && profile.businessAge === 'preliminary') {
      return {
        status: 'fail',
        confidence: CONFIDENCE.HIGH,
        message: '기창업자(사업자등록 완료) 전용 공고',
      }
    }

    // 업력 제한 체크
    if (ageReq.maxYears && profile.businessAge !== 'preliminary') {
      const ageMap = {
        'under1': 0.5,
        '1to3': 2,
        '3to5': 4,
        '5to7': 6,
        'over7': 10,
      }
      const profileYears = ageMap[profile.businessAge] || 0
      if (profileYears > ageReq.maxYears) {
        return {
          status: 'fail',
          confidence: CONFIDENCE.HIGH,
          message: `업력 ${ageReq.maxYears}년 이하 기업만 지원 가능`,
        }
      }
    }
  }

  return { status: 'pass', confidence: CONFIDENCE.MEDIUM }
}

/**
 * 신청 대상 유형 체크 (지방자치단체, 공공기관 등 기업이 아닌 대상)
 * 기업 사용자에게는 이러한 공고가 맞춤 추천되면 안 됨
 * [개선] eligibility 필드에서 추출된 대상 정보도 활용
 * @param {Object} announcement - 공고
 * @returns {{ excluded: boolean, targetType?: string, message?: string }}
 */
function checkTargetTypeForHardFilter(announcement) {
  const eligibility = announcement.eligibility || []
  const fullText = [
    announcement.title || '',
    announcement.summary || '',
    ...eligibility,
    ...(announcement.tags || []),
  ].join(' ').toLowerCase()

  // ✅ [개선] eligibility 필드에서 직접 특수 대상 체크
  // fetchAnnouncements.js에서 추출한 eligibility 값 활용
  const specialTargetInEligibility = [
    { value: '교육생', type: 'education', label: '교육생/참가자' },
    { value: '운영사', type: 'operator', label: '운영사/주관기관' },
    { value: '지방자치단체', type: 'government', label: '지방자치단체' },
    { value: '공공기관', type: 'public', label: '공공기관' },
    { value: '대학', type: 'university', label: '대학/교육기관' },
    { value: '연구기관', type: 'research', label: '연구기관' },
  ]

  for (const { value, type, label } of specialTargetInEligibility) {
    if (eligibility.includes(value)) {
      return {
        excluded: true,
        targetType: type,
        message: `${label} 대상 공고 (기업 신청 불가)`,
        source: 'eligibility_extraction',
      }
    }
  }

  // 신청 대상이 기업이 아닌 경우 (지방자치단체, 공공기관, 대학, 연구기관 등)
  const nonBusinessTargetPatterns = [
    // 지방자치단체 대상
    { pattern: /신청\s*자격[^.]*지방\s*자치\s*단체/, type: 'government', label: '지방자치단체' },
    { pattern: /신청\s*대상[^.]*지방\s*자치\s*단체/, type: 'government', label: '지방자치단체' },
    { pattern: /지방\s*자치\s*단체\s*(대상|만|에\s*한|한정)/, type: 'government', label: '지방자치단체' },
    { pattern: /지자체\s*(대상|만|에\s*한|한정|모집)/, type: 'government', label: '지방자치단체' },
    { pattern: /기초\s*자치\s*단체/, type: 'government', label: '기초자치단체' },
    { pattern: /광역\s*자치\s*단체/, type: 'government', label: '광역자치단체' },
    // 공공기관 대상
    { pattern: /공공\s*기관\s*(대상|만|에\s*한|한정|모집)/, type: 'public', label: '공공기관' },
    // 대학/연구기관 대상 (기업 제외)
    { pattern: /대학\s*(대상|만|에\s*한|한정)[^기업]/, type: 'university', label: '대학' },
    { pattern: /연구\s*(기관|소)\s*(대상|만|에\s*한|한정)/, type: 'research', label: '연구기관' },
  ]

  for (const { pattern, type, label } of nonBusinessTargetPatterns) {
    if (pattern.test(fullText)) {
      return {
        excluded: true,
        targetType: type,
        message: `${label} 대상 공고 (기업 신청 불가)`,
        source: 'text_pattern',
      }
    }
  }

  return { excluded: false }
}

/**
 * 업종 불일치 체크 (강한 패널티 레벨만 제외)
 * @param {Object} profile - 프로필
 * @param {Object} announcement - 공고
 * @returns {{ mismatch: boolean, penaltyLevel: 'strong' | 'normal' | null, message?: string }}
 */
function checkIndustryMismatchForHardFilter(profile, announcement) {
  // 전통제조/시설공간 등 강한 불일치 키워드 체크
  const fullText = [
    announcement.title || '',
    announcement.summary || '',
    ...(announcement.tags || []),
  ].join(' ').toLowerCase()

  const profileInterests = profile.interests || []
  const profileText = [
    profile.serviceName || '',
    profile.businessOverview || '',
  ].join(' ').toLowerCase()

  // 1. 특수 공고 유형 탐지 (교육생/참가자 모집, 장비 이용 등)
  const specialProgramResult = detectSpecialProgramType(fullText)
  if (specialProgramResult.isSpecial) {
    return {
      mismatch: true,
      penaltyLevel: 'strong',
      message: specialProgramResult.message,
      specialType: specialProgramResult.type,
    }
  }

  // 2. 특정 산업/업종 대상 공고 탐지
  const industryTargetResult = detectIndustryTargetMismatch(fullText, profileInterests, profileText)
  if (industryTargetResult.mismatch) {
    return industryTargetResult
  }

  // 3. 전통제조/시설 키워드 체크 (기존 로직)
  const strongMismatchKeywords = [
    '가죽', '피혁', '봉제', '원단', '섬유', '직물',
    '공방', '수공예', '도자기', '목공', '주물', '주조', '단조',
    '입주공간', '창업공간', '제조공간', '공장임대', '장비지원',
    '건설', '시공', '토목', '배관', '전기공사',
  ]

  const digitalInterests = ['ai', 'saas', 'ict', 'data', 'content', 'fintech', 'platform']
  const isDigitalService = profileInterests.some(i => digitalInterests.includes(i)) ||
    profileText.match(/ai|saas|플랫폼|소프트웨어|앱|서비스|음악|음원|콘텐츠/)

  if (isDigitalService) {
    const hasMismatchKeyword = strongMismatchKeywords.some(kw => fullText.includes(kw))
    if (hasMismatchKeyword) {
      return {
        mismatch: true,
        penaltyLevel: 'strong',
        message: '업종 불일치 (전통제조/시설 공고)',
      }
    }
  }

  return { mismatch: false, penaltyLevel: null }
}

/**
 * 특수 공고 유형 탐지 (교육생 모집, 장비 이용, 운영사 모집 등)
 * - 일반 스타트업 지원금 공고가 아닌 특수 목적 공고 필터링
 */
function detectSpecialProgramType(text) {
  // 교육생/참가자 모집 패턴
  const educationPatterns = [
    /교육생\s*모집/,
    /참가자\s*모집/,
    /수강생\s*모집/,
    /연수생\s*모집/,
    /교육\s*참여자?\s*모집/,
    /이용\s*교육생/,
    /장비\s*이용\s*교육/,
    /실습\s*교육/,
    /기초\s*교육/,
    /교육\s*대상[^.]*창업자/,  // "교육 대상: ~창업자"
    /교육\s*대상[^.]*관계자/,  // "교육 대상: ~관계자"
    /교육\s*프로그램\s*참가/,
    /아카데미\s*(참가|모집|신청)/,
    /부트캠프\s*(참가|모집|신청)/,
    /부트캠프[^.]*교육\s*(신청|안내|모집)/,  // "부트캠프 ~ 교육 신청 안내"
    /창업\s*부트캠프/,  // "창업부트캠프"
    /교육\s*신청\s*안내/,  // "교육 신청 안내"
  ]
  for (const pattern of educationPatterns) {
    if (pattern.test(text)) {
      return { isSpecial: true, type: 'education_recruitment', message: '교육생/참가자 모집 공고 (기업 지원금 아님)' }
    }
  }

  // 장비/시설 이용 모집 패턴
  const equipmentPatterns = [
    /장비\s*이용/,
    /시설\s*이용/,
    /기자재\s*이용/,
    /레이저\s*커팅/,
    /레이저\s*각인/,
    /3d\s*프린터/,
    /cnc/,
    /uv\s*프린터/,
    /목공\s*장비/,
    /메이커\s*장비/,
    /메이커스페이스/,
    /팹랩/,
  ]
  for (const pattern of equipmentPatterns) {
    if (pattern.test(text)) {
      return { isSpecial: true, type: 'equipment_usage', message: '장비/시설 이용자 모집 (기업 지원금 아님)' }
    }
  }

  // 운영사/기관 모집 패턴
  const operatorPatterns = [
    /운영사\s*모집/,
    /운영기관\s*모집/,
    /주관기관\s*모집/,
    /수행기관\s*모집/,
    /위탁기관\s*모집/,
    /협약기관\s*모집/,
    /교육기관\s*모집/,
    /컨설팅\s*기관\s*모집/,
  ]
  for (const pattern of operatorPatterns) {
    if (pattern.test(text)) {
      return { isSpecial: true, type: 'operator_recruitment', message: '운영사/기관 모집 (일반 기업 대상 아님)' }
    }
  }

  return { isSpecial: false }
}

/**
 * 특정 산업/업종 대상 공고 탐지
 * - 공고가 특정 산업만 대상으로 하는 경우 프로필 업종과 비교
 */
function detectIndustryTargetMismatch(text, profileInterests, profileText) {
  // 산업별 대상 키워드 그룹
  const industryTargets = [
    {
      name: '바이오/헬스케어',
      keywords: ['바이오', '헬스케어', '의료기기', '제약', '생명공학', '진단키트', '임상', '신약', '디지털헬스케어'],
      matchPatterns: [
        /바이오\s*(기업|스타트업|벤처|분야|전\s*분야|큐브)/,  // "바이오 전 분야", "바이오큐브"
        /헬스케어\s*(기업|분야)/,
        /의료\s*기기\s*(기업|제조)/,
        /바이오[^.]*창업자/,  // "바이오 ~ 창업자"
        /바이오[^.]*교육/,    // "바이오 ~ 교육"
      ],
      allowedProfileKeywords: ['바이오', 'bio', 'healthcare', '의료', '헬스', '제약', '진단'],
      allowedInterests: ['bio', 'healthcare'],
    },
    {
      name: '기후테크/환경',
      keywords: ['기후테크', '탄소중립', '그린뉴딜', '친환경', '재생에너지', '신재생', '태양광', '풍력', '수소'],
      matchPatterns: [/기후\s*테크/, /탄소\s*중립/, /그린\s*(뉴딜|산업|기술)/, /친환경\s*(기업|기술)/],
      allowedProfileKeywords: ['기후', '탄소', '환경', '에너지', '그린', 'esg', '친환경'],
      allowedInterests: ['greentech', 'energy', 'environment'],
    },
    {
      name: '관광/여행',
      keywords: ['관광', '여행', '숙박', '호텔', '리조트', '펜션', '민박', '관광지', '여행사'],
      matchPatterns: [/관광\s*(기업|산업|업체)/, /여행\s*(기업|업체|사)/, /숙박\s*(업|시설)/],
      allowedProfileKeywords: ['관광', '여행', '숙박', '호텔', 'travel', 'tourism'],
      allowedInterests: ['tourism', 'travel'],
    },
    {
      name: '수산/어업',
      keywords: ['수산', '어업', '양식', '어촌', '수협', '어선', '해양', '어민'],
      matchPatterns: [/수산\s*(업|기업|물)/, /어업\s*(인|기업)/, /양식\s*(업|장)/],
      allowedProfileKeywords: ['수산', '어업', '양식', '해양', '어촌'],
      allowedInterests: ['fishery', 'marine'],
    },
    {
      name: '농업/축산',
      keywords: ['농업', '축산', '농촌', '영농', '농가', '축산업', '낙농', '양계', '양돈'],
      matchPatterns: [/농업\s*(인|기업|법인)/, /축산\s*(업|농가)/, /영농\s*법인/],
      allowedProfileKeywords: ['농업', '축산', '농촌', '스마트팜', '애그테크', 'agtech'],
      allowedInterests: ['agriculture', 'agtech', 'smartfarm'],
    },
    {
      name: '무역/수출',
      keywords: ['수출', '무역', '해외진출', '수입', '통관', '관세', 'fta', '수출입'],
      matchPatterns: [/수출\s*(기업|업체|지원)/, /무역\s*(기업|업체|회사)/, /해외\s*진출\s*기업/],
      allowedProfileKeywords: ['수출', '무역', '해외', '글로벌', 'export', 'trade', 'global'],
      allowedInterests: ['trade', 'export', 'global'],
    },
  ]

  // 프로필이 디지털/IT 서비스인지 확인
  const digitalKeywords = ['ai', '인공지능', '플랫폼', 'saas', '소프트웨어', 'sw', '앱', '서비스', '음악', '음원', '콘텐츠', '미디어']
  const isDigitalProfile = profileInterests.some(i => ['ai', 'saas', 'ict', 'data', 'content', 'fintech', 'platform'].includes(i)) ||
    digitalKeywords.some(kw => profileText.includes(kw))

  if (!isDigitalProfile) {
    return { mismatch: false }
  }

  // 각 산업별로 공고가 해당 산업 대상인지 확인
  for (const industry of industryTargets) {
    // 공고가 해당 산업 대상인지 확인 (matchPatterns로 더 정확하게)
    const isIndustryTarget = industry.matchPatterns.some(pattern => pattern.test(text)) ||
      (industry.keywords.filter(kw => text.includes(kw)).length >= 2) // 키워드 2개 이상 매칭

    if (isIndustryTarget) {
      // 프로필이 해당 산업과 관련 있는지 확인
      const profileHasIndustry = industry.allowedInterests.some(i => profileInterests.includes(i)) ||
        industry.allowedProfileKeywords.some(kw => profileText.includes(kw))

      if (!profileHasIndustry) {
        return {
          mismatch: true,
          penaltyLevel: 'strong',
          message: `${industry.name} 분야 대상 공고 (프로필 업종 불일치)`,
          targetIndustry: industry.name,
        }
      }
    }
  }

  return { mismatch: false }
}

/**
 * Hard Filter 적용 (v2 - 새로운 반환 구조)
 *
 * 차단 게이트로서의 역할:
 * - hardPass: true → 통과, false → 제외, null → 미확인(기본 포함)
 * - HIGH confidence 조건만 제외 트리거
 * - Unknown(미확인)은 기본 포함하되 경고 표시
 *
 * @param {Object} profile - 사용자 프로필
 * @param {Object} announcement - 지원사업 공고
 * @param {Object} options - 옵션 (향후 확장용)
 * @returns {{
 *   hardPass: boolean | null,
 *   hardFailReasons: Array<{ label: string, message: string, confidence: string, source?: string }>,
 *   hardUnknownReasons: Array<{ label: string, message: string, reason: string }>,
 *   hardConfidence: 'high' | 'medium' | 'low'
 * }}
 */
export function applyHardFilter(profile, announcement, options = {}) {
  const failReasons = []
  const unknownReasons = []

  // 1. 입력 검증
  if (!profile || !announcement) {
    return {
      hardPass: null,
      hardFailReasons: [],
      hardUnknownReasons: [{
        label: HARD_FILTER_LABELS.MISSING_DATA,
        message: '프로필 또는 공고 데이터 없음',
        reason: 'NO_INPUT_DATA',
      }],
      hardConfidence: CONFIDENCE.LOW,
    }
  }

  const source = announcement.source || 'unknown'
  const hasParsedData = !!(announcement.parsed?.eligibilityText)

  // 2. 마감일 체크
  const deadlineResult = checkDeadlineStatus(announcement)
  if (deadlineResult.fail) {
    failReasons.push({
      label: HARD_FILTER_LABELS.DEADLINE_PASSED,
      message: `마감일 경과 (D${deadlineResult.daysRemaining})`,
      confidence: CONFIDENCE.HIGH,
      source: 'deadline',
    })
  }

  // 3. 요구사항 추출
  const requirements = buildHardRequirements(announcement)

  // 3.5 [v3] 제외 관심 분야 체크 (HIGH confidence - 즉시 제외)
  const excludedCheck = checkExcludedInterests(profile, announcement)
  if (excludedCheck.excluded) {
    failReasons.push({
      label: HARD_FILTER_LABELS.INDUSTRY_MISMATCH,
      message: excludedCheck.reason,
      confidence: CONFIDENCE.HIGH,
      source: 'excludedInterests',
      excludedType: excludedCheck.excludedType,
    })
  }

  // 4. 데이터 가용성 체크 (bizinfo/kstartup은 parsed 없음)
  if (!hasParsedData && ['bizinfo', 'kstartup'].includes(source)) {
    unknownReasons.push({
      label: HARD_FILTER_LABELS.MISSING_ELIGIBILITY_TEXT,
      message: '지원자격 상세 정보 없음',
      reason: 'NO_PARSED_DATA',
    })
  }

  // 5. 지역 체크 (HIGH + MEDIUM confidence 제외)
  // 지역은 다른 조건보다 명확한 제한이므로 medium도 제외 처리
  const regionResult = checkRegionEligibilityForHardFilter(profile, requirements.region)
  if (regionResult.status === 'fail') {
    // HIGH confidence: 확실한 지역 불일치 → 추천에서 제외
    // MEDIUM confidence: 가능성 높은 지역 불일치 → 추천에서 제외하되 경고 메시지 다름
    const isHighConfidence = regionResult.confidence === CONFIDENCE.HIGH
    failReasons.push({
      label: HARD_FILTER_LABELS.REGION_MISMATCH,
      message: regionResult.message,
      confidence: regionResult.confidence,
      source: 'region',
      isRegionMismatch: true, // 지역 불일치 명시
    })

    // MEDIUM confidence인 경우 unknownReasons에도 추가 (사용자에게 확인 권장)
    if (!isHighConfidence) {
      unknownReasons.push({
        label: HARD_FILTER_LABELS.REGION_MISMATCH,
        message: `${regionResult.message} (확인 필요)`,
        reason: 'REGION_MEDIUM_CONFIDENCE',
      })
    }
  }

  // 6. 기업형태 체크 (HIGH confidence만 제외)
  const companyResult = checkCompanyTypeEligibilityForHardFilter(profile, requirements.companyType)
  if (companyResult.status === 'fail' && companyResult.confidence === CONFIDENCE.HIGH) {
    failReasons.push({
      label: HARD_FILTER_LABELS.TARGET_MISMATCH,
      message: companyResult.message,
      confidence: CONFIDENCE.HIGH,
      source: 'companyType',
    })
  }

  // 7. 업력 체크 (HIGH confidence만 제외)
  const ageResult = checkBusinessAgeEligibilityForHardFilter(profile, requirements.age)
  if (ageResult.status === 'fail' && ageResult.confidence === CONFIDENCE.HIGH) {
    failReasons.push({
      label: HARD_FILTER_LABELS.TARGET_MISMATCH,
      message: ageResult.message,
      confidence: CONFIDENCE.HIGH,
      source: 'businessAge',
    })
  }

  // 8. 업종 불일치 체크 (strong penalty는 HIGH confidence로 제외)
  if (!options.skipIndustryCheck) {
    const industryResult = checkIndustryMismatchForHardFilter(profile, announcement)
    if (industryResult.mismatch && industryResult.penaltyLevel === 'strong') {
      // 특수 공고 유형(교육생 모집, 장비 이용, 운영사 모집)은 HIGH confidence
      // 산업 대상 불일치도 HIGH confidence
      const isSpecialType = ['education_recruitment', 'equipment_usage', 'operator_recruitment'].includes(industryResult.specialType)
      const isIndustryTarget = !!industryResult.targetIndustry
      const confidence = (isSpecialType || isIndustryTarget) ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM

      failReasons.push({
        label: HARD_FILTER_LABELS.INDUSTRY_MISMATCH,
        message: industryResult.message,
        confidence,
        source: 'industry',
        specialType: industryResult.specialType,
        targetIndustry: industryResult.targetIndustry,
      })
    }
  }

  // 8.5 신청 대상 유형 체크 (지방자치단체, 공공기관 등 기업이 아닌 대상)
  const targetTypeResult = checkTargetTypeForHardFilter(announcement)
  if (targetTypeResult.excluded) {
    failReasons.push({
      label: HARD_FILTER_LABELS.TARGET_MISMATCH,
      message: targetTypeResult.message,
      confidence: CONFIDENCE.HIGH,
      source: 'targetType',
      targetType: targetTypeResult.targetType,
    })
  }

  // 8.6 [신규] 관심분야 호환성 체크 (기술 분야 vs 농업/제조/건설 등)
  const interestCompatibility = checkInterestCompatibility(profile, announcement)
  if (!interestCompatibility.compatible) {
    failReasons.push({
      label: HARD_FILTER_LABELS.INDUSTRY_MISMATCH,
      message: interestCompatibility.reason,
      confidence: CONFIDENCE.MEDIUM, // 완전 배제보다는 경고 수준
      source: 'interestCompatibility',
      incompatibleIndustry: interestCompatibility.industry,
    })
  }

  // 8.7 [신규] 관심분야 매칭률 체크 (0% 매칭 시 경고)
  const interestMatch = calculateInterestMatchRate(profile, announcement)
  if (interestMatch.matchRate === 0 && (profile?.interests?.length || 0) > 0) {
    // 범용 카테고리는 예외 처리 (창업, 수출 등은 산업 불문)
    const hasGeneralCategory = (announcement.category || []).some((cat) =>
      ['창업', '수출', 'R&D', '마케팅', '일반'].includes(cat)
    )

    if (!hasGeneralCategory) {
      // 완전 불일치이지만 MEDIUM confidence (경고 수준)
      unknownReasons.push({
        label: HARD_FILTER_LABELS.INDUSTRY_MISMATCH,
        message: `관심분야(${profile.interests.join(', ')})와 공고 카테고리가 일치하지 않습니다`,
        reason: 'INTEREST_ZERO_MATCH',
      })
    }
  }

  // 9. 최종 결정 (Unknown은 기본 포함)
  const highConfidenceFails = failReasons.filter(r => r.confidence === CONFIDENCE.HIGH)
  // [개선] 지역 불일치는 MEDIUM confidence도 제외 처리
  const regionMismatchFails = failReasons.filter(r => r.isRegionMismatch && r.confidence === CONFIDENCE.MEDIUM)

  if (highConfidenceFails.length > 0 || regionMismatchFails.length > 0) {
    // HIGH confidence 제외 사유 있음 → hardPass: false
    // 또는 지역 불일치(MEDIUM)가 있음 → hardPass: false
    const mainConfidence = highConfidenceFails.length > 0 ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM
    return {
      hardPass: false,
      hardFailReasons: failReasons,
      hardUnknownReasons: [],
      hardConfidence: mainConfidence,
    }
  } else if (unknownReasons.length > 0) {
    // 미확인 사항 있음 → hardPass: null (기본 포함, 경고 표시)
    return {
      hardPass: null,
      hardFailReasons: failReasons,
      hardUnknownReasons: unknownReasons,
      hardConfidence: CONFIDENCE.LOW,
    }
  } else {
    // 통과
    return {
      hardPass: true,
      hardFailReasons: [],
      hardUnknownReasons: [],
      hardConfidence: hasParsedData ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM,
    }
  }
}

/**
 * Hard Filter: 프로필이 공고의 자격 조건을 충족하는지 사전 검증
 *
 * [v2] applyHardFilter를 내부적으로 호출하여 하위 호환성 유지
 * - 기존 반환 형식: { isEligible, eligible, excludedReason, excludedReasons }
 * - 새로운 applyHardFilter 결과를 기존 형식으로 변환
 *
 * @param {Object} profile - 사용자 프로필
 * @param {Object} announcement - 지원사업 공고
 * @returns {Object} { isEligible, eligible, excludedReason, excludedReasons }
 */
export function checkEligibility(profile, announcement) {
  // 새로운 Hard Filter 적용
  const result = applyHardFilter(profile, announcement)

  // 기존 형식으로 변환
  const allReasons = [...result.hardFailReasons, ...result.hardUnknownReasons]

  // excludedReason: 첫 번째 실패 사유
  const excludedReason = result.hardFailReasons[0]
    ? { code: result.hardFailReasons[0].label, message: result.hardFailReasons[0].message }
    : null

  // excludedReasons: 모든 사유 (로그용)
  const excludedReasons = allReasons.map(r => ({
    code: r.label,
    message: r.message,
    confidence: r.confidence || CONFIDENCE.LOW,
    priority: PRIORITY.P0, // 기본값
  }))

  return {
    eligible: result.hardPass !== false, // null(unknown)은 eligible로 처리 (기본 포함)
    isEligible: result.hardPass !== false,
    excludedReason,
    ...(excludedReason ? { excludedReasonText: excludedReason.message } : {}),
    excludedReasons,
    // 새로운 필드 (v2)
    hardFilterResult: result,
  }
}

/**
 * 텍스트에서 키워드 매칭 점수 계산 (향후 확장용)
 * @param {string} profileText - 프로필 텍스트 (businessOverview, targetMarket 등)
 * @param {string} announcementText - 공고 텍스트 (title, summary 등)
 * @returns {number} 매칭된 키워드 수
 */
// eslint-disable-next-line no-unused-vars
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
 * Industry Mismatch Penalty 완화 키워드
 * - 공고에 이 키워드가 명시적으로 포함되면 mismatch penalty를 완화
 * - AI/SW/디지털 서비스도 대상인 공고임을 나타냄
 */
const PENALTY_MITIGATION_KEYWORDS = [
  'ai', '인공지능', '데이터', 'sw', '소프트웨어', '플랫폼', 'saas',
  '디지털', '디지털전환', 'ict', 'it', '콘텐츠', '앱', '어플',
  '온라인', '이커머스', '클라우드', '블록체인', '핀테크',
]

/**
 * 도메인 키워드 그룹 (matchedDomains 추출용)
 */
const DOMAIN_KEYWORDS = {
  ai: ['ai', '인공지능', '머신러닝', '딥러닝', 'llm', 'gpt', 'chatgpt'],
  saas: ['saas', '구독', '클라우드', '서비스형'],
  data: ['데이터', '빅데이터', '데이터분석', '데이터플랫폼'],
  ict: ['ict', 'it', '정보통신', '소프트웨어', 'sw'],
  content: ['콘텐츠', '미디어', '영상', '음악', '게임', '웹툰'],
  fintech: ['핀테크', '금융', '블록체인', '암호화폐', '결제'],
  bio: ['바이오', '헬스케어', '의료', '건강'],
  manufacturing: ['제조', '생산', '공장', '스마트팩토리'],
  foodtech: ['푸드테크', '식품', '음식'],
}

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
 * 프로필의 사업개요/타겟시장에서 핵심 키워드 추출
 * @param {Object} profile - 사용자 프로필
 * @returns {Object} { keywords: string[], targetType: 'b2b' | 'b2c' | 'b2g' | null, domains: string[] }
 */
function extractProfileKeywords(profile) {
  const text = [
    profile.serviceName || '',
    profile.businessOverview || '',
    profile.targetMarket || '',
  ].join(' ').toLowerCase()

  const keywords = []
  const domains = []

  // 기술/서비스 키워드 추출
  const techKeywords = {
    ai: ['ai', '인공지능', '머신러닝', '딥러닝', 'llm', 'gpt', '자동화'],
    music: ['음악', '음원', '사운드', '오디오', '스트리밍', '저작권'],
    content: ['콘텐츠', '미디어', '영상', '동영상', '크리에이터'],
    platform: ['플랫폼', 'saas', '서비스', '앱', '어플리케이션'],
    data: ['데이터', '분석', '빅데이터', '추천'],
    iot: ['iot', '스마트', '센서', '하드웨어', '디바이스'],
    blockchain: ['블록체인', '암호화폐', 'nft', '토큰'],
    fintech: ['핀테크', '금융', '결제', '송금', '보험'],
  }

  for (const [domain, kws] of Object.entries(techKeywords)) {
    if (kws.some(kw => text.includes(kw))) {
      domains.push(domain)
      keywords.push(...kws.filter(kw => text.includes(kw)))
    }
  }

  // 타겟 시장 유형 감지 (B2B/B2C/B2G)
  let targetType = null
  if (text.includes('b2b') || text.includes('기업') || text.includes('사업자') ||
      text.includes('매장') || text.includes('점포') || text.includes('업체')) {
    targetType = 'b2b'
  } else if (text.includes('b2c') || text.includes('소비자') || text.includes('개인') ||
             text.includes('일반인') || text.includes('사용자')) {
    targetType = 'b2c'
  } else if (text.includes('b2g') || text.includes('공공') || text.includes('정부') ||
             text.includes('관공서') || text.includes('지자체')) {
    targetType = 'b2g'
  }

  return { keywords: [...new Set(keywords)], targetType, domains: [...new Set(domains)] }
}

/**
 * 프로필의 제외 관심 분야와 공고가 매칭되는지 확인
 * @param {Object} profile - 사용자 프로필
 * @param {Object} announcement - 공고
 * @returns {Object} { excluded: boolean, reason: string | null }
 */
function checkExcludedInterests(profile, announcement) {
  const excludedInterests = profile.excludedInterests || []
  if (excludedInterests.length === 0) {
    return { excluded: false, reason: null }
  }

  const announcementText = [
    announcement.title || '',
    announcement.summary || '',
    ...(announcement.tags || []),
  ].join(' ').toLowerCase()

  // 제외 관심 분야 키워드 매핑
  const excludedKeywordsMap = {
    bio: ['바이오', '헬스케어', '의료', '제약', '진단', '임상', '신약', '생명공학'],
    agriculture: ['농업', '축산', '농촌', '영농', '작물', '재배', '농가'],
    fishery: ['수산', '어업', '양식', '어촌', '해양', '어선'],
    tourism: ['관광', '여행', '숙박', '호텔', '리조트', '펜션', '관광지'],
    construction: ['건설', '건축', '시공', '토목', '리모델링', '배관', '전기공사'],
    manufacturing: ['가죽', '피혁', '봉제', '섬유', '직물', '공방', '수공예', '도자기', '목공', '소공인'],
    trade: ['수출', '무역', '해외진출', '통관', '관세'],
    climate: ['기후테크', '탄소중립', '그린뉴딜', '친환경', '재생에너지', '태양광', '풍력'],
    food: ['요식업', '외식업', '음식점', '식당', '베이커리', '프랜차이즈', '가맹점'],
    beauty: ['미용실', '헤어샵', '네일샵', '피부관리실', '에스테틱'],
  }

  for (const excluded of excludedInterests) {
    const keywords = excludedKeywordsMap[excluded]
    if (keywords) {
      // 키워드가 2개 이상 매칭되거나, 제목에서 1개 매칭되면 제외
      const matchedKeywords = keywords.filter(kw => announcementText.includes(kw))
      const titleText = (announcement.title || '').toLowerCase()
      const titleMatch = keywords.some(kw => titleText.includes(kw))

      if (matchedKeywords.length >= 2 || titleMatch) {
        const labelMap = {
          bio: '바이오/헬스케어', agriculture: '농업/축산', fishery: '수산/어업',
          tourism: '관광/여행', construction: '건설/건축', manufacturing: '전통 제조/공방',
          trade: '무역/수출입', climate: '기후테크/환경', food: '요식업/식품', beauty: '미용/뷰티샵',
        }
        return {
          excluded: true,
          reason: `제외 관심 분야: ${labelMap[excluded] || excluded}`,
          excludedType: excluded,
        }
      }
    }
  }

  return { excluded: false, reason: null }
}

/**
 * 프로필과 공고를 비교하여 매칭률 계산
 *
 * [v2] Relevance Gate + Industry Mismatch Penalty 추가
 * - 도메인 적합도(관심분야+키워드 매칭)가 THRESHOLD 미만이면 점수 상한 적용
 * - 업종 특화 공고에 무관한 프로필은 패널티 적용
 *
 * [v3] 사업개요/타겟시장 키워드 추출 및 제외 관심 분야 필터링 추가
 * - businessOverview에서 핵심 키워드 자동 추출하여 매칭에 반영
 * - targetMarket에서 B2B/B2C 유형 감지
 * - excludedInterests에 해당하는 공고는 점수 0 반환
 *
 * @param {Object} profile - 사용자 프로필
 * @param {Object} announcement - 지원사업 공고
 * @returns {number} 0-100 사이의 매칭률
 */
export function calculateMatchingScore(profile, announcement) {
  if (!profile || !announcement) return 0

  // [v3] 제외 관심 분야 체크 - 해당되면 즉시 0점 반환
  const excludedCheck = checkExcludedInterests(profile, announcement)
  if (excludedCheck.excluded) {
    return 0
  }

  // [v3] 프로필 키워드 추출
  const profileKeywords = extractProfileKeywords(profile)

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
    industryMismatchGroup: null, // 감지된 업종 그룹명
    penaltyMitigated: false, // AI/SW 키워드로 패널티 완화 여부
    matchedDomains: [], // 프로필과 매칭된 도메인 목록
    stageBoost: 0,
    stageBoostApplied: false,
    // [v3] 추가 필드
    profileKeywords: profileKeywords.keywords,
    profileTargetType: profileKeywords.targetType,
    profileDomains: profileKeywords.domains,
    businessOverviewBonus: 0,
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
  // profileKeywords는 상단에서 extractProfileKeywords(profile)로 이미 추출됨
  const simpleKeywords = extractKeywordsFromProfile(profile)
  let keywordMatchCount = 0
  if (simpleKeywords.length > 0) {
    simpleKeywords.forEach(keyword => {
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

  // [v3] 사업개요/타겟시장에서 추출한 도메인 키워드 보너스 (최대 10점)
  // - profileKeywords.domains와 공고 텍스트의 매칭
  if (profileKeywords.domains.length > 0) {
    const domainKeywordMap = {
      ai: ['ai', '인공지능', '머신러닝', '딥러닝', '자동화'],
      music: ['음악', '음원', '사운드', '오디오', '스트리밍'],
      content: ['콘텐츠', '미디어', '영상', '동영상', '크리에이터'],
      platform: ['플랫폼', 'saas', '서비스형'],
      data: ['데이터', '분석', '빅데이터'],
      iot: ['iot', '스마트', '센서'],
      blockchain: ['블록체인', 'nft', '토큰'],
      fintech: ['핀테크', '금융', '결제'],
    }

    let domainMatchCount = 0
    profileKeywords.domains.forEach(domain => {
      const keywords = domainKeywordMap[domain]
      if (keywords && keywords.some(kw => fullSearchText.includes(kw))) {
        domainMatchCount++
      }
    })

    if (domainMatchCount > 0) {
      breakdown.businessOverviewBonus = Math.min(10, domainMatchCount * 5)
      score += breakdown.businessOverviewBonus
      breakdown.matchedDomains = profileKeywords.domains.filter(domain => {
        const keywords = domainKeywordMap[domain]
        return keywords && keywords.some(kw => fullSearchText.includes(kw))
      })
    }
  }

  // ============================================================
  // [NEW] Relevance Score 계산 (Relevance Gate용)
  // ============================================================
  const relevanceScore = breakdown.interestScore + breakdown.keywordScore + breakdown.businessOverviewBonus

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
  // 3. 지역 매칭 (최대 18점 - 서울 구 단위 보너스 포함)
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

        // 서울 구 단위 매칭 보너스: 프로필에 subRegion이 있고, 공고에도 구 단위가 감지된 경우
        if (
          profile.region === 'seoul' &&
          profile.subRegion &&
          regionRestriction.detectedDistrict
        ) {
          if (profile.subRegion === regionRestriction.detectedDistrict) {
            // 구 단위까지 일치 - 추가 보너스 (+3점)
            breakdown.regionScore += 3
            breakdown.districtMatch = true
            score += 3
          } else {
            // 서울이지만 다른 구 - 소폭 감점 (-2점, 하지만 여전히 서울 범위이므로 기본 지역 점수 유지)
            breakdown.regionScore -= 2
            breakdown.districtMatch = false
            score -= 2
          }
        }
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

        // 서울 구 단위 매칭 보너스 (preferred 타입에도 적용)
        if (
          profile.region === 'seoul' &&
          profile.subRegion &&
          regionRestriction.detectedDistrict
        ) {
          if (profile.subRegion === regionRestriction.detectedDistrict) {
            breakdown.regionScore += 2
            breakdown.districtMatch = true
            score += 2
          }
        }
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
  // - 단, 공고에 AI/SW/디지털 키워드가 있으면 패널티 완화
  // ============================================================
  let industryMismatchDetected = false
  let detectedPenaltyLevel = null
  let detectedMismatchGroup = null

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
        detectedMismatchGroup = industryType
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
    // 패널티 완화 체크: 공고에 AI/SW/디지털 키워드가 있으면 패널티 감소
    const hasMitigationKeyword = PENALTY_MITIGATION_KEYWORDS.some(kw =>
      fullSearchText.includes(kw.toLowerCase())
    )

    let penalty = detectedPenaltyLevel === 'strong'
      ? INDUSTRY_MISMATCH_PENALTY_STRONG
      : INDUSTRY_MISMATCH_PENALTY_NORMAL

    // 완화 적용: 패널티를 절반으로 줄임
    if (hasMitigationKeyword) {
      penalty = Math.round(penalty / 2)
      breakdown.penaltyMitigated = true
    }

    breakdown.industryMismatchPenalty = penalty
    breakdown.industryMismatchType = detectedPenaltyLevel
    breakdown.industryMismatchGroup = detectedMismatchGroup
    score += penalty
  }

  // ============================================================
  // 7-1. matchedDomains 추출 (디버그/설명용)
  // - 프로필의 interests와 공고에서 매칭된 도메인 목록
  // ============================================================
  const matchedDomains = []
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const domainMatched = keywords.some(kw => fullSearchText.includes(kw.toLowerCase()))
    const profileHasDomain = profile.interests?.includes(domain) ||
      keywords.some(kw => {
        const profileText = [
          profile.serviceName || '',
          profile.businessOverview || '',
        ].join(' ').toLowerCase()
        return profileText.includes(kw.toLowerCase())
      })

    if (domainMatched && profileHasDomain) {
      matchedDomains.push(domain)
    }
  }
  breakdown.matchedDomains = matchedDomains

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

// ==============================================
// [하이브리드 매칭] AI 분류 기반 매칭 로직
// ==============================================

/**
 * 프로필 interests를 정규화된 키로 변환
 * - useProfileStore의 INTERESTS value를 매칭 가능한 형태로 변환
 */
const PROFILE_INTERESTS_MAP = {
  // 프로필 interests value -> 매칭 키
  ai: ['ai', 'ai_data'],
  data: ['data', 'ai_data'],
  ict: ['ict', 'ict_sw'],
  sw: ['sw', 'ict_sw'],
  cloud: ['cloud', 'cloud_saas'],
  saas: ['saas', 'cloud_saas'],
  content: ['content', 'content_media'],
  media: ['media', 'content_media'],
  game: ['game'],
  music: ['music'],
  bio: ['bio', 'bio_healthcare'],
  healthcare: ['healthcare', 'bio_healthcare'],
  medtech: ['medtech', 'medical_device'],
  manufacturing: ['manufacturing'],
  smartfactory: ['smartfactory', 'manufacturing'],
  hardware: ['hardware'],
  iot: ['iot', 'hardware'],
  fintech: ['fintech'],
  finance: ['finance', 'fintech'],
  logistics: ['logistics'],
  mobility: ['mobility', 'logistics'],
  foodtech: ['foodtech'],
  edutech: ['edutech'],
  // 특수 분야
  tourism: ['tourism'],
  agriculture: ['agriculture'],
  fishery: ['fishery'],
  construction: ['construction'],
  trade: ['trade', 'trade_export'],
  export: ['export', 'trade_export'],
  retail: ['retail', 'traditional_retail'],
}

/**
 * AI 분류 결과와 프로필 interests의 매칭 여부 확인
 *
 * @param {Object} classification - AI 분류 결과 { primaryIndustry, secondaryIndustry, isGeneralProgram, targetType }
 * @param {Object} profile - 사용자 프로필 { interests: [...] }
 * @returns {Object} { isMatch, matchLevel, reason }
 */
export function checkIndustryMatch(classification, profile) {
  if (!classification || !profile) {
    return { isMatch: true, matchLevel: 'unknown', reason: '분류 정보 없음' }
  }

  const { primaryIndustry, secondaryIndustry, isGeneralProgram, targetType, confidence } = classification
  const profileInterests = profile.interests || []

  // 1. 범용 프로그램이면 매칭
  if (isGeneralProgram || primaryIndustry === 'general_startup' || primaryIndustry === 'general_sme') {
    return { isMatch: true, matchLevel: 'general', reason: '분야 무관 범용 프로그램' }
  }

  // 2. 대상 유형 체크 (특수 대상 공고는 일반 스타트업과 불일치)
  if (targetType === 'operator') {
    // 교육기관/운영사 모집은 일반 스타트업에게 부적합
    return { isMatch: false, matchLevel: 'target_mismatch', reason: '교육기관/운영사 대상 공고' }
  }

  if (targetType === 'education') {
    // 교육생/참가자 모집은 기업 지원금이 아님
    return { isMatch: false, matchLevel: 'target_mismatch', reason: '교육생/참가자 모집 공고 (기업 지원금 아님)' }
  }

  if (targetType === 'equipment') {
    // 장비/시설 이용자 모집은 기업 지원금이 아님
    return { isMatch: false, matchLevel: 'target_mismatch', reason: '장비/시설 이용자 모집 (기업 지원금 아님)' }
  }

  // 3. 프로필 interests를 매칭 키로 변환
  const profileMatchKeys = new Set()
  profileInterests.forEach(interest => {
    const keys = PROFILE_INTERESTS_MAP[interest] || [interest]
    keys.forEach(k => profileMatchKeys.add(k))
  })

  // 서비스명/사업개요에서 추가 키워드 추출
  const profileText = [
    profile.serviceName || '',
    profile.businessOverview || '',
  ].join(' ').toLowerCase()

  // AI/음악/콘텐츠 등 핵심 키워드 감지
  if (profileText.includes('ai') || profileText.includes('인공지능')) {
    profileMatchKeys.add('ai')
    profileMatchKeys.add('ai_data')
  }
  if (profileText.includes('음악') || profileText.includes('음원') || profileText.includes('music')) {
    profileMatchKeys.add('music')
    profileMatchKeys.add('content_media')
  }
  if (profileText.includes('콘텐츠') || profileText.includes('미디어')) {
    profileMatchKeys.add('content')
    profileMatchKeys.add('content_media')
  }
  if (profileText.includes('플랫폼') || profileText.includes('saas') || profileText.includes('서비스')) {
    profileMatchKeys.add('ict_sw')
    profileMatchKeys.add('cloud_saas')
  }

  // 4. 주 산업 분야 매칭 확인
  const primaryMatches = profileMatchKeys.has(primaryIndustry)
  const secondaryMatches = secondaryIndustry && profileMatchKeys.has(secondaryIndustry)

  if (primaryMatches) {
    return { isMatch: true, matchLevel: 'primary', reason: `주 분야(${primaryIndustry}) 매칭` }
  }

  if (secondaryMatches) {
    return { isMatch: true, matchLevel: 'secondary', reason: `부 분야(${secondaryIndustry}) 매칭` }
  }

  // 5. 불일치 케이스 분류
  // 오프라인/전통 분야 vs 디지털 서비스
  const offlineIndustries = [
    'tourism', 'agriculture', 'fishery', 'construction',
    'trade_export', 'traditional_retail', 'education_operator', 'social_enterprise',
    'bio_healthcare', 'climate_tech', 'manufacturing', // 특정 산업 대상 공고
  ]

  const isOfflineProgram = offlineIndustries.includes(primaryIndustry)
  const isDigitalProfile = profileMatchKeys.has('ai') || profileMatchKeys.has('ict_sw') ||
    profileMatchKeys.has('cloud_saas') || profileMatchKeys.has('content_media')

  if (isOfflineProgram && isDigitalProfile) {
    return {
      isMatch: false,
      matchLevel: 'industry_mismatch',
      reason: `업종 불일치: ${primaryIndustry}(공고) vs 디지털서비스(프로필)`,
      confidence: confidence || 80,
    }
  }

  // 6. 그 외 불일치
  return {
    isMatch: false,
    matchLevel: 'weak_mismatch',
    reason: `분야 불일치: ${primaryIndustry}`,
    confidence: confidence || 70,
  }
}

/**
 * AI 분류 결과를 기반으로 매칭 점수 조정
 *
 * @param {number} baseScore - 기존 매칭 점수
 * @param {Object} classification - AI 분류 결과
 * @param {Object} profile - 사용자 프로필
 * @returns {Object} { adjustedScore, adjustment, reason }
 */
export function adjustScoreByClassification(baseScore, classification, profile) {
  const matchResult = checkIndustryMatch(classification, profile)

  if (matchResult.isMatch) {
    // 매칭되면 점수 유지 또는 약간 가점
    if (matchResult.matchLevel === 'primary') {
      return {
        adjustedScore: Math.min(100, baseScore + 5),
        adjustment: 5,
        reason: matchResult.reason,
        isMatch: true,
      }
    }
    return {
      adjustedScore: baseScore,
      adjustment: 0,
      reason: matchResult.reason,
      isMatch: true,
    }
  }

  // 불일치 시 점수 대폭 감점
  let penalty = 0

  switch (matchResult.matchLevel) {
    case 'target_mismatch':
      // 대상 불일치 (운영사 모집 등) → 추천에서 제외
      penalty = -50
      break
    case 'industry_mismatch':
      // 업종 명확 불일치 → 추천에서 제외
      penalty = -45
      break
    case 'weak_mismatch':
      // 약한 불일치 → 감점하되 유지
      penalty = -25
      break
    default:
      penalty = -20
  }

  return {
    adjustedScore: Math.max(0, baseScore + penalty),
    adjustment: penalty,
    reason: matchResult.reason,
    isMatch: false,
  }
}

/**
 * 하이브리드 매칭 점수 계산
 * - 기존 규칙 기반 점수 + AI 분류 기반 조정
 *
 * @param {Object} profile - 사용자 프로필
 * @param {Object} announcement - 공고 객체
 * @param {Object} classification - AI 분류 결과 (optional)
 * @returns {Object} { score, breakdown, classification }
 */
export function calculateHybridMatchingScore(profile, announcement, classification = null) {
  // 1. 기존 규칙 기반 점수 계산
  const baseScore = calculateMatchingScore(profile, announcement)

  // 2. AI 분류가 없으면 기존 점수 반환
  if (!classification) {
    return {
      score: baseScore,
      breakdown: {
        baseScore,
        aiAdjustment: 0,
        aiReason: 'AI 분류 없음',
      },
      classification: null,
    }
  }

  // 3. AI 분류 기반 점수 조정
  const { adjustedScore, adjustment, reason, isMatch } = adjustScoreByClassification(
    baseScore,
    classification,
    profile
  )

  return {
    score: adjustedScore,
    breakdown: {
      baseScore,
      aiAdjustment: adjustment,
      aiReason: reason,
      aiMatch: isMatch,
    },
    classification,
  }
}
