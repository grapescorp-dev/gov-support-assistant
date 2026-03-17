# Gov Support Assistant - 인수인계 문서

> 작성일: 2026-03-15
> 브랜치: dev (메인 개발 브랜치)
> 배포: https://gov-assistant.netlify.app
> 최신 커밋: `c4a098e` refactor: AI 공고 분류에서 프로필 전달 제거 및 비용 최적화

---

## 1. 프로젝트 개요

정부/공공기관 지원사업 공고를 수집하여, 사용자 프로필 기반으로 맞춤형 공고를 매칭해주는 웹 애플리케이션.

### 1-1. 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| 프론트엔드 | React | 19.2.0 |
| 빌드 도구 | Vite | 7.2.4 |
| CSS | Tailwind CSS | 4.1.18 |
| 상태관리 | Zustand (persist) | 5.0.9 |
| 라우팅 | React Router DOM | 7.11.0 |
| 아이콘 | Lucide React | 0.562.0 |
| AI | Anthropic SDK (@anthropic-ai/sdk) | 0.71.2 |
| 백엔드 | Netlify Functions (서버리스) | - |
| 배포 | Netlify | - |

### 1-2. 환경 변수

Netlify 환경 변수에 설정 필요:

```
ANTHROPIC_API_KEY=sk-ant-...  (Anthropic API 키)
```

---

## 2. 프로젝트 구조

```
gov-support-assistant/
├── src/
│   ├── App.jsx                          # 라우팅 (BrowserRouter)
│   ├── main.jsx                         # 엔트리 포인트
│   │
│   ├── pages/
│   │   ├── HomePage.jsx                 # 메인 홈
│   │   ├── ProfilePage.jsx             # 프로필 입력/수정
│   │   ├── ProfileSelectPage.jsx       # 프로필 선택 (로그인)
│   │   ├── SearchPage.jsx              # ★ 핵심: 공고 검색 + AI 매칭
│   │   ├── CalendarPage.jsx            # 공고 캘린더
│   │   ├── DocumentsPage.jsx           # 저장 문서 목록
│   │   └── EditorPage.jsx              # 문서 에디터
│   │
│   ├── components/
│   │   └── common/
│   │       ├── Layout.jsx               # 네비게이션 + 프로필 드롭다운
│   │       └── Toast.jsx                # 토스트 알림
│   │
│   ├── stores/
│   │   ├── useProfileStore.js          # ★ 프로필 상태 (Zustand persist)
│   │   ├── useSearchStore.js           # 검색 상태
│   │   ├── useDocumentStore.js         # 문서 상태
│   │   ├── useBookmarkStore.js         # 북마크 상태
│   │   ├── useFeedbackStore.js         # 피드백 상태
│   │   └── useToastStore.js            # 토스트 상태
│   │
│   ├── api/
│   │   └── announcements.js            # ★ API 호출 + 5종 캐시 시스템
│   │
│   ├── utils/
│   │   ├── matchingScore.js            # ★ 매칭 점수 계산 (규칙 + 하이브리드)
│   │   ├── classificationCache.js      # AI 분류 캐시 (classificationCache)
│   │   ├── getAnnouncementLink.js      # 공고 링크 생성
│   │   ├── stripHtml.js                # HTML 태그 제거
│   │   └── hardFilterDebug.js          # 하드필터 디버그 유틸
│   │
│   ├── constants/
│   │   └── microcopy.js                # UI 문구 상수
│   │
│   └── data/
│       └── mockAnnouncements.js        # 개발용 목업 데이터
│
├── netlify/functions/                   # ★ Netlify 서버리스 함수
│   ├── fetchAnnouncements.js            # 기업마당/K-Startup/MSS API에서 공고 수집
│   ├── search.js                        # 공고 검색
│   ├── classifyAnnouncement.js          # AI 공고 분류 (단건)
│   ├── classifyAnnouncementBatch.js     # AI 공고 분류 (배치, 10개씩)
│   ├── analyze.js                       # AI 공고 맞춤 분석 (Sonnet)
│   ├── summarize.js                     # AI 문서 기반 요약 (MSS 공고)
│   ├── parseMssDocs.js                  # MSS 문서 파싱
│   └── suggest.js                       # AI 작성 제안
│
└── package.json
```

---

## 3. 라우팅 구조

