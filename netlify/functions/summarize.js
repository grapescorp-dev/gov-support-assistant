import Anthropic from '@anthropic-ai/sdk'
import { Buffer } from 'node:buffer'

const anthropic = new Anthropic({
  // eslint-disable-next-line no-undef
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ==============================================
// HWPX 파싱 유틸리티 (순수 Node.js, 외부 라이브러리 없음)
// ==============================================

/**
 * HWPX 파일에서 텍스트 추출 (ZIP 내부 Contents/section0.xml 파싱)
 * HWPX는 ZIP 포맷이므로 Node.js 내장 기능으로 처리 가능
 */
const extractTextFromHwpx = async (buffer) => {
  // HWPX는 ZIP 파일이므로 PK 시그니처(50 4B 03 04) 확인
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error('HWPX_INVALID_FORMAT')
  }

  // Node.js 내장 zlib 사용하여 ZIP 파일 처리
  // ZIP 파일 구조를 직접 파싱
  const entries = parseZipEntries(buffer)

  // Contents/section0.xml 또는 Contents/section*.xml 찾기
  const sectionEntries = entries.filter(e =>
    e.name.startsWith('Contents/section') && e.name.endsWith('.xml')
  )

  if (sectionEntries.length === 0) {
    // HWPX가 아닌 경우 header.xml에서라도 추출 시도
    const headerEntry = entries.find(e => e.name === 'Contents/header.xml')
    if (!headerEntry) {
      throw new Error('HWPX_NO_CONTENT')
    }
  }

  // 모든 section의 텍스트 추출
  let fullText = ''
  for (const entry of sectionEntries) {
    const xmlContent = await inflateEntry(buffer, entry)
    const text = extractTextFromHwpxXml(xmlContent)
    fullText += text + '\n'
  }

  return fullText.trim()
}

/**
 * ZIP 파일에서 엔트리 목록 파싱 (Central Directory 기반)
 */
const parseZipEntries = (buffer) => {
  const entries = []

  // End of Central Directory 찾기 (뒤에서부터 검색)
  let eocdOffset = -1
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer[i] === 0x50 && buffer[i + 1] === 0x4b &&
        buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) {
      eocdOffset = i
      break
    }
  }

  if (eocdOffset === -1) {
    throw new Error('ZIP_EOCD_NOT_FOUND')
  }

  // Central Directory 시작 위치
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16)
  const cdEntries = buffer.readUInt16LE(eocdOffset + 10)

  let offset = cdOffset
  for (let i = 0; i < cdEntries; i++) {
    // Central Directory 헤더 시그니처 확인
    if (buffer[offset] !== 0x50 || buffer[offset + 1] !== 0x4b ||
        buffer[offset + 2] !== 0x01 || buffer[offset + 3] !== 0x02) {
      break
    }

    const compressedSize = buffer.readUInt32LE(offset + 20)
    const uncompressedSize = buffer.readUInt32LE(offset + 24)
    const fileNameLen = buffer.readUInt16LE(offset + 28)
    const extraLen = buffer.readUInt16LE(offset + 30)
    const commentLen = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)
    const compressionMethod = buffer.readUInt16LE(offset + 10)

    const fileName = buffer.slice(offset + 46, offset + 46 + fileNameLen).toString('utf8')

    entries.push({
      name: fileName,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      compressionMethod,
    })

    offset += 46 + fileNameLen + extraLen + commentLen
  }

  return entries
}

/**
 * ZIP 엔트리의 데이터를 압축 해제
 */
const inflateEntry = async (buffer, entry) => {
  const { localHeaderOffset, compressionMethod, compressedSize } = entry

  // Local file header 파싱
  const fileNameLen = buffer.readUInt16LE(localHeaderOffset + 26)
  const extraLen = buffer.readUInt16LE(localHeaderOffset + 28)
  const dataOffset = localHeaderOffset + 30 + fileNameLen + extraLen

  const compressedData = buffer.slice(dataOffset, dataOffset + compressedSize)

  if (compressionMethod === 0) {
    // Stored (압축 없음)
    return compressedData.toString('utf8')
  } else if (compressionMethod === 8) {
    // Deflate
    const zlib = await import('zlib')
    return new Promise((resolve, reject) => {
      zlib.inflateRaw(compressedData, (err, result) => {
        if (err) reject(err)
        else resolve(result.toString('utf8'))
      })
    })
  } else {
    throw new Error(`UNSUPPORTED_COMPRESSION: ${compressionMethod}`)
  }
}

/**
 * HWPX XML에서 텍스트 추출 (hp:t 태그 기반)
 */
