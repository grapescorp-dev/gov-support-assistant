/**
 * MSS(중소벤처기업부) 공고 첨부파일 파싱 함수
 * HWPX/PDF에서 지원자격/제외조건/필수요건/태그를 추출
 */
import { Buffer } from 'node:buffer'

// ==============================================
// 간단한 메모리 캐시 (서버리스 환경에서 best-effort)
// ==============================================
const cache = new Map()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24시간

const getCached = (key) => {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

const setCache = (key, data) => {
  // 캐시 크기 제한 (100개)
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
  cache.set(key, { data, timestamp: Date.now() })
}

// ==============================================
// HWPX 파싱 유틸리티 (순수 Node.js)
// ==============================================

const parseZipEntries = (buffer) => {
  const entries = []
  let eocdOffset = -1
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer[i] === 0x50 && buffer[i + 1] === 0x4b &&
        buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) throw new Error('ZIP_EOCD_NOT_FOUND')

  const cdOffset = buffer.readUInt32LE(eocdOffset + 16)
  const cdEntries = buffer.readUInt16LE(eocdOffset + 10)

  let offset = cdOffset
  for (let i = 0; i < cdEntries; i++) {
    if (buffer[offset] !== 0x50 || buffer[offset + 1] !== 0x4b ||
        buffer[offset + 2] !== 0x01 || buffer[offset + 3] !== 0x02) break

    const compressedSize = buffer.readUInt32LE(offset + 20)
    const fileNameLen = buffer.readUInt16LE(offset + 28)
    const extraLen = buffer.readUInt16LE(offset + 30)
    const commentLen = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)
    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const fileName = buffer.slice(offset + 46, offset + 46 + fileNameLen).toString('utf8')

    entries.push({ name: fileName, compressedSize, localHeaderOffset, compressionMethod })
    offset += 46 + fileNameLen + extraLen + commentLen
  }
  return entries
}

const inflateEntry = async (buffer, entry) => {
  const { localHeaderOffset, compressionMethod, compressedSize } = entry
  const fileNameLen = buffer.readUInt16LE(localHeaderOffset + 26)
  const extraLen = buffer.readUInt16LE(localHeaderOffset + 28)
  const dataOffset = localHeaderOffset + 30 + fileNameLen + extraLen
  const compressedData = buffer.slice(dataOffset, dataOffset + compressedSize)

  if (compressionMethod === 0) {
    return compressedData.toString('utf8')
  } else if (compressionMethod === 8) {
    const zlib = await import('zlib')
    return new Promise((resolve, reject) => {
      zlib.inflateRaw(compressedData, (err, result) => {
        if (err) reject(err)
        else resolve(result.toString('utf8'))
      })
    })
  }
  throw new Error(`UNSUPPORTED_COMPRESSION: ${compressionMethod}`)
}

const extractTextFromHwpxXml = (xmlContent) => {
  const texts = []
  const regex = /<(?:hp:)?t[^>]*>([^<]*)<\/(?:hp:)?t>/gi
  let match
  while ((match = regex.exec(xmlContent)) !== null) {
    if (match[1].trim()) texts.push(match[1].trim())
  }
  const regex2 = /<w:t[^>]*>([^<]*)<\/w:t>/gi
  while ((match = regex2.exec(xmlContent)) !== null) {
    if (match[1].trim()) texts.push(match[1].trim())
  }
  return texts.join('\n')
}

const extractTextFromHwpx = async (buffer) => {
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error('HWPX_INVALID_FORMAT')
  }
  const entries = parseZipEntries(buffer)
  const sectionEntries = entries.filter(e =>
    e.name.startsWith('Contents/section') && e.name.endsWith('.xml')
  )
  if (sectionEntries.length === 0) throw new Error('HWPX_NO_CONTENT')

  let fullText = ''
  for (const entry of sectionEntries) {
    const xmlContent = await inflateEntry(buffer, entry)
    fullText += extractTextFromHwpxXml(xmlContent) + '\n'
  }
  return fullText.trim()
}

// ==============================================
// PDF 텍스트 추출 (간단한 스트림 기반)
// ==============================================

const decodeEscaped = (str) => {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
}

const extractTextFromPdf = (buffer) => {
  const content = buffer.toString('latin1')
  const texts = []
  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi
  let streamMatch
  while ((streamMatch = streamRegex.exec(content)) !== null) {
    const streamContent = streamMatch[1]
    const tjRegex = /\(([^)]*)\)\s*Tj/g
    let tjMatch
    while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
      texts.push(decodeEscaped(tjMatch[1]))
    }
    const tjArrayRegex = /\[(.*?)\]\s*TJ/gi
    let tjArrayMatch
    while ((tjArrayMatch = tjArrayRegex.exec(streamContent)) !== null) {
      const strRegex = /\(([^)]*)\)/g
      let strMatch
      while ((strMatch = strRegex.exec(tjArrayMatch[1])) !== null) {
        texts.push(decodeEscaped(strMatch[1]))
      }
    }
  }
  if (texts.length === 0) throw new Error('PDF_NO_TEXT_EXTRACTABLE')
  return texts.join(' ').replace(/\s+/g, ' ').trim()
}

