/**
 * Hard Filter (checkEligibility) 유닛 테스트
 *
 * 테스트 목표:
 * 1. allowPhrase 포함 시 오탐 방지 (지원 가능한 공고 제거 금지)
 * 2. bizinfo/kstartup 업력 조건 오탐 방지
 * 3. 강한 제외 표현은 정상 제외
 * 4. 소상공인 키워드 오탐 방지
 * 5. 지역 제한 정상 동작
 */

import { checkEligibility, buildHardRequirements, evaluateEligibility } from './matchingScore.js'

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

// 메인 실행
export function runAllTests() {
  const results = runTests()
  testBuildHardRequirements()
  return results
}

// CLI 실행 시
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runAllTests()
}

export { testCases, profiles }
