/**
 * 공유 보안 유틸리티
 * - Origin 검증 (허용된 도메인만 접근 가능)
 * - CORS 헤더 개선 (와일드카드 → 동적 origin)
 * - Rate Limiting (인메모리, 서버리스 best-effort)
 */

const ALLOWED_ORIGINS = [
  'https://gov-assistant.netlify.app',
  'http://localhost:5173',
  'http://localhost:8888',
  'http://localhost:9999',
]

// 인메모리 rate limit 저장소
const rateLimitStore = new Map()

// 메모리 누수 방지: 5분마다 만료된 엔트리 정리
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

const cleanupExpired = () => {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > 60_000) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Origin 검증
 * - origin 또는 referer 헤더로 검증
 * - 둘 다 없으면 내부 함수간 호출로 간주하여 허용
 */
const validateOrigin = (event) => {
  const origin = event.headers?.origin || event.headers?.Origin
  const referer = event.headers?.referer || event.headers?.Referer

  // origin/referer 둘 다 없으면 내부 호출 (예: analyze → parseMssDocs)
  if (!origin && !referer) {
    return { valid: true, origin: null }
  }

  // origin 헤더가 있으면 직접 매칭
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      return { valid: true, origin }
    }
    return { valid: false, origin }
  }

  // referer만 있으면 origin 추출 후 매칭
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (ALLOWED_ORIGINS.includes(refOrigin)) {
        return { valid: true, origin: refOrigin }
      }
    } catch {
      // invalid referer URL
    }
    return { valid: false, origin: referer }
  }

  return { valid: false, origin: null }
}

/**
 * 동적 CORS 헤더 생성
 * - 허용된 origin이면 해당 origin 반환
 * - 내부 호출(origin 없음)이면 프로덕션 origin 반환
 */
const getCorsHeaders = (matchedOrigin) => {
  return {
    'Access-Control-Allow-Origin': matchedOrigin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  }
}

/**
 * Rate Limit 검사 (인메모리, 1분 윈도우)
 * @param {string} ip - 클라이언트 IP
 * @param {'ai'|'standard'} tier - ai: 10/min, standard: 30/min
 */
const checkRateLimit = (ip, tier = 'standard') => {
  cleanupExpired()

  const limit = tier === 'ai' ? 10 : 30
  const key = `${tier}:${ip}`
  const now = Date.now()

  const entry = rateLimitStore.get(key)

  if (!entry || now - entry.windowStart > 60_000) {
    rateLimitStore.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1 }
  }

  entry.count++

  if (entry.count > limit) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: limit - entry.count }
}

/**
 * 통합 보안 함수
 * @param {Object} event - Netlify function event
 * @param {Object} options - { tier: 'ai' | 'standard' }
 * @returns {{ ok: boolean, response?: Object, headers: Object }}
 */
export const applySecurity = (event, options = {}) => {
  const { tier = 'standard' } = options

  // 1. Origin 검증
  const originResult = validateOrigin(event)
  const headers = getCorsHeaders(originResult.origin)

  // 2. OPTIONS preflight 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      ok: false,
      response: { statusCode: 200, headers, body: '' },
      headers,
    }
  }

  // 3. Origin 거부
  if (!originResult.valid) {
    return {
      ok: false,
      response: {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden: origin not allowed' }),
      },
      headers,
    }
  }

  // 4. Rate Limit 검사
  const ip = event.headers?.['x-nf-client-connection-ip'] ||
             event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
             'unknown'

  const rateResult = checkRateLimit(ip, tier)

  if (!rateResult.allowed) {
    return {
      ok: false,
      response: {
        statusCode: 429,
        headers: {
          ...headers,
          'Retry-After': '60',
        },
        body: JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      },
      headers,
    }
  }

  // 5. 모든 검사 통과
  return { ok: true, headers }
}
