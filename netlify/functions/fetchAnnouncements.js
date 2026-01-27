// 기업마당 공공데이터 API 연동
// API 문서: https://www.bizinfo.go.kr/web/lay1/program/S1T175C174/apiDetail.do?id=bizinfoApi
const BIZINFO_API_URL = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do'

// 타임아웃이 있는 fetch 함수
const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

// 간단한 mock 데이터 (API 실패 시 fallback)
const fallbackMockData = [
  {
    id: 'mock-001',
    title: '2026년 AI 융합 중소기업 기술개발 지원사업',
    organization: '기업마당',
    category: ['AI', 'IT'],
    deadline: '2026-03-31',
    budget: '최대 5억원',
    eligibility: ['중소기업', 'AI 관련 기술 보유'],
    link: 'https://www.bizinfo.go.kr',
    summary: 'AI 기술을 활용한 제품/서비스 개발 중소기업 지원 (API 연결 대기 중 - mock 데이터)',
    source: 'mock',
  },
  {
    id: 'mock-002',
    title: '2026년 초기창업패키지',
    organization: 'K-스타트업',
    category: ['창업', 'ICT'],
    deadline: '2026-02-28',
    budget: '최대 1억원',
    eligibility: ['예비창업자', '창업 3년 미만'],
    link: 'https://www.k-startup.go.kr',
    summary: '예비창업자 및 초기 스타트업 대상 사업화 자금 지원 (API 연결 대기 중 - mock 데이터)',
    source: 'mock',
  },
  {
    id: 'mock-003',
    title: '콘텐츠 제작 지원사업',
    organization: '한국콘텐츠진흥원',
    category: ['콘텐츠', 'CT'],
    deadline: '2026-04-15',
    budget: '최대 3억원',
    eligibility: ['콘텐츠 제작사'],
    link: 'https://www.kocca.kr',
    summary: '콘텐츠 제작 및 유통 지원 (API 연결 대기 중 - mock 데이터)',
    source: 'mock',
  },
]

// K-Startup 공공데이터 API 연동 (창업진흥원 K-Startup 조회서비스 v2.0)
// (가이드 기준) https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01
const KSTARTUP_API_URL =
  'https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01'

// ✅ 중소벤처기업부(사업공고) API 연동 (XML)
// 사용자가 제공한 실제 호출 URL 패턴:
// https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2?serviceKey=...&pageNo=...&numOfRows=...
const MSS_API_URL = 'https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2'

// 캐시 저장소 (메모리 캐시 - 서버리스 환경에서는 제한적)
let cache = { data: null, timestamp: null }
const CACHE_DURATION = 60 * 60 * 1000 // 1시간

// 분야 코드 매핑(현재 미사용이지만 유지)
const categoryCodeMap = {
  '01': '경영',
  '02': '금융',
  '03': '기술',
  '04': '인력',
  '05': '수출',
  '06': '내수',
  '07': '창업',
  '08': '기타',
}

// 분야를 우리 카테고리로 변환
const mapToOurCategory = (lcategory) => {
  const categoryMapping = {
    경영: ['창업'],
    금융: ['창업'],
    기술: ['IT', 'ICT'],
    인력: ['창업'],
    수출: ['창업'],
    내수: ['창업'],
    창업: ['창업'],
    기타: [],
  }
  return categoryMapping[lcategory] || []
}

// 해시태그/문자열에서 추가 카테고리 추출
const extractCategoriesFromHashtags = (hashtags) => {
  if (!hashtags) return []
  const tagCategories = []
  const lowerTags = String(hashtags).toLowerCase()

  if (lowerTags.includes('ai') || lowerTags.includes('인공지능')) tagCategories.push('AI')
  if (lowerTags.includes('ict') || lowerTags.includes('정보통신')) tagCategories.push('ICT')
  if (lowerTags.includes('콘텐츠') || lowerTags.includes('content')) tagCategories.push('콘텐츠')
  if (lowerTags.includes('음악') || lowerTags.includes('music')) tagCategories.push('음악')
  if (lowerTags.includes('it') || lowerTags.includes('소프트웨어') || lowerTags.includes('sw'))
    tagCategories.push('IT')
  if (lowerTags.includes('ct') || lowerTags.includes('문화기술')) tagCategories.push('CT')

  return tagCategories
}

