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
