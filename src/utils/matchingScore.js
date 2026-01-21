// 프로필 기반 지원사업 매칭률 계산

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

  // 1. 관심 분야 매칭 (40점)
  maxScore += 40
  if (profile.interests && profile.interests.length > 0 && announcement.category) {
    const matchedInterests = profile.interests.filter((interest) =>
      announcement.category.includes(interest)
    )
    if (matchedInterests.length > 0) {
      score += Math.min(40, (matchedInterests.length / announcement.category.length) * 40)
    }
  }

  // 2. 기업 형태 매칭 (20점)
  maxScore += 20
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
      score += 20
    }
  }

  // 3. 업력 매칭 (15점)
  maxScore += 15
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
      score += 15
    }
  }

  // 4. 지역 매칭 (10점)
  maxScore += 10
  if (profile.region && announcement.organization) {
    const orgText = announcement.organization.toLowerCase()
    const regionMatches = {
      seoul: ['서울'],
      gyeonggi: ['경기', '판교'],
      gangwon: ['강원'],
      incheon: ['인천'],
    }

    const matchKeywords = regionMatches[profile.region] || []
    // 지역 특화 사업이거나 전국 대상인 경우
    if (
      matchKeywords.some((kw) => orgText.includes(kw)) ||
      !['서울', '경기', '강원', '인천', '부산', '대구'].some((r) => orgText.includes(r))
    ) {
      score += 10
    }
  }

  // 5. 인증 보유 시 가산점 (15점)
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