const pad2 = (n) => String(n).padStart(2, '0')
const toYMD = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`

// 신청 기간에서 마감일 추출(강화 버전) - Bizinfo용 유지
const extractDeadline = (reqstDt) => {
  if (!reqstDt) return null
  const text = String(reqstDt)

  if (text.includes('예산소진') || text.includes('예산 소진') || text.includes('상시')) {
    return '2099-12-31'
  }

  const digits = text.replace(/\D/g, '')
  const matches8 = digits.match(/\d{8}/g)
  if (matches8 && matches8.length > 0) {
    const s = matches8[matches8.length - 1]
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }

  const re = /(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/g
  const found = []
  let m
  while ((m = re.exec(text)) !== null) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    if (y && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      found.push(toYMD(y, mo, d))
    }
  }
  if (found.length > 0) return found[found.length - 1]

  return null
}

// Bizinfo API 응답에서 item 배열 안전 추출
const extractItemsFromApiResponse = (data) => {
  if (Array.isArray(data?.jsonArray)) return data.jsonArray

  if (data?.jsonArray && typeof data.jsonArray === 'object') {
    const keys = Object.keys(data.jsonArray)
    const numericKeyCount = keys.filter((k) => /^\d+$/.test(k)).length
    if (numericKeyCount > 0) {
      return keys
        .filter((k) => /^\d+$/.test(k))
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => data.jsonArray[k])
        .filter(Boolean)
    }
  }

  const candidates = [
    data?.jsonArray?.item,
    data?.jsonArray?.channel?.item,
    data?.jsonArray?.rss?.channel?.item,
    data?.jsonArray?.items?.item,
    data?.jsonArray?.items,
    data?.items,
    data?.item,
  ]

  for (const c of candidates) {
    if (!c) continue
    if (Array.isArray(c)) return c
    if (typeof c === 'object') return [c]
  }

  return []
}

// Bizinfo 응답 -> 공통 스키마 변환(기존 유지)
const transformApiResponse = (items) => {
  return (items || []).map((item) => {
    const rawLcategory =
      item.pldirSportRealmLclasCodeNm || item.lcategory || item.lcategoryNm || '기타'

    const baseCategories = mapToOurCategory(rawLcategory)

    const rawHashtags = item.hashtags || item.hashTags || ''
    const tagCategories = extractCategoriesFromHashtags(rawHashtags)
    const allCategories = [...new Set([...baseCategories, ...tagCategories])]

    const rawReqst = item.reqstBeginEndDe || item.reqstDt || ''
    const deadline = extractDeadline(rawReqst)

    const link = item.pblancUrl || item.rceptEngnHmpgUrl || item.link || ''

    const title = item.pblancNm || item.title || ''
    const summary = item.bsnsSumryCn || item.description || ''

    return {
      id: item.pblancId,
      title,
      organization: '기업마당',
      category: allCategories.length > 0 ? allCategories : ['창업'],
      deadline,
      budget: null,
      eligibility: item.trgetNm ? [item.trgetNm] : [],
      link,
      detailUrl: link,
      summary,
      requirements: [],
      evaluationCriteria: [],
      source: 'bizinfo_api',
      author: item.author,
      lcategory: rawLcategory,
      pubDate: item.creatPnttm || item.pubDate,
      reqstDt: rawReqst,
      hashTags: rawHashtags,
    }
  })
}

/**
 * K-Startup 응답에서 items 배열 안전 추출
 */
const extractItemsFromKstartupResponse = (data) => {
  if (Array.isArray(data?.data)) return data.data

  const candidates = [
    data?.response?.body?.items,
    data?.response?.body?.items?.item,
    data?.response?.body?.data,
    data?.items,
    data?.items?.item,
    data?.item,
  ]

  for (const c of candidates) {
    if (!c) continue
    if (Array.isArray(c)) return c
    if (typeof c === 'object') return [c]
  }

  return []
}

const normalizeYmdFromAny = (v) => {
  if (!v) return null
  const s = String(v).trim()
  if (!s) return null

  const digits = s.replace(/\D/g, '')
  if (digits.length >= 8) {
    const y = digits.slice(0, 4)
    const m = digits.slice(4, 6)
    const d = digits.slice(6, 8)
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`
    }
  }

  const m1 = s.match(/(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/)
  if (m1) return toYMD(Number(m1[1]), Number(m1[2]), Number(m1[3]))

  return null
}

