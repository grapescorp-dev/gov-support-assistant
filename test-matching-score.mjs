/**
 * Matching Score 테스트 (Relevance Gate, Industry Mismatch, Stage Boost, Penalty Mitigation)
 *
 * 실행: node test-matching-score.mjs
 */

// ============================================================
// 테스트에 필요한 상수/함수들을 인라인으로 정의
// ============================================================

const RELEVANCE_THRESHOLD = 12
const RELEVANCE_GATE_CAP = 49
const INDUSTRY_MISMATCH_PENALTY_STRONG = -35
const INDUSTRY_MISMATCH_PENALTY_NORMAL = -25
const STAGE_BOOST_PRELIMINARY = 12

const INDUSTRY_SPECIFIC_KEYWORDS = {
  traditionalManufacturing: {
    keywords: ['가죽', '피혁', '봉제', '원단', '섬유', '직물', '의류', '패션', '신발', '가방', '액세서리', '잡화',
               '공방', '수공예', '공예품', '도자기', '목공', '가구', '소공인', '제조장비', '금형',
               '주물', '주조', '단조', '도금', '절삭', '용접', '판금', '프레스', '열처리'],
    allowedInterests: ['manufacturing', 'fashion', 'smartfactory'],
    penaltyLevel: 'strong',
  },
  facilitySpace: {
    keywords: ['입주', '입주공간', '공유오피스', '창업공간', '창작공간', '제조공간', '공장', '작업장', '작업실',
               '시설', '설비', '장비임대', '장비지원', '장비대여', '기자재', '공간지원', '공간임대'],
    allowedInterests: ['manufacturing', 'smartfactory'],
    penaltyLevel: 'strong',
  },
  food: {
    keywords: ['식품', '요식업', '외식업', '음식점', '식당', '베이커리', '제과', '제빵', '정육', '수산', '농수산'],
    allowedInterests: ['foodtech', 'bio'],
    penaltyLevel: 'normal',
  },
  construction: {
    keywords: ['건설', '건축', '시공', '토목', '리모델링', '배관', '전기공사', '소방', '조경'],
    allowedInterests: ['manufacturing', 'smartfactory'],
    penaltyLevel: 'strong',
  },
  agriculture: {
    keywords: ['농업', '축산', '양계', '양돈', '낙농', '작물', '재배', '농기계', '비료', '사료', '종자'],
    allowedInterests: ['foodtech', 'bio', 'smartfarm'],
    penaltyLevel: 'normal',
  },
  beauty: {
    keywords: ['미용실', '헤어샵', '네일샵', '피부관리실', '에스테틱', '뷰티샵'],
    allowedInterests: ['fashion', 'bio', 'healthcare'],
    penaltyLevel: 'normal',
  },
}

const PRELIMINARY_STAGE_KEYWORDS = [
  '예비창업', '예비 창업', '예비창업자', '창업준비', '창업 준비',
  '아이디어', '아이디어 검증', 'poc', '초기검증', '초기 검증',
  '사업화', '사업화 지원', '시제품', '프로토타입', 'mvp',
  '창업교육', '창업 교육', '멘토링', '액셀러레이팅',
  '데모데이', '데모 데이', 'ir', '투자유치',
]

// 패널티 완화 키워드
const PENALTY_MITIGATION_KEYWORDS = [
  'ai', '인공지능', '데이터', 'sw', '소프트웨어', '플랫폼', 'saas',
  '디지털', '디지털전환', 'ict', 'it', '콘텐츠', '앱', '어플',
  '온라인', '이커머스', '클라우드', '블록체인', '핀테크',
]

// 도메인 키워드 그룹
const DOMAIN_KEYWORDS = {
  ai: ['ai', '인공지능', '머신러닝', '딥러닝', 'llm', 'gpt'],
  saas: ['saas', '구독', '클라우드', '서비스형'],
  data: ['데이터', '빅데이터', '데이터분석'],
  ict: ['ict', 'it', '정보통신', '소프트웨어', 'sw'],
  content: ['콘텐츠', '미디어', '영상', '음악', '게임', '웹툰'],
  fintech: ['핀테크', '금융', '블록체인'],
  bio: ['바이오', '헬스케어', '의료', '건강'],
  manufacturing: ['제조', '생산', '공장', '스마트팩토리'],
}

