import { useParams, Link } from 'react-router-dom'
import { useDocumentStore } from '../stores/useDocumentStore'
import { ArrowLeft, Save, Sparkles } from 'lucide-react'

const sectionLabels = {
  overview: { title: '사업 개요', hint: '사업의 핵심 내용과 목표를 설명하세요' },
  problem: { title: '문제 정의', hint: '해결하고자 하는 문제와 그 중요성을 설명하세요' },
  solution: { title: '솔루션', hint: '제안하는 해결책과 기술적 접근을 설명하세요' },
  market: { title: '시장 분석', hint: '목표 시장의 규모와 성장 가능성을 분석하세요' },
  team: { title: '팀 구성', hint: '팀원의 역량과 역할 분담을 설명하세요' },
  budget: { title: '예산 계획', hint: '자금 사용 계획과 항목별 예산을 작성하세요' },
  timeline: { title: '추진 일정', hint: '단계별 목표와 일정을 제시하세요' },
}

export function EditorPage() {
  const { docId } = useParams()
  const { documents, currentDocument, setCurrentDocument, updateSection } = useDocumentStore()

  // 현재 문서 설정
  if (!currentDocument || currentDocument.id !== docId) {
    const doc = documents.find((d) => d.id === docId)
    if (doc) {
      setCurrentDocument(docId)
    }
  }

  if (!currentDocument) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">문서를 찾을 수 없습니다</p>
        <Link to="/documents" className="text-blue-600 hover:underline">
          문서 목록으로 돌아가기
        </Link>
      </div>
    )
  }

  const handleSectionChange = (key, value) => {
    updateSection(docId, key, value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/documents"
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">
            {currentDocument.programTitle}
          </h2>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <Save size={18} />
          저장
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(sectionLabels).map(([key, { title, hint }]) => (
            <div key={key} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{hint}</p>
                </div>
                <button className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200 transition-colors">
                  <Sparkles size={12} />
                  AI 제안
                </button>
              </div>
              <textarea
                value={currentDocument.sections[key] || ''}
                onChange={(e) => handleSectionChange(key, e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                placeholder={`${title} 내용을 입력하세요...`}
              />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 sticky top-24">
            <h3 className="font-semibold text-blue-900 mb-3">작성 가이드</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• 구체적인 수치와 데이터를 활용하세요</li>
              <li>• 차별화 포인트를 명확히 제시하세요</li>
              <li>• 실현 가능한 목표를 설정하세요</li>
              <li>• 심사 기준에 맞춰 작성하세요</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">작성 현황</h3>
            <div className="space-y-2">
              {Object.entries(sectionLabels).map(([key, { title }]) => {
                const filled = currentDocument.sections[key]?.length > 0
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        filled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className={filled ? 'text-gray-900' : 'text-gray-400'}>
                      {title}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
