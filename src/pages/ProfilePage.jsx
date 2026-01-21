import { useState } from 'react'
import {
  useProfileStore,
  COMPANY_TYPES,
  BUSINESS_AGES,
  REGIONS,
  REVENUES,
  EMPLOYEES,
  CERTIFICATIONS,
  INVESTMENT_STAGES,
  INTERESTS,
} from '../stores/useProfileStore'
import { useToastStore } from '../stores/useToastStore'
import {
  Save,
  Trash2,
  Building2,
  Users,
  Award,
  Target,
  Briefcase,
  Plus,
  Check,
  Edit3,
  X,
} from 'lucide-react'

// 재사용 가능한 Select 컴포넌트
function SelectField({ label, name, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        <option value="">{placeholder || `${label} 선택`}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// 재사용 가능한 Checkbox Group 컴포넌트
function CheckboxGroup({ label, options, selectedValues = [], onToggle }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selectedValues.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 섹션 헤더 컴포넌트
function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="text-blue-600" size={20} />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  )
}

// 프로필 카드 컴포넌트
function ProfileCard({ profile, isActive, onSelect, onDelete, onRename }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(profile.name)

  const handleRename = () => {
    if (editName.trim()) {
      onRename(profile.id, editName.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={() => onSelect(profile.id)}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <Check size={14} className="text-white" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
              />
              <button
                onClick={handleRename}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900 truncate">{profile.name}</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditName(profile.name)
                  setIsEditing(true)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <Edit3 size={14} />
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1 truncate">
            {profile.serviceName || '서비스명 미설정'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(profile.updatedAt).toLocaleDateString('ko-KR')} 수정
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(profile.id)
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* 관심분야 태그 */}
      {profile.interests && profile.interests.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {profile.interests.slice(0, 3).map((interest) => (
            <span
              key={interest}
              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
            >
              {interest}
            </span>
          ))}
          {profile.interests.length > 3 && (
            <span className="text-xs text-gray-400">+{profile.interests.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}

export function ProfilePage() {
  const {
    profiles,
    activeProfileId,
    getActiveProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    toggleCertification,
    toggleInterest,
  } = useProfileStore()

  const { success, error } = useToastStore()

  const activeProfile = getActiveProfile()

  const handleChange = (e) => {
    const { name, value } = e.target
    if (activeProfileId) {
      updateProfile(activeProfileId, { [name]: value })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (activeProfile) {
      success('프로필이 저장되었습니다')
    }
  }

  const handleAddProfile = () => {
    const newProfile = addProfile(`프로필 ${profiles.length + 1}`)
    setActiveProfile(newProfile.id)
    success('새 프로필이 추가되었습니다')
  }

  const handleDeleteProfile = (id) => {
    if (profiles.length === 1) {
      error('최소 하나의 프로필이 필요합니다')
      return
    }
    if (window.confirm('이 프로필을 삭제하시겠습니까?')) {
      deleteProfile(id)
      success('프로필이 삭제되었습니다')
    }
  }

  const handleRenameProfile = (id, newName) => {
    updateProfile(id, { name: newName })
    success('프로필 이름이 변경되었습니다')
  }

  // 프로필 완성도 계산
  const calculateProgress = () => {
    if (!activeProfile) return 0
    const fields = [
      activeProfile.serviceName,
      activeProfile.companyType,
      activeProfile.businessAge,
      activeProfile.region,
      activeProfile.revenue,
      activeProfile.employees,
      activeProfile.businessOverview,
    ]
    const filledFields = fields.filter((f) => f && f.length > 0).length
    const hasInterests = activeProfile.interests && activeProfile.interests.length > 0
    const total = fields.length + 1
    const filled = filledFields + (hasInterests ? 1 : 0)
    return Math.round((filled / total) * 100)
  }

  const progress = calculateProgress()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">기업 프로필 설정</h2>
        {activeProfile && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">완성도</div>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm font-medium text-blue-600">{progress}%</div>
          </div>
        )}
      </div>

      {/* 프로필 목록 */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">내 프로필 ({profiles.length})</h3>
          <button
            onClick={handleAddProfile}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={16} />
            새 프로필
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-300">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="text-gray-400" size={24} />
            </div>
            <p className="text-gray-500 mb-4">아직 프로필이 없습니다</p>
            <button
              onClick={handleAddProfile}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              첫 프로필 만들기
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isActive={profile.id === activeProfileId}
                onSelect={setActiveProfile}
                onDelete={handleDeleteProfile}
                onRename={handleRenameProfile}
              />
            ))}
            <button
              onClick={handleAddProfile}
              className="p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-600"
            >
              <Plus size={24} />
              <span className="text-sm font-medium">프로필 추가</span>
            </button>
          </div>
        )}
      </section>

      {/* 프로필 편집 폼 */}
      {activeProfile && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 섹션 1: 서비스 정보 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={Briefcase}
              title="서비스 정보"
              description="지원사업 매칭에 사용될 기본 정보입니다"
            />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">서비스명</label>
                <input
                  type="text"
                  name="serviceName"
                  value={activeProfile.serviceName || ''}
                  onChange={handleChange}
                  placeholder="예: AI 기반 음악 추천 플랫폼"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">사업 개요</label>
                <textarea
                  name="businessOverview"
                  value={activeProfile.businessOverview || ''}
                  onChange={handleChange}
                  rows={3}
                  placeholder="사업 아이템의 핵심 내용을 간략히 설명해주세요"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">타겟 시장</label>
                <textarea
                  name="targetMarket"
                  value={activeProfile.targetMarket || ''}
                  onChange={handleChange}
                  rows={2}
                  placeholder="목표 고객과 시장을 설명해주세요"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </section>

          {/* 섹션 2: 기업 기본정보 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={Building2}
              title="기업 기본정보"
              description="기업 형태와 업력에 따라 지원 자격이 달라집니다"
            />
            <div className="grid md:grid-cols-3 gap-4">
              <SelectField
                label="기업 형태"
                name="companyType"
                value={activeProfile.companyType}
                onChange={handleChange}
                options={COMPANY_TYPES}
              />
              <SelectField
                label="업력"
                name="businessAge"
                value={activeProfile.businessAge}
                onChange={handleChange}
                options={BUSINESS_AGES}
              />
              <SelectField
                label="소재지"
                name="region"
                value={activeProfile.region}
                onChange={handleChange}
                options={REGIONS}
              />
            </div>
          </section>

          {/* 섹션 3: 사업 규모 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={Users}
              title="사업 규모"
              description="매출과 인력 규모에 따른 지원사업을 찾을 수 있습니다"
            />
            <div className="grid md:grid-cols-2 gap-4">
              <SelectField
                label="연 매출 규모"
                name="revenue"
                value={activeProfile.revenue}
                onChange={handleChange}
                options={REVENUES}
              />
              <SelectField
                label="고용 인원"
                name="employees"
                value={activeProfile.employees}
                onChange={handleChange}
                options={EMPLOYEES}
              />
            </div>
          </section>

          {/* 섹션 4: 인증 및 투자 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={Award}
              title="인증 및 투자"
              description="보유 인증과 투자 이력을 선택해주세요"
            />
            <div className="space-y-5">
              <CheckboxGroup
                label="보유 인증 (다중 선택 가능)"
                options={CERTIFICATIONS}
                selectedValues={activeProfile.certifications}
                onToggle={toggleCertification}
              />
              <SelectField
                label="투자 유치 이력"
                name="investmentStage"
                value={activeProfile.investmentStage}
                onChange={handleChange}
                options={INVESTMENT_STAGES}
              />
            </div>
          </section>

          {/* 섹션 5: 관심 분야 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={Target}
              title="관심 분야"
              description="관심 있는 지원사업 분야를 선택해주세요"
            />
            <CheckboxGroup
              label="분야 선택 (다중 선택 가능)"
              options={INTERESTS}
              selectedValues={activeProfile.interests}
              onToggle={toggleInterest}
            />
          </section>

          {/* 저장 버튼 */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Save size={18} />
              프로필 저장
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