const extractTextFromHwpxXml = (xmlContent) => {
  const texts = []

  // hp:t 태그 또는 일반 텍스트 노드 추출
  // HWPX의 텍스트는 <hp:t>텍스트</hp:t> 또는 <t>텍스트</t> 형태
  const regex = /<(?:hp:)?t[^>]*>([^<]*)<\/(?:hp:)?t>/gi
  let match
  while ((match = regex.exec(xmlContent)) !== null) {
    const text = match[1].trim()
    if (text) {
      texts.push(text)
    }
  }

  // 대체 패턴: <w:t> (OOXML 호환)
  const regex2 = /<w:t[^>]*>([^<]*)<\/w:t>/gi
  while ((match = regex2.exec(xmlContent)) !== null) {
    const text = match[1].trim()
    if (text) {
      texts.push(text)
    }
  }

  return texts.join('\n')
}

// ==============================================
// PDF 파싱 (텍스트 기반 PDF만 지원, 간단한 추출)
// ==============================================

/**
 * PDF에서 텍스트 추출 (간단한 스트림 기반)
 * 복잡한 PDF는 지원하지 않음
 */
const extractTextFromPdf = (buffer) => {
  const content = buffer.toString('latin1')
  const texts = []

  // BT...ET 블록 (Text Object) 찾기
  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi
  let streamMatch

  while ((streamMatch = streamRegex.exec(content)) !== null) {
    const streamContent = streamMatch[1]

    // Tj, TJ 연산자로 텍스트 추출
    const tjRegex = /\(([^)]*)\)\s*Tj/g
    let tjMatch
    while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
      texts.push(decodeEscaped(tjMatch[1]))
    }

    // TJ 배열 처리
    const tjArrayRegex = /\[(.*?)\]\s*TJ/gi
    let tjArrayMatch
    while ((tjArrayMatch = tjArrayRegex.exec(streamContent)) !== null) {
      const arrayContent = tjArrayMatch[1]
      const strRegex = /\(([^)]*)\)/g
      let strMatch
      while ((strMatch = strRegex.exec(arrayContent)) !== null) {
        texts.push(decodeEscaped(strMatch[1]))
      }
    }
  }

  if (texts.length === 0) {
    throw new Error('PDF_NO_TEXT_EXTRACTABLE')
  }

  return texts.join(' ').replace(/\s+/g, ' ').trim()
}

const decodeEscaped = (str) => {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
}

// ==============================================
// 문서에서 지원자격/제외조건/필수요건 섹션 파싱
// ==============================================

/**
 * 텍스트에서 구조화된 정보 추출
 */
const parseEligibilityFromText = (text) => {
  const result = {
    eligibility: [],    // 지원자격
    exclusion: [],      // 제외조건
    mandatory: [],      // 필수요건
    confidence: 'medium',
    notes: [],
  }

  if (!text || text.length < 50) {
    result.confidence = 'low'
    result.notes.push('문서 텍스트가 너무 짧습니다')
    return result
  }

  // 줄 단위로 분리
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)

  // 섹션 헤더 패턴
  const eligibilityHeaders = [
    /지원\s*대상/i, /신청\s*자격/i, /지원\s*자격/i, /참가\s*자격/i,
    /지원.*기업/i, /대상.*기업/i, /신청.*대상/i, /자격.*요건/i
  ]

  const exclusionHeaders = [
    /제외/i, /제한/i, /신청.*제외/i, /지원.*제외/i, /참여.*제한/i,
    /불가/i, /해당.*없/i, /대상.*아님/i
  ]

  const mandatoryHeaders = [
    /필수/i, /의무/i, /필수.*요건/i, /필수.*제출/i, /제출.*서류/i,
    /구비.*서류/i, /신청.*서류/i
  ]

  let currentSection = null
  let sectionContent = []
  let foundSections = { eligibility: false, exclusion: false, mandatory: false }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 섹션 헤더 감지
    let newSection = null

    if (eligibilityHeaders.some(p => p.test(line))) {
      newSection = 'eligibility'
    } else if (exclusionHeaders.some(p => p.test(line))) {
      newSection = 'exclusion'
    } else if (mandatoryHeaders.some(p => p.test(line))) {
      newSection = 'mandatory'
    }

    if (newSection) {
      // 이전 섹션 저장
      if (currentSection && sectionContent.length > 0) {
        result[currentSection].push(...sectionContent)
        foundSections[currentSection] = true
      }
      currentSection = newSection
      sectionContent = []
      continue
    }

    // 현재 섹션에 내용 추가
    if (currentSection) {
      // 불릿 포인트 정리
      const cleanedLine = line
        .replace(/^[\s\-•◦·※○●□■◆◇▶►☞➤→⇒*]+/, '')
        .replace(/^\d+[.)]\s*/, '')
        .trim()

      if (cleanedLine.length > 5 && cleanedLine.length < 500) {
        sectionContent.push(cleanedLine)
      }

      // 섹션 종료 조건 (다른 큰 제목이 나오면)
      if (sectionContent.length > 10 || line.match(/^[IVX\d]+\.\s|^제\s*\d+\s*조|^[가나다라마바사]/)) {
        result[currentSection].push(...sectionContent)
        foundSections[currentSection] = true
        currentSection = null
        sectionContent = []
      }
    }
  }

  // 마지막 섹션 저장
  if (currentSection && sectionContent.length > 0) {
    result[currentSection].push(...sectionContent)
    foundSections[currentSection] = true
  }

  // 신뢰도 및 노트 설정
  const foundCount = Object.values(foundSections).filter(v => v).length

  if (foundCount === 0) {
    result.confidence = 'low'
    result.notes.push('문서에서 지원자격/제외조건/필수요건 섹션을 찾지 못했습니다')
  } else if (foundCount === 1) {
    result.confidence = 'medium'
    if (!foundSections.eligibility) result.notes.push('지원자격 섹션을 찾지 못했습니다')
    if (!foundSections.exclusion) result.notes.push('제외조건 섹션을 찾지 못했습니다')
    if (!foundSections.mandatory) result.notes.push('필수요건 섹션을 찾지 못했습니다')
  } else if (foundCount >= 2) {
    result.confidence = 'high'
    if (!foundSections.exclusion) result.notes.push('제외조건 섹션을 찾지 못했습니다')
  }

  // 각 배열 중복 제거 및 정리
  result.eligibility = [...new Set(result.eligibility)].slice(0, 10)
  result.exclusion = [...new Set(result.exclusion)].slice(0, 10)
  result.mandatory = [...new Set(result.mandatory)].slice(0, 10)

  return result
}

