/**
 * Hard Filter (checkEligibility) 유닛 테스트
 *
 * 테스트 목표:
 * 1. allowPhrase 포함 시 오탐 방지 (지원 가능한 공고 제거 금지)
 * 2. bizinfo/kstartup 업력 조건 오탐 방지
 * 3. 강한 제외 표현은 정상 제외
 * 4. 소상공인 키워드 오탐 방지
 * 5. 지역 제한 정상 동작
 * 6. Relevance Gate (도메인 적합도 미달 시 점수 상한)
 * 7. Industry Mismatch Penalty (업종 불일치 감점)
 */

import { checkEligibility, buildHardRequirements, calculateMatchingScore, applyHardFilter, HARD_FILTER_LABELS } from './matchingScore.js'

// 테스트용 프로필
const profiles = {
  // 예비창업자
  preliminary: {
    companyType: 'preliminary',
    businessAge: 'preliminary',
    region: 'seoul',
    certifications: [],
  },
  // 개인사업자 (1년 미만)
  soleUnder1: {
    companyType: 'sole',
    businessAge: 'under1',
    region: 'seoul',
    certifications: [],
  },
  // 개인사업자 (3-7년)
  sole3to7: {
    companyType: 'sole',
    businessAge: '3to7',
    region: 'seoul',
    certifications: [],
  },
  // 법인 중소기업 (1-3년)
  sme1to3: {
    companyType: 'sme',
    businessAge: '1to3',
    region: 'seoul',
    certifications: [],
  },
  // 법인 중소기업 (7년 이상)
  smeOver7: {
    companyType: 'sme',
    businessAge: 'over7',
    region: 'seoul',
    certifications: [],
  },
  // 부산 소재 법인
  smeBusan: {
    companyType: 'sme',
    businessAge: '1to3',
    region: 'busan',
    certifications: [],
  },
  // 중견기업
  midsize: {
    companyType: 'midsize',
    businessAge: '3to7',
    region: 'seoul',
    certifications: [],
  },
  // 비영리단체
  nonprofit: {
    companyType: 'nonprofit',
    businessAge: '1to3',
    region: 'seoul',
    certifications: [],
  },
  // AI 기반 음악 서비스 스타트업 (Relevance Gate 테스트용)
  aiMusicStartup: {
    companyType: 'sme',
    businessAge: '1to3',
    region: 'seoul',
    certifications: [],
    interests: ['ai', 'ict', 'saas', 'content'],
    serviceName: 'AI 기반 음악 추천 플랫폼',
    businessOverview: 'AI를 활용하여 사용자 취향에 맞는 음악을 추천하고 생성하는 SaaS 서비스입니다.',
  },
  // 전통 제조업 (가죽/패션)
  leatherManufacturer: {
    companyType: 'sole',
    businessAge: '3to7',
    region: 'seoul',
    certifications: [],
    interests: ['manufacturing', 'fashion'],
    serviceName: '가죽 패션 액세서리 제조',
    businessOverview: '수공예 가죽 가방 및 액세서리를 제조합니다.',
  },
}