/**
 * K-Startup API 응답을 공통 스키마로 변환
 */
const transformKstartupResponse = (items) => {
  return (items || [])
    .map((item) => {
      const title = item.biz_pbanc_nm || item.title || ''
      const org = item.pbanc_ntrp_nm || item.org_nm || item.organization || 'K-Startup'

      const start = normalizeYmdFromAny(item.pbanc_rcpt_bgng_dt || item.rcpt_bgng_dt)
      const end = normalizeYmdFromAny(item.pbanc_rcpt_end_dt || item.rcpt_end_dt)

      const deadline = end || null

      let link = item.detl_pg_url || item.detail_url || item.link || ''
      if (link && typeof link === 'string' && !/^https?:\/\//i.test(link)) {
        link = `https://${link.replace(/^\/+/, '')}`
      }

      const summary =
        item.pbanc_ctnt ||
        item.biz_intrcn ||
        item.description ||
        item.atchFileNm ||
        item.atch_file_nm ||
        ''

      const categories = ['창업']

      return {
        id: item.pbanc_sn || item.id || `${title}__${start || ''}__${end || ''}`,
        title,
        organization: org,
        category: categories,
        deadline,
        budget: null,
        eligibility: [],
        link,
        detailUrl: link,
        summary,
        requirements: [],
        evaluationCriteria: [],
        source: 'kstartup_api',
        author: null,
        lcategory: '창업',
        pubDate: normalizeYmdFromAny(item.pbanc_reg_dt || item.reg_dt || item.pub_date) || null,
        reqstDt: start && end ? `${start} ~ ${end}` : start || end || null,
        hashTags: '',
      }
    })
    .filter((x) => x.title)
}

/**
 * ============
 * ✅ MSS(XML) 파서 (외부 라이브러리 없이, 응답 구조에 맞춘 안전한 수준의 파싱)
 * ============
 */
const stripCdata = (s) => {
  if (!s) return ''
  return String(s)
    .replace(/^\s*<!\[CDATA\[/, '')
    .replace(/\]\]>\s*$/, '')
    .trim()
}