// ==============================================
// 섹션별 텍스트 추출 (지원자격/제외조건/필수요건)
// ==============================================

const extractSections = (text) => {
  const result = {
    eligibilityText: '',
    exclusionText: '',
    mandatoryText: '',
  }

  if (!text || text.length < 50) return result

  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)

  // 섹션 헤더 패턴
  const eligibilityHeaders = [
    /지원\s*대상/i, /신청\s*자격/i, /지원\s*자격/i, /참가\s*자격/i,
    /신청\s*대상/i, /대상\s*기업/i, /자격\s*요건/i, /지원.*기업/i
  ]
  const exclusionHeaders = [
    /제외/i, /제한/i, /지원.*불가/i, /참여.*제한/i, /부적격/i,
    /신청.*제외/i, /지원.*제외/i, /해당.*없/i
  ]
  const mandatoryHeaders = [
    /필수\s*요건/i, /필수\s*서류/i, /제출\s*서류/i, /신청\s*서류/i,
    /구비\s*서류/i, /필수\s*제출/i, /의무/i
  ]

  let currentSection = null
  let sectionLines = []

  const saveSection = () => {
    if (currentSection && sectionLines.length > 0) {
      const cleanedLines = sectionLines
        .map(l => l.replace(/^[\s\-•◦·※○●□■◆◇▶►☞➤→⇒*]+/, '').replace(/^\d+[.)]\s*/, '').trim())
        .filter(l => l.length > 5 && l.length < 500)
        .slice(0, 10)

      const sectionText = cleanedLines.join(' | ')
      if (currentSection === 'eligibility') result.eligibilityText = sectionText
      else if (currentSection === 'exclusion') result.exclusionText = sectionText
      else if (currentSection === 'mandatory') result.mandatoryText = sectionText
    }
    sectionLines = []
  }

  for (const line of lines) {
    let newSection = null
    if (eligibilityHeaders.some(p => p.test(line))) newSection = 'eligibility'
    else if (exclusionHeaders.some(p => p.test(line))) newSection = 'exclusion'
    else if (mandatoryHeaders.some(p => p.test(line))) newSection = 'mandatory'

    if (newSection) {
      saveSection()
      currentSection = newSection
      continue
    }

    if (currentSection) {
      sectionLines.push(line)
      // 섹션 종료 조건
      if (sectionLines.length > 15 || line.match(/^[IVX\d]+\.\s|^제\s*\d+\s*조|^[가나다라마바사]/)) {
        saveSection()
        currentSection = null
      }
    }
  }
  saveSection()

  return result
}

// ==============================================
// 태그 추출 (규칙 기반 키워드 매핑)
// ==============================================

const TAG_RULES = {
  'R&D': ['r&d', '연구개발', '기술개발', '과제', '연구비', '기술혁신', '개발지원'],
  '수출/해외진출': ['수출', '해외', '글로벌', '바이어', '진출', 'kotra', '무역', '해외마케팅'],
  '창업/스타트업': ['창업', '스타트업', '예비창업', '초기창업', '액셀러레이터', '팁스', 'tips', '벤처'],
  '소상공인': ['소상공인', '스마트상점', '전통시장', '소공인', '영세'],
  '중소기업': ['중소기업', 'sme', '중견기업'],
  '투자/IR': ['투자', 'ir', 'vc', '투자유치', '엔젤', '시드'],
  '교육/세미나': ['세미나', '교육', '특강', '아카데미', '워크숍', '캠프', '연수'],
  '전시/로드쇼': ['전시', '박람회', 'expo', '로드쇼', '상담회', '밋업', '네트워킹'],
  '데모데이/피칭': ['데모데이', 'demoday', '피칭', 'pitching', 'showcase', '발표대회'],
  '바우처/이용권': ['바우처', '이용권', '쿠폰', '포인트'],
  '입주/공간': ['입주', '공간', '센터', '사무실', '보육', '인큐베이팅', '창업공간'],
  '컨설팅/멘토링': ['컨설팅', '멘토링', '코칭', '자문', '진단'],
  '디지털전환': ['디지털 전환', '디지털전환', 'dx', 'ax', '클라우드', '스마트화'],
  '제조/스마트공장': ['스마트공장', '제조', '공장', '고도화', '자동화', '생산성'],
  'AI/데이터': ['ai', '인공지능', '머신러닝', '데이터', '빅데이터', '딥러닝'],
  '콘텐츠/미디어': ['콘텐츠', '미디어', '영상', '게임', '음악', '웹툰', '애니메이션'],
  '기술사업화': ['사업화', '기술이전', '상용화', '실증', '시제품'],
  '인력지원': ['인력', '채용', '고용', '일자리', '인건비', '청년'],
  '특허/지식재산': ['특허', '지식재산', 'ip', '상표', '디자인권'],
  '인증/시험': ['인증', '시험', '검사', '품질', 'iso', 'ks', 'kc', 'ce'],
}

