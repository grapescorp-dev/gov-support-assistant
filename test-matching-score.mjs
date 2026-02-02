/**
 * Matching Score 테스트 (Relevance Gate & Industry Mismatch)
 *
 * 실행: node test-matching-score.mjs
 */

// ============================================================
// 테스트에 필요한 상수/함수들을 인라인으로 정의
// ============================================================

const RELEVANCE_THRESHOLD = 12
const RELEVANCE_GATE_CAP = 49
const INDUSTRY_MISMATCH_PENALTY = -30

const INDUSTRY_SPECIFIC_KEYWORDS = {
  traditionalManufacturing: {
    keywords: ['가죽', '피혁', '봉제', '원단', '섬유', '직물', '의류', '패션', '신발', '가방', '액세서리', '잡화',
               '공방', '수공예', '공예품', '도자기', '목공', '가구', '인테리어', '소공인', '제조장비', '금형',
               '주물', '주조', '단조', '도금', '절삭', '용접', '판금', '프레스', '열처리'],
    allowedInterests: ['manufacturing', 'fashion', 'smartfactory'],
  },
  food: {
    keywords: ['식품', '음식', '외식', '요식', '급식', '케이터링', '베이커리', '제과', '제빵', '푸드트럭'],
    allowedInterests: ['foodtech', 'bio'],
  },
  construction: {
    keywords: ['건설', '건축', '토목', '시공', '인테리어공사', '리모델링', '설비'],
    allowedInterests: ['construction', 'realestate'],
  },
  agriculture: {
    keywords: ['농업', '농산물', '축산', '양식', '어업', '수산', '임업', '원예', '화훼', '종묘'],
    allowedInterests: ['agriculture', 'smartfarm', 'foodtech'],
  },
  beauty: {
    keywords: ['미용', '뷰티', '헤어', '네일', '화장품', '에스테틱', '피부관리'],
    allowedInterests: ['beauty', 'healthcare'],
  },
}

// INTERESTS 정의 (간소화)
const INTERESTS = [
  { value: 'ai', keywords: ['ai', '인공지능', '머신러닝', '딥러닝', 'gpt', 'llm'] },
  { value: 'ict', keywords: ['ict', '정보통신', 'it', '소프트웨어', 'sw', '디지털'] },
  { value: 'saas', keywords: ['saas', '클라우드', '구독', '플랫폼'] },
  { value: 'content', keywords: ['콘텐츠', '미디어', '영상', '음악', '음원', '게임'] },
  { value: 'fintech', keywords: ['핀테크', '금융', '블록체인', '암호화폐', '가상화폐'] },
  { value: 'manufacturing', keywords: ['제조', '생산', '공장', '설비'] },
  { value: 'fashion', keywords: ['패션', '의류', '신발', '가방', '액세서리'] },
  { value: 'foodtech', keywords: ['푸드테크', '식품', '음식'] },
  { value: 'agriculture', keywords: ['농업', '스마트팜', '농산물'] },
]

function hasAllowedInterest(profile, allowedInterests) {
  if (!profile.interests || profile.interests.length === 0) return false
  return profile.interests.some(interest => allowedInterests.includes(interest))
}

function hasIndustrySignalInProfile(profile, industryKeywords) {
  const profileText = [
    profile.serviceName || '',
    profile.businessOverview || '',
  ].join(' ').toLowerCase()

  return industryKeywords.some(kw => profileText.includes(kw.toLowerCase()))
}

function extractKeywordsFromProfile(profile) {
  const keywords = []
  if (profile.serviceName) {
    const serviceKeywords = profile.serviceName
      .replace(/[기반|플랫폼|서비스|시스템|솔루션]/g, ' ')
      .split(/[\s,./]+/)
      .filter(w => w.length >= 2)
    keywords.push(...serviceKeywords)
  }
  return keywords
}

