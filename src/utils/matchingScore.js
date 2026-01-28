// 프로필 기반 지원사업 매칭률 계산

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

  // 특정 지역 제한 패턴 확인 (시·도 및 시·군·구 단위)
  for (const [regionKey, regionData] of Object.entries(REGION_KEYWORDS)) {
    const allKeywords = getAllKeywordsForRegion(regionData)

    for (const kw of allKeywords) {
      // 다양한 지역 제한 패턴 확인
      const patterns = [
        `${kw} 소재`,
        `${kw} 지역`,
        `${kw}시 `,
        `${kw}도 `,
        `${kw}군 `,
        `${kw}구 `,
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
        `${kw}특별자치도`, // "전북특별자치도", "강원특별자치도" 등
        `${kw}특별자치도 소재`, // "전북특별자치도 소재" 등
        `${kw}특별자치도 내`, // "전북특별자치도 내에" 등
        `${kw}특별자치시`, // "세종특별자치시" 등
        `${kw}특별자치시 소재`, // "세종특별자치시 소재" 등
        `${kw}특별자치시 내`, // "세종특별자치시 내에" 등
        `${kw}특별시`, // "서울특별시" 등
        `${kw}특별시 소재`, // "서울특별시 소재" 등
        `${kw}특별시 내`, // "서울특별시 내에" 등
        `${kw}광역시`, // "부산광역시" 등
        `${kw}광역시 소재`, // "부산광역시 소재" 등
        `${kw}광역시 내`, // "부산광역시 내에" 등
        `${kw}도 소재`, // "경기도 소재" 등
        `${kw}에 본사`, // "전북에 본사" 등
        `${kw}에 사업장`, // "전북에 사업장" 등
        `${kw}에 연구소`, // "전북에 연구소" 등
        `${kw}에 공장`, // "전북에 공장" 등
        `도내 `, // "도내 농촌융복합인증" 등
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

  // 기관명에 지역이 포함된 경우 - 지역 제한 공고로 처리
  // (예: "강원테크노파크", "대구창조경제혁신센터", "김포시청")
  const orgText = (announcement.organization || '').toLowerCase()
  for (const [regionKey, regionData] of Object.entries(REGION_KEYWORDS)) {
    const allKeywords = getAllKeywordsForRegion(regionData)

    for (const kw of allKeywords) {
      if (orgText.includes(kw)) {
        // 지역 기관에서 운영하는 사업은 해당 지역 제한으로 간주
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

  // 통합 검색 텍스트 생성 (eligibility + title + summary)
  // K-Startup, MSS는 eligibility가 비어있으므로 title/summary에서 검색
  const fullSearchText = [
    ...(announcement.eligibility || []),
    announcement.title || '',
    announcement.summary || '',
  ].join(' ').toLowerCase()

  // 3. 기업 형태 매칭 (15점)
  maxScore += 15
  if (profile.companyType) {
    const typeMatches = {
      preliminary: ['예비창업', '예비창업자', '예비 창업'],
      sole: ['개인사업자', '1인기업', '소상공인', '1인 기업', '개인 사업자'],
      sme: ['중소기업', '스타트업', '창업기업', '벤처', '중소 기업', '창업 기업'],
      midsize: ['중견기업', '중견 기업'],
      nonprofit: ['비영리', '사회적기업', '사회적 기업', '협동조합'],
    }

    const matchKeywords = typeMatches[profile.companyType] || []
    if (matchKeywords.some((kw) => fullSearchText.includes(kw))) {
      score += 15
    }
  }

  // 4. 업력 매칭 (15점)
  maxScore += 15
  if (profile.businessAge) {
    const ageMatches = {
      preliminary: ['예비창업', '예비 창업'],
      under1: ['1년 미만', '초기창업', '초기 창업', '1년미만'],
      '1to3': ['3년 미만', '3년 이내', '초기창업', '초기 창업', '3년미만', '3년이내'],
      '3to7': ['7년 미만', '7년 이내', '성장단계', '성장 단계', '7년미만', '7년이내', '5년 이내', '5년이내'],
      over7: [], // 대부분 지원 가능
    }

    const matchKeywords = ageMatches[profile.businessAge] || []
    if (
      profile.businessAge === 'over7' ||
      matchKeywords.some((kw) => fullSearchText.includes(kw))
    ) {
      score += 15
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
    const certMatches = {
      venture: ['벤처', '벤처기업', '벤처 기업'],
      innobiz: ['이노비즈', 'innobiz'],
      mainbiz: ['메인비즈', 'mainbiz'],
      research: ['연구소', '기업부설연구소', '기업부설 연구소', '부설연구소'],
      patent: ['특허', '지식재산권', '지식재산', 'ip'],
    }

    let certScore = 0
    profile.certifications.forEach((cert) => {
      const keywords = certMatches[cert] || []
      // fullSearchText 사용 (title + summary + eligibility 통합)
      if (keywords.some((kw) => fullSearchText.includes(kw))) {
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