| 경로 | 컴포넌트 | 인증 필요 | 설명 |
|------|----------|:---------:|------|
| `/` | HomePage | ❌ | 메인 홈 |
| `/profile` | ProfilePage | ❌ | 프로필 입력/수정 |
| `/profile/select` | ProfileSelectPage | ❌ | 프로필 선택 (로그인) |
| `/search` | SearchPage | ✅ | 공고 검색 + AI 매칭 |
| `/calendar` | CalendarPage | ✅ | 공고 캘린더 |
| `/documents` | DocumentsPage | ✅ | 저장 문서 목록 |
| `/editor/:docId` | EditorPage | ✅ | 문서 에디터 |

인증: `useProfileStore.isLoggedIn`이 false이면 `/profile/select`로 리다이렉트

---

## 4. 프로필 데이터 모델

`useProfileStore.js`에서 관리 (localStorage `user-profiles` 키로 persist)

### 4-1. 프로필 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | `profile-${Date.now()}` 자동 생성 |
| name | string | 프로필 이름 |
| serviceName | string | 서비스명 |
| businessOverview | string | 사업 개요 (자유 텍스트) |
| targetMarket | string | 타겟 시장 (자유 텍스트) |
| companyType | string | 기업형태 |
| businessAge | string | 업력 |
| region | string | 지역 (시/도) |
| subRegion | string | 서울시 구 단위 |
| revenue | string | 매출 규모 |
| employees | string | 직원 수 |
| certifications | string[] | 보유 인증 |
| investmentStage | string | 투자 단계 |
| interests | string[] | 관심 분야 |
| excludedInterests | string[] | 제외 관심 분야 |

### 4-2. 선택지 상수

- **COMPANY_TYPES**: preliminary, sole, sme, midsize, nonprofit
- **BUSINESS_AGES**: preliminary, under1, 1to3, 3to7, over7
- **REGIONS**: 17개 시/도 (seoul, gyeonggi, incheon, ...)
- **SEOUL_DISTRICTS**: 25개 서울시 구
- **REVENUES**: none, under1, 1to10, 10to50, over50
- **EMPLOYEES**: none, 1to5, 5to10, 10to50, over50
- **CERTIFICATIONS**: venture, innobiz, mainbiz, research, patent
- **INVESTMENT_STAGES**: none, seed, seriesA, seriesB
- **INTERESTS**: 17개 항목 (3그룹: 기술 5, 산업 9, 지원유형 3)
- **EXCLUDED_INTEREST_OPTIONS**: 10개 항목 (제외할 분야)

---

## 5. 핵심 로직: 공고 매칭 시스템

### 5-1. 전체 흐름

```
사용자가 프로필 저장 후 /search 진입
│
├── ① 공고 로드: searchAnnouncements() → 300개 공고 가져옴
│
├── ② AI 분류 (최초 1회, 비용 발생):
│   ├── getCachedClassifications() → 캐시 확인 (classificationCache)
│   ├── 캐시 미스 → classifyAnnouncementsBatch() → Haiku API 호출 (10개씩 배치)
│   ├── AI가 각 공고에 라벨 부착: primaryIndustry, targetType, isGeneralProgram 등
│   └── 결과를 캐시에 저장 (7일)
│
├── ③ 매칭 점수 계산 (클라이언트, useMemo):
│   ├── checkEligibility() → 하드필터 (기업형태, 지역, 업력 등)
│   ├── calculateMatchingScore() → 규칙 기반 점수 (100점 만점)
│   ├── calculateHybridMatchingScore() → AI 분류 결과로 점수 조정 (+5 ~ -50)
│   └── AI hardPass 오버라이드 (교육생/운영사 등 강한 불일치 → 제외)
│
└── ④ 추천 공고 노출:
    └── eligible + matchingScore >= 30 + hardPass !== false
```

### 5-2. AI 분류 결과 구조

AI(Haiku)가 각 공고에 부여하는 라벨:

```json
{
  "announcementId": "1064353",
  "primaryIndustry": "ai_data",
  "secondaryIndustry": "ict_sw",
  "confidence": 85,
  "isGeneralProgram": false,
  "targetType": "startup"
}
```

- `primaryIndustry`: 주 산업 분야 (ai_data, bio_healthcare, tourism, general_startup 등)
- `targetType`: 대상 유형 (startup, sme, operator, education, equipment)
- `isGeneralProgram`: 분야 무관 범용 프로그램 여부

### 5-3. 매칭 점수 배분 (100점 만점)

| 항목 | 최대 점수 | 사용 프로필 값 |
|------|:---------:|---------------|
| 관심분야 매칭 | 30점 | interests |
| 서비스 키워드 매칭 | 20점 | serviceName, businessOverview |
| 도메인 키워드 매칭 | 15점 | targetMarket |
| 기업형태 매칭 | 15점 | companyType |
| 지역 매칭 | 10점 | region, subRegion |
| 인증 보너스 | 10점 | certifications |
| **AI 조정** | **+5 ~ -50** | **classification vs interests** |

