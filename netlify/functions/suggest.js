// 섹션별 AI 작성 제안 API
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
    const { section, programTitle, userProfile, currentContent } = JSON.parse(event.body)

    // 섹션별 제안 템플릿
    const suggestions = {
      overview: `${userProfile?.serviceName || '본 서비스'}는 ${userProfile?.field || '해당 분야'}에서 혁신적인 솔루션을 제공합니다. ${userProfile?.businessOverview || '사업 개요를 입력해주세요.'}`,
      problem: '현재 시장에서는 [구체적인 문제]로 인해 [영향받는 대상]이 [구체적인 어려움]을 겪고 있습니다. 기존 솔루션들은 [한계점]이 있어 근본적인 해결이 어렵습니다.',
      solution: `본 사업에서 제안하는 솔루션은 [핵심 기술/접근법]을 활용하여 [문제]를 해결합니다. ${userProfile?.businessOverview || ''} 이를 통해 [기대 효과]를 달성할 수 있습니다.`,
      market: `${userProfile?.targetMarket || '목표 시장'}의 규모는 [시장 규모]이며, 연평균 [성장률]%의 성장이 예상됩니다. 주요 타겟 고객은 [고객 세그먼트]이며, [시장 진입 전략]을 통해 시장을 공략할 계획입니다.`,
      team: '본 팀은 [분야] 전문가로 구성되어 있습니다. 대표는 [경력/전문성]을 보유하고 있으며, 핵심 팀원들은 [관련 역량]을 갖추고 있습니다.',
      budget: '총 사업비 [금액]원 중 인건비 [%]%, 재료비 [%]%, 외주용역비 [%]%, 기타 [%]%로 편성하였습니다. 각 항목별 세부 내역은 다음과 같습니다.',
      timeline: '본 사업은 [기간] 동안 [단계]개 단계로 추진됩니다. 1단계(M1-M3): [목표], 2단계(M4-M6): [목표], 3단계(M7-M12): [목표]',
    }

    const suggestion = suggestions[section] || '해당 섹션에 대한 제안을 생성할 수 없습니다.'

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: { section, suggestion } }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message }),
    }
  }
}
