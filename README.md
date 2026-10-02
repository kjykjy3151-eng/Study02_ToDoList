# Study02_ToDoList

매일 10~20개의 할 일을 관리하는 개인용 할 일 관리 앱입니다.
설치나 서버 없이 브라우저에서 `index.html`을 열면 바로 실행되고, 새로고침해도 데이터가 유지됩니다.

> 현재 상태: **기획·설계 완료, 구현 전**입니다. 자세한 내용은 [docs/PRD.md](docs/PRD.md)를 참고하세요.

## 주요 기능

- 할 일 추가, 수정, 삭제
- 완료 체크와 "완료 항목 지우기"
- 카테고리 분류 (업무 / 개인 / 공부) 및 필터
- 전체·카테고리별 진행률 보기
- 브라우저 저장소(localStorage)에 자동 저장

## 기술

- HTML, CSS, 순수 JavaScript (프레임워크·라이브러리·빌드 도구 없음)
- 테스트: Node 내장 테스트 도구 (`node --test`)

## 파일 구성 (예정)

```
index.html                 화면 뼈대
style.css                  스타일
todo-core.js               순수 로직 (상태 변경, 정렬·필터, 진행률)
app.js                     화면 그리기, 이벤트 처리, 저장
tests/todo-core.test.js    로직 테스트
docs/PRD.md                PRD 및 설계 스펙
```

## 사용 방법 (구현 후)

1. 저장소를 내려받습니다.
2. `index.html`을 브라우저에서 엽니다. 더블클릭하면 됩니다.

테스트 실행:

```bash
node --test tests/
```

## 문서

- [PRD 및 설계 스펙](docs/PRD.md)
- [Claude Code 단계별 구현 프롬프트](docs/PROMPTS.md)
