# Claude Code 단계별 구현 프롬프트

`docs/PRD.md`를 바탕으로 앱을 5단계로 나눠 구현하기 위한 프롬프트입니다.
각 단계의 프롬프트 블록을 그대로 복사해 Claude Code에 붙여 넣으면 됩니다.

## 사용 방법

- **순서대로** 진행하세요. 각 단계는 앞 단계의 결과물에 의존합니다.
- 한 단계가 끝나면 "완료 기준"을 직접 확인한 뒤 다음 단계로 넘어가세요.
- 단계마다 새 대화로 시작해도 됩니다. 프롬프트마다 필요한 맥락이 들어 있습니다.
- 결과가 마음에 들지 않으면 다음 단계로 가기 전에 그 단계 안에서 수정을 요청하세요.

| 단계 | 목표 | 주요 산출물 |
|---|---|---|
| 1 | 핵심 로직과 테스트 | `todo-core.js`, `tests/todo-core.test.js` |
| 2 | 화면 뼈대와 기본 동작 | `index.html`, `app.js`, `style.css`(최소) |
| 3 | 수정·필터·정리 기능 | `app.js` 확장 |
| 4 | 진행률·오류 안내·디자인 | `style.css` 완성, `app.js` 확장 |
| 5 | 브라우저 검증과 마무리 | 수용 기준 점검 결과, `README.md` 갱신 |

---

## 1단계. 핵심 로직과 테스트 (`todo-core.js`)

```text
docs/PRD.md를 읽고, 2부 설계 스펙의 7.2절(todo-core.js), 8절(데이터 모델과 저장), 9절(오류 처리), 11.1절(자동 테스트)을 기준으로 핵심 로직을 구현해 줘.

## 할 일
1. tests/todo-core.test.js를 먼저 작성해. Node 내장 node:test와 node:assert만 사용해.
2. 테스트가 실패하는 것을 확인한 뒤, todo-core.js를 구현해서 테스트를 통과시켜.
3. 구현할 함수: createState, addTodo, updateTodoText, toggleTodo, deleteTodo, clearCompleted, setFilter, getVisibleTodos, getProgress, parseSaved (시그니처와 반환값은 PRD 7.2절 표를 따를 것)

## 지켜야 할 규칙
- 모든 함수는 순수 함수다. 받은 state를 직접 바꾸지 말고 새 객체를 돌려줘.
- 현재 시각(now)과 id는 인자로 받는다. 함수 안에서 Date.now()나 난수를 쓰지 마.
- DOM, window, localStorage를 참조하지 마.
- 파일 끝에서 Node에서는 module.exports로, 브라우저에서는 window.TodoCore로 내보내 (PRD 7.2절 코드 참고). import/export 문법은 쓰지 마.
- 외부 패키지를 설치하지 마. package.json도 만들지 마.

## 반드시 테스트할 경우 (PRD 11.1절)
- addTodo: 앞뒤 공백 제거, 빈 입력 거부, 200자 자르기, lastCategory 갱신, 원래 state 불변
- updateTodoText: 빈 내용이면 기존 유지, 없는 id면 state 그대로
- toggleTodo, deleteTodo: 정상 동작, 없는 id면 state 그대로
- clearCompleted: 미완료 항목만 남음
- setFilter: all/work/personal/study만 허용
- getVisibleTodos: 필터별 결과, 정렬(미완료 → 완료, 각 그룹 안에서 createdAt 내림차순), 완료 해제 시 원래 자리로 복귀
- getProgress: 0개일 때 0%, 반올림(12개 중 7개 → 58%), 카테고리별 집계
- parseSaved: 정상 데이터(ok), null/빈 문자열(empty), 손상된 JSON(corrupt), version이 1이 아님(corrupt), 형식이 틀린 항목만 제거, 잘못된 settings는 기본값(filter "all", lastCategory "work")

## 완료 기준
- node --test tests/ 가 모두 통과한다. 실행 결과를 보여 줘.
- 끝나면 변경 사항을 커밋해 줘. 커밋 메시지: "Add todo core logic with tests"
```

**완료 확인**: `node --test tests/` 결과가 모두 통과(pass)인지 확인합니다.

---

## 2단계. 화면 뼈대와 기본 동작 (추가·체크·삭제·저장)

