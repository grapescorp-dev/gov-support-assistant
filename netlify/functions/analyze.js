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
    const { announcement, profile } = JSON.parse(event.body)

    // MSS 공고의 경우 parsed 정보 확보 시도
    let parsed = announcement.parsed
    if (!parsed && announcement.source === 'mss_api') {
      parsed = await fetchParsedFromMssDocs(announcement)
    }

    // 프로필 정보 텍스트화
    const profileText = profile
      ? `
## 사용자 프로필
- 서비스명: ${profile.serviceName || '미입력'}
- 사업 개요: ${profile.businessOverview || '미입력'}
- 목표 시장: ${profile.targetMarket || '미입력'}
- 기업 형태: ${profile.companyType || '미입력'}
- 업력: ${profile.businessAge || '미입력'}
- 지역: ${profile.region || '미입력'}
- 매출: ${profile.revenue || '미입력'}
- 직원 수: ${profile.employees || '미입력'}
- 보유 인증: ${profile.certifications?.length > 0 ? profile.certifications.join(', ') : '없음'}
- 투자 단계: ${profile.investmentStage || '미입력'}
- 관심 분야: ${profile.interests?.length > 0 ? profile.interests.join(', ') : '미입력'}
`
      : '프로필 정보 없음'

    // 공고 정보 텍스트화 (parsed 정보 포함)
    const announcementText = `
## 공고 정보
- 제목: ${announcement.title}
- 기관: ${announcement.organization || '미입력'}
- 지원금: ${announcement.budget || '미입력'}
- 마감일: ${announcement.deadline || '미입력'}
- 요약: ${announcement.summary || '미입력'}
- 지원 자격: ${announcement.eligibility?.join(', ') || '미입력'}
- 제출 서류: ${announcement.requirements?.join(', ') || '미입력'}
- 평가 기준: ${announcement.evaluationCriteria?.join(', ') || '미입력'}
- 카테고리: ${announcement.category?.join(', ') || '미입력'}

## 문서에서 추출된 상세 정보 (MSS 공고)
- 문서추출 지원자격: ${parsed?.eligibilityText || '미추출'}
- 문서추출 필수요건: ${parsed?.mandatoryText || '미추출'}
- 문서추출 제외조건: ${parsed?.exclusionText || '미추출'}
- 상세태그: ${parsed?.tags?.join(', ') || '없음'}
`

    const systemPrompt = `당신은 정부지원사업 전문 컨설턴트입니다.
공고 정보와 사용자 프로필을 분석하여 맞춤형 조언을 제공합니다.
특히 "문서에서 추출된 상세 정보"가 있다면, 이를 우선적으로 참고하여 지원자격/제외조건을 정확히 분석하세요.
응답은 반드시 JSON 형식으로만 출력하세요.`

    const userPrompt = `다음 정부지원사업 공고와 사용자 프로필을 분석해주세요.

${announcementText}

${profileText}

다음 JSON 형식으로 응답해주세요:
{
  "summary": "공고 핵심 요약 (3-4문장으로 이 사업이 무엇인지, 누구에게 적합한지 설명)",
  "matchAnalysis": {
    "score": 0-100 사이 적합도 점수,
    "level": "high" | "medium" | "low",
    "reason": "이 프로필과 공고의 적합도 분석 (2-3문장). 문서에서 추출된 제외조건이 있다면 반드시 언급",
    "strengths": ["이 프로필이 가진 강점 2-3개"],
    "weaknesses": ["보완이 필요한 부분 또는 제외조건에 해당하는 항목 1-2개"]
  },
  "writingDirection": [
    "사업계획서 작성 방향 제안 1",
    "사업계획서 작성 방향 제안 2",
    "사업계획서 작성 방향 제안 3",
    "사업계획서 작성 방향 제안 4",
    "사업계획서 작성 방향 제안 5"
  ],
  "keyPoints": [
    "심사위원이 중요하게 볼 포인트 1",
    "심사위원이 중요하게 볼 포인트 2",
    "심사위원이 중요하게 볼 포인트 3"
  ],
  "tips": [
    "합격을 위한 실전 팁 1",
    "합격을 위한 실전 팁 2",
    "합격을 위한 실전 팁 3"
  ]
}

JSON만 출력하고 다른 텍스트는 포함하지 마세요.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
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