// 테스트 케이스 정의
const testCases = [
  // ========================================
  // 1. allowPhrase 포함 시 오탐 방지
  // ========================================
  {
    name: '오탐방지: "창업 7년 이내 기업도 지원 가능" + 10년 기업 => 통과해야 함',
    profile: profiles.smeOver7,
    announcement: {
      title: 'AI 기술개발 지원사업',
      summary: '창업 7년 이내 기업도 지원 가능합니다. 모든 중소기업 대상.',
      source: 'bizinfo',
    },
    expected: {
      isEligible: true, // 오탐이면 false가 되어 실패
    },
  },
  {
    name: '오탐방지: "예비창업자도 참여 가능" + 법인 => 통과해야 함',
    profile: profiles.sme1to3,
    announcement: {
      title: '스타트업 지원사업',
      summary: '예비창업자도 참여 가능합니다. 모든 창업기업 대상.',
      source: 'kstartup',
    },
    expected: {
      isEligible: true,
    },
  },
  {
    name: '오탐방지: "법인 우대" + 개인사업자 => 통과해야 함',
    profile: profiles.soleUnder1,
    announcement: {
      title: '소상공인 디지털 전환',
      summary: '법인 우대, 개인사업자도 신청 가능',
      source: 'bizinfo',
    },
    expected: {
      isEligible: true,
    },
  },

  // ========================================
  // 2. bizinfo/kstartup 업력 조건 오탐 방지
  // ========================================
  {
    name: 'bizinfo 업력: title/summary만으로 제외하면 안됨',
    profile: profiles.smeOver7,
    announcement: {
      title: '창업 3년 이내 기업 지원',
      summary: '초기창업기업 대상 지원사업',
      source: 'bizinfo',
      // parsed 데이터 없음
    },
    expected: {
      isEligible: true, // bizinfo는 업력 조건으로 제외 트리거 금지
    },
  },
  {
    name: 'kstartup 업력: title/summary만으로 제외하면 안됨',
    profile: profiles.smeOver7,
    announcement: {
      title: '업력 5년 이내 기업 R&D 지원',
      summary: '창업 5년 이내 기업을 위한 R&D 지원',
      source: 'kstartup',
    },
    expected: {
      isEligible: true, // kstartup은 업력 조건으로 제외 트리거 금지
    },
  },

  // ========================================
  // 3. 강한 제외 표현 정상 제외
  // ========================================
  {
    name: '정상제외: "개인사업자 제외" + 개인사업자',
    profile: profiles.soleUnder1,
    announcement: {
      title: '법인기업 R&D 지원',
      summary: '개인사업자 제외, 법인기업만 지원',
      source: 'bizinfo',
    },
    expected: {
      isEligible: false,
      code: 'COMPANY_TYPE_SOLE_EXCLUDED',
    },
  },
  {
    name: '정상제외: "법인만" + 예비창업자',
    profile: profiles.preliminary,
    announcement: {
      title: '법인 기업 해외진출 지원',
      summary: '법인만 지원 가능합니다.',
      source: 'bizinfo',
    },
    expected: {
      isEligible: false,
      code: 'COMPANY_TYPE_CORP_ONLY',
    },
  },
  {
    name: '정상제외: "법인에 한함" + 개인사업자',
    profile: profiles.sole3to7,
    announcement: {
      title: '수출 바우처 지원',
      summary: '법인에 한함. 중소기업 대상.',
      source: 'bizinfo',
    },
    expected: {
      isEligible: false,
      code: 'COMPANY_TYPE_CORP_ONLY',
    },
  },
  {
    name: '정상제외: "예비창업자 전용" + 법인',
    profile: profiles.sme1to3,
    announcement: {
      title: '예비창업자 전용 교육',
      summary: '예비창업자 전용 프로그램입니다.',
      source: 'kstartup',
    },
    expected: {
      isEligible: false,
      code: 'COMPANY_TYPE_PRELIMINARY_ONLY',
    },
  },
  {
    name: '정상제외: "예비창업자 제외" + 예비창업자',
    profile: profiles.preliminary,
    announcement: {
      title: '기존 사업자 지원',
      summary: '예비창업자 제외, 사업자등록 완료 기업 대상',
      source: 'bizinfo',
    },
    expected: {
      isEligible: false,
      code: 'COMPANY_TYPE_PRELIMINARY_EXCLUDED',
    },
  },
  {
    name: '정상제외: "비영리 제외" + 비영리단체',
    profile: profiles.nonprofit,
    announcement: {
      title: '영리법인 지원사업',
      summary: '비영리 단체 제외',
      source: 'bizinfo',
    },
    expected: {
      isEligible: false,
      code: 'COMPANY_TYPE_NONPROFIT_EXCLUDED',
    },
  },

  // ========================================
  // 4. 소상공인 키워드 오탐 방지
  // ========================================
  {
    name: '오탐방지: "소상공인 대상" + 법인(중소기업) => 통과해야 함',
    profile: profiles.sme1to3,
    announcement: {
      title: '소상공인 디지털 바우처',
      summary: '소상공인 대상 지원사업',
      source: 'bizinfo',
    },
    expected: {
      isEligible: true, // 소상공인 판정은 상시근로자 수 필요 → 확정 불가
    },
  },
  {
    name: '오탐방지: "소상공인 전용" + 중견기업 => 통과해야 함 (확정 불가)',
    profile: profiles.midsize,
    announcement: {
      title: '소상공인 전용 지원',
      summary: '소상공인 전용 프로그램',
      source: 'bizinfo',
    },
    expected: {
      isEligible: true, // 소상공인은 확정 불가 → 제외 안함
    },
  },

  // ========================================
  // 5. 지역 제한 정상 동작
  // ========================================
  {
    name: '지역제외: 서울 공고 + 부산 기업',
    profile: profiles.smeBusan,
    announcement: {
      title: '서울시 스타트업 지원',
      summary: '서울 소재 기업 대상',
      source: 'bizinfo',
    },
    expected: {
      isEligible: false,
      code: 'REGION_MISMATCH',
    },
  },
  {
    name: '지역통과: 지역 제한 없음 (unknown)',
    profile: profiles.smeBusan,
    announcement: {
      title: '전국 스타트업 지원',
      summary: '중소기업 대상 지원사업',
      source: 'bizinfo',
    },
    expected: {
      isEligible: true,
    },
  },
  {
    name: '지역통과: 지역 일치 (부산 공고 + 부산 기업)',
    profile: profiles.smeBusan,
    announcement: {
      title: '부산시 기업 지원',
      summary: '부산 소재 기업 대상',
      source: 'bizinfo',
    },
    expected: {
      isEligible: true,
    },
  },

  // ========================================
  // 6. MSS API parsed 데이터 기반 제외 (HIGH confidence)
  // ========================================
  {
    name: 'MSS 업력: parsed.exclusionText 기반 제외',
    profile: profiles.smeOver7,
    announcement: {
      title: '초기창업기업 R&D',
      summary: '초기창업기업 지원',
      source: 'mss_api',
      parsed: {
        exclusionText: '창업 7년 이내 기업에 한함. 업력 초과 기업 제외.',
        eligibilityText: '창업 7년 이내 중소기업',
      },
    },
    expected: {
      isEligible: false, // MSS API parsed 데이터는 HIGH confidence
      code: 'BUSINESS_AGE_EXCEEDED',
    },
  },
  {
    name: 'MSS 기업형태: parsed.exclusionText 기반 제외',
    profile: profiles.soleUnder1,
    announcement: {
      title: '법인기업 지원',
      summary: '중소기업 대상',
      source: 'mss_api',
      parsed: {
        exclusionText: '개인사업자 제외',
      },
    },
    expected: {
      isEligible: false,
      code: 'COMPANY_TYPE_SOLE_EXCLUDED',
    },
  },
]

