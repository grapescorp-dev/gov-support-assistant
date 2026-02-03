/**
 * 마이크로카피 상수 모음
 * - 검색 페이지 및 프로필 입력 UI에서 사용
 * - 추천 정확도 향상을 위한 사용자 유도 문구
 */

// 검색 페이지 상단 (항상 표시)
export const SEARCH_PAGE_HEADER = {
  main: '당신에게 맞는 정부지원사업을 골라 보여드려요.',
  sub: '프로필 정보가 구체적일수록, 실제 지원 가능한 공고만 추천됩니다.',
  info: '현재 추천은 프로필 정보 + 공고 조건을 기준으로 자동 계산됩니다.',
}

// 프로필 신호 부족 배너 (조건부)
export const PROFILE_WEAK_SIGNAL_BANNER = {
  title: '⚠️ 아직 추천 정확도가 낮아요',
  body: '관심분야·사업개요를 조금만 보완하면 더 잘 맞는 공고를 보여드릴 수 있어요.',
  cta: '프로필 보완하기 →',
}

// 관심분야 영역
export const INTERESTS_COPY = {
  importance: '📌 가장 중요한 항목입니다',
  filterInfo: '선택한 분야를 기준으로 공고를 1차 필터링합니다.',
  tipGood: '✔️ 실제 사업과 가장 가까운 분야를 선택해주세요',
  tipBad: '❌ 단순 관심 분야를 많이 선택하면 추천이 흐려질 수 있어요',
  emptyWarning: '⚠️ 관심분야가 명확하지 않으면 업종이 다른 공고도 함께 추천될 수 있습니다.',
}

// 서비스명 (serviceName)
export const SERVICE_NAME_COPY = {
  tip: '💡 서비스명에는 기술·산업 키워드가 포함되면 좋아요',
  examples: '예: AI, SaaS, 콘텐츠, 제조, 플랫폼',
  status: {
    zero: '⚠️ 현재 입력으로는 맞춤 추천이 어려워요',
    low: 'ℹ️ 기본적인 추천은 가능해요',
    good: '✅ 맞춤 추천에 충분한 정보가 입력됐어요',
  },
}

// 사업개요 (businessOverview)
export const BUSINESS_OVERVIEW_COPY = {
  info: '📄 이 내용은 공고의 지원 분야·기술 조건과 직접 매칭됩니다.',
  placeholder: '예시) AI 기반 음원 생성 기술을 활용해 매장용 BGM을 자동 추천·재생하는 SaaS 플랫폼',
  abstractWarning: "⚠️ '혁신적인 플랫폼', '다양한 서비스 제공'처럼 추상적인 설명만 있으면 추천 정확도가 떨어질 수 있어요",
}

// 기업형태/업력
export const COMPANY_INFO_COPY = {
  companyType: '🏢 일부 공고는 법인/개인사업자/예비창업자를 엄격히 구분합니다.',
  businessAge: {
    main: '⏱️ 업력 조건은 지원 가능 여부를 결정하는 핵심 기준이에요',
    sub: '실제 사업자 등록 기준으로 선택해주세요.',
  },
}

// 지역
export const REGION_COPY = {
  main: '📍 지역 제한이 있는 공고가 많아요',
  sub: '소재지가 다르면 추천에서 자동 제외될 수 있습니다.',
}

// 추천 결과 리스트 상단
export const SEARCH_RESULTS_COPY = {
  main: '🔍 현재 프로필 기준으로 지원 가능성이 높은 공고부터 보여드리고 있어요.',
  sub: '점수는 지원자격·업력·분야·지역을 종합해 계산됩니다.',
}

// "왜 추천됐나요?" 툴팁/토글
export const WHY_RECOMMENDED_COPY = {
  title: '이 공고는',
  reasons: [
    '• 관심분야와 사업 내용이 일치하고',
    '• 업력/기업형태 조건을 충족하며',
    '• 지역 요건에 맞아 추천되었습니다.',
  ],
}

// 하단 안내 (맞지 않는 공고가 보일 때)
export const MISMATCH_HELP_COPY = {
  question: '🤔 맞지 않는 공고가 보이나요?',
  suggestion: '사업 개요나 관심분야를 조금만 더 구체화해보세요.',
  cta: '추천 정확도 높이기 →',
}

// 도메인 키워드 (UI용 판단 기준)
export const DOMAIN_KEYWORDS_FOR_UI = [
  'ai', 'saas', '플랫폼', '콘텐츠', '제조', 'r&d', '데이터', '클라우드', 'sw', 'ict',
  '인공지능', '머신러닝', '헬스케어', '바이오', '핀테크', '블록체인', '모빌리티',
  '에듀테크', '푸드테크', '스마트팩토리', '이커머스', '소프트웨어',
]

/**
 * 프로필 신호 부족 여부 판단 (UI용)
 * @param {Object} profile - 프로필 객체
 * @returns {{ isWeak: boolean, reasons: string[] }}
 */
export function checkProfileSignalWeak(profile) {
  if (!profile) return { isWeak: true, reasons: ['프로필이 없습니다'] }

  const reasons = []
  let weakCount = 0

  // 1. interests가 비어있거나 길이=0 이면 부족
  if (!profile.interests || profile.interests.length === 0) {
    weakCount++
    reasons.push('관심분야가 선택되지 않았습니다')
  }

  // 2. businessOverview 텍스트 길이 < 30 이면 부족
  const overviewLength = (profile.businessOverview || '').length
  if (overviewLength < 30) {
    weakCount++
    reasons.push('사업개요가 너무 짧습니다')
  }

  // 3. serviceName에 도메인 키워드가 0개면 부족
  const serviceName = (profile.serviceName || '').toLowerCase()
  const hasKeyword = DOMAIN_KEYWORDS_FOR_UI.some(kw => serviceName.includes(kw.toLowerCase()))
  if (!hasKeyword) {
    weakCount++
    reasons.push('서비스명에 도메인 키워드가 없습니다')
  }

  // 2개 이상 해당하면 "추천 정확도 낮음"
  return {
    isWeak: weakCount >= 2,
    reasons,
    weakCount,
  }
}

/**
 * 서비스명에서 도메인 키워드 개수 판단
 * @param {string} serviceName - 서비스명
 * @returns {number} 감지된 키워드 개수
 */
export function countDomainKeywords(serviceName) {
  if (!serviceName) return 0
  const lowerText = serviceName.toLowerCase()
  return DOMAIN_KEYWORDS_FOR_UI.filter(kw => lowerText.includes(kw.toLowerCase())).length
}

/**
 * 사업개요가 추상적인지 판단 (간단 휴리스틱)
 * @param {string} overview - 사업개요
 * @returns {boolean}
 */
export function isOverviewAbstract(overview) {
  if (!overview) return true
  // 길이가 너무 짧으면 추상적
  if (overview.length < 30) return true

  // 추상적 키워드만 있는지 체크 (간단 휴리스틱)
  const abstractKeywords = ['혁신', '다양', '서비스', '플랫폼', '제공', '솔루션']
  const lowerOverview = overview.toLowerCase()
  const hasConcreteKeyword = DOMAIN_KEYWORDS_FOR_UI.some(kw =>
    lowerOverview.includes(kw.toLowerCase())
  )

  // 구체적인 도메인 키워드 없이 추상적 키워드만 있으면 추상적
  if (!hasConcreteKeyword) {
    const abstractCount = abstractKeywords.filter(kw => lowerOverview.includes(kw)).length
    if (abstractCount >= 2) return true
  }

  return false
}