### 5-4. AI 점수 조정 상세

`adjustScoreByClassification()` (matchingScore.js):

| 매칭 결과 | 조정 | 예시 |
|-----------|------|------|
| primary 매칭 | +5점 | 프로필 interests=['AI'] + 공고='ai_data' |
| secondary 매칭 | 0점 | 부 분야만 매칭 |
| 범용 프로그램 | 0점 | isGeneralProgram=true |
| target_mismatch | -50점 | 운영사/교육생/장비 모집 |
| industry_mismatch | -45점 | 디지털 프로필 vs 수산업 공고 |
| weak_mismatch | -25점 | 그 외 불일치 |

### 5-5. 하드필터 시스템

`checkEligibility()` → `buildHardRequirements()`:

- **P0 (최우선)**: 기업형태 불일치 (법인 전용 vs 개인사업자)
- **P1 (높음)**: 지역 제한 (특정 지자체 전용)
- **P2 (보통)**: 업력 제한, 매출/인원 조건
- **P3 (낮음)**: 인증 조건
- **P4 (참고)**: 기타

confidence 레벨: high(80+) / medium(60~79) / low(60 미만)

### 5-6. 매칭 로직의 핵심 특성

**현재 구조:**
```
AI의 역할 = "이 공고가 어떤 분야인지" 라벨링 (1회, 프로필 무관)
매칭의 역할 = "이 라벨이 내 프로필과 맞는지" 비교 (프로필 변경 시마다 재계산)
```

- AI는 **공고 분류기**이지 **프로필-공고 매칭기**가 아님
- 프로필이 바뀌면 규칙 기반 점수 + 하드필터만 재계산 (useMemo, 비용 0원)
- AI 분류 결과는 캐시에서 재사용 (프로필별로 AI를 재호출하지 않음)
- `businessOverview`, `targetMarket`은 규칙 기반 키워드 매칭에서 일부 사용되지만, AI가 이 값을 읽고 맞춤 판단하지는 않음

---

## 6. 캐시 시스템 (5종)

모든 캐시는 localStorage 기반.

| 캐시 | 파일 | 키 패턴 | TTL | 용도 |
|------|------|---------|-----|------|
| classificationCache | classificationCache.js | `gov-assistant-ai-cache-v1` (JSON 객체) | 7일 | AI 분류 결과 (프로필 무관) |
| industryClassCache | announcements.js | `industryClass:{source}:{id}` | 7일 | API 레벨 AI 분류 캐시 |
| analysisCache | announcements.js | `analysisCache:{공고ID}:{프로필ID}` | 24시간 | AI 맞춤 분석 (프로필별) |
| hardFilterCache | announcements.js | `hfCache:{source}:{id}:{updatedAt}` | 통과 7일 / 실패 6시간 | 하드필터 결과 |
| docSummaryCache | announcements.js | `docSummary:{id}` | 7일 | MSS 문서 요약 |

### 6-1. 캐시 무효화

- **프로필 수정 시**: `clearAnalysisCacheForProfile(profileId)` → analysisCache만 삭제
- **classificationCache와 industryClassCache는 프로필 수정 시 삭제하지 않음** (공고 분류는 프로필 무관이라는 설계 의도)

### 6-2. 디버그용 콘솔 함수

```javascript
window.govAssistantCache.stats()   // classificationCache 통계
window.govAssistantCache.clear()   // classificationCache 초기화
```

---

## 7. Netlify 함수 (서버리스 API)

### 7-1. AI 모델 사용 현황

| 함수 | 모델 | 용도 |
|------|------|------|
| classifyAnnouncement.js | `claude-haiku-4-5-20251001` | 공고 단건 분류 |
| classifyAnnouncementBatch.js | `claude-haiku-4-5-20251001` | 공고 배치 분류 (10개씩) |
| summarize.js | `claude-haiku-4-5-20251001` | MSS 문서 요약 |
| analyze.js | `claude-sonnet-4-20250514` | 공고 맞춤 분석 (상세) |

### 7-2. Fallback 체인 (AI 분류)

```
1차: classifyAnnouncementBatch → 배치 API (10개씩)
  ↓ 실패 시
2차: classifyBatchFallback → 개별 classifyAnnouncement (1개씩)
  ↓ 실패 시
3차: classifyByKeywords → 키워드 기반 분류 (API 호출 없음)
```

### 7-3. 공고 데이터 소스

| 소스 | 식별자 | API |
|------|--------|-----|
| 기업마당 (BizInfo) | `bizinfo` | 기업마당 공공 API |
| K-Startup | `kstartup` | K-Startup API |
| 중소벤처기업부 | `mss_api` | MSS API |

