// API 호출 함수들

// 개발 환경에서는 Vite 프록시(/api)를 통해, 프로덕션에서는 직접 Netlify Functions 호출
const API_BASE = import.meta.env.DEV ? '/api' : '/.netlify/functions'

// 실제 공고 데이터 가져오기 (기업마당 API)
export async function fetchRealAnnouncements(options = {}) {
  const params = new URLSearchParams()
  if (options.keyword) params.append('keyword', options.keyword)
  if (options.category) params.append('category', options.category)
  if (options.refresh) params.append('refresh', 'true')

  try {
    const response = await fetch(`${API_BASE}/fetchAnnouncements?${params}`)
    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || '실제 공고 데이터를 가져오는 중 오류가 발생했습니다')
    }

    return {
      announcements: data.data,
      total: data.total,
      cached: data.cached,
      cacheAge: data.cacheAge,
    }
  } catch (error) {
    console.error('[fetchRealAnnouncements] Error:', error)
    throw error
  }
}

// 지원사업 검색 (목업 데이터)
export async function searchAnnouncements(keyword, filters = {}) {
  const params = new URLSearchParams()
  if (keyword) params.append('keyword', keyword)
  if (filters.category) params.append('category', filters.category)
  if (filters.organization) params.append('organization', filters.organization)

  const response = await fetch(`${API_BASE}/search?${params}`)
  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || '검색 중 오류가 발생했습니다')
  }

  return data.data
}

// AI 분석 요청
export async function analyzeProgram(announcement, profile) {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ announcement, profile }),
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || '분석 중 오류가 발생했습니다')
  }

  return data.data
}

// 섹션별 AI 작성 제안
export async function getSuggestion(section, programTitle, userProfile, currentContent) {
  const response = await fetch(`${API_BASE}/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, programTitle, userProfile, currentContent }),
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || '제안 생성 중 오류가 발생했습니다')
  }

  return data.data
}

// ==============================================
// 문서 기반 AI 요약 (MSS 공고 전용)
// ==============================================

const DOC_SUMMARY_CACHE_KEY_PREFIX = 'docSummary:'
const DOC_SUMMARY_CACHE_EXPIRY_DAYS = 7

/**
 * localStorage 캐시에서 요약 조회
 */
function getDocSummaryFromCache(announcementId) {
  try {
    const key = `${DOC_SUMMARY_CACHE_KEY_PREFIX}${announcementId}`
    const cached = localStorage.getItem(key)

    if (!cached) return null

    const parsed = JSON.parse(cached)
    const createdAt = new Date(parsed.createdAt)
    const now = new Date()
    const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24)

    // 만료 확인 (7일)
    if (diffDays > DOC_SUMMARY_CACHE_EXPIRY_DAYS) {
      localStorage.removeItem(key)
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}

/**
 * localStorage 캐시에 요약 저장
 */
function setDocSummaryToCache(announcementId, data) {
  try {
    const key = `${DOC_SUMMARY_CACHE_KEY_PREFIX}${announcementId}`
    const cacheEntry = {
      createdAt: new Date().toISOString(),
      data,
    }
    localStorage.setItem(key, JSON.stringify(cacheEntry))
  } catch {
    // localStorage 용량 초과 등 무시
    console.warn('[DocSummary] Failed to save cache')
  }
}

/**
 * 문서 기반 AI 요약 요청 (MSS 공고 전용)
 * - 캐시가 있으면 캐시 반환
 * - 없으면 서버 호출 후 캐시 저장
 *
 * @param {Object} announcement - 공고 객체 (mssMeta.files 포함)
 * @returns {Promise<Object>} 요약 결과 또는 에러
 */
export async function summarizeProgramFromDoc(announcement) {
  // 1. 캐시 확인
  const cached = getDocSummaryFromCache(announcement.id)
  if (cached) {
    console.log('[DocSummary] Returning cached result')
    return { success: true, data: cached, fromCache: true }
  }

  // 2. 서버 호출
  const response = await fetch(`${API_BASE}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ announcement }),
  })

  const result = await response.json()

  // 3. 성공 시 캐시 저장
  if (result.success && result.data) {
    setDocSummaryToCache(announcement.id, result.data)
  }

  return result
}