```text
docs/PRD.md의 7.3절(app.js), 8.3절(저장과 불러오기), 10절(화면 구성)을 기준으로, 1단계에서 만든 todo-core.js를 사용하는 화면을 만들어 줘. 이번 단계는 할 일 추가, 완료 체크, 삭제, 저장·불러오기까지만 구현해.

## 만들 파일
- index.html: style.css, todo-core.js, app.js를 이 순서로 불러와. 스크립트는 일반 <script> 태그로 불러오고 type="module"은 쓰지 마.
- app.js: 화면 그리기와 이벤트 처리
- style.css: 지금은 레이아웃이 깨지지 않을 정도의 최소 스타일만

## 화면 요소 (PRD 10절 와이어프레임 참고)
- 카테고리 선택(업무/개인/공부), 입력창(maxlength="200"), [추가] 버튼
- 할 일 목록: 체크박스, 카테고리 배지(글자 포함), 내용, [삭제] 버튼
- 진행률 영역과 필터 버튼은 자리만 만들어 두고 3~4단계에서 채운다

## 동작 규칙
- 상태 변경은 반드시 "이벤트 → TodoCore 함수로 새 상태 → save() → render()" 흐름으로만 해.
- 목록 이벤트는 목록 컨테이너 하나에 걸고(이벤트 위임) data-id로 항목을 찾아.
- 사용자 입력은 textContent로만 화면에 넣어. innerHTML에 사용자 입력을 절대 넣지 마.
- id는 crypto.randomUUID()로 만들고, 없으면 Date.now()와 Math.random()을 조합해.
- 추가하면 입력창을 비우고 포커스를 유지해. 카테고리 기본값은 settings.lastCategory.
- 삭제는 확인 창 없이 바로 지워.
- localStorage 키는 "todo-app:v1". 시작할 때 TodoCore.parseSaved()로 불러와.
- localStorage 접근은 모두 try/catch로 감싸. (안내 문구는 4단계에서 만든다)

## 완료 기준
- node --test tests/ 가 여전히 모두 통과한다.
- index.html을 서버 없이 file://로 열어서 추가 → 체크 → 삭제 → 새로고침 후 유지가 되는지 확인할 수 있게, 확인 방법을 알려 줘.
- 끝나면 커밋해 줘. 커밋 메시지: "Add basic UI: add, toggle, delete, persist"
```

**완료 확인**: `index.html`을 더블클릭해 열고, 할 일을 추가·체크·삭제한 뒤 새로고침해도 유지되는지 봅니다.

---

## 3단계. 수정·필터·정리 기능

```text
docs/PRD.md 1부의 4.2절(수정), 4.3절(삭제·완료 항목 지우기), 4.5절(카테고리 필터), 4.8절(빈 화면 안내)을 app.js와 index.html에 구현해 줘. 로직은 이미 todo-core.js에 있으니 새 로직이 필요하면 todo-core.js에 순수 함수로 추가하고 테스트도 함께 추가해.

## 1) 인라인 수정
- 내용을 더블클릭하거나 [수정] 버튼을 누르면 그 자리에서 입력창으로 바뀐다.
- Enter 또는 포커스 이탈(blur) → 저장, Esc → 취소.
- 내용을 다 지우고 저장하면 원래 내용으로 돌아간다.
- 수정은 글자만 바꾼다. 카테고리는 바꾸지 않는다.
- Enter 저장 후 blur가 한 번 더 발생해 두 번 저장되지 않도록 주의해.

## 2) 카테고리 필터
- 필터 버튼: 전체 / 업무 / 개인 / 공부. 현재 선택된 버튼은 aria-pressed="true"로 표시해.
- 선택한 필터는 settings.filter에 저장되어 새로고침 후에도 유지된다.
- 목록은 TodoCore.getVisibleTodos(state)의 결과만 그린다.

## 3) 완료 항목 지우기
- 완료 항목이 있을 때만 버튼이 보이고, 버튼에 개수를 표시한다. 예: "완료 항목 지우기 (3)"
- 누르면 confirm()으로 확인한 뒤 TodoCore.clearCompleted()를 실행한다.

## 4) 빈 화면 안내
- 할 일이 0개면 "할 일을 추가해 보세요"
- 할 일은 있지만 필터 결과가 0개면 "이 카테고리에 할 일이 없습니다"

## 완료 기준
- node --test tests/ 가 모두 통과한다.
- 위 4가지 기능을 브라우저에서 확인하는 순서를 알려 줘.
- 끝나면 커밋해 줘. 커밋 메시지: "Add inline edit, category filter, clear completed"
```

**완료 확인**: 더블클릭 수정(Enter/Esc), 필터 전환 후 새로고침, "완료 항목 지우기" 동작을 직접 확인합니다.

---

## 4단계. 진행률·오류 안내·디자인 완성