const extractTags = (text, title = '', summary = '') => {
  const searchText = [text, title, summary].join(' ').toLowerCase()
  const matchedTags = []

  for (const [tag, keywords] of Object.entries(TAG_RULES)) {
    if (keywords.some(kw => searchText.includes(kw))) {
      matchedTags.push(tag)
    }
  }

  return [...new Set(matchedTags)].slice(0, 15)
}

// ==============================================
// 파일 다운로드
// ==============================================

const downloadFile = async (url, timeoutMs = 10000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error(`HTTP_${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') throw new Error('DOWNLOAD_TIMEOUT')
    throw error
  }
}

// ==============================================
// 공고문 파일 선택
// ==============================================

const selectAnnouncementFile = (files) => {
  if (!files || files.length === 0) return null

  // '공고' 포함 파일 우선
  let selected = files.find(f => f.name && (f.name.includes('공고') || f.name.includes('모집')))
  if (selected) return selected

  // HWPX 우선
  selected = files.find(f => f.name?.toLowerCase().endsWith('.hwpx'))
  if (selected) return selected

  // PDF
  selected = files.find(f => f.name?.toLowerCase().endsWith('.pdf'))
  if (selected) return selected

  return files[0]
}

// ==============================================
// Handler
// ==============================================

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
      body: JSON.stringify({ success: false, error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } }),
    }
  }

  try {
    const { announcementId, files, title, summary } = JSON.parse(event.body)

    // 캐시 확인
    if (announcementId) {
      const cached = getCached(announcementId)
      if (cached) {
        console.log(`[parseMssDocs] Cache hit: ${announcementId}`)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: cached, fromCache: true }),
        }
      }
    }

    // 파일 없으면 빈 결과
    if (!files || files.length === 0) {
      const emptyParsed = { eligibilityText: '', mandatoryText: '', exclusionText: '', tags: [] }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: emptyParsed, note: 'NO_FILES' }),
      }
    }

    // 파일 선택
    const selectedFile = selectAnnouncementFile(files)
    if (!selectedFile?.url) {
      const emptyParsed = { eligibilityText: '', mandatoryText: '', exclusionText: '', tags: [] }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: emptyParsed, note: 'NO_VALID_URL' }),
      }
    }

    const fileName = selectedFile.name?.toLowerCase() || ''
    const isHwpx = fileName.endsWith('.hwpx')
    const isPdf = fileName.endsWith('.pdf')
    const isHwp = fileName.endsWith('.hwp') && !isHwpx

    // HWP(구버전) 미지원
    if (isHwp) {
      const emptyParsed = { eligibilityText: '', mandatoryText: '', exclusionText: '', tags: [] }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: emptyParsed, note: 'HWP_NOT_SUPPORTED' }),
      }
    }

    if (!isHwpx && !isPdf) {
      const emptyParsed = { eligibilityText: '', mandatoryText: '', exclusionText: '', tags: [] }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: emptyParsed, note: 'UNSUPPORTED_FORMAT' }),
      }
    }

    // 파일 다운로드
    console.log(`[parseMssDocs] Downloading: ${selectedFile.name}`)
    let fileBuffer
    try {
      fileBuffer = await downloadFile(selectedFile.url)
    } catch (dlError) {
      console.error('[parseMssDocs] Download error:', dlError.message)
      const emptyParsed = { eligibilityText: '', mandatoryText: '', exclusionText: '', tags: [] }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: emptyParsed, note: `DOWNLOAD_FAILED: ${dlError.message}` }),
      }
    }

    // 텍스트 추출
    let documentText = ''
    try {
      if (isHwpx) {
        console.log('[parseMssDocs] Parsing HWPX...')
        documentText = await extractTextFromHwpx(fileBuffer)
      } else if (isPdf) {
        console.log('[parseMssDocs] Parsing PDF...')
        documentText = extractTextFromPdf(fileBuffer)
      }
    } catch (parseError) {
      console.error('[parseMssDocs] Parse error:', parseError.message)
      const emptyParsed = { eligibilityText: '', mandatoryText: '', exclusionText: '', tags: [] }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: emptyParsed, note: `PARSE_FAILED: ${parseError.message}` }),
      }
    }

    // 섹션 추출
    const sections = extractSections(documentText)

    // 태그 추출
    const tags = extractTags(documentText, title || '', summary || '')

    const parsed = {
      eligibilityText: sections.eligibilityText,
      mandatoryText: sections.mandatoryText,
      exclusionText: sections.exclusionText,
      tags,
      fileName: selectedFile.name,
    }

    // 캐시 저장
    if (announcementId) {
      setCache(announcementId, parsed)
    }

    console.log(`[parseMssDocs] Success: eligibility=${parsed.eligibilityText.length}chars, tags=${tags.length}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: parsed }),
    }

  } catch (error) {
    console.error('[parseMssDocs] Unexpected error:', error)
    const emptyParsed = { eligibilityText: '', mandatoryText: '', exclusionText: '', tags: [] }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: emptyParsed, note: `ERROR: ${error.message}` }),
    }
  }
}
