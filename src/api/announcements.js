// API 호출 함수들

const API_BASE = '/.netlify/functions'

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
