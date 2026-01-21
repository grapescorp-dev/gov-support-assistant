// HTML 문자열에서 태그를 제거하고 카드용 텍스트로 정제
export function stripHtml(html) {
  if (!html) return ''

  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')   // <br>, <br/> → 공백
    .replace(/<\/p>/gi, ' ')        // </p> → 공백
    .replace(/<[^>]*>/g, '')        // 모든 HTML 태그 제거
    .replace(/\s+/g, ' ')           // 연속 공백 정리
    .trim()
}

export default stripHtml
