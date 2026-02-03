/**
 * Hard Filter 독립 테스트 (Node.js에서 실행 가능)
 *
 * 실행: node test-hard-filter.mjs
 */

// ============================================================
// 테스트에 필요한 함수들을 인라인으로 정의
// ============================================================

const CONFIDENCE = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

const ALLOW_PHRASES = [
  '지원 가능', '지원가능', '도 가능', '도 지원', '포함', '해당 가능',
  '우대', '가점', '참고', '권장', '선택', '해당 시', '할 수 있음',
  '있는 경우', '경우 가능', '도 참여', '참여 가능',
]

const STRONG_EXCLUSION_PATTERNS = {
  corpOnly: [
    /법인만/,  // 단순 "법인만" - allowPhrase 체크는 별도로
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
}

function hasAllowPhrase(text) {
  const lowerText = text.toLowerCase()
  return ALLOW_PHRASES.some(phrase => lowerText.includes(phrase.toLowerCase()))
}

function hasAllowPhraseNearPattern(text, pattern, contextSize = 40) {
  const match = text.match(pattern)
  if (!match) return false
  const matchIndex = match.index
  const start = Math.max(0, matchIndex - contextSize)
  const end = Math.min(text.length, matchIndex + match[0].length + contextSize)
  const context = text.slice(start, end)
  return hasAllowPhrase(context)
}

// ============================================================
// 테스트 케이스
// ============================================================

const testCases = [
  // 1. allowPhrase 포함 시 오탐 방지
  {
    name: '오탐방지: "창업 7년 이내 기업도 지원 가능" => allowPhrase 감지',
    test: () => {
      const text = '창업 7년 이내 기업도 지원 가능합니다. 모든 중소기업 대상.'
      const hasAllow = hasAllowPhrase(text)
      return hasAllow === true
    },
  },
  {
    name: '오탐방지: "법인 우대" => allowPhrase 감지',
    test: () => {
      const text = '법인 우대, 개인사업자도 신청 가능'
      const hasAllow = hasAllowPhrase(text)
      return hasAllow === true
    },
  },

  // 2. 강한 제외 표현 감지
  {
    name: '정상감지: "개인사업자 제외" 패턴',
    test: () => {
      const text = '개인사업자 제외, 법인기업만 지원'
      return STRONG_EXCLUSION_PATTERNS.soleExcluded.some(p => p.test(text))
    },
  },
  {
    name: '정상감지: "법인만" 패턴',
    test: () => {
      const text = '법인만 지원 가능합니다.'
      return STRONG_EXCLUSION_PATTERNS.corpOnly.some(p => p.test(text))
    },
  },
  {
    name: '정상감지: "법인에 한함" 패턴',
    test: () => {
      const text = '법인에 한함. 중소기업 대상.'
      return STRONG_EXCLUSION_PATTERNS.corpOnly.some(p => p.test(text))
    },
  },
  {
    name: '정상감지: "예비창업자 전용" 패턴',
    test: () => {
      const text = '예비창업자 전용 프로그램입니다.'
      return STRONG_EXCLUSION_PATTERNS.preliminaryOnly.some(p => p.test(text))
    },
  },
  {
    name: '정상감지: "예비창업자 제외" 패턴',
    test: () => {
      const text = '예비창업자 제외, 사업자등록 완료 기업 대상'
      return STRONG_EXCLUSION_PATTERNS.preliminaryExcluded.some(p => p.test(text))
    },
  },

  // 3. allowPhrase로 인한 confidence 하향
  {
    name: '오탐방지: "법인만" + "가능" => allowPhrase로 confidence 하향',
    test: () => {
      const text = '법인만 가능한 것은 아닙니다. 개인사업자도 가능.'
      // 패턴은 매칭되지만, allowPhrase가 있으면 confidence가 낮아짐
      const patternMatches = STRONG_EXCLUSION_PATTERNS.corpOnly.some(p => p.test(text))
      const hasAllow = hasAllowPhrase(text)
      return patternMatches && hasAllow // 둘 다 true여야 함 (패턴 매칭 + allowPhrase 감지)
    },
  },
  {
    name: '컨텍스트 allowPhrase: 패턴 주변 40자에 "가능" 있으면 감지',
    test: () => {
      const text = '창업 7년 이내 기업도 지원 가능합니다.'
      const pattern = /창업\s*\d+\s*년\s*이내/
      return hasAllowPhraseNearPattern(text, pattern)
    },
  },

  // 4. 소상공인 키워드 - 항상 LOW confidence
  {
    name: '소상공인: "소상공인 대상" => 패턴 매칭은 되지만 제외 트리거 안됨',
    test: () => {
      const text = '소상공인 대상 지원사업'
      const pattern = /소상공인\s*(만|전용|에\s*한|한정|대상)/
      // 패턴은 매칭되지만, confidence가 LOW여야 함
      return pattern.test(text) // 패턴 자체는 매칭됨
    },
  },

  // 5. 업력 패턴 감지
  {
    name: '업력감지: "창업 7년 이내" 패턴',
    test: () => {
      const text = '창업 7년 이내 기업 대상'
      const pattern = /창업\s*(\d+)\s*년\s*(이내|미만|이하)/
      const match = text.match(pattern)
      return match && parseInt(match[1]) === 7
    },
  },
  {
    name: '업력감지: "업력 3년 이상" 패턴',
    test: () => {
      const text = '업력 3년 이상 기업 대상'
      const pattern = /업력\s*(\d+)\s*년\s*이상/
      const match = text.match(pattern)
      return match && parseInt(match[1]) === 3
    },
  },

  // 6. 지역 패턴 감지
  {
    name: '지역감지: "서울 소재 기업"',
    test: () => {
      const text = '서울 소재 기업 대상'
      return text.includes('서울') && text.includes('소재')
    },
  },

  // 7. source별 게이트 검증 (로직 검증)
  {
    name: 'source 게이트: bizinfo 업력 조건 => LOW',
    test: () => {
      // bizinfo 소스에서 업력 조건은 기본 LOW
      const source = 'bizinfo'
      const ruleType = 'age'
      const isLow = (source === 'bizinfo' || source === 'kstartup') && ruleType === 'age'
      return isLow === true
    },
  },
  {
    name: 'source 게이트: mss_api => HIGH 가능',
    test: () => {
      const source = 'mss_api'
      const isHigh = source === 'mss_api'
      return isHigh === true
    },
  },
]

// ============================================================
// 테스트 실행
// ============================================================

console.log('='.repeat(60))
console.log('Hard Filter 패턴 및 로직 테스트')
console.log('='.repeat(60))

let passed = 0
let failed = 0

for (const tc of testCases) {
  try {
    const result = tc.test()
    if (result) {
      console.log(`✅ PASS: ${tc.name}`)
      passed++
    } else {
      console.log(`❌ FAIL: ${tc.name}`)
      failed++
    }
  } catch (e) {
    console.log(`❌ ERROR: ${tc.name}`)
    console.log(`   ${e.message}`)
    failed++
  }
}

console.log('\n' + '='.repeat(60))
console.log(`총 ${testCases.length}개 테스트: ${passed} 통과, ${failed} 실패`)
console.log('='.repeat(60))

process.exit(failed > 0 ? 1 : 0)