```text
docs/PRD.md의 4.6절(진행률), 5절(비기능 요구사항), 9절(오류 처리), 10절(화면 구성)을 기준으로 남은 화면 기능과 스타일을 완성해 줘.

## 1) 진행률
- 상단에 전체 진행률 "완료 / 전체 · 퍼센트%"와 막대를 표시한다.
- 그 아래 업무·개인·공부 각각의 "완료/전체"와 막대를 표시한다.
- 값은 TodoCore.getProgress(state.todos)로 계산한다. 필터와 상관없이 항상 전체 목록 기준이다.
- 막대에는 role="progressbar", aria-valuenow, aria-valuemin="0", aria-valuemax="100", aria-label을 붙여.

## 2) 오류 안내 (PRD 9절)
- parseSaved 결과가 corrupt이면: 원본 문자열을 "todo-app:v1:corrupt" 키에 백업하고, 상단에 "저장된 데이터를 읽을 수 없어 새로 시작합니다" 안내를 띄운다.
- localStorage 읽기·쓰기가 실패하면: "이 브라우저에서는 저장되지 않습니다" 안내를 계속 띄운다. 앱은 정상 동작해야 한다.
- 안내 영역은 role="status"로 만들어.

## 3) 스타일 (style.css)
- 색은 :root의 CSS 변수로 정의해. 카테고리 색: 업무 파랑, 개인 초록, 공부 보라. 배지에는 글자도 함께 표시한다.
- 완료 항목: 취소선 + 흐린 색.
- 360px 폭에서 가로 스크롤이 없어야 한다. 좁은 화면에서는 카테고리별 진행률을 세로로 쌓아.
- 키보드 포커스가 보이도록 :focus-visible 스타일을 넣어.
- 체크박스와 버튼에 화면 낭독기용 레이블(aria-label 또는 <label>)을 붙여. 예: "주간 보고서 작성 완료", "주간 보고서 작성 삭제"
- 외부 폰트, CSS 프레임워크는 쓰지 마.

## 완료 기준
- node --test tests/ 가 모두 통과한다.
- 12개 중 7개 완료 시 "7 / 12 · 58%"로 보이는지, 0개일 때 "0 / 0 · 0%"로 보이는지 확인 방법을 알려 줘.
- 끝나면 커밋해 줘. 커밋 메시지: "Add progress, error notices, and responsive styles"
```

**완료 확인**: 진행률 숫자와 막대, 휴대폰 폭(개발자 도구에서 360px)에서의 화면, 비공개 모드에서의 안내 문구를 확인합니다.

---

## 5단계. 브라우저 검증과 마무리

```text
docs/PRD.md 6절(수용 기준)과 11.2절(브라우저 확인)을 기준으로 완성된 앱을 검증하고 마무리해 줘.

## 1) 자동 테스트
- node --test tests/ 를 실행하고 결과를 보여 줘.

## 2) 브라우저 검증 (Playwright, 개발용으로만)
- file:// 경로로 index.html을 열어서 아래 흐름을 실제로 확인해. 앱 저장소에 Playwright 의존성을 추가하지 말고, 검증 스크립트는 임시 위치에서 실행해.
  1. 할 일 3개 추가 (카테고리 각각 다르게)
  2. 1개 완료 체크 → 완료 그룹으로 이동, 진행률 갱신
  3. 1개 더블클릭 수정 → Enter 저장 / Esc 취소
  4. 필터 전환 → 목록만 바뀌고 진행률은 그대로
  5. 완료 항목 지우기
  6. 새로고침 → 할 일, 필터, 마지막 카테고리 유지
  7. "<script>alert(1)</script>" 입력 → 실행되지 않고 글자 그대로 표시
  8. 360px 폭에서 가로 스크롤 없음
- 각 단계의 스크린샷을 찍어서 보여 줘.

## 3) 수용 기준 점검
- PRD 6절의 체크리스트를 항목별로 "통과 / 실패 / 직접 확인 필요"로 표로 정리해 줘.
- 실패한 항목이 있으면 원인을 찾아 고치고, 다시 검증해.

## 4) 마무리
- README.md를 갱신해: "현재 상태"를 구현 완료로 바꾸고, 사용 방법과 테스트 실행 방법을 실제 내용에 맞게 고쳐.
- 끝나면 커밋하고 원격 저장소에 푸시해 줘. 커밋 메시지: "Verify acceptance criteria and update README"
```

**완료 확인**: 수용 기준 표에 "실패"가 없는지, README 내용이 실제와 맞는지 확인합니다.

---

## 팁

- **superpowers 플러그인이 있다면**: 1단계 프롬프트 앞에 "test-driven-development 스킬을 사용해서"를, 5단계 앞에 "verification-before-completion 스킬을 사용해서"를 붙이면 더 엄격하게 진행합니다.
- **단계가 너무 크게 느껴지면**: 프롬프트 안의 번호 항목을 하나씩 나눠 요청해도 됩니다.
- **PRD를 바꿨다면**: 해당 단계 프롬프트의 절 번호와 규칙도 함께 고치세요.
