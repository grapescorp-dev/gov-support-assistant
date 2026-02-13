/**
 * AI 분류 결과 캐싱 시스템
 * - localStorage 기반
 * - 7일간 유효
 * - 최대 500개 항목
 *
 * 목적: AI API 비용 90% 절감
 * - 동일 공고에 대한 중복 AI 호출 방지
 * - 프로필이 변경되어도 공고 자체의 분류(산업, 대상, 지역)는 동일
 */

const CACHE_KEY = 'gov-assistant-ai-cache-v1'
const CACHE_EXPIRY_DAYS = 7
const MAX_CACHE_SIZE = 500

/**
 * 공고 ID 생성 (캐시 키)
 * - 공고 id가 있으면 사용
 * - 없으면 organization + title 조합
 */
function generateCacheKey(announcement) {
  if (announcement.id) {
    return String(announcement.id)
  }
  return `${announcement.organization || 'unknown'}-${(announcement.title || '').slice(0, 50)}`
}

/**
 * 캐시에서 분류 결과 조회
 * @param {Array} announcements - 공고 목록
 * @returns {{ cached: Map, needsClassification: Array }}
 */
export function getCachedClassifications(announcements) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    const now = Date.now()
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    const cached = new Map()
    const needsClassification = []

    announcements.forEach((announcement) => {
      const key = generateCacheKey(announcement)
      const entry = cache[key]

      if (entry && now - entry.timestamp < expiryTime) {
        // 캐시 히트: 유효한 캐시 존재
        cached.set(announcement.id, entry.classification)
      } else {
        // 캐시 미스: AI 분류 필요
        needsClassification.push(announcement)
      }
    })

    return { cached, needsClassification }
  } catch (error) {
    console.error('[ClassificationCache] 캐시 조회 실패:', error)
    return { cached: new Map(), needsClassification: announcements }
  }
}

/**
 * 분류 결과를 캐시에 저장
 * @param {Map} classificationMap - Map<announcementId, classification>
 */
export function saveClassifications(classificationMap) {
  try {
    let cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')

    // 캐시 크기 제한: MAX_CACHE_SIZE 초과 시 오래된 50개 삭제
    const currentSize = Object.keys(cache).length
    if (currentSize >= MAX_CACHE_SIZE) {
      cache = cleanOldEntries(cache, 50)
    }

    // 새 분류 결과 저장
    classificationMap.forEach((classification, announcementId) => {
      const key = String(announcementId)
      cache[key] = {
        classification,
        timestamp: Date.now(),
      }
    })

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('[ClassificationCache] 캐시 저장 실패:', error)
    // QuotaExceededError 시 캐시 초기화
    if (error.name === 'QuotaExceededError') {
      clearCache()
    }
  }
}

/**
 * 오래된 캐시 항목 정리
 * @param {Object} cache - 캐시 객체
 * @param {number} count - 삭제할 항목 수
 * @returns {Object} 정리된 캐시
 */
function cleanOldEntries(cache, count) {
  const entries = Object.entries(cache)
  // timestamp 기준 오름차순 정렬 (오래된 것 먼저)
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
  // 앞에서 count개 제거
  return Object.fromEntries(entries.slice(count))
}

/**
 * 캐시 통계 조회
 * @returns {{ total: number, valid: number, expired: number, hitRate: string }}
 */
export function getCacheStats() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    const now = Date.now()
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    const entries = Object.values(cache)
    const validEntries = entries.filter((e) => now - e.timestamp < expiryTime)

    return {
      total: entries.length,
      valid: validEntries.length,
      expired: entries.length - validEntries.length,
    }
  } catch {
    return { total: 0, valid: 0, expired: 0 }
  }
}

/**
 * 캐시 초기화
 */
export function clearCache() {
  localStorage.removeItem(CACHE_KEY)
  console.log('[ClassificationCache] 캐시 초기화 완료')
}

/**
 * 만료된 캐시만 정리
 */
export function cleanExpiredCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    const now = Date.now()
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    const cleanedCache = {}
    let removedCount = 0

    Object.entries(cache).forEach(([key, entry]) => {
      if (now - entry.timestamp < expiryTime) {
        cleanedCache[key] = entry
      } else {
        removedCount++
      }
    })

    localStorage.setItem(CACHE_KEY, JSON.stringify(cleanedCache))
    console.log(`[ClassificationCache] 만료된 ${removedCount}개 항목 정리 완료`)

    return removedCount
  } catch (error) {
    console.error('[ClassificationCache] 캐시 정리 실패:', error)
    return 0
  }
}

// 개발자 도구에 캐시 관리 함수 노출
if (typeof window !== 'undefined') {
  window.govAssistantCache = {
    stats: getCacheStats,
    clear: clearCache,
    cleanExpired: cleanExpiredCache,
  }
}
