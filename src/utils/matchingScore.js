// 프로필 기반 지원사업 매칭률 계산

// 전체 지역 매핑 (프로필 region 값 -> 키워드 배열)
const REGION_KEYWORDS = {
  seoul: ['서울'],
  gyeonggi: ['경기', '판교', '성남', '수원', '용인', '화성', '고양', '안양', '부천'],
  incheon: ['인천'],
  gangwon: ['강원', '춘천', '원주', '강릉'],
  daejeon: ['대전'],
  sejong: ['세종'],
  chungbuk: ['충북', '충청북도', '청주', '충주'],
  chungnam: ['충남', '충청남도', '천안', '아산'],
  jeonbuk: ['전북', '전라북도', '전주', '익산', '군산'],
  jeonnam: ['전남', '전라남도', '광주', '목포', '여수', '순천'],
  gwangju: ['광주'],
  gyeongbuk: ['경북', '경상북도', '포항', '구미', '경주', '안동'],
  gyeongnam: ['경남', '경상남도', '창원', '김해', '진주', '양산'],
  daegu: ['대구'],
  busan: ['부산'],
  ulsan: ['울산'],
  jeju: ['제주'],
}

// 모든 지역 키워드 (지역 제한 감지용)
const ALL_REGION_KEYWORDS = Object.values(REGION_KEYWORDS).flat()

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
 * @returns {string} 한글 지역명 (예: '서울')
 */
export function getRegionName(regionCode) {
  return REGION_NAMES[regionCode] || regionCode
}

/**
 * 공고에서 지역 제한 정보 추출
 * @param {Object} announcement - 공고 객체
 * @returns {Object} { type: 'nationwide' | 'restricted' | 'unknown', region?: string }
 */
export function extractRegionRestriction(announcement) {
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

  // 특정 지역 제한 패턴 확인
  for (const [regionKey, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of keywords) {
      // "XX 소재", "XX 지역", "XX시", "XX도" 등의 패턴
      if (
        text.includes(`${kw} 소재`) ||
        text.includes(`${kw} 지역`) ||
        text.includes(`${kw}시 `) ||
        text.includes(`${kw}도 `) ||
        text.includes(`${kw} 기업`) ||
        text.includes(`${kw} 창업`) ||
        text.includes(`${kw} 스타트업`) ||
        text.includes(`${kw}지역`)
      ) {
        return { type: 'restricted', region: regionKey }
      }
    }
  }

  // 기관명에 지역이 포함된 경우 (예: "대구창조경제혁신센터")
  const orgText = (announcement.organization || '').toLowerCase()
  for (const [regionKey, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of keywords) {
      if (orgText.includes(kw)) {
        // 기관명에 지역이 있으면 해당 지역 우대 (단, 제한은 아님)
        return { type: 'preferred', region: regionKey }
      }
    }
  }

  return { type: 'unknown' }
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

/**
 * 프로필과 공고를 비교하여 매칭률 계산
 * @param {Object} profile - 사용자 프로필
 * @param {Object} announcement - 지원사업 공고
 * @returns {number} 0-100 사이의 매칭률
 */
export function calculateMatchingScore(profile, announcement) {
  if (!profile || !announcement) return 0

  let score = 0
  let maxScore = 0

  // 1. 관심 분야 매칭 (25점)
  maxScore += 25
  if (profile.interests && profile.interests.length > 0 && announcement.category) {
    const matchedInterests = profile.interests.filter((interest) =>
      announcement.category.includes(interest)
    )
    if (matchedInterests.length > 0) {
      score += Math.min(25, (matchedInterests.length / profile.interests.length) * 25)
    }
  }

  // 2. 서비스 정보 키워드 매칭 (15점)
  maxScore += 15
  const profileServiceText = [
    profile.serviceName || '',
    profile.businessOverview || '',
    profile.targetMarket || '',
  ].join(' ')
  const announcementText = [
    announcement.title || '',
    announcement.summary || '',
    (announcement.eligibility || []).join(' '),
  ].join(' ')

  const textMatchCount = calculateTextMatchScore(profileServiceText, announcementText)
  if (textMatchCount > 0) {
    // 최대 3개 키워드 매칭 시 만점
    score += Math.min(15, textMatchCount * 5)
  }

  // 3. 기업 형태 매칭 (15점) - 기존 20점에서 조정
  maxScore += 15
  if (profile.companyType && announcement.eligibility) {
    const eligibilityText = announcement.eligibility.join(' ').toLowerCase()
    const typeMatches = {
      preliminary: ['예비창업', '예비창업자'],
      sole: ['개인사업자', '1인기업', '소상공인'],
      sme: ['중소기업', '스타트업', '창업기업', '벤처'],
      midsize: ['중견기업'],
      nonprofit: ['비영리', '사회적기업'],
    }

    const matchKeywords = typeMatches[profile.companyType] || []
    if (matchKeywords.some((kw) => eligibilityText.includes(kw))) {
      score += 15
    }
  }

  // 4. 업력 매칭 (10점) - 기존 15점에서 조정
  maxScore += 10
  if (profile.businessAge && announcement.eligibility) {
    const eligibilityText = announcement.eligibility.join(' ').toLowerCase()
    const ageMatches = {
      preliminary: ['예비창업'],
      under1: ['1년 미만', '초기창업'],
      '1to3': ['3년 미만', '3년 이내', '초기창업'],
      '3to7': ['7년 미만', '7년 이내', '성장단계'],
      over7: [], // 대부분 지원 가능
    }

    const matchKeywords = ageMatches[profile.businessAge] || []
    if (
      profile.businessAge === 'over7' ||
      matchKeywords.some((kw) => eligibilityText.includes(kw))
    ) {
      score += 10
    }
  }

  // 5. 지역 매칭 (15점) - 개선된 로직
  maxScore += 15
  if (profile.region) {
    const regionRestriction = extractRegionRestriction(announcement)

    if (regionRestriction.type === 'nationwide') {
      // 전국 대상 공고 - 기본 점수
      score += 10
    } else if (regionRestriction.type === 'restricted') {
      // 특정 지역 제한 공고
      if (profile.region === regionRestriction.region) {
        // 지역 일치 - 높은 점수
        score += 15
      } else {
        // 지역 불일치 - 감점 (부적합 표시)
        score -= 15
      }
    } else if (regionRestriction.type === 'preferred') {
      // 기관 소재지 기반 우대
      if (profile.region === regionRestriction.region) {
        score += 12
      } else {
        // 다른 지역이어도 지원은 가능 - 기본 점수
        score += 5
      }
    } else {
      // 지역 정보 불명확 - 기본 점수
      score += 8
    }
  }

  // 6. 인증 보유 시 가산점 (15점)
  maxScore += 15
  if (profile.certifications && profile.certifications.length > 0) {
    const eligibilityText = (announcement.eligibility || []).join(' ').toLowerCase()
    const certMatches = {
      venture: ['벤처', '벤처기업'],
      innobiz: ['이노비즈'],
      mainbiz: ['메인비즈'],
      research: ['연구소', '기업부설연구소'],
      patent: ['특허', '지식재산권'],
    }

    let certScore = 0
    profile.certifications.forEach((cert) => {
      const keywords = certMatches[cert] || []
      if (keywords.some((kw) => eligibilityText.includes(kw))) {
        certScore += 5
      }
    })
    score += Math.min(15, certScore)
  }

  // 최종 점수 계산 (0-100)
  const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  return Math.min(100, Math.max(0, finalScore))
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
