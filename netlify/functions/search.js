// netlify/functions/search.js
// fetchAnnouncements의 handler를 직접 import
import { handler as fetchAnnouncementsHandler } from './fetchAnnouncements.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // fetchAnnouncements handler를 직접 호출
    const result = await fetchAnnouncementsHandler(event)

    if (result.statusCode === 200) {
      const body = JSON.parse(result.body)
      if (body?.success && Array.isArray(body.data)) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: body.data,
            total: body.total,
            cached: body.cached,
          }),
        }
      }
    }

    // fetchAnnouncements 실패 시 에러 반환
    return {
      statusCode: result.statusCode || 500,
      headers,
      body: result.body,
    }
  } catch (error) {
    console.error('[Search] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '검색 중 오류가 발생했습니다',
      }),
    }
  }
}
