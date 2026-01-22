# Gov Support Assistant

정부지원사업 공고 탐색 및 분석을 돕는 웹 프로젝트입니다.  
Frontend는 **Vite** 기반이며, 서버리스 로직은 **Netlify Functions**(`netlify/functions`)로 구성되어 있습니다.

---

## Repository
- GitHub: https://github.com/<ORG_NAME>/<REPO_NAME>](https://github.com/grapescorp-dev/gov-support-assistant.git

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
### 2. Install dependencies
npm install

### 3. Create .env
.env.example을 복사하여 .env 파일을 만들고, 필요한 값을 입력하세요.
```powershell
Copy-Item .env.example .env
notepad .env
```
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
- dev 브랜치를 기준으로 개발합니다.
- 기능 단위로 브랜치를 생성한 뒤 Pull Request(PR)로 dev에 병합합니다.
- main 브랜치는 안정/배포용 브랜치로 유지합니다.

## Branch workflow example
```powershell
git checkout dev
git pull
git checkout -b feat/<short-feature-name>

git add .
git commit -m "feat: <short message>"
git push -u origin feat/<short-feature-name>
```
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