// ==============================================
// Claude를 통한 요약 생성
// ==============================================

/**
 * 파싱된 구조화 데이터로 Claude 요약 생성
 */
const generateSummaryWithClaude = async (announcement, extracted) => {
  // 비용 최적화: 간결한 프롬프트 + Haiku 모델 사용
  const systemPrompt = `정부지원사업 공고 요약 전문가. JSON만 출력.`

  // 프롬프트 최적화: 불필요한 텍스트 제거, 핵심만 전달
  const eligibilityText = extracted.eligibility.slice(0, 5).join('; ') || '없음'
  const exclusionText = extracted.exclusion.slice(0, 3).join('; ') || '없음'
  const mandatoryText = extracted.mandatory.slice(0, 3).join('; ') || '없음'

  const userPrompt = `공고 요약:
제목: ${announcement.title || '-'}
기관: ${announcement.organization || '-'}
마감: ${announcement.deadline || '-'}
자격: ${eligibilityText}
제외: ${exclusionText}
필수: ${mandatoryText}

JSON 응답:
{"summary":"3-5문장 핵심요약","keyEligibility":["자격1","자격2","자격3"],"keyExclusion":["제외1","제외2"],"keyMandatory":["필수1","필수2"],"recommendation":"한줄조언"}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20250929',  // 비용 절감: Sonnet → Haiku
    max_tokens: 600,  // 출력 토큰 감소
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const responseText = message.content[0].text

  // JSON 파싱
  let parsed
  try {
    parsed = JSON.parse(responseText)
  } catch {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1].trim())
    } else {
      throw new Error('CLAUDE_JSON_PARSE_FAILED')
    }
  }

  return parsed
}

// ==============================================
// 파일 선택 및 다운로드
// ==============================================

/**
 * MSS 첨부파일 중 공고문 파일 선택
 */
const selectAnnouncementFile = (files) => {
  if (!files || files.length === 0) {
    return null
  }

  // '공고' 포함 파일 우선
  const announcementFile = files.find(f =>
    f.name && (f.name.includes('공고') || f.name.includes('모집'))
  )

  if (announcementFile) return announcementFile

  // HWPX 파일 우선 (파싱 지원)
  const hwpxFile = files.find(f =>
    f.name && f.name.toLowerCase().endsWith('.hwpx')
  )

  if (hwpxFile) return hwpxFile

  // PDF 파일
  const pdfFile = files.find(f =>
    f.name && f.name.toLowerCase().endsWith('.pdf')
  )

  if (pdfFile) return pdfFile

  // 그 외 첫 번째 파일
  return files[0]
}

/**
 * 파일 다운로드
 */
const downloadFile = async (url) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`FILE_DOWNLOAD_FAILED: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('FILE_DOWNLOAD_TIMEOUT')
    }
    throw error
  }
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
      body: JSON.stringify({
        success: false,
        error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }
      }),
    }
  }

  try {
    const { announcement, extracted: preExtracted } = JSON.parse(event.body)

    // 1. MSS 공고인지 확인
    if (announcement.source !== 'mss_api') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            message: '문서 기반 요약은 중소벤처기업부(MSS) 공고만 지원합니다.',
            code: 'UNSUPPORTED_SOURCE',
          },
        }),
      }
    }

    // 2. 파일 정보 확인
    const files = announcement.mssMeta?.files
    if (!files || files.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            message: '이 공고에는 첨부파일이 없습니다.',
            code: 'NO_FILES',
          },
        }),
      }
    }

    let extracted = preExtracted

    // 3. extracted가 없으면 파일에서 추출
    if (!extracted) {
      const selectedFile = selectAnnouncementFile(files)

      if (!selectedFile || !selectedFile.url) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: '유효한 첨부파일 URL이 없습니다.',
              code: 'NO_VALID_FILE_URL',
            },
          }),
        }
      }

      const fileName = selectedFile.name?.toLowerCase() || ''
      const isHwpx = fileName.endsWith('.hwpx')
      const isPdf = fileName.endsWith('.pdf')
      const isHwp = fileName.endsWith('.hwp') && !isHwpx

      // HWP (구버전) 미지원
      if (isHwp) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: 'HWP 파일(구버전)은 지원하지 않습니다. HWPX 또는 PDF 파일만 지원합니다.',
              code: 'HWP_NOT_SUPPORTED',
            },
          }),
        }
      }

      // 파일 다운로드
      console.log(`[Summarize] Downloading file: ${selectedFile.name}`)
      let fileBuffer
      try {
        fileBuffer = await downloadFile(selectedFile.url)
      } catch (downloadError) {
        console.error('[Summarize] Download error:', downloadError.message)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: `파일 다운로드 실패: ${downloadError.message}`,
              code: 'FILE_DOWNLOAD_ERROR',
            },
          }),
        }
      }

      // 텍스트 추출
      let documentText
      try {
        if (isHwpx) {
          console.log('[Summarize] Parsing HWPX...')
          documentText = await extractTextFromHwpx(fileBuffer)
        } else if (isPdf) {
          console.log('[Summarize] Parsing PDF...')
          documentText = extractTextFromPdf(fileBuffer)
        } else {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: false,
              error: {
                message: `지원하지 않는 파일 형식입니다: ${selectedFile.name}`,
                code: 'UNSUPPORTED_FILE_FORMAT',
              },
            }),
          }
        }
      } catch (parseError) {
        console.error('[Summarize] Parse error:', parseError.message)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: `문서 파싱 실패: ${parseError.message}`,
              code: 'PARSE_ERROR',
            },
          }),
        }
      }

      // 구조화 정보 추출
      console.log(`[Summarize] Extracted ${documentText.length} chars, parsing eligibility...`)
      extracted = parseEligibilityFromText(documentText)
      extracted.fileName = selectedFile.name
    }

    // 4. Claude로 요약 생성
    console.log('[Summarize] Generating summary with Claude...')
    let claudeResult
    try {
      claudeResult = await generateSummaryWithClaude(announcement, extracted)
    } catch (claudeError) {
      console.error('[Summarize] Claude error:', claudeError.message)

      // Claude 실패해도 파싱 결과는 반환
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            summary: '(AI 요약 생성 실패) 아래 추출된 정보를 참고하세요.',
            eligibility: extracted.eligibility,
            mandatory: extracted.mandatory,
            exclusion: extracted.exclusion,
            confidence: extracted.confidence,
            notes: [...(extracted.notes || []), 'AI 요약 생성에 실패했습니다.'],
            fileName: extracted.fileName,
          },
        }),
      }
    }

    // 5. 성공 응답
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          summary: claudeResult.summary,
          keyEligibility: claudeResult.keyEligibility || [],
          keyExclusion: claudeResult.keyExclusion || [],
          keyMandatory: claudeResult.keyMandatory || [],
          recommendation: claudeResult.recommendation || '',
          eligibility: extracted.eligibility,
          mandatory: extracted.mandatory,
          exclusion: extracted.exclusion,
          confidence: extracted.confidence,
          notes: extracted.notes || [],
          fileName: extracted.fileName,
        },
      }),
    }

  } catch (error) {
    console.error('[Summarize] Unexpected error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          message: error.message || '서버 오류가 발생했습니다.',
          code: 'INTERNAL_ERROR',
        },
      }),
    }
  }
}
