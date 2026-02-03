/**
 * Hard Filter 디버그 유틸리티
 * 브라우저 콘솔에서 window.__hardFilterDebug()로 호출 가능
 */

import { applyHardFilter, HARD_FILTER_LABELS } from './matchingScore'

// 디버그 통계 저장소
let debugStats = {
  counts: { pass: 0, fail: 0, unknown: 0 },
  failReasonCounts: {},
  unknownReasonCounts: {},
  samples: { fail: [], unknown: [] },
  lastReset: null,
}

/**
 * 디버그 통계 초기화
 */
export function resetHardFilterDebug() {
  debugStats = {
    counts: { pass: 0, fail: 0, unknown: 0 },
    failReasonCounts: {},
    unknownReasonCounts: {},
    samples: { fail: [], unknown: [] },
    lastReset: new Date().toISOString(),
  }
}

/**
 * Hard Filter 적용 및 디버그 통계 수집
 * @param {Object} profile - 프로필
 * @param {Object} announcement - 공고
 * @returns {Object} applyHardFilter 결과
 */
export function applyHardFilterWithDebug(profile, announcement) {
  const result = applyHardFilter(profile, announcement)

  // 통계 수집
  if (result.hardPass === true) {
    debugStats.counts.pass++
  } else if (result.hardPass === false) {
    debugStats.counts.fail++

    // 실패 사유별 카운트
    result.hardFailReasons.forEach(reason => {
      debugStats.failReasonCounts[reason.label] = (debugStats.failReasonCounts[reason.label] || 0) + 1
    })

    // 샘플 저장 (최대 20개)
    if (debugStats.samples.fail.length < 20) {
      debugStats.samples.fail.push({
        announcementId: announcement.id,
        title: announcement.title?.substring(0, 50),
        source: announcement.source,
        reasons: result.hardFailReasons.map(r => r.label),
      })
    }
  } else {
    // hardPass === null (unknown)
    debugStats.counts.unknown++

    // Unknown 사유별 카운트
    result.hardUnknownReasons.forEach(reason => {
      debugStats.unknownReasonCounts[reason.label] = (debugStats.unknownReasonCounts[reason.label] || 0) + 1
    })

    // 샘플 저장 (최대 20개)
    if (debugStats.samples.unknown.length < 20) {
      debugStats.samples.unknown.push({
        announcementId: announcement.id,
        title: announcement.title?.substring(0, 50),
        source: announcement.source,
        reasons: result.hardUnknownReasons.map(r => r.label),
      })
    }
  }

  return result
}

/**
 * 현재 디버그 통계 반환
 * @returns {Object} 디버그 통계
 */
export function getHardFilterDebugStats() {
  const total = debugStats.counts.pass + debugStats.counts.fail + debugStats.counts.unknown

  return {
    ...debugStats,
    total,
    percentages: total > 0 ? {
      pass: ((debugStats.counts.pass / total) * 100).toFixed(1) + '%',
      fail: ((debugStats.counts.fail / total) * 100).toFixed(1) + '%',
      unknown: ((debugStats.counts.unknown / total) * 100).toFixed(1) + '%',
    } : { pass: '0%', fail: '0%', unknown: '0%' },
    labels: HARD_FILTER_LABELS,
  }
}

/**
 * 브라우저 콘솔에서 사용할 수 있는 글로벌 함수 등록
 */
export function registerHardFilterDebugGlobal() {
  if (typeof window !== 'undefined') {
    window.__hardFilterDebug = getHardFilterDebugStats
    window.__hardFilterDebugReset = resetHardFilterDebug
    window.__HARD_FILTER_LABELS = HARD_FILTER_LABELS

    // 초기화
    resetHardFilterDebug()

    console.log('[HardFilterDebug] 디버그 함수 등록 완료')
    console.log('  - window.__hardFilterDebug() : 통계 확인')
    console.log('  - window.__hardFilterDebugReset() : 통계 초기화')
    console.log('  - window.__HARD_FILTER_LABELS : 라벨 상수')
  }
}
