import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  // eslint-disable-next-line no-undef
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * MSS 공고의 경우 parseMssDocs를 호출하여 parsed 정보 확보
 * @param {Object} announcement - 공고 객체
 * @returns {Promise<Object|null>} parsed 정보 또는 null
 */
const fetchParsedFromMssDocs = async (announcement) => {
  // MSS 공고이고 files가 있고 parsed가 없는 경우에만 호출
  if (
    announcement.source !== 'mss_api' ||
    !announcement.mssMeta?.files ||
    announcement.mssMeta.files.length === 0 ||
    announcement.parsed
  ) {
    return announcement.parsed || null
  }

  try {
    console.log(`[analyze] Fetching parsed for MSS announcement: ${announcement.id}`)

    // 내부 함수 호출 (같은 Netlify Functions 환경)
    const response = await fetch(
      // eslint-disable-next-line no-undef
      `${process.env.URL || 'http://localhost:8888'}/.netlify/functions/parseMssDocs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcementId: announcement.id,
          files: announcement.mssMeta.files,
          title: announcement.title,
          summary: announcement.summary,
        }),
      }
    )

    if (!response.ok) {
      console.error(`[analyze] parseMssDocs failed: ${response.status}`)
      return null
    }

    const result = await response.json()
    if (result.success && result.data) {
      console.log(`[analyze] parseMssDocs success: eligibility=${result.data.eligibilityText?.length || 0}chars`)
      return result.data
    }

    return null
  } catch (error) {
    console.error('[analyze] parseMssDocs error:', error.message)
    return null
  }
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { announcement, profile, hardFilterResult } = JSON.parse(event.body)

    // MSS 공고의 경우 parsed 정보 확보 시도
    let parsed = announcement.parsed
    if (!parsed && announcement.source === 'mss_api') {
      parsed = await fetchParsedFromMssDocs(announcement)
    }

    // =============================================
    // 프롬프트 최적화: 토큰 사용량 50% 감소
    // =============================================

    // Hard Filter 결과 (간결하게)
    let hfText = ''
    if (hardFilterResult) {
      const { hardPass, hardFailReasons } = hardFilterResult
      const status = hardPass === true ? '적격' : hardPass === false ? '부적격' : '미확인'
      hfText = `검증: ${status}`
      if (hardFailReasons?.length > 0) {
        hfText += ` (${hardFailReasons.map(r => r.label).join(', ')})`
      }
    }

    // 프로필 (핵심만)
    const pf = profile || {}
    const profileText = profile
      ? `프로필: ${pf.serviceName || '-'} | ${pf.companyType || '-'} | ${pf.businessAge || '-'} | ${pf.region || '-'} | 인증:${pf.certifications?.join(',') || '없음'}`
      : ''

    // 공고 정보 (간결하게)
    const ann = announcement
    const eligibility = ann.eligibility?.slice(0, 3).join('; ') || '-'
    const parsedElig = parsed?.eligibilityText?.slice(0, 200) || ''
    const parsedExcl = parsed?.exclusionText?.slice(0, 150) || ''

    const announcementText = `공고: ${ann.title}
기관: ${ann.organization || '-'} | 마감: ${ann.deadline || '-'} | 지원금: ${ann.budget || '-'}
요약: ${(ann.summary || '').slice(0, 150)}
자격: ${eligibility}${parsedElig ? `\n상세자격: ${parsedElig}` : ''}${parsedExcl ? `\n제외조건: ${parsedExcl}` : ''}`

    const systemPrompt = `정부지원사업 컨설턴트. 공고와 프로필 매칭 분석. JSON만 출력.`

    const userPrompt = `${announcementText}
${profileText}${hfText ? `\n${hfText}` : ''}

JSON 응답:
{"summary":"2-3문장 요약","matchAnalysis":{"score":0-100,"level":"high|medium|low","reason":"적합도 분석 1-2문장","strengths":["강점1","강점2"],"weaknesses":["약점1"]},"writingDirection":["방향1","방향2","방향3"],"keyPoints":["포인트1","포인트2","포인트3"],"tips":["팁1","팁2","팁3"]}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,  // 1500 → 1000 (출력 토큰 감소)
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    // Claude 응답에서 텍스트 추출
    const responseText = message.content[0].text

    // JSON 파싱
    let analysis
    try {
      analysis = JSON.parse(responseText)
    } catch {
      // JSON 파싱 실패 시 코드 블록에서 추출 시도
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1].trim())
      } else {
        throw new Error('Failed to parse AI response as JSON')
      }
    }

    // 응답 데이터에 공고 ID 및 parsed 정보 추가
    analysis.programId = announcement.id
    if (parsed) {
      analysis.parsedFromDoc = true
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: analysis }),
    }
  } catch (error) {
    console.error('Analyze API Error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'AI 분석 중 오류가 발생했습니다',
      }),
    }
  }
}
