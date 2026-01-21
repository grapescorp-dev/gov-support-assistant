// netlify/functions/search.js
import mockAnnouncements from '../../src/data/mockAnnouncements.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const params = event.queryStringParameters || {}
  const qs = new URLSearchParams(params).toString()

  // 1) 실데이터 우선: fetchAnnouncements를 HTTP로 호출 (함수 import 충돌 회피)
  try {
    const proto =
      event.headers?.['x-forwarded-proto'] ||
      event.headers?.['X-Forwarded-Proto'] ||
      'http'
    const host = event.headers?.host

    if (host) {
      const url = `${proto}://${host}/.netlify/functions/fetchAnnouncements?${qs}`
      const res = await fetch(url)

      if (res.ok) {
        const body = await res.json()
        // fetchAnnouncements: { success, data, ... }
        if (body?.success && Array.isArray(body.data)) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: body.data,
            }),
          }
        }
      }
    }
  } catch (e) {
    // 실패 시 mock fallback
  }

  // 2) fallback: mock 검색
  const keyword = (params.keyword || '').trim().toLowerCase()
  const category = params.category

  let results = Array.isArray(mockAnnouncements) ? [...mockAnnouncements] : []

  if (keyword) {
    results = results.filter((a) => {
      const t = (a.title || '').toLowerCase()
      const s = (a.summary || '').toLowerCase()
      return t.includes(keyword) || s.includes(keyword)
    })
  }

  if (category && category !== '전체') {
    results = results.filter((a) => {
      const c = a.category
      if (Array.isArray(c)) return c.includes(category)
      if (typeof c === 'string') return c.includes(category)
      return false
    })
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: results,
    }),
  }
}