---

## 8. 최근 해결한 이슈

### 8-1. 500 에러: AI 모델 퇴직 (2026-02-19)

**증상:** 공고 검색 시 AI 분류 진행률이 0/300에서 멈추고, 콘솔에 500 Internal Server Error 반복

**원인:** `claude-3-5-haiku-20241022` 모델이 2026년 2월 19일부로 퇴직(retired)

**해결:**
- 커밋 `9079e48`: 3개 파일의 모델명을 `claude-haiku-4-5-20250929`로 변경 (이 모델명도 잘못됨)
- 커밋 `7f0dd7d`: 정확한 모델명 `claude-haiku-4-5-20251001`로 재수정
  - `20250929`는 Sonnet 4.5의 스냅샷 날짜
  - `20251001`이 Haiku 4.5의 정확한 스냅샷 날짜
- 참고: https://platform.claude.com/docs/en/about-claude/models/overview

### 8-2. 프로필 전달 구조 정리

**변경 전** (커밋 `e4932db` ~ `a67380f`):
- AI 분류 시 프로필 데이터(businessOverview, targetMarket)를 함께 전달
- `classifyAnnouncementsBatch`에 `hasProfile` 분기로 캐시 스킵 로직 존재
- 하지만 `getCachedClassifications`가 먼저 캐시 히트하여 실제로 도달하지 않는 죽은 코드

**변경 후** (커밋 `c4a098e`):
- AI 분류 함수에서 프로필 전달 로직 완전 제거
- `classifyAnnouncement`, `classifyAnnouncementsBatch` → 프로필 파라미터 없음
- `classifyBatchFallback` → profileData 파라미터 없음
- 설계 의도 명확화: "AI는 공고 분류만, 프로필 매칭은 로컬에서"

---

## 9. 알려진 구조적 한계

### 9-1. AI가 프로필을 직접 분석하여 매칭하지 않음

현재 AI는 공고에 산업 분류 라벨만 붙이고, 프로필과의 매칭은 규칙 기반(문자열 비교)으로 처리합니다.

```
현재: AI가 공고 라벨링 → 라벨 vs 프로필을 "규칙 기반 비교"
이상: AI가 "이 프로필의 이 사업에게 이 공고가 적합한지" 직접 판단
```

사용자가 `businessOverview`에 아무리 상세히 사업을 설명해도, AI가 이를 읽고 공고와 매칭하지 않습니다.

### 9-2. 개선 방향 (논의됨, 미구현)

비용과 품질을 절충하는 2단계 방식:

```
[1단계] AI 공고 분류 (현재와 동일, 1회) → API 30건
[2단계] AI 프로필 매칭 (1단계 후보만 대상) → API ~8건 추가
   → 1단계에서 명확한 불일치 제외 후 남은 후보만 AI에게 프로필 매칭 요청
   → businessOverview, targetMarket을 AI가 직접 읽고 적합성 판단
```

### 9-3. classificationCache와 industryClassCache 중복

동일 데이터가 두 캐시에 저장됩니다:
- `classificationCache` (classificationCache.js): JSON 객체 하나에 모든 분류 저장
- `industryClassCache` (announcements.js): 공고별 개별 키로 저장

`classificationCache`가 항상 먼저 히트하므로 `industryClassCache`는 사실상 백업 역할.

### 9-4. SPA 내 이동 시 AI 재분류 미실행

프로필 변경 후 /search로 돌아올 때:
- `results.length > 0` (Zustand에 남아있음) → `handleSearch` 미호출 → `runHybridClassification` 미실행
- 매칭 점수는 `useMemo`가 `activeProfile` 변경 감지하여 자동 재계산됨
- AI 분류는 이전 결과 그대로 사용 (공고 자체의 분류는 변하지 않으므로 문제없음)

---

## 10. Git 브랜치 구조

| 브랜치 | 용도 | 상태 |
|--------|------|------|
| `dev` | 개발 메인 | ★ 활성 |
| `main` | 프로덕션 | dev에서 병합 |
| `feat/readme-practice` | 연습용 | 비활성 |
| `sleepy-noether` | worktree (프로필 UX) | 비활성 |
| `claude/wonderful-dirac` | worktree | 비활성 |

배포: `dev` → `origin/dev` push 시 Netlify 자동 배포

---

## 11. 주요 파일별 역할 요약

### 프론트엔드 핵심 (가장 자주 수정하는 파일)

