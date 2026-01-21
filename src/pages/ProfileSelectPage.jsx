import { useNavigate } from 'react-router-dom'
import { useProfileStore, COMPANY_TYPES, INTERESTS } from '../stores/useProfileStore'
import { User, Plus, ArrowRight, Building2, Tag } from 'lucide-react'

export function ProfileSelectPage() {
  const navigate = useNavigate()
  const { profiles, login, addProfile } = useProfileStore()

  const handleSelectProfile = (profileId) => {
    login(profileId)
    navigate('/')
  }

  const handleCreateProfile = () => {
    const newProfile = addProfile(`프로필 ${profiles.length + 1}`)
    login(newProfile.id)
    navigate('/profile')
  }

  const getCompanyTypeLabel = (value) => {
    return COMPANY_TYPES.find((t) => t.value === value)?.label || ''
  }

  const getInterestLabels = (interests) => {
    if (!interests || interests.length === 0) return []
    return interests.slice(0, 3).map((i) => INTERESTS.find((int) => int.value === i)?.label || i)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <User size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            정부지원사업 어시스턴트
          </h1>
          <p className="text-gray-600">
            프로필을 선택하여 맞춤형 지원사업을 찾아보세요
          </p>
        </div>

        {profiles.length > 0 ? (
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">저장된 프로필</h2>
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleSelectProfile(profile.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-lg font-bold">
                      {profile.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {profile.name || '이름 없음'}
                      </h3>
                      {profile.serviceName && (
                        <p className="text-sm text-gray-600 mb-2 truncate">
                          {profile.serviceName}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {profile.companyType && (
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            <Building2 size={12} />
                            {getCompanyTypeLabel(profile.companyType)}
                          </span>
                        )}
                        {getInterestLabels(profile.interests).map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded"
                          >
                            <Tag size={12} />
                            {label}
                          </span>
                        ))}
                        {profile.interests?.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{profile.interests.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    시작
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              아직 프로필이 없습니다
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              새 프로필을 만들어 맞춤형 지원사업을 찾아보세요
            </p>
          </div>
        )}

        <button
          onClick={handleCreateProfile}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          새 프로필 만들기
        </button>

        <p className="text-center text-xs text-gray-500 mt-6">
          프로필 정보는 브라우저에 안전하게 저장됩니다
        </p>
      </div>
    </div>
  )
}