// ========================================
// Relevance Gate & Industry Mismatch Penalty 테스트 케이스
// ========================================
const scoreTestCases = [
  // 핵심 테스트: AI 스타트업 + 가죽패션 공고 => 상위 노출 금지
  {
    name: 'Industry Mismatch: AI 스타트업 + 가죽패션 소공인 공고 => 점수 상한 적용',
    profile: profiles.aiMusicStartup,
    announcement: {
      title: '가죽패션 소공인 장비 임대지원',
      summary: '가죽 피혁 봉제 소공인 제조장비 임대 지원사업',
      source: 'bizinfo',
      eligibility: ['서울 소재 소상공인', '소공인'],
      category: ['제조', '장비지원'],
    },
    expected: {
      maxScore: 49, // Relevance Gate CAP 또는 Industry Mismatch로 인해 낮은 점수
      description: '지역 일치(서울)해도 도메인 불일치로 상위 노출 금지',
    },
  },
  {
    name: 'Industry Match: 가죽 제조업체 + 가죽패션 소공인 공고 => 높은 점수',
    profile: profiles.leatherManufacturer,
    announcement: {
      title: '가죽패션 소공인 장비 임대지원',
      summary: '가죽 피혁 봉제 소공인 제조장비 임대 지원사업',
      source: 'bizinfo',
      eligibility: ['서울 소재 소상공인', '소공인'],
      category: ['제조', '장비지원'],
    },
    expected: {
      minScore: 50, // 업종 일치 시 적정 점수
      description: '업종 + 지역 일치로 높은 점수',
    },
  },
  {
    name: 'Relevance Gate: 관심분야 매칭 없이 지역만 일치 => 점수 상한',
    profile: {
      companyType: 'sme',
      businessAge: '1to3',
      region: 'seoul',
      certifications: [],
      interests: ['fintech', 'blockchain'], // 금융/블록체인 관심
      serviceName: '암호화폐 거래 플랫폼',
      businessOverview: '블록체인 기반 디지털 자산 거래 서비스',
    },
    announcement: {
      title: '농업 스마트팜 장비 지원',
      summary: '스마트팜 설비 도입 지원사업',
      source: 'bizinfo',
      eligibility: ['서울 소재 농업법인'],
      category: ['농업', '스마트팜'],
    },
    expected: {
      maxScore: 49, // Relevance 미달로 점수 상한
      description: '관심분야(핀테크) vs 공고(농업) 불일치',
    },
  },
  {
    name: 'Relevance Pass: AI 스타트업 + AI 지원사업 => 높은 점수',
    profile: profiles.aiMusicStartup,
    announcement: {
      title: 'AI 스타트업 기술개발 지원',
      summary: 'AI 인공지능 기반 서비스 개발 지원사업',
      source: 'bizinfo',
      eligibility: ['서울 소재 중소기업'],
      category: ['AI', 'ICT', '기술개발'],
      tags: ['인공지능', 'AI', 'SaaS'],
    },
    expected: {
      minScore: 50, // 관심분야 일치로 Relevance Gate 통과
      description: '관심분야(AI/ICT) 일치로 높은 점수',
    },
  },
  {
    name: 'No Industry Penalty: 범용 지원사업 => 패널티 없음',
    profile: profiles.aiMusicStartup,
    announcement: {
      title: '중소기업 R&D 바우처 지원',
      summary: '중소기업 연구개발 바우처 지원사업',
      source: 'bizinfo',
      eligibility: ['전국 중소기업'],
      category: ['R&D', '바우처'],
    },
    expected: {
      // 범용 공고는 Industry Mismatch 없음 (특정 업종 키워드 없음)
      noIndustryPenalty: true,
      description: '특정 업종 키워드 없어서 패널티 없음',
    },
  },
]