| 파일 | 코드량 | 핵심 역할 |
|------|--------|-----------|
| `SearchPage.jsx` | ~1000줄 | 공고 검색, AI 분류 호출, 매칭 점수 표시, 필터/정렬 |
| `matchingScore.js` | ~4300줄 | 규칙 기반 점수, 하드필터, 하이브리드 매칭, 지역 추출 |
| `announcements.js` | ~1080줄 | API 호출, 5종 캐시 시스템, AI 분류 배치 처리 |
| `useProfileStore.js` | ~370줄 | 프로필 CRUD, 상수 정의 |
| `Layout.jsx` | ~150줄 | 네비게이션, 프로필 드롭다운 |

### 백엔드 핵심

| 파일 | 핵심 역할 |
|------|-----------|
| `classifyAnnouncementBatch.js` | 10개씩 묶어서 Haiku AI 분류 |
| `classifyAnnouncement.js` | 단건 AI 분류 (fallback 용) |
| `fetchAnnouncements.js` | 3개 소스에서 공고 수집 |
| `analyze.js` | Sonnet으로 공고 상세 맞춤 분석 |
| `summarize.js` | Haiku로 MSS 문서 요약 |

---

## 12. 비용 구조

### 12-1. AI API 비용

| 모델 | 용도 | Input | Output | 호출 시점 |
|------|------|-------|--------|-----------|
| claude-haiku-4-5-20251001 | 공고 분류 | $1/MTok | $5/MTok | 최초 검색 1회 (30 batches) |
| claude-haiku-4-5-20251001 | 문서 요약 | $1/MTok | $5/MTok | MSS 공고 상세 보기 시 |
| claude-sonnet-4-20250514 | 맞춤 분석 | $3/MTok | $15/MTok | 사용자가 "AI 분석" 버튼 클릭 시 |

### 12-2. 비용 절감 전략

- 공고 분류: 캐시 7일 → 동일 공고 재방문 시 API 호출 0건
- 프로필 변경: 공고 분류 재호출 안 함 → 추가 비용 0원
- 맞춤 분석: 자동 호출 → 수동 버튼 클릭으로 변경 (비용 90% 절감)
- 배치 처리: 1건씩 → 10건씩 묶어서 호출 (API 호출 횟수 90% 감소)

---

## 13. 디버그 팁

### 13-1. 콘솔 로그 패턴

```
[classifyBatch] Cached: 280, Need API: 20         # AI 분류 캐시 히트율
[AI 비용 절감] 캐시 적중: 300개, AI 호출 필요: 0개    # 비용 절감 확인
[SearchPage] 필터에 전달할 프로필: {...}              # 매칭에 사용된 프로필 값
[SearchPage] 필터 결과: {...}                        # 하드필터 결과
[classifyAnnouncement] Classifying: 1064353          # AI 분류 실행
[AnalysisCache] Cleared 5 entries for profile: ...   # 프로필 수정 시 캐시 무효화
```

### 13-2. 캐시 초기화 (개발자 도구)

```javascript
// AI 분류 캐시 초기화 (전체 재분류 필요)
window.govAssistantCache.clear()

// localStorage 전체 확인
Object.keys(localStorage).filter(k => k.startsWith('industryClass:'))
Object.keys(localStorage).filter(k => k.startsWith('analysisCache:'))
Object.keys(localStorage).filter(k => k.startsWith('hfCache:'))
```

### 13-3. Anthropic 모델 퇴직 확인

모델 500 에러 발생 시 → 모델 퇴직 여부 확인:
- https://platform.claude.com/docs/en/about-claude/models/overview
- 현재 사용 중: `claude-haiku-4-5-20251001`, `claude-sonnet-4-20250514`
- `claude-3-5-haiku-20241022`는 2026-02-19 퇴직됨 (이전 모델)

---

## 14. 미해결 과제 / 향후 개선 사항

| 우선순위 | 항목 | 설명 |
|:--------:|------|------|
| 🔴 높음 | AI 프로필 맞춤 매칭 | AI가 프로필의 businessOverview/targetMarket을 읽고 공고별 적합성 직접 판단 (2단계 방식) |
| 🟡 중간 | 캐시 시스템 통합 | classificationCache와 industryClassCache 중복 제거 |
| 🟡 중간 | 프로필 변경 시 자동 재검색 | SPA 이동 시 프로필 변경 감지하여 AI 재분류 트리거 |
| 🟠 낮음 | AI 오버라이드 양방향화 | 현재 AI→하드필터 단방향만 존재, 반대 방향 추가 고려 |
| 🟠 낮음 | 프로필 입력 최소 요구사항 | 최소 interests 입력 없이 매칭 시 품질 저하 안내 |