// ==============================================
// MSS 문서 파싱 (parsed 필드 확보)
// ==============================================

const PARSED_CACHE_KEY_PREFIX = 'parsedMss:'
const PARSED_CACHE_EXPIRY_DAYS = 7

/**
 * localStorage 캐시에서 parsed 조회
 */
function getParsedFromCache(announcementId) {
  try {
    const key = `${PARSED_CACHE_KEY_PREFIX}${announcementId}`
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const entry = JSON.parse(cached)
    const diffDays = (Date.now() - new Date(entry.createdAt)) / (1000 * 60 * 60 * 24)
    if (diffDays > PARSED_CACHE_EXPIRY_DAYS) {
      localStorage.removeItem(key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

/**
 * localStorage 캐시에 parsed 저장
 */
function setParsedToCache(announcementId, data) {
  try {
    const key = `${PARSED_CACHE_KEY_PREFIX}${announcementId}`
    localStorage.setItem(key, JSON.stringify({ createdAt: new Date().toISOString(), data }))
  } catch {
    console.warn('[ParsedMss] Failed to save cache')
  }
}

/**
 * MSS 공고 문서에서 지원자격/제외조건/필수요건/태그 파싱
 * - 캐시가 있으면 캐시 반환
 * - 없으면 서버 호출 후 캐시 저장
 *
 * @param {Object} announcement - 공고 객체 (mssMeta.files 포함)
 * @returns {Promise<Object>} { success, data: parsed, fromCache?, note? }
 */
export async function parseMssDocs(announcement) {
  // MSS 공고가 아니거나 파일이 없으면 빈 결과
  if (
    announcement.source !== 'mss_api' ||
    !announcement.mssMeta?.files ||
    announcement.mssMeta.files.length === 0
  ) {
    return {
      success: true,
      data: { eligibilityText: '', mandatoryText: '', exclusionText: '', tags: [] },
      note: 'NOT_MSS_OR_NO_FILES',
    }
  }

  // 1. 캐시 확인
  const cached = getParsedFromCache(announcement.id)
  if (cached) {
    console.log('[ParsedMss] Returning cached result')
    return { success: true, data: cached, fromCache: true }
  }

  // 2. 서버 호출
  try {
    const response = await fetch(`${API_BASE}/parseMssDocs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        announcementId: announcement.id,
        files: announcement.mssMeta.files,
        title: announcement.title,
        summary: announcement.summary,
      }),
    })

    const result = await response.json()

    // 3. 성공 시 캐시 저장
    if (result.success && result.data) {
      setParsedToCache(announcement.id, result.data)
    }

    return result
  } catch (error) {
    console.error('[ParsedMss] Error:', error)
    return {
      success: true,
      data: { eligibilityText: '', mandatoryText: '', exclusionText: '', tags: [] },
      note: `ERROR: ${error.message}`,
    }
  }
}

// ==============================================
// Hard Filter 캐시 (v2)
// - 성공: 7일 캐시
// - 실패 (negative cache): 6시간 캐시
// ==============================================

const HF_CACHE_KEY_PREFIX = 'hfCache:'
const HF_CACHE_EXPIRY_DAYS_PASS = 7
const HF_CACHE_EXPIRY_HOURS_FAIL = 6

/**
 * Hard Filter 캐시 키 생성
 * - source, id, updatedAt 조합으로 고유 키 생성
 * @param {Object} announcement - 공고 객체
 * @returns {string} 캐시 키
 */
function getHardFilterCacheKey(announcement) {
  const source = announcement.source || 'unknown'
  const id = announcement.id
  const updatedAt = announcement.updatedAt || announcement.fetchedAt || ''
  return `${HF_CACHE_KEY_PREFIX}${source}:${id}:${updatedAt}`
}

/**
 * localStorage 캐시에서 Hard Filter 결과 조회
 * @param {Object} announcement - 공고 객체
 * @returns {Object|null} 캐시된 결과 또는 null
 */
export function getHardFilterFromCache(announcement) {
  try {
    const key = getHardFilterCacheKey(announcement)
    const cached = localStorage.getItem(key)

    if (!cached) return null

    const entry = JSON.parse(cached)
    const now = Date.now()
    const createdAt = new Date(entry.createdAt).getTime()

    // 만료 확인 (실패는 6시간, 성공은 7일)
    const isNegative = entry.negative === true
    const expiryMs = isNegative
      ? HF_CACHE_EXPIRY_HOURS_FAIL * 60 * 60 * 1000
      : HF_CACHE_EXPIRY_DAYS_PASS * 24 * 60 * 60 * 1000

    if (now - createdAt > expiryMs) {
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

/**
 * localStorage 캐시에 Hard Filter 결과 저장
 * @param {Object} announcement - 공고 객체
 * @param {Object} result - applyHardFilter 결과
 */
export function setHardFilterToCache(announcement, result) {
  try {
    const key = getHardFilterCacheKey(announcement)
    const isNegative = result.hardPass === false
    const cacheEntry = {
      createdAt: new Date().toISOString(),
      negative: isNegative,
      data: result,
    }
    localStorage.setItem(key, JSON.stringify(cacheEntry))
  } catch {
    // localStorage 용량 초과 등 무시
    console.warn('[HardFilterCache] Failed to save cache')
  }
}

/**
 * Hard Filter 캐시 전체 삭제 (디버그용)
 * @returns {number} 삭제된 항목 수
 */
export function clearHardFilterCache() {
  let count = 0
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(HF_CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key)
        count++
      }
    })
    console.log(`[HardFilterCache] Cleared ${count} entries`)
  } catch {
    console.warn('[HardFilterCache] Failed to clear cache')
  }
  return count
}

/**
 * Hard Filter 캐시 통계 조회 (디버그용)
 * @returns {Object} { total, pass, fail, unknown, expired }
 */
export function getHardFilterCacheStats() {
  const stats = { total: 0, pass: 0, fail: 0, unknown: 0, expired: 0 }

  try {
    const keys = Object.keys(localStorage)
    const now = Date.now()

    keys.forEach(key => {
      if (key.startsWith(HF_CACHE_KEY_PREFIX)) {
        stats.total++
        try {
          const entry = JSON.parse(localStorage.getItem(key))
          const createdAt = new Date(entry.createdAt).getTime()
          const isNegative = entry.negative === true
          const expiryMs = isNegative
            ? HF_CACHE_EXPIRY_HOURS_FAIL * 60 * 60 * 1000
            : HF_CACHE_EXPIRY_DAYS_PASS * 24 * 60 * 60 * 1000

          if (now - createdAt > expiryMs) {
            stats.expired++
          } else if (entry.data?.hardPass === true) {
            stats.pass++
          } else if (entry.data?.hardPass === false) {
            stats.fail++
          } else {
            stats.unknown++
          }
        } catch {
          stats.expired++
        }
      }
    })
  } catch {
    // ignore
  }

  return stats
}

// ==============================================
// Industry Classification 캐시 (하이브리드 매칭용)
// - AI(Haiku)로 분류한 결과를 캐시
// - 7일 유효
// ==============================================

const IC_CACHE_KEY_PREFIX = 'industryClass:'
const IC_CACHE_EXPIRY_DAYS = 7

/**
 * 산업 분류 결과를 위한 프로필 interests 매핑
 * - AI 분류 결과(primaryIndustry)를 프로필 interests와 비교하기 위한 매핑
 */
export const INDUSTRY_TO_INTERESTS_MAP = {
  // IT/디지털 → 프로필 interests
  ai_data: ['ai', 'data', 'ict'],
  ict_sw: ['ict', 'sw', 'platform'],
  cloud_saas: ['cloud', 'saas', 'ict'],

  // 콘텐츠/미디어 → 프로필 interests
  content_media: ['content', 'media', 'video'],
  game: ['game', 'content'],
  music: ['music', 'content', 'entertainment'],

  // 바이오/헬스케어 → 프로필 interests
  bio_healthcare: ['bio', 'healthcare', 'medical'],
  medical_device: ['medtech', 'healthcare', 'bio'],

  // 제조/하드웨어 → 프로필 interests
  manufacturing: ['manufacturing', 'smartfactory'],
  hardware: ['hardware', 'iot', 'semiconductor'],

  // 특수 분야 → 프로필 interests
  fintech: ['fintech', 'finance', 'blockchain'],
  logistics: ['logistics', 'mobility', 'delivery'],
  foodtech: ['foodtech', 'food'],
  edutech: ['edutech', 'education'],

  // 오프라인/전통 분야 (디지털 서비스와 불일치 가능)
  tourism: ['tourism', 'travel', 'hospitality'],
  agriculture: ['agriculture', 'agtech', 'smartfarm'],
  fishery: ['fishery', 'marine'],
  construction: ['construction', 'realestate'],
  trade_export: ['trade', 'export', 'global'],
  traditional_retail: ['retail', 'smallbiz'],

  // 특수 대상
  education_operator: ['education', 'training'],
  social_enterprise: ['social', 'nonprofit'],

  // 범용 (모든 interests와 매칭)
  general_startup: ['*'],
  general_sme: ['*'],
}

/**
 * Industry Classification 캐시 키 생성
 * @param {Object} announcement - 공고 객체
 * @returns {string} 캐시 키
 */
function getIndustryClassCacheKey(announcement) {
  const source = announcement.source || 'unknown'
  const id = announcement.id
  return `${IC_CACHE_KEY_PREFIX}${source}:${id}`
}

/**
 * localStorage에서 산업 분류 결과 조회
 * @param {Object} announcement - 공고 객체
 * @returns {Object|null} 캐시된 분류 결과 또는 null
 */
export function getIndustryClassFromCache(announcement) {
  try {
    const key = getIndustryClassCacheKey(announcement)
    const cached = localStorage.getItem(key)

    if (!cached) return null

    const entry = JSON.parse(cached)
    const now = Date.now()
    const createdAt = new Date(entry.createdAt).getTime()
    const expiryMs = IC_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    if (now - createdAt > expiryMs) {
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

/**
 * localStorage에 산업 분류 결과 저장
 * @param {Object} announcement - 공고 객체
 * @param {Object} classification - 분류 결과
 */
export function setIndustryClassToCache(announcement, classification) {
  try {
    const key = getIndustryClassCacheKey(announcement)
    const cacheEntry = {
      createdAt: new Date().toISOString(),
      data: classification,
    }
    localStorage.setItem(key, JSON.stringify(cacheEntry))
  } catch {
    console.warn('[IndustryClassCache] Failed to save cache')
  }
}

/**
 * AI(Haiku)를 사용하여 공고 분류
 * - 캐시가 있으면 캐시 반환
 * - 없으면 API 호출 후 캐시 저장
 * - API 실패 시 키워드 기반 fallback 분류
 *
 * @param {Object} announcement - 공고 객체
 * @param {Object} options - 옵션
 * @param {boolean} options.includeRegion - 지역 분류 포함 여부 (기본 false)
 * @returns {Promise<Object>} 분류 결과
 */
export async function classifyAnnouncement(announcement, options = {}) {
  const { includeRegion = false } = options

  // 1. 캐시 확인 (지역 분류 요청 시 캐시에 regionRestriction이 있는지도 확인)
  const cached = getIndustryClassFromCache(announcement)
  if (cached) {
    // 지역 분류를 요청했는데 캐시에 없으면 재호출 필요
    if (includeRegion && !cached.regionRestriction) {
      console.log(`[classifyAnnouncement] Cache hit but no region, re-classifying: ${announcement.id}`)
    } else {
      console.log(`[classifyAnnouncement] Cache hit: ${announcement.id}`)
      return { success: true, data: cached, fromCache: true }
    }
  }

  // 2. API 호출
  try {
    console.log(`[classifyAnnouncement] Classifying: ${announcement.id} (includeRegion: ${includeRegion})`)
    const response = await fetch(`${API_BASE}/classifyAnnouncement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement, includeRegion }),
    })

    const result = await response.json()

    // 3. 성공 시 캐시 저장
    if (result.success && result.data) {
      setIndustryClassToCache(announcement, result.data)
    }

    return result
  } catch (error) {
    console.error('[classifyAnnouncement] Error:', error)
    // 실패 시 키워드 기반 fallback 분류
    const fallbackResult = classifyByKeywords(announcement)
    // fallback 결과도 캐시 저장 (API 재호출 방지)
    setIndustryClassToCache(announcement, fallbackResult)
    return {
      success: true,
      data: fallbackResult,
      fallback: true,
      error: error.message,
    }
  }
}

/**
 * 지역 분류만 별도로 요청 (패턴 매칭 실패 시 호출)
 * - 기존 분류 결과가 있으면 지역만 추가로 분류
 * - 비용 최적화: unknown 지역인 경우에만 호출
 *
 * @param {Object} announcement - 공고 객체
 * @returns {Promise<Object>} 지역 분류 결과
 */
export async function classifyAnnouncementRegion(announcement) {
  // 캐시에서 기존 분류 결과 확인
  const cached = getIndustryClassFromCache(announcement)

  // 이미 지역 분류가 있으면 반환
  if (cached?.regionRestriction) {
    console.log(`[classifyRegion] Already has region: ${announcement.id}`)
    return { success: true, data: cached, fromCache: true }
  }

  // 지역 분류 포함하여 재분류
  const result = await classifyAnnouncement(announcement, { includeRegion: true })

  return result
}

/**
 * 키워드 기반 공고 분류 (AI API 실패 시 fallback)
 * @param {Object} announcement - 공고 객체
 * @returns {Object} 분류 결과
 */
function classifyByKeywords(announcement) {
  const text = [
    announcement.title || '',
    announcement.summary || '',
    ...(announcement.tags || []),
  ].join(' ').toLowerCase()

  // 1. 특수 공고 유형 탐지 (최우선)
  // 교육생/참가자 모집
  if (/교육생\s*모집|참가자\s*모집|수강생\s*모집|이용\s*교육/.test(text)) {
    return {
      announcementId: announcement.id,
      primaryIndustry: 'education_operator',
      secondaryIndustry: null,
      confidence: 85,
      isGeneralProgram: false,
      targetType: 'education',
    }
  }

  // 장비/시설 이용
  if (/장비\s*이용|시설\s*이용|메이커\s*장비|3d\s*프린터|레이저\s*커팅|메이커스페이스/.test(text)) {
    return {
      announcementId: announcement.id,
      primaryIndustry: 'manufacturing',
      secondaryIndustry: null,
      confidence: 85,
      isGeneralProgram: false,
      targetType: 'equipment',
    }
  }

  // 운영사/기관 모집
  if (/운영사\s*모집|운영기관\s*모집|주관기관\s*모집|수행기관/.test(text)) {
    return {
      announcementId: announcement.id,
      primaryIndustry: 'education_operator',
      secondaryIndustry: null,
      confidence: 90,
      isGeneralProgram: false,
      targetType: 'operator',
    }
  }

  // 2. 산업별 분류
  const industryPatterns = [
    { industry: 'bio_healthcare', patterns: [/바이오/, /헬스케어/, /의료기기/, /제약/, /생명공학/, /진단/], confidence: 80 },
    { industry: 'climate_tech', patterns: [/기후테크/, /탄소중립/, /그린뉴딜/, /친환경/, /재생에너지/], confidence: 80 },
    { industry: 'tourism', patterns: [/관광/, /여행/, /숙박/, /호텔/], confidence: 75 },
    { industry: 'fishery', patterns: [/수산/, /어업/, /양식/, /어촌/], confidence: 80 },
    { industry: 'agriculture', patterns: [/농업/, /축산/, /농촌/, /영농/], confidence: 80 },
    { industry: 'trade_export', patterns: [/수출/, /무역/, /해외진출/], confidence: 75 },
    { industry: 'manufacturing', patterns: [/제조/, /공장/, /생산/, /소공인/, /공방/], confidence: 70 },
    { industry: 'construction', patterns: [/건설/, /건축/, /시공/, /토목/], confidence: 80 },
    { industry: 'ai_data', patterns: [/\bai\b/, /인공지능/, /머신러닝/, /딥러닝/, /빅데이터/], confidence: 75 },
    { industry: 'ict_sw', patterns: [/소프트웨어/, /\bsw\b/, /\bict\b/, /정보통신/], confidence: 70 },
    { industry: 'content_media', patterns: [/콘텐츠/, /미디어/, /영상/, /게임/, /음악/, /웹툰/], confidence: 70 },
    { industry: 'fintech', patterns: [/핀테크/, /블록체인/, /금융/], confidence: 75 },
  ]

  for (const { industry, patterns, confidence } of industryPatterns) {
    const matchCount = patterns.filter(p => p.test(text)).length
    if (matchCount >= 2 || (matchCount === 1 && patterns.some(p => {
      const match = text.match(p)
      return match && text.indexOf(match[0]) < 50 // 제목 부분에서 매칭
    }))) {
      return {
        announcementId: announcement.id,
        primaryIndustry: industry,
        secondaryIndustry: null,
        confidence,
        isGeneralProgram: false,
        targetType: 'startup',
      }
    }
  }

  // 3. 범용 스타트업 지원 (기본값)
  return {
    announcementId: announcement.id,
    primaryIndustry: 'general_startup',
    secondaryIndustry: null,
    confidence: 50,
    isGeneralProgram: true,
    targetType: 'startup',
  }
}

/**
 * 여러 공고를 배치로 분류 (병렬 처리, 동시성 제한)
 * @param {Object[]} announcements - 공고 배열
 * @param {number} concurrency - 동시 처리 수 (기본 5)
 * @param {Function} onProgress - 진행률 콜백 (optional)
 * @returns {Promise<Map>} announcementId -> classification 매핑
 */
export async function classifyAnnouncementsBatch(announcements, concurrency = 5, onProgress = null) {
  const results = new Map()
  const uncached = []

  // 1. 캐시된 것과 아닌 것 분리
  for (const ann of announcements) {
    const cached = getIndustryClassFromCache(ann)
    if (cached) {
      results.set(ann.id, cached)
    } else {
      uncached.push(ann)
    }
  }

  console.log(`[classifyBatch] Cached: ${results.size}, Need API: ${uncached.length}`)

  if (onProgress) {
    onProgress({ cached: results.size, total: announcements.length, processed: results.size })
  }

  // 2. 캐시 안 된 것들 병렬 처리 (동시성 제한)
  for (let i = 0; i < uncached.length; i += concurrency) {
    const batch = uncached.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(ann => classifyAnnouncement(ann))
    )

    // 결과 저장
    batch.forEach((ann, idx) => {
      if (batchResults[idx].success && batchResults[idx].data) {
        results.set(ann.id, batchResults[idx].data)
      }
    })

    if (onProgress) {
      onProgress({
        cached: results.size - uncached.length,
        total: announcements.length,
        processed: results.size,
      })
    }
  }

  return results
}

/**
 * 산업 분류 캐시 통계 조회
 * @returns {Object} { total, valid, expired }
 */
export function getIndustryClassCacheStats() {
  const stats = { total: 0, valid: 0, expired: 0 }

  try {
    const keys = Object.keys(localStorage)
    const now = Date.now()
    const expiryMs = IC_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    keys.forEach(key => {
      if (key.startsWith(IC_CACHE_KEY_PREFIX)) {
        stats.total++
        try {
          const entry = JSON.parse(localStorage.getItem(key))
          const createdAt = new Date(entry.createdAt).getTime()

          if (now - createdAt > expiryMs) {
            stats.expired++
          } else {
            stats.valid++
          }
        } catch {
          stats.expired++
        }
      }
    })
  } catch {
    // ignore
  }

  return stats
}

/**
 * 산업 분류 캐시 전체 삭제
 * @returns {number} 삭제된 항목 수
 */
export function clearIndustryClassCache() {
  let count = 0
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(IC_CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key)
        count++
      }
    })
    console.log(`[IndustryClassCache] Cleared ${count} entries`)
  } catch {
    console.warn('[IndustryClassCache] Failed to clear cache')
  }
  return count
}
