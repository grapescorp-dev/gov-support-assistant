# Gov Support Assistant

정부지원사업 공고 탐색 및 분석을 돕는 웹 프로젝트입니다.
Frontend는 **Vite** 기반이며, 서버리스 로직은 **Netlify Functions**(`netlify/functions`)로 구성되어 있습니다.

---

## Repository
- GitHub: https://github.com/grapescorp-dev/gov-support-assistant

---

## Requirements
- OS: Windows / macOS / Linux
- Node.js: **LTS 권장 (최소 Node 18 이상)**
- npm (Node 설치 시 포함)

> 팀에서 Node 버전을 고정하려면 `.nvmrc` 또는 `package.json`의 `engines` 설정을 추가하는 것을 권장합니다.

---

## Project Structure
- `src/` : Frontend 소스 코드
- `public/` : 정적 파일
- `netlify/functions/` : Netlify Functions (서버리스 함수)
- `.env.example` : 환경변수 템플릿 (값 없음)
- `.env` : 로컬 전용 환경변수 (**GitHub 커밋 금지**)

---

## Setup (최초 1회)

### 1. Clone repository
```powershell
git clone https://github.com/grapescorp-dev/gov-support-assistant.git
cd gov-support-assistant
```
> git clone은 프로젝트를 처음 한 번만 내 컴퓨터로 복사하는 명령입니다.
처음 clone 이후에는 git pull을 따로 할 필요가 없습니다.

### 2. Install dependencies
```
npm install
```

### 3. Create .env
.env.example을 복사하여 .env 파일을 만들고, 필요한 값을 입력하세요.

Windows (PowerShell)
```powershell
Copy-Item .env.example .env
notepad .env
```

macOS / Linux (bash, zsh)
```bash
cp .env.example .env
nano .env
```
> 값이 아직 없다면 비워둔 채로 저장해도 됩니다.

---

## Run (Recommended: Frontend + Netlify Functions)
Frontend와 Netlify Functions를 함께 실행하는 권장 방식입니다.

### 1. Install Netlify CLI (최초 1회)
```powershell
npm install -g netlify-cli
```

### 2. Start development server
```powershell
netlify dev
```

- Netlify Dev가 프론트엔드와 Functions를 함께 실행합니다.
- Functions 소스 코드는 netlify/functions에서 관리합니다.

---

## Build
```powershell
npm run build
```

---

## Environment Variables
- .env 파일은 로컬에서만 사용하며 GitHub에 커밋하지 않습니다.
- 공유가 필요한 환경변수는 .env.example에 변수 이름만 추가합니다.

---

## Collaboration Workflow
- dev : 다 같이 쓰는 공용 연습장
- feat/* : 혼자 작업하는 개인 연습장
- main : 최종 정리/배포용 (직접 작업하지 않음)

기본 규칙 :
- 모든 작업은 dev 기준으로 진행합니다.
- 개인 작업은 반드시 feat/* 브랜치에서 합니다.
- 작업이 끝나면 dev로 합쳐달라는 요청(PR)을 보냅니다.

---

## Branch workflow (기본 예시)
```powershell
git checkout dev
git pull
git checkout -b feat/<short-feature-name > -> 작업 명을 의미

git add .
git commit -m "feat: <short message>"
git push -u origin feat/<short-feature-name>
```

---

## Practice: 개인 연습장(feat) → 공용 연습장(dev) 연습
아래는 실제 협업과 동일한 흐름을 연습하기 위한 가이드입니다.

---
### Step 1. dev 브랜치로 이동
```powershell
git checkout dev
git pull
```
현재 브런치 확인:
```powershell
git branch --show-current
```
출력이 dev이면 정상입니다.

---

### Step 2. 개인 연습장(feat 브랜치) 만들기
```powershell
git checkout -b feat/readme-practice
```
출력이 feat/readme-practice이면
→ 지금부터 이 브랜치는 개인 연습장입니다.

---

### Step 3. README 수정 (연습)
README.md 파일에 연습용 문장 한 줄 추가:
```powershell
<!-- practice: working on feat branch -->
```
저장

---

### Step 4. 개인 연습장에 커밋
```powershell
git status
git add README.md
git commit -m "docs: practice on feat branch" -> 예시
```
이 커밋은 feat 브랜치에만 존재합니다.

---

### Step 5. dev에는 아직 반영되지 않았는지 확인
```powershell
git checkout dev
git log --oneline -3
```
방금 커밋이 보이지 않으면 정상입니다.

---

### Step 6. 개인 연습장을 dev로 옮기기
```powershell
git merge feat/readme-practice
```

---

### Step 7. dev에 반영됐는지 확인
```powershell
git log --oneline -3
```
방금 커밋이 보이면 성공입니다.

---

### Step 8. 연습용 브랜치 삭제 (선택)
```powershell
git branch -d feat/readme-practice
```

---

### 요약 (한 줄)

- 연습은 feat/*에서
- 괜찮으면 dev로 옮긴다
- main은 마지막에만 사용한다

---

## Troubleshooting
.env 파일이 없거나 값이 비어 있는 경우
- 외부 API 호출 또는 분석 기능이 실패할 수 있습니다.
- .env.example을 복사하여 .env 파일을 생성하고 값을 입력하세요.

## Netlify Functions가 호출되지 않는 경우
- npm run dev는 프론트엔드만 실행합니다.
- Functions까지 포함하려면 반드시 netlify dev로 실행하세요.

---

## Commit (after updating README)
```powershell
git add README.md
git commit -m "docs: complete README (markdown-lint safe)"
git push
```
