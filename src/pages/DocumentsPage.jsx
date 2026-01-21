import { Link } from 'react-router-dom'
import { useDocumentStore } from '../stores/useDocumentStore'
import { FileText, Plus, Trash2, Clock } from 'lucide-react'

export function DocumentsPage() {
  const { documents, deleteDocument, createDocument } = useDocumentStore()

  const handleCreateNew = () => {
    const newDoc = createDocument('temp', '새 문서')
    // 실제로는 지원사업 선택 후 생성
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">작성 문서</h2>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={18} />
          새 문서
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">작성된 문서가 없습니다</p>
          <Link
            to="/search"
            className="text-blue-600 hover:underline font-medium"
          >
            지원사업 검색하러 가기
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-gray-900">{doc.programTitle}</h3>
                <button
                  onClick={() => deleteDocument(doc.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                <Clock size={12} />
                {new Date(doc.updatedAt).toLocaleDateString('ko-KR')}
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/editor/${doc.id}`}
                  className="flex-1 text-center bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  편집
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