// INTERESTS 정의
const INTERESTS = [
  { value: 'ai', keywords: ['ai', '인공지능', '머신러닝', '딥러닝', 'gpt', 'llm'] },
  { value: 'iot', keywords: ['iot', '사물인터넷', '센서', '스마트', '웨어러블'] },
  { value: 'ict', keywords: ['ict', '정보통신', 'it', '소프트웨어', 'sw', '디지털'] },
  { value: 'saas', keywords: ['saas', '클라우드', '구독', '플랫폼'] },
  { value: 'content', keywords: ['콘텐츠', '미디어', '영상', '음악', '음원', '게임'] },
  { value: 'fintech', keywords: ['핀테크', '금융', '블록체인', '암호화폐', '가상화폐'] },
  { value: 'manufacturing', keywords: ['제조', '생산', '공장', '설비'] },
  { value: 'fashion', keywords: ['패션', '의류', '신발', '가방', '액세서리'] },
  { value: 'foodtech', keywords: ['푸드테크', '식품', '음식'] },
  { value: 'agriculture', keywords: ['농업', '스마트팜', '농산물'] },
  { value: 'bio', keywords: ['바이오', '헬스케어', '의료', '건강', '헬스', '운동', '피트니스', '웰니스'] },
  { value: 'healthcare', keywords: ['헬스케어', '의료', '건강', '헬스', '운동', '피트니스', '웰니스', '재활', '스트레칭', '리커버리'] },
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

// calculateMatchingScore (인라인 구현)
function calculateMatchingScore(profile, announcement) {
  if (!profile || !announcement) return { score: 0, breakdown: {} }

  let score = 0

  const breakdown = {
    interestScore: 0,
    keywordScore: 0,
    companyTypeScore: 0,
    regionScore: 0,
    industryMismatchPenalty: 0,
    industryMismatchType: null,
    industryMismatchGroup: null,
    penaltyMitigated: false,
    matchedDomains: [],
    stageBoost: 0,
    stageBoostApplied: false,
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

  // 5. Industry Mismatch Soft Penalty (패널티 완화 로직 포함)
  let industryMismatchDetected = false
  let detectedPenaltyLevel = null
  let detectedMismatchGroup = null

  for (const [industryType, config] of Object.entries(INDUSTRY_SPECIFIC_KEYWORDS)) {
    const hasIndustryKeywordInAnnouncement = config.keywords.some(kw =>
      fullSearchText.includes(kw.toLowerCase())
    )

    if (hasIndustryKeywordInAnnouncement) {
      const hasAllowedInt = hasAllowedInterest(profile, config.allowedInterests)
      const hasSignalInProfile = hasIndustrySignalInProfile(profile, config.keywords)

      if (!hasAllowedInt && !hasSignalInProfile) {
        industryMismatchDetected = true
        detectedMismatchGroup = industryType
        if (config.penaltyLevel === 'strong') {
          detectedPenaltyLevel = 'strong'
        } else if (detectedPenaltyLevel !== 'strong') {
          detectedPenaltyLevel = 'normal'
        }
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

  // 5-1. matchedDomains 추출
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

  // 6. Stage Boost (예비창업자)
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

  // 7. Relevance Gate
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
  // 예비창업자: 운동 후 스트레칭/리커버리 습관 형성 앱
  healthcareAppPreliminary: {
    companyType: 'preliminary',
    businessAge: 'preliminary',
    region: 'seoul',
    interests: ['ai', 'iot', 'content', 'bio', 'healthcare'],
    serviceName: '운동 후 스트레칭 리커버리 습관 형성 앱',
    businessOverview: '운동 후 스트레칭과 리커버리 루틴을 추천하고 습관화를 돕는 모바일 앱 서비스입니다.',
  },
  // AI 음악/SaaS 스타트업
  aiMusicStartup: {
    companyType: 'sme',
    businessAge: '1to3',
    region: 'seoul',
    interests: ['ai', 'ict', 'saas', 'content'],
    serviceName: 'AI 기반 음악 추천 플랫폼',
    businessOverview: 'AI를 활용하여 사용자 취향에 맞는 음악을 추천하고 생성하는 SaaS 서비스입니다.',
  },
  // 가죽 제조업체
  leatherManufacturer: {
    companyType: 'sole',
    businessAge: '3to7',
    region: 'seoul',
    interests: ['manufacturing', 'fashion'],
    serviceName: '가죽 패션 액세서리 제조',
    businessOverview: '수공예 가죽 가방 및 액세서리를 제조합니다.',
  },
  // 핀테크 스타트업
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
  // ========== 예비창업자 헬스케어 앱 시나리오 ==========
  {
    name: '[오탐방지] 헬스케어 앱 + 제조/시설/장비 공고 => 낮은 점수',
    profile: profiles.healthcareAppPreliminary,
    announcement: {
      title: '소공인 제조장비 임대 지원',
      summary: '제조 시설 및 장비 임대 지원사업',
      eligibility: ['서울 소재 소공인', '제조업'],
      category: ['제조', '장비지원', '시설'],
    },
    validate: (result) => {
      if (result.score > 30) {
        return { pass: false, reason: `점수 ${result.score} > 30 (제조/시설 공고인데 높은 점수)` }
      }
      if (result.breakdown.industryMismatchType !== 'strong') {
        return { pass: false, reason: `Industry Mismatch가 'strong'이 아님` }
      }
      return { pass: true }
    },
  },
  {
    name: '[오탐방지] 헬스케어 앱 + 입주공간 공고 => 낮은 점수',
    profile: profiles.healthcareAppPreliminary,
    announcement: {
      title: '창업공간 입주기업 모집',
      summary: '창작공간 및 제조공간 입주 지원',
      eligibility: ['예비창업자', '초기창업기업'],
      category: ['공간지원', '입주'],
    },
    validate: (result) => {
      if (result.score > 40) {
        return { pass: false, reason: `점수 ${result.score} > 40 (공간/입주 공고인데 높은 점수)` }
      }
      return { pass: true }
    },
  },
  {
    name: '[정탐] 헬스케어 앱 + 바이오헬스 사업화 공고 => 높은 점수 + matchedDomains',
    profile: profiles.healthcareAppPreliminary,
    announcement: {
      title: '바이오헬스 예비창업자 사업화 지원',
      summary: '헬스케어 서비스 아이디어 검증 및 사업화 지원',
      eligibility: ['예비창업자'],
      category: ['바이오', '헬스케어', '사업화'],
      tags: ['헬스', '운동', '웰니스'],
    },
    validate: (result) => {
      if (result.score < 40) {
        return { pass: false, reason: `점수 ${result.score} < 40 (도메인 일치인데 점수 낮음)` }
      }
      if (!result.breakdown.stageBoostApplied) {
        return { pass: false, reason: `Stage Boost가 적용되지 않음` }
      }
      if (!result.breakdown.matchedDomains.includes('bio')) {
        return { pass: false, reason: `matchedDomains에 'bio' 없음: ${result.breakdown.matchedDomains}` }
      }
      return { pass: true }
    },
  },
  {
    name: '[정탐] 헬스케어 앱 + 창업교육/멘토링 공고 => Stage Boost 적용',
    profile: profiles.healthcareAppPreliminary,
    announcement: {
      title: '예비창업자 창업교육 및 멘토링',
      summary: 'IT/디지털 서비스 예비창업자 대상 창업교육 및 멘토링 지원',
      eligibility: ['예비창업자', '창업준비자'],
      category: ['창업교육', '멘토링'],
      tags: ['디지털', 'IT', '서비스'],
    },
    validate: (result) => {
      if (result.score < 25) {
        return { pass: false, reason: `점수 ${result.score} < 25 (예비창업자 공고인데 점수 낮음)` }
      }
      if (!result.breakdown.stageBoostApplied) {
        return { pass: false, reason: `Stage Boost가 적용되지 않음` }
      }
      return { pass: true }
    },
  },

  // ========== AI/SaaS 스타트업 시나리오 ==========
  {
    name: '[오탐방지] AI 스타트업 + 가죽패션 소공인 공고 => 낮은 점수',
    profile: profiles.aiMusicStartup,
    announcement: {
      title: '가죽패션 소공인 장비 임대지원',
      summary: '가죽 피혁 봉제 소공인 제조장비 임대 지원사업',
      eligibility: ['서울 소재 소상공인', '소공인'],
      category: ['제조', '장비지원'],
    },
    validate: (result) => {
      if (result.score > 20) {
        return { pass: false, reason: `점수 ${result.score} > 20 (Industry Penalty 미적용)` }
      }
      if (result.breakdown.industryMismatchGroup !== 'traditionalManufacturing') {
        return { pass: false, reason: `Mismatch 그룹이 틀림: ${result.breakdown.industryMismatchGroup}` }
      }
      return { pass: true }
    },
  },
  {
    name: '[NEW] 패널티 완화: AI 스타트업 + 제조+디지털전환 공고 => 패널티 절반',
    profile: profiles.aiMusicStartup,
    announcement: {
      title: '중소 제조기업 디지털전환 지원',
      summary: '제조 공장의 AI 및 소프트웨어 기반 디지털전환 지원사업',
      eligibility: ['서울 소재 중소기업'],
      category: ['제조', '디지털전환', 'AI'],
    },
    validate: (result) => {
      // 제조 키워드가 있지만, AI/디지털전환 키워드도 있어서 패널티 완화
      if (!result.breakdown.penaltyMitigated) {
        return { pass: false, reason: `패널티 완화가 적용되지 않음` }
      }
      // 완화된 패널티: -35 → -17 또는 -18 (Math.round(-35/2) = -17)
      const expectedPenalty = Math.round(INDUSTRY_MISMATCH_PENALTY_STRONG / 2)
      if (result.breakdown.industryMismatchPenalty !== expectedPenalty) {
        return { pass: false, reason: `완화된 패널티가 ${expectedPenalty}이 아님: ${result.breakdown.industryMismatchPenalty}` }
      }
      return { pass: true }
    },
  },
  {
    name: '[정탐] 가죽 제조업체 + 가죽패션 공고 => 높은 점수',
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
      // 업종 일치이므로 mismatch 없어야 함
      if (result.breakdown.industryMismatchPenalty !== 0) {
        return { pass: false, reason: `업종 일치인데 패널티 적용됨: ${result.breakdown.industryMismatchPenalty}` }
      }
      return { pass: true }
    },
  },
  {
    name: '[정탐] AI 스타트업 + AI 지원사업 => 높은 점수 + matchedDomains',
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
      if (!result.breakdown.matchedDomains.includes('ai')) {
        return { pass: false, reason: `matchedDomains에 'ai' 없음` }
      }
      return { pass: true }
    },
  },
  {
    name: '[정탐] 범용 공고 (R&D 바우처) => Industry Penalty 없음',
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

console.log('='.repeat(70))
console.log('Matching Score 테스트 (Relevance Gate, Industry Mismatch, Penalty Mitigation)')
console.log('='.repeat(70))

let passed = 0
let failed = 0

for (const tc of testCases) {
  const result = calculateMatchingScore(tc.profile, tc.announcement)
  const validation = tc.validate(result)

  if (validation.pass) {
    console.log(`✅ PASS: ${tc.name}`)
    console.log(`   Score: ${result.score}, interest=${result.breakdown.interestScore.toFixed(1)}, keyword=${result.breakdown.keywordScore}, region=${result.breakdown.regionScore}`)
    console.log(`   Penalty: ${result.breakdown.industryMismatchPenalty}(${result.breakdown.industryMismatchGroup || 'none'}, mitigated=${result.breakdown.penaltyMitigated}), stageBoost=${result.breakdown.stageBoost}`)
    console.log(`   matchedDomains: [${result.breakdown.matchedDomains.join(', ')}], gateApplied=${result.breakdown.relevanceGateApplied}`)
    passed++
  } else {
    console.log(`❌ FAIL: ${tc.name}`)
    console.log(`   ${validation.reason}`)
    console.log(`   Score: ${result.score}`)
    console.log(`   Breakdown:`, JSON.stringify(result.breakdown, null, 2).split('\n').map(l => '     ' + l).join('\n'))
    failed++
  }
}

console.log('\n' + '='.repeat(70))
console.log(`총 ${testCases.length}개 테스트: ${passed} 통과, ${failed} 실패`)
console.log('='.repeat(70))

process.exit(failed > 0 ? 1 : 0)
