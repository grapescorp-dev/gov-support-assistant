import Anthropic from '@anthropic-ai/sdk'
import { applySecurity } from './utils/security.js'

const anthropic = new Anthropic({
  // eslint-disable-next-line no-undef
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * 지역 코드 목록 (AI 지역 분류용)
 */
const REGION_CODES = {
  seoul: '서울',
  gyeonggi: '경기',
  incheon: '인천',
  gangwon: '강원',
  daejeon: '대전',
  sejong: '세종',
  chungbuk: '충북',
  chungnam: '충남',
  jeonbuk: '전북',
  jeonnam: '전남',
  gwangju: '광주',
  gyeongbuk: '경북',
  gyeongnam: '경남',
  daegu: '대구',
  busan: '부산',
  ulsan: '울산',
  jeju: '제주',
  nationwide: '전국',
}

/**
 * 공고 분류를 위한 산업 분야 목록
 * - 프로필의 interests와 매칭될 수 있도록 설계
 */
const INDUSTRY_CATEGORIES = {
  // IT/디지털 분야
  ai_data: 'AI/데이터',
  ict_sw: 'ICT/SW',
  cloud_saas: '클라우드/SaaS',

  // 콘텐츠/미디어 분야
  content_media: '콘텐츠/미디어',
  game: '게임',
  music: '음악',

  // 바이오/헬스케어 분야
  bio_healthcare: '바이오/헬스케어',
  medical_device: '의료기기',

  // 제조/하드웨어 분야
  manufacturing: '제조/스마트공장',
  hardware: '하드웨어/IoT',

  // 특수 분야
  fintech: '핀테크/금융',
  logistics: '물류/모빌리티',
  foodtech: '푸드테크',
  edutech: '에듀테크',

  // 오프라인/전통 분야 (디지털 서비스와 불일치)
  tourism: '관광/여행',
  agriculture: '농업/축산',
  fishery: '수산/해양',
  construction: '건설/건축',
  trade_export: '무역/수출',
  traditional_retail: '소상공인/자영업',

  // 특수 대상 (일반 스타트업과 불일치)
  education_operator: '교육기관/운영사',
  social_enterprise: '사회적기업',

  // 범용 (누구나 지원 가능)
  general_startup: '일반 창업지원',
  general_sme: '일반 중소기업지원',
}

/**
 * 공고를 산업 분야로 분류하는 함수
 * - Haiku 모델 사용 (빠르고 저렴)
 * - 공고 자체의 산업 분야만 분류 (프로필 매칭 제외)
 * - 프로필 매칭은 로컬 checkIndustryMatch()에서 처리
 */
export async function handler(event) {
  const security = applySecurity(event, { tier: 'ai' })
  if (!security.ok) return security.response
  const headers = security.headers

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { announcement, includeRegion = false } = JSON.parse(event.body)

    if (!announcement || !announcement.title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'announcement.title is required' }),
      }
    }

    // 공고 정보 텍스트화
    const announcementText = `
제목: ${announcement.title}
기관: ${announcement.organization || '미입력'}
요약: ${announcement.summary || '미입력'}
지원자격: ${(announcement.eligibility || []).join(', ') || '미입력'}
카테고리: ${(announcement.category || []).join(', ') || '미입력'}
태그: ${(announcement.tags || []).join(', ') || '미입력'}
`.trim()

    const systemPrompt = `당신은 정부지원사업 공고를 분류하는 전문가입니다.
공고 내용을 분석하여 가장 적합한 산업 분야${includeRegion ? '와 지역 제한 여부' : ''}를 판단합니다.
반드시 JSON 형식으로만 응답하세요.`

    // 지역 분류 옵션 (includeRegion이 true일 때만 추가)
    const regionClassificationPrompt = includeRegion ? `

또한, 이 공고의 지역 제한 여부를 판단해주세요:
- 특정 지역(시/도) 소재 기업만 지원 가능한지
- 전국 어디서나 지원 가능한지
- 지역 제한을 판단할 수 없는지

지역 코드 옵션:
- seoul: 서울
- gyeonggi: 경기
- incheon: 인천
- gangwon: 강원
- daejeon: 대전
- sejong: 세종
- chungbuk: 충북
- chungnam: 충남
- jeonbuk: 전북
- jeonnam: 전남
- gwangju: 광주
- gyeongbuk: 경북
- gyeongnam: 경남
- daegu: 대구
- busan: 부산
- ulsan: 울산
- jeju: 제주
- nationwide: 전국 (지역 무관)
- unknown: 판단 불가` : ''

    const regionResponseFormat = includeRegion ? `,
  "regionRestriction": {
    "type": "nationwide" | "restricted" | "unknown",
    "region": "지역 코드 (restricted일 때만, 위 옵션 중 하나)",
    "confidence": 0-100 사이의 확신도
  }` : ''

    // 기본 분류 옵션
    const industryOptions = `분류 옵션:
- ai_data: AI, 인공지능, 머신러닝, 데이터 분석 분야
- ict_sw: ICT, 소프트웨어, IT서비스, 플랫폼 분야
- cloud_saas: 클라우드, SaaS, 서비스형 소프트웨어 분야
- content_media: 콘텐츠, 미디어, 영상, 방송 분야
- game: 게임, 웹툰, 애니메이션 분야
- music: 음악, 음원, K-POP 분야
- bio_healthcare: 바이오, 헬스케어, 제약, 신약 분야
- medical_device: 의료기기, 체외진단 분야
- manufacturing: 제조업, 스마트공장, 생산 분야
- hardware: 하드웨어, IoT, 센서, 반도체 분야
- fintech: 핀테크, 금융, 블록체인 분야
- logistics: 물류, 모빌리티, 자율주행 분야
- foodtech: 푸드테크, 식품기술 분야
- edutech: 에듀테크, 교육기술 분야
- tourism: 관광, 여행, 숙박 분야 (오프라인)
- agriculture: 농업, 축산 분야
- fishery: 수산, 해양 분야
- construction: 건설, 건축 분야
- trade_export: 무역, 수출, 해외진출 전문
- traditional_retail: 소상공인, 자영업, 전통시장
- education_operator: 교육기관, 운영사 모집 (스타트업 대상 아님)
- social_enterprise: 사회적기업, 협동조합
- general_startup: 분야 무관 창업지원 (누구나 가능)
- general_sme: 분야 무관 중소기업지원 (누구나 가능)`

    const userPrompt = `다음 정부지원사업 공고의 타겟 산업 분야를 분류해주세요.

${announcementText}

${industryOptions}
${regionClassificationPrompt}

다음 JSON 형식으로 응답하세요:
{
  "primaryIndustry": "가장 적합한 분야 코드 (위 옵션 중 하나)",
  "secondaryIndustry": "두 번째로 적합한 분야 코드 또는 null",
  "confidence": 0-100 사이의 확신도,
  "isGeneralProgram": true/false (분야 무관 범용 프로그램인지),
  "targetType": "startup" | "sme" | "operator" | "individual" (대상 유형)${regionResponseFormat}
}

JSON만 출력하고 다른 텍스트는 포함하지 마세요.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
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
    let classification
    try {
      classification = JSON.parse(responseText)
    } catch {
      // JSON 파싱 실패 시 코드 블록에서 추출 시도
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[1].trim())
      } else {
        // 그래도 실패하면 기본값 반환
        console.error('[classifyAnnouncement] Failed to parse response:', responseText)
        classification = {
          primaryIndustry: 'general_startup',
          secondaryIndustry: null,
          confidence: 50,
          isGeneralProgram: true,
          targetType: 'startup',
        }
      }
    }

    // 유효성 검증 - 산업 분야
    if (!INDUSTRY_CATEGORIES[classification.primaryIndustry]) {
      classification.primaryIndustry = 'general_startup'
    }

    // 유효성 검증 - 지역 분류 (includeRegion이 true일 때만)
    if (includeRegion && classification.regionRestriction) {
      const regionRestriction = classification.regionRestriction

      // type 검증
      if (!['nationwide', 'restricted', 'unknown'].includes(regionRestriction.type)) {
        regionRestriction.type = 'unknown'
      }

      // restricted일 때 region 검증
      if (regionRestriction.type === 'restricted') {
        if (!REGION_CODES[regionRestriction.region]) {
          regionRestriction.region = null
          regionRestriction.type = 'unknown'
        }
      }

      // confidence 검증
      if (typeof regionRestriction.confidence !== 'number' ||
          regionRestriction.confidence < 0 ||
          regionRestriction.confidence > 100) {
        regionRestriction.confidence = 50
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          announcementId: announcement.id,
          ...classification,
          classifiedAt: new Date().toISOString(),
        },
      }),
    }
  } catch (error) {
    console.error('Classify API Error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '분류 중 오류가 발생했습니다',
      }),
    }
  }
}
