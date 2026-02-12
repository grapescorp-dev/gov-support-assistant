import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  // eslint-disable-next-line no-undef
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * 공고 분류를 위한 산업 분야 목록
 */
const INDUSTRY_CATEGORIES = {
  ai_data: 'AI/데이터',
  ict_sw: 'ICT/SW',
  cloud_saas: '클라우드/SaaS',
  content_media: '콘텐츠/미디어',
  game: '게임',
  music: '음악',
  bio_healthcare: '바이오/헬스케어',
  medical_device: '의료기기',
  manufacturing: '제조/스마트공장',
  hardware: '하드웨어/IoT',
  fintech: '핀테크/금융',
  logistics: '물류/모빌리티',
  foodtech: '푸드테크',
  edutech: '에듀테크',
  tourism: '관광/여행',
  agriculture: '농업/축산',
  fishery: '수산/해양',
  construction: '건설/건축',
  trade_export: '무역/수출',
  traditional_retail: '소상공인/자영업',
  education_operator: '교육기관/운영사',
  social_enterprise: '사회적기업',
  general_startup: '일반 창업지원',
  general_sme: '일반 중소기업지원',
}

/**
 * 여러 공고를 한 번에 분류하는 배치 API
 * - 최대 10개까지 한 번에 처리
 * - 프롬프트 오버헤드 감소로 토큰 비용 절감
 * - [개선] 프로필 정보를 받아 맞춤 적합성 분석 수행
 */
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
    const { announcements, profile = null } = JSON.parse(event.body)

    if (!announcements || !Array.isArray(announcements) || announcements.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'announcements array is required' }),
      }
    }

    // 최대 10개로 제한
    const batch = announcements.slice(0, 10)

    // ✅ [개선] 프로필 정보 확인
    const hasProfile = profile && (profile.businessOverview || profile.targetMarket || profile.interests?.length > 0)

    // 각 공고를 간결하게 텍스트화
    const announcementsText = batch.map((ann, idx) => {
      return `[${idx + 1}] ID:${ann.id}
제목: ${ann.title}
기관: ${ann.organization || '-'}
요약: ${(ann.summary || '').slice(0, 150)}
태그: ${(ann.tags || []).slice(0, 5).join(', ') || '-'}`
    }).join('\n\n')

    // ✅ [개선] 프로필 정보 텍스트화
    const profileText = hasProfile ? `
[사용자 프로필]
사업개요: ${profile.businessOverview || '미입력'}
타겟시장: ${profile.targetMarket || '미입력'}
관심분야: ${(profile.interests || []).join(', ') || '미입력'}
기업유형: ${profile.companyType || '미입력'}` : ''

    // ✅ [개선] 프로필이 있으면 맞춤 분석 프롬프트 사용
    const systemPrompt = hasProfile
      ? `정부지원사업 공고 분류 및 사용자 적합성 평가 전문가입니다. 공고를 분류하고 사용자 사업과의 적합성을 판단합니다. JSON 배열로만 응답하세요.`
      : `정부지원사업 공고를 산업 분야로 분류하는 전문가입니다. 여러 공고를 한 번에 분류합니다. JSON 배열로만 응답하세요.`

    const userPrompt = hasProfile
      ? `다음 ${batch.length}개 공고를 분류하고 사용자와의 적합성을 평가하세요.
${profileText}

${announcementsText}

분류 옵션: ai_data, ict_sw, cloud_saas, content_media, game, music, bio_healthcare, medical_device, manufacturing, hardware, fintech, logistics, foodtech, edutech, tourism, agriculture, fishery, construction, trade_export, traditional_retail, education_operator, social_enterprise, general_startup, general_sme

적합성 판단 기준:
- 사용자의 사업개요/타겟시장과 공고 대상 분야가 맞는지
- 교육생/참가자 모집, 운영사 모집 등 특수 대상인지
- 특정 업종(바이오, 제조업 등) 전용인지

JSON 배열 형식으로 응답:
[{"id":"공고ID","primary":"분류코드","confidence":0-100,"isGeneral":true/false,"targetType":"startup|sme|operator","match":true/false,"matchScore":0-100,"mismatchReason":"불일치 이유 또는 null"},...]

JSON 배열만 출력하세요.`
      : `다음 ${batch.length}개 공고를 분류하세요.

${announcementsText}

분류 옵션: ai_data, ict_sw, cloud_saas, content_media, game, music, bio_healthcare, medical_device, manufacturing, hardware, fintech, logistics, foodtech, edutech, tourism, agriculture, fishery, construction, trade_export, traditional_retail, education_operator, social_enterprise, general_startup, general_sme

JSON 배열 형식으로 응답:
[{"id":"공고ID","primary":"분류코드","confidence":0-100,"isGeneral":true/false,"targetType":"startup|sme|operator"},...]

JSON 배열만 출력하세요.`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: hasProfile ? 3000 : 2000,  // ✅ 프로필 분석 시 토큰 증가
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const responseText = message.content[0].text

    // JSON 파싱
    let results
    try {
      results = JSON.parse(responseText)
    } catch {
      // JSON 배열 추출 시도
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0])
      } else {
        console.error('[classifyBatch] Failed to parse response:', responseText)
        // 실패 시 기본값 반환
        results = batch.map(ann => ({
          id: ann.id,
          primary: 'general_startup',
          confidence: 30,
          isGeneral: true,
          targetType: 'startup',
        }))
      }
    }

    // 결과를 원본 형식으로 변환
    const classifications = results.map(r => {
      const primary = INDUSTRY_CATEGORIES[r.primary] ? r.primary : 'general_startup'
      const baseResult = {
        announcementId: r.id,
        primaryIndustry: primary,
        secondaryIndustry: null,
        confidence: Math.min(100, Math.max(0, r.confidence || 50)),
        isGeneralProgram: r.isGeneral === true || primary.startsWith('general_'),
        targetType: r.targetType || 'startup',
        classifiedAt: new Date().toISOString(),
      }

      // ✅ [개선] 프로필 매칭 결과 추가
      if (hasProfile) {
        baseResult.profileMatch = {
          isMatch: r.match !== false, // 기본값 true
          matchScore: Math.min(100, Math.max(0, r.matchScore || (r.match ? 70 : 30))),
          mismatchReason: r.mismatchReason || null,
        }
        baseResult.hasProfileAnalysis = true
      }

      return baseResult
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: classifications,
        processed: classifications.length,
        inputCount: announcements.length,
        hasProfileAnalysis: hasProfile,
      }),
    }
  } catch (error) {
    console.error('Classify Batch API Error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '배치 분류 중 오류가 발생했습니다',
      }),
    }
  }
}