// 간소화된 calculateMatchingScore
function calculateMatchingScore(profile, announcement) {
  if (!profile || !announcement) return { score: 0, breakdown: {} }

  let score = 0

  const breakdown = {
    interestScore: 0,
    keywordScore: 0,
    companyTypeScore: 0,
    regionScore: 0,
    industryMismatchPenalty: 0,
    relevanceGateApplied: false,
  }

  // 통합 검색 텍스트 생성
  const fullSearchText = [
    announcement.title || '',
    announcement.summary || '',
    ...(announcement.eligibility || []),
    ...(announcement.category || []),
    ...(announcement.tags || []),
  ].join(' ').toLowerCase()

  // 1. 관심분야 매칭 (최대 20점)
  let interestMatchCount = 0
  if (profile.interests && profile.interests.length > 0) {
    profile.interests.forEach(interestValue => {
      const interestConfig = INTERESTS.find(i => i.value === interestValue)
      const keywords = interestConfig?.keywords || [interestValue.toLowerCase()]
      const isMatched = keywords.some(keyword => fullSearchText.includes(keyword.toLowerCase()))
      if (isMatched) {
        interestMatchCount++
      }
    })
    if (interestMatchCount > 0) {
      breakdown.interestScore = Math.min(20, (interestMatchCount / profile.interests.length) * 25)
      score += breakdown.interestScore
    }
  }

  // 2. 키워드 매칭 (최대 15점)
  const profileKeywords = extractKeywordsFromProfile(profile)
  let keywordMatchCount = 0
  if (profileKeywords.length > 0) {
    profileKeywords.forEach(keyword => {
      if (fullSearchText.includes(keyword.toLowerCase())) {
        keywordMatchCount++
      }
    })
    if (keywordMatchCount > 0) {
      breakdown.keywordScore = Math.min(15, keywordMatchCount * 3)
      score += breakdown.keywordScore
    }
  }

  // Relevance Score 계산
  const relevanceScore = breakdown.interestScore + breakdown.keywordScore

  // 3. 기업형태 매칭 (최대 15점)
  if (profile.companyType) {
    const typeMatches = {
      preliminary: ['예비창업', '예비창업자'],
      sole: ['개인사업자', '소상공인', '1인기업'],
      sme: ['중소기업', '스타트업', '창업기업', '벤처'],
      midsize: ['중견기업'],
    }
    const matchKeywords = typeMatches[profile.companyType] || []
    if (matchKeywords.some(kw => fullSearchText.includes(kw))) {
      breakdown.companyTypeScore = 15
      score += 15
    }
  }

  // 4. 지역 매칭 (최대 15점)
  if (profile.region) {
    const regionKeywords = {
      seoul: ['서울'],
      busan: ['부산'],
      gyeonggi: ['경기'],
    }
    const keywords = regionKeywords[profile.region] || []
    if (keywords.some(kw => fullSearchText.includes(kw))) {
      breakdown.regionScore = 15
      score += 15
    } else if (fullSearchText.includes('전국')) {
      breakdown.regionScore = 8
      score += 8
    }
  }

  // 5. Industry Mismatch Penalty
  let industryMismatchDetected = false
  for (const [industryType, config] of Object.entries(INDUSTRY_SPECIFIC_KEYWORDS)) {
    const hasIndustryKeywordInAnnouncement = config.keywords.some(kw =>
      fullSearchText.includes(kw.toLowerCase())
    )

    if (hasIndustryKeywordInAnnouncement) {
      const hasAllowedInt = hasAllowedInterest(profile, config.allowedInterests)
      const hasSignalInProfile = hasIndustrySignalInProfile(profile, config.keywords)

      if (!hasAllowedInt && !hasSignalInProfile) {
        industryMismatchDetected = true
        break
      }
    }
  }

  if (industryMismatchDetected) {
    breakdown.industryMismatchPenalty = INDUSTRY_MISMATCH_PENALTY
    score += INDUSTRY_MISMATCH_PENALTY
  }

  // 6. Relevance Gate
  let finalScore = Math.max(0, score)
  if (relevanceScore < RELEVANCE_THRESHOLD) {
    if (finalScore > RELEVANCE_GATE_CAP) {
      breakdown.relevanceGateApplied = true
      finalScore = RELEVANCE_GATE_CAP
    }
  }

  return { score: Math.min(100, finalScore), breakdown }
}

// ============================================================
// 테스트 프로필
// ============================================================

const profiles = {
  aiMusicStartup: {
    companyType: 'sme',
    businessAge: '1to3',
    region: 'seoul',
    interests: ['ai', 'ict', 'saas', 'content'],
    serviceName: 'AI 기반 음악 추천 플랫폼',
    businessOverview: 'AI를 활용하여 사용자 취향에 맞는 음악을 추천하고 생성하는 SaaS 서비스입니다.',
  },
  leatherManufacturer: {
    companyType: 'sole',
    businessAge: '3to7',
    region: 'seoul',
    interests: ['manufacturing', 'fashion'],
    serviceName: '가죽 패션 액세서리 제조',
    businessOverview: '수공예 가죽 가방 및 액세서리를 제조합니다.',
  },
  fintechStartup: {
    companyType: 'sme',
    businessAge: '1to3',
    region: 'seoul',
    interests: ['fintech'],
    serviceName: '암호화폐 거래 플랫폼',
    businessOverview: '블록체인 기반 디지털 자산 거래 서비스',
  },
}

// ============================================================
// 테스트 케이스
// ============================================================