const decodeEntities = (s) => {
  if (!s) return ''
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

const stripHtmlTags = (s) => {
  if (!s) return ''
  return String(s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const getTagText = (xml, tag) => {
  if (!xml) return ''
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = xml.match(re)
  if (m && m[1] != null) return stripCdata(decodeEntities(m[1]))

  const reSelf = new RegExp(`<${tag}\\s*\\/\\s*>`, 'i')
  if (reSelf.test(xml)) return ''
  return ''
}

const getTagTexts = (xml, tag) => {
  if (!xml) return []
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const out = []
  let m
  while ((m = re.exec(xml)) !== null) {
    out.push(stripCdata(decodeEntities(m[1])))
  }
  return out
}

const extractMssItemsFromXml = (xml) => {
  if (!xml) return []
  const itemsBlockMatch = xml.match(/<items>([\s\S]*?)<\/items>/i)
  if (!itemsBlockMatch) return []

  const itemsBlock = itemsBlockMatch[1]
  const reItem = /<item>([\s\S]*?)<\/item>/gi
  const out = []
  let m
  while ((m = reItem.exec(itemsBlock)) !== null) out.push(m[1])
  return out
}

const parseMssXmlEnvelope = (xml) => {
  const resultCode = getTagText(xml, 'resultCode')
  const resultMsg = getTagText(xml, 'resultMsg')
  const totalCountRaw = getTagText(xml, 'totalCount')
  const numOfRowsRaw = getTagText(xml, 'numOfRows')
  const pageNoRaw = getTagText(xml, 'pageNo')

  const totalCount = totalCountRaw ? Number(totalCountRaw) : null
  const numOfRows = numOfRowsRaw ? Number(numOfRowsRaw) : null
  const pageNo = pageNoRaw ? Number(pageNoRaw) : null

  return { resultCode, resultMsg, totalCount, numOfRows, pageNo }
}

/**
 * ✅ MSS API 호출 (최신순 100개, 타임아웃 적용)
 */
const fetchMssAnnouncements = async ({ apiKey, max = 100, perPage = 100 } = {}) => {
  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: '1',
    numOfRows: String(Math.min(perPage, 100)), // 100개 요청
  })

  const url = `${MSS_API_URL}?${params.toString()}`
  const res = await fetchWithTimeout(url, {}, 15000) // 15초 타임아웃 (데이터 많아서 늘림)
  if (!res.ok) {
    throw new Error(`[MSS API] request failed: ${res.status} ${res.statusText}`)
  }

  const xml = await res.text()
  const envelope = parseMssXmlEnvelope(xml)

  if (envelope.resultCode && envelope.resultCode !== '00') {
    throw new Error(`[MSS API] resultCode=${envelope.resultCode} resultMsg=${envelope.resultMsg}`)
  }

  const itemBlocks = extractMssItemsFromXml(xml)
  return itemBlocks.slice(0, max)
}

/**
 * MSS item(XML 블록) -> 공통 스키마 변환
 */
const transformMssResponse = (itemBlocks) => {
  return (itemBlocks || [])
    .map((block) => {
      const itemId = getTagText(block, 'itemId')
      const title = getTagText(block, 'title') || ''
      const dataContentsRaw = getTagText(block, 'dataContents') || ''
      const applicationStartDate = normalizeYmdFromAny(getTagText(block, 'applicationStartDate'))
      const applicationEndDate = normalizeYmdFromAny(getTagText(block, 'applicationEndDate'))

      const viewUrl = getTagText(block, 'viewUrl') || ''
      const fileNames = getTagTexts(block, 'fileName')
      const fileUrls = getTagTexts(block, 'fileUrl')

      const writerName = getTagText(block, 'writerName') || null
      const writerPosition = getTagText(block, 'writerPosition') || null
      const writerPhone = getTagText(block, 'writerPhone') || null
      const writerEmail = getTagText(block, 'writerEmail') || null

      const summary = stripHtmlTags(dataContentsRaw)

      const tagCats = extractCategoriesFromHashtags(`${title} ${summary}`)
      const categories = [...new Set(['창업', ...tagCats])].filter(Boolean)

      const deadline = applicationEndDate || null

      const reqstDt =
        applicationStartDate && applicationEndDate
          ? `${applicationStartDate} ~ ${applicationEndDate}`
          : applicationStartDate || applicationEndDate || null

      return {
        id: itemId || `mss__${title}__${applicationStartDate || ''}__${applicationEndDate || ''}`,
        title,
        organization: '중소벤처기업부',
        category: categories.length ? categories : ['창업'],
        deadline,
        budget: null,
        eligibility: [],
        link: viewUrl,
        detailUrl: viewUrl,
        summary,
        requirements: [],
        evaluationCriteria: [],
        source: 'mss_api',
        author: writerName,
        lcategory: '창업',
        pubDate: null,
        reqstDt,
        hashTags: '',
        mssMeta: {
          writerName,
          writerPosition,
          writerPhone,
          writerEmail,
          files: fileNames.map((name, idx) => ({
            name,
            url: fileUrls[idx] || null,
          })),
        },
      }
    })
    .filter((x) => x.title)
}

/**
 * 통합 결과에서 중복 제거
 */
const dedupAnnouncements = (arr) => {
  const seen = new Set()
  const out = []

  for (const a of arr || []) {
    const linkKey = (a.detailUrl || a.link || '').trim()
    const fallbackKey = `${a.title || ''}__${a.organization || ''}__${a.deadline || ''}`
    const key = linkKey || fallbackKey

    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(a)
  }
  return out
}

/**
 * K-Startup 공고 목록 조회 (최신순 100개, 타임아웃 적용)
 */
const fetchKstartupAnnouncements = async ({ apiKey, max = 100, perPage = 100 } = {}) => {
  const params = new URLSearchParams({
    ServiceKey: apiKey,
    page: '1',
    perPage: String(Math.min(perPage, 100)), // 100개 요청
    returnType: 'json',
  })

  const url = `${KSTARTUP_API_URL}?${params.toString()}`
  const res = await fetchWithTimeout(url, {}, 15000) // 15초 타임아웃 (데이터 많아서 늘림)
  if (!res.ok) throw new Error(`[K-Startup API] request failed: ${res.status} ${res.statusText}`)

  const data = await res.json()
  const items = extractItemsFromKstartupResponse(data)
  return items.slice(0, max)
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  try {
    const { keyword, category, refresh, debug } = event.queryStringParameters || {}

    // 캐시 확인 (refresh=true가 아닌 경우)
    if (!refresh && cache.data && cache.timestamp && Date.now() - cache.timestamp < CACHE_DURATION) {
      console.log('[Announcements] Using cached data')
      let results = [...cache.data]

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase()
        results = results.filter(
          (p) =>
            (p.title || '').toLowerCase().includes(lowerKeyword) ||
            (p.summary || '').toLowerCase().includes(lowerKeyword)
        )
      }

      if (category) results = results.filter((p) => (p.category || []).includes(category))

      results.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline) - new Date(b.deadline)
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: results,
          total: results.length,
          cached: true,
          cacheAge: Math.round((Date.now() - cache.timestamp) / 1000),
        }),
      }
    }

    // ==========================
    // ✅ 키 분리
    // ==========================
    const bizinfoKey = process.env.BIZINFO_API_KEY || process.env.DATA_GO_KR_API_KEY
    const kstartupKey = process.env.DATA_GO_KR_API_KEY
    const mssKey = process.env.MSS_API_KEY || process.env.DATA_GO_KR_API_KEY

    // API 키가 없으면 mock 데이터 반환
    if (!bizinfoKey && !kstartupKey && !mssKey) {
      console.log('[Announcements] No API keys configured, returning mock data')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: fallbackMockData,
          total: fallbackMockData.length,
          cached: false,
          warning: 'API keys not configured. Showing mock data.',
        }),
      }
    }

    // ===============
    // 1) 기업마당 호출 (타임아웃 8초)
    // ===============
    let bizinfoItems = []
    let bizinfoError = null

    if (bizinfoKey) {
      const bizinfoParams = new URLSearchParams({
        crtfcKey: bizinfoKey,
        dataType: 'json',
        searchCnt: '100',
      })

      try {
        console.log('[Bizinfo API] Fetching from API...')
        const bizinfoResponse = await fetchWithTimeout(
          `${BIZINFO_API_URL}?${bizinfoParams}`,
          {},
          8000
        )
        if (!bizinfoResponse.ok) {
          throw new Error(
            `Bizinfo API request failed: ${bizinfoResponse.status} ${bizinfoResponse.statusText}`
          )
        }

        const bizinfoData = await bizinfoResponse.json()
        bizinfoItems = extractItemsFromApiResponse(bizinfoData)
      } catch (e) {
        bizinfoError = e
        console.error('[Bizinfo API Error]', e.message)
        bizinfoItems = []
      }
    }

    // ===============
    // 2) K-Startup 호출(옵션, 타임아웃 8초)
    // ===============
    let kstartupItems = []
    let kstartupError = null

    if (!kstartupKey) {
      console.warn('[K-Startup API] DATA_GO_KR_API_KEY not configured; skipping.')
    } else {
      try {
        console.log('[K-Startup API] Fetching from API...')
        kstartupItems = await fetchKstartupAnnouncements({
          apiKey: kstartupKey,
          max: 100,
          perPage: 100,
        })
      } catch (e) {
        kstartupError = e
        console.error('[K-Startup API Error]', e.message)
        kstartupItems = []
      }
    }

    // ===============
    // 3) MSS 호출(옵션, 타임아웃 8초)
    // ===============
    let mssItemBlocks = []
    let mssError = null

    if (!mssKey) {
      console.warn('[MSS API] MSS_API_KEY not configured; skipping.')
    } else {
      try {
        console.log('[MSS API] Fetching from API...')
        mssItemBlocks = await fetchMssAnnouncements({
          apiKey: mssKey,
          max: 100,
          perPage: 100,
        })
      } catch (e) {
        mssError = e
        console.error('[MSS API Error]', e.message)
        mssItemBlocks = []
      }
    }

    // 디버그: 간소화된 구조 확인
    if (debug === 'true') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          debug: {
            env: { hasBizinfoKey: !!bizinfoKey, hasKstartupKey: !!kstartupKey, hasMssKey: !!mssKey },
            bizinfo: {
              itemsLength: bizinfoItems.length,
              error: bizinfoError ? bizinfoError.message : null,
            },
            kstartup: {
              itemsLength: kstartupItems.length,
              error: kstartupError ? kstartupError.message : null,
            },
            mss: {
              itemsLength: mssItemBlocks.length,
              error: mssError ? mssError.message : null,
            },
          },
        }),
      }
    }

    // =========================
    // 4) 공통 스키마 변환 후 통합
    // =========================
    const transformedBizinfo = transformApiResponse(bizinfoItems)
    const transformedKstartup = transformKstartupResponse(kstartupItems)
    const transformedMss = transformMssResponse(mssItemBlocks)

    let combined = dedupAnnouncements([
      ...transformedBizinfo,
      ...transformedKstartup,
      ...transformedMss,
    ])

    // 모든 API가 실패하거나 데이터가 없으면 mock 데이터 사용
    if (combined.length === 0) {
      console.log('[Announcements] All APIs failed or returned empty, using mock data')
      combined = fallbackMockData
    }

    cache = { data: combined, timestamp: Date.now() }

    // 필터링 적용
    let results = [...combined]

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      results = results.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(lowerKeyword) ||
          (p.summary || '').toLowerCase().includes(lowerKeyword)
      )
    }

    if (category) results = results.filter((p) => (p.category || []).includes(category))

    // deadline 없는 건 뒤로, 있는 건 deadline 순
    results.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline) - new Date(b.deadline)
    })

    const warnings = []
    if (bizinfoError) warnings.push('Bizinfo API failed.')
    if (kstartupError) warnings.push('K-Startup API failed.')
    if (mssError) warnings.push('MSS API failed.')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: results,
        total: results.length,
        cached: false,
        totalFromApi: {
          bizinfo: bizinfoItems.length,
          kstartup: kstartupItems.length,
          mss: mssItemBlocks.length,
        },
        warnings,
      }),
    }
  } catch (error) {
    console.error('[Announcements API Error]', error)
    // 에러 발생 시에도 mock 데이터 반환 (서비스 가용성 우선)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: fallbackMockData,
        total: fallbackMockData.length,
        cached: false,
        warning: `API error: ${error.message}. Showing mock data.`,
      }),
    }
  }
}
