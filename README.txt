이 프로젝트는 기존 index.html을 '내비게이션 주제(뷰)별 HTML'로 분리한 버전입니다.

구조
- index.html : 공통 레이아웃 + 부트스트랩(views/*.html 로딩 후 app.js 로딩)
- app.js      : 기존 index.html의 <script> 내용을 그대로 분리한 파일
- views/*.html: v-home, v-mnist ... 각 뷰(div.view)만 담긴 HTML 조각

주의
- 브라우저에서 file:// 로 직접 열면 fetch가 막혀 화면이 안 뜰 수 있습니다.
  로컬 서버(예: VSCode Live Server, python -m http.server)로 여세요.