// 테스트 실행
function runTests() {
  console.log('='.repeat(60))
  console.log('Hard Filter (checkEligibility) 유닛 테스트')
  console.log('='.repeat(60))

  let passed = 0
  let failed = 0
  const failures = []

  for (const tc of testCases) {
    const result = checkEligibility(tc.profile, tc.announcement)

    let success = true
    let failReason = ''

    // isEligible 검증
    if (result.isEligible !== tc.expected.isEligible) {
      success = false
      failReason = `isEligible: expected ${tc.expected.isEligible}, got ${result.isEligible}`
    }

    // code 검증 (expected.code가 있을 때만)
    if (success && tc.expected.code) {
      if (result.excludedReason?.code !== tc.expected.code) {
        success = false
        failReason = `code: expected ${tc.expected.code}, got ${result.excludedReason?.code}`
      }
    }

    if (success) {
      console.log(`✅ PASS: ${tc.name}`)
      passed++
    } else {
      console.log(`❌ FAIL: ${tc.name}`)
      console.log(`   ${failReason}`)
      console.log(`   Result:`, JSON.stringify(result, null, 2).split('\n').map(l => '   ' + l).join('\n'))
      failed++
      failures.push({ name: tc.name, reason: failReason, result })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`총 ${testCases.length}개 테스트: ${passed} 통과, ${failed} 실패`)
  console.log('='.repeat(60))

  if (failures.length > 0) {
    console.log('\n실패한 테스트:')
    failures.forEach((f, i) => {
      console.log(`${i + 1}. ${f.name}`)
      console.log(`   사유: ${f.reason}`)
    })
  }

  return { passed, failed, total: testCases.length }
}

// buildHardRequirements 테스트
function testBuildHardRequirements() {
  console.log('\n' + '='.repeat(60))
  console.log('buildHardRequirements 테스트')
  console.log('='.repeat(60))

  const testAnnouncements = [
    {
      name: 'allowPhrase 포함 공고',
      announcement: {
        title: '창업 7년 이내 기업도 지원 가능',
        summary: '모든 기업 대상',
        source: 'bizinfo',
      },
    },
    {
      name: 'MSS API 공고',
      announcement: {
        title: '초기창업기업 지원',
        summary: '창업 7년 이내',
        source: 'mss_api',
        parsed: {
          exclusionText: '개인사업자 제외',
          mandatoryText: '벤처기업 인증 필수',
        },
      },
    },
  ]

  for (const tc of testAnnouncements) {
    const result = buildHardRequirements(tc.announcement)
    console.log(`\n📋 ${tc.name}:`)
    console.log(`   companyType confidence: ${result.companyType.confidence}`)
    console.log(`   age confidence: ${result.age.confidence}`)
    console.log(`   region confidence: ${result.region.confidence}`)
    console.log(`   exclusions confidence: ${result.exclusions.confidence}`)
    console.log(`   mandatory confidence: ${result.mandatory.confidence}`)
  }
}

// Relevance Gate & Industry Mismatch 테스트
function testRelevanceAndIndustryMismatch() {
  console.log('\n' + '='.repeat(60))
  console.log('Relevance Gate & Industry Mismatch Penalty 테스트')
  console.log('='.repeat(60))

  let passed = 0
  let failed = 0
  const failures = []

  for (const tc of scoreTestCases) {
    const score = calculateMatchingScore(tc.profile, tc.announcement)
    let success = true
    let failReason = ''

    // maxScore 검증
    if (tc.expected.maxScore !== undefined && score > tc.expected.maxScore) {
      success = false
      failReason = `점수 상한 초과: expected <= ${tc.expected.maxScore}, got ${score}`
    }

    // minScore 검증
    if (tc.expected.minScore !== undefined && score < tc.expected.minScore) {
      success = false
      failReason = `점수 하한 미달: expected >= ${tc.expected.minScore}, got ${score}`
    }

    if (success) {
      console.log(`✅ PASS: ${tc.name} (score: ${score})`)
      console.log(`   ${tc.expected.description}`)
      passed++
    } else {
      console.log(`❌ FAIL: ${tc.name} (score: ${score})`)
      console.log(`   ${failReason}`)
      console.log(`   ${tc.expected.description}`)
      failed++
      failures.push({ name: tc.name, reason: failReason, score })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`Relevance/Industry 테스트: ${scoreTestCases.length}개 중 ${passed} 통과, ${failed} 실패`)
  console.log('='.repeat(60))

  return { passed, failed, total: scoreTestCases.length }
}

// ========================================
// applyHardFilter v2 테스트 케이스
// ========================================
const applyHardFilterTestCases = [
  // 1. MSS 지역 제외 (FAIL)
  {
    name: 'MSS 지역 불일치: 부산 소재 공고 + 서울 프로필 => FAIL',
    profile: {
      companyType: 'sme',
      businessAge: '1to3',
      region: 'seoul',
    },
    announcement: {
      id: 'test-1',
      title: '부산시 스타트업 지원',
      summary: '부산 소재 기업만 지원 가능',
      source: 'mss_api',
    },
    expected: {
      hardPass: false,
      hasLabel: HARD_FILTER_LABELS.REGION_MISMATCH,
    },
  },

  // 2. bizinfo 데이터 없음 (UNKNOWN → 기본 포함)
  {
    name: 'bizinfo 데이터 부족: parsed 없음 => UNKNOWN (기본 포함)',
    profile: {
      companyType: 'sme',
      businessAge: '1to3',
      region: 'seoul',
    },
    announcement: {
      id: 'test-2',
      title: 'AI 기업 지원사업',
      summary: '중소기업 대상',
      source: 'bizinfo',
      // parsed 없음
    },
    expected: {
      hardPass: null, // Unknown
      hasUnknownLabel: HARD_FILTER_LABELS.MISSING_ELIGIBILITY_TEXT,
    },
  },

  // 3. 개인사업자 제외 패턴 (FAIL)
  {
    name: '개인사업자 제외 패턴 => FAIL',
    profile: {
      companyType: 'sole',
      businessAge: 'under1',
      region: 'seoul',
    },
    announcement: {
      id: 'test-3',
      title: '법인기업 R&D 지원',
      summary: '개인사업자 제외, 법인기업만 지원 가능',
      source: 'bizinfo',
    },
    expected: {
      hardPass: false,
      hasLabel: HARD_FILTER_LABELS.TARGET_MISMATCH,
    },
  },

  // 4. 우대 키워드 (PASS)
  {
    name: '우대 키워드: "법인 우대, 개인사업자도 지원 가능" => PASS',
    profile: {
      companyType: 'sole',
      businessAge: '1to3',
      region: 'seoul',
    },
    announcement: {
      id: 'test-4',
      title: '소상공인 지원사업',
      summary: '법인 우대, 개인사업자도 지원 가능',
      source: 'bizinfo',
    },
    expected: {
      hardPass: null, // bizinfo는 parsed 없으면 Unknown
      notHardFail: true, // hardPass !== false
    },
  },

  // 5. 강한 업종 불일치 (현재는 medium confidence이므로 FAIL이 아님)
  {
    name: '업종 불일치 (가죽/피혁 공고 + AI 프로필) => PASS (medium confidence)',
    profile: {
      companyType: 'sme',
      businessAge: '1to3',
      region: 'seoul',
      interests: ['ai', 'saas'],
      businessOverview: 'AI 기반 SaaS 서비스',
    },
    announcement: {
      id: 'test-5',
      title: '가죽 피혁 소공인 장비지원',
      summary: '가죽 피혁 봉제 소공인 제조장비 지원사업',
      source: 'bizinfo',
    },
    expected: {
      // Industry mismatch는 medium confidence이므로 hard fail이 아님
      notHardFail: true,
    },
  },

  // 6. 마감일 경과 (FAIL)
  {
    name: '마감일 경과 => FAIL',
    profile: {
      companyType: 'sme',
      businessAge: '1to3',
      region: 'seoul',
    },
    announcement: {
      id: 'test-6',
      title: '지원사업',
      summary: '중소기업 대상',
      source: 'bizinfo',
      deadline: '2020-01-01', // 과거 날짜
    },
    expected: {
      hardPass: false,
      hasLabel: HARD_FILTER_LABELS.DEADLINE_PASSED,
    },
  },

  // 7. 모든 조건 통과 (MSS with parsed data)
  {
    name: 'MSS 공고 + 조건 충족 => PASS (high confidence)',
    profile: {
      companyType: 'sme',
      businessAge: '1to3',
      region: 'seoul',
    },
    announcement: {
      id: 'test-7',
      title: '서울 중소기업 R&D 지원',
      summary: '서울 소재 중소기업 대상',
      source: 'mss_api',
      parsed: {
        eligibilityText: '서울 소재 중소기업',
      },
      deadline: '2030-12-31',
    },
    expected: {
      hardPass: true,
      hardConfidence: 'high',
    },
  },
]

// applyHardFilter 테스트 실행
function testApplyHardFilter() {
  console.log('\n' + '='.repeat(60))
  console.log('applyHardFilter v2 테스트')
  console.log('='.repeat(60))

  let passed = 0
  let failed = 0
  const failures = []

  for (const tc of applyHardFilterTestCases) {
    const result = applyHardFilter(tc.profile, tc.announcement)

    let success = true
    let failReason = ''

    // hardPass 검증
    if (tc.expected.hardPass !== undefined) {
      if (result.hardPass !== tc.expected.hardPass) {
        success = false
        failReason = `hardPass: expected ${tc.expected.hardPass}, got ${result.hardPass}`
      }
    }

    // notHardFail 검증 (hardPass !== false)
    if (success && tc.expected.notHardFail) {
      if (result.hardPass === false) {
        success = false
        failReason = `notHardFail: expected hardPass !== false, got ${result.hardPass}`
      }
    }

    // hasLabel 검증 (hardFailReasons에 특정 라벨 포함)
    if (success && tc.expected.hasLabel) {
      const hasLabel = result.hardFailReasons.some(r => r.label === tc.expected.hasLabel)
      if (!hasLabel) {
        success = false
        failReason = `hasLabel: expected ${tc.expected.hasLabel} in hardFailReasons, got ${result.hardFailReasons.map(r => r.label).join(', ')}`
      }
    }

    // hasUnknownLabel 검증 (hardUnknownReasons에 특정 라벨 포함)
    if (success && tc.expected.hasUnknownLabel) {
      const hasLabel = result.hardUnknownReasons.some(r => r.label === tc.expected.hasUnknownLabel)
      if (!hasLabel) {
        success = false
        failReason = `hasUnknownLabel: expected ${tc.expected.hasUnknownLabel} in hardUnknownReasons, got ${result.hardUnknownReasons.map(r => r.label).join(', ')}`
      }
    }

    // hardConfidence 검증
    if (success && tc.expected.hardConfidence) {
      if (result.hardConfidence !== tc.expected.hardConfidence) {
        success = false
        failReason = `hardConfidence: expected ${tc.expected.hardConfidence}, got ${result.hardConfidence}`
      }
    }

    if (success) {
      console.log(`✅ PASS: ${tc.name}`)
      passed++
    } else {
      console.log(`❌ FAIL: ${tc.name}`)
      console.log(`   ${failReason}`)
      console.log(`   Result:`, JSON.stringify(result, null, 2).split('\n').map(l => '   ' + l).join('\n'))
      failed++
      failures.push({ name: tc.name, reason: failReason, result })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`applyHardFilter 테스트: ${applyHardFilterTestCases.length}개 중 ${passed} 통과, ${failed} 실패`)
  console.log('='.repeat(60))

  return { passed, failed, total: applyHardFilterTestCases.length }
}

// 메인 실행
export function runAllTests() {
  const hardFilterResults = runTests()
  testBuildHardRequirements()
  const relevanceResults = testRelevanceAndIndustryMismatch()
  const applyHardFilterResults = testApplyHardFilter()

  const totalPassed = hardFilterResults.passed + relevanceResults.passed + applyHardFilterResults.passed
  const totalFailed = hardFilterResults.failed + relevanceResults.failed + applyHardFilterResults.failed
  const totalTests = hardFilterResults.total + relevanceResults.total + applyHardFilterResults.total

  console.log('\n' + '='.repeat(60))
  console.log(`전체 테스트 결과: ${totalTests}개 중 ${totalPassed} 통과, ${totalFailed} 실패`)
  console.log('='.repeat(60))

  return { passed: totalPassed, failed: totalFailed, total: totalTests }
}

// CLI 실행 시
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runAllTests()
}

export { testCases, scoreTestCases, profiles, applyHardFilterTestCases }
