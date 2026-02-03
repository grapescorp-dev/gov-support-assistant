import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// 태그 색상 매핑
const TAG_COLORS = {
  // 행사 태그 (우선순위 높음)
  '전시/로드쇼': 'bg-pink-100 text-pink-700 border-pink-200',
  '교육/세미나': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  '투자/IR': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '데모데이/피칭': 'bg-red-100 text-red-700 border-red-200',

  // 수출/글로벌 (우선순위 높음)
  '수출/해외진출': 'bg-blue-100 text-blue-700 border-blue-200',

  // 대상 태그
  '창업/스타트업': 'bg-green-100 text-green-700 border-green-200',
  '소상공인': 'bg-orange-100 text-orange-700 border-orange-200',
  '중소기업': 'bg-gray-100 text-gray-700 border-gray-200',
  '예비창업': 'bg-emerald-100 text-emerald-700 border-emerald-200',

  // 지원유형
  'R&D': 'bg-purple-100 text-purple-700 border-purple-200',
  '바우처/이용권': 'bg-teal-100 text-teal-700 border-teal-200',
  '입주/공간': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  '컨설팅/멘토링': 'bg-lime-100 text-lime-700 border-lime-200',
  '인력지원': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  '시설/장비': 'bg-stone-100 text-stone-700 border-stone-200',
  '판로지원': 'bg-amber-100 text-amber-700 border-amber-200',

  // 기술/산업
  '디지털전환': 'bg-sky-100 text-sky-700 border-sky-200',
  '제조/스마트공장': 'bg-amber-100 text-amber-700 border-amber-200',
  'AI/데이터': 'bg-violet-100 text-violet-700 border-violet-200',
  '콘텐츠/미디어': 'bg-rose-100 text-rose-700 border-rose-200',
  '기술사업화': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '특허/지식재산': 'bg-slate-100 text-slate-700 border-slate-200',
  '인증/시험': 'bg-zinc-100 text-zinc-700 border-zinc-200',

  // 소스 태그
  '기업마당': 'bg-blue-50 text-blue-600 border-blue-200',
  'K-Startup': 'bg-green-50 text-green-600 border-green-200',
  'MSS': 'bg-purple-50 text-purple-600 border-purple-200',
}

// 태그 우선순위 정렬
const TAG_PRIORITY = [
  // 행사형 태그 우선
  '전시/로드쇼', '교육/세미나', '투자/IR', '데모데이/피칭',
  // 수출/글로벌
  '수출/해외진출',
  // 대상
  '중소기업', '소상공인', '창업/스타트업', '예비창업',
  // 소스
  '기업마당', 'K-Startup', 'MSS',
]

const getTagColor = (tag) => TAG_COLORS[tag] || 'bg-gray-100 text-gray-600 border-gray-200'

const sortTags = (tags) => {
  return [...tags].sort((a, b) => {
    const aIdx = TAG_PRIORITY.indexOf(a)
    const bIdx = TAG_PRIORITY.indexOf(b)
    if (aIdx === -1 && bIdx === -1) return 0
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })
}

/**
 * 접을 수 있는 태그 배지 컴포넌트
 * - 기본: 모든 태그 표시
 * - 2줄 초과 시 접기 모드로 전환
 * - +N 칩에 hover 시 숨겨진 태그 목록 표시
 */
export function CollapsibleTags({ tags, maxLines = 2, className = '' }) {
  const containerRef = useRef(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [visibleCount, setVisibleCount] = useState(tags?.length || 0)
  const [measured, setMeasured] = useState(false)

  // 태그 정렬 (useMemo로 안정화)
  const sortedTags = useMemo(() => tags ? sortTags(tags) : [], [tags])
  const sortedTagsLength = sortedTags.length

  // 줄 수 측정 및 접기 여부 결정
  const measureAndCollapse = useCallback(() => {
    if (!containerRef.current || sortedTagsLength === 0) return

    const container = containerRef.current
    const lineHeight = 28 // 태그 높이 + gap 예상값
    const maxHeightValue = lineHeight * maxLines + 4 // 여유값

    // 모든 태그를 보여준 상태에서 높이 측정
    const actualHeight = container.scrollHeight

    if (actualHeight > maxHeightValue) {
      // 접기 모드 필요
      // 보여줄 태그 개수 결정 (이진 탐색으로 최적화 가능하지만 간단히 순차 탐색)
      const children = container.children
      let count = 0

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const rect = child.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const relativeTop = rect.top - containerRect.top

        if (relativeTop + rect.height > maxHeightValue - lineHeight) {
          break
        }
        count++
      }

      // 최소 2개, 최대 전체-1개
      const newVisibleCount = Math.max(2, Math.min(count - 1, sortedTagsLength - 1))
      setIsCollapsed(true)
      setVisibleCount(newVisibleCount)
    } else {
      setIsCollapsed(false)
      setVisibleCount(sortedTagsLength)
    }
    setMeasured(true)
  }, [sortedTagsLength, maxLines])

  useEffect(() => {
    // 초기 측정을 requestAnimationFrame으로 지연
    const rafId = requestAnimationFrame(() => {
      measureAndCollapse()
    })

    const handleResize = () => {
      setMeasured(false)
      setTimeout(measureAndCollapse, 50)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', handleResize)
    }
  }, [measureAndCollapse])

  if (!sortedTags || sortedTags.length === 0) return null

  const displayTags = isCollapsed && measured ? sortedTags.slice(0, visibleCount) : sortedTags
  const hiddenTags = isCollapsed && measured ? sortedTags.slice(visibleCount) : []
  const hiddenCount = hiddenTags.length

  return (
    <div
      ref={containerRef}
      className={`flex flex-wrap gap-1 ${className}`}
      style={{ maxHeight: measured && isCollapsed ? `${28 * maxLines + 4}px` : 'none', overflow: 'hidden' }}
    >
      {displayTags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded border ${getTagColor(tag)} max-w-full whitespace-nowrap overflow-hidden text-ellipsis`}
          title={tag}
        >
          {tag}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span
          className="inline-flex items-center text-xs px-1.5 py-0.5 rounded border bg-gray-50 text-gray-500 border-gray-200 cursor-help min-w-[32px] justify-center"
          title={`숨김 태그: ${hiddenTags.join(', ')}`}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { TAG_COLORS, getTagColor, sortTags }
