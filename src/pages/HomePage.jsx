import { Link } from 'react-router-dom'
import { User, Search, FileText, ArrowRight } from 'lucide-react'

const features = [
  {
    to: '/profile',
    icon: User,
    title: '프로필 등록',
    description: '서비스 정보를 등록하여 맞춤 지원사업을 추천받으세요',
  },
  {
    to: '/search',
    icon: Search,
    title: '지원사업 검색',
    description: '키워드로 정부 지원사업을 검색하고 AI 분석을 받아보세요',
  },
  {
    to: '/documents',
    icon: FileText,
    title: '문서 작성',
    description: '섹션별 가이드와 함께 지원서를 작성하세요',
  },
]

export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          정부지원사업 매칭 및 작성 지원
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          AI 기반으로 적합한 지원사업을 찾고, 효과적인 지원서 작성을 도와드립니다.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {features.map(({ to, icon: Icon, title, description }) => (
          <Link
            key={to}
            to={to}
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Icon className="text-blue-600" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              {title}
              <ArrowRight
                size={16}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </h3>
            <p className="text-gray-600 text-sm">{description}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