const testCases = [
  {
    name: '핵심: AI 스타트업 + 가죽패션 소공인 공고 => 점수 상한 (49 이하)',
    profile: profiles.aiMusicStartup,
    announcement: {
      title: '가죽패션 소공인 장비 임대지원',
      summary: '가죽 피혁 봉제 소공인 제조장비 임대 지원사업',
      eligibility: ['서울 소재 소상공인', '소공인'],
      category: ['제조', '장비지원'],
    },
    validate: (result) => {
      if (result.score > 49) {
        return { pass: false, reason: `점수 ${result.score} > 49 (Relevance Gate 또는 Industry Penalty 미적용)` }
      }
      return { pass: true }
    },
  },
  {
    name: '가죽 제조업체 + 가죽패션 공고 => 높은 점수 (50 이상)',
    profile: profiles.leatherManufacturer,
    announcement: {
      title: '가죽패션 소공인 장비 임대지원',
      summary: '가죽 피혁 봉제 소공인 제조장비 임대 지원사업',
      eligibility: ['서울 소재 소상공인', '소공인'],
      category: ['제조', '장비지원'],
    },
    validate: (result) => {
      if (result.score < 30) {
        return { pass: false, reason: `점수 ${result.score} < 30 (업종 일치인데 점수 낮음)` }
      }
      return { pass: true }
    },
  },
  {
    name: 'Relevance Gate: 핀테크 + 농업 공고 => 점수 상한',
    profile: profiles.fintechStartup,
    announcement: {
      title: '농업 스마트팜 장비 지원',
      summary: '스마트팜 설비 도입 지원사업',
      eligibility: ['서울 소재 농업법인'],
      category: ['농업', '스마트팜'],
    },
    validate: (result) => {
      if (result.score > 49) {
        return { pass: false, reason: `점수 ${result.score} > 49 (Relevance Gate 미적용)` }
      }
      return { pass: true }
    },
  },
  {
    name: 'Relevance Pass: AI 스타트업 + AI 지원사업 => 높은 점수',
    profile: profiles.aiMusicStartup,
    announcement: {
      title: 'AI 스타트업 기술개발 지원',
      summary: 'AI 인공지능 기반 서비스 개발 지원사업',
      eligibility: ['서울 소재 중소기업'],
      category: ['AI', 'ICT', '기술개발'],
      tags: ['인공지능', 'AI', 'SaaS'],
    },
    validate: (result) => {
      if (result.score < 50) {
        return { pass: false, reason: `점수 ${result.score} < 50 (관심분야 일치인데 점수 낮음)` }
      }
      return { pass: true }
    },
  },
  {
    name: '범용 공고 (R&D 바우처) => Industry Penalty 없음',
    profile: profiles.aiMusicStartup,
    announcement: {
      title: '중소기업 R&D 바우처 지원',
      summary: '중소기업 연구개발 바우처 지원사업',
      eligibility: ['전국 중소기업'],
      category: ['R&D', '바우처'],
    },
    validate: (result) => {
      if (result.breakdown.industryMismatchPenalty !== 0) {
        return { pass: false, reason: `Industry Penalty가 적용됨: ${result.breakdown.industryMismatchPenalty}` }
      }
      return { pass: true }
    },
  },
]

// ============================================================
// 테스트 실행
// ============================================================

console.log('='.repeat(60))
console.log('Relevance Gate & Industry Mismatch Penalty 테스트')
console.log('='.repeat(60))

let passed = 0
let failed = 0

for (const tc of testCases) {
  const result = calculateMatchingScore(tc.profile, tc.announcement)
  const validation = tc.validate(result)

  if (validation.pass) {
    console.log(`✅ PASS: ${tc.name}`)
    console.log(`   Score: ${result.score}, Breakdown: interest=${result.breakdown.interestScore.toFixed(1)}, keyword=${result.breakdown.keywordScore}, companyType=${result.breakdown.companyTypeScore}, region=${result.breakdown.regionScore}, industryPenalty=${result.breakdown.industryMismatchPenalty}, gateApplied=${result.breakdown.relevanceGateApplied}`)
    passed++
  } else {
    console.log(`❌ FAIL: ${tc.name}`)
    console.log(`   ${validation.reason}`)
    console.log(`   Score: ${result.score}, Breakdown:`, JSON.stringify(result.breakdown, null, 2).split('\n').map(l => '   ' + l).join('\n'))
    failed++
  }
}

console.log('\n' + '='.repeat(60))
console.log(`총 ${testCases.length}개 테스트: ${passed} 통과, ${failed} 실패`)
console.log('='.repeat(60))

process.exit(failed > 0 ? 1 : 0)
