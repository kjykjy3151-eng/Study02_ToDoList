// 생성: 2026-10-05 20:42 KST

// ===== 저장 =====

// ===== 상태 =====

// ===== 순수 함수 =====

function makeId() {
  return Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

// 미완료 먼저, 마감일 빠른 순(없으면 뒤), 나중에 추가한 것 먼저. 새 배열을 돌려준다.
function sortTodos(todos) {
  return todos.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate !== b.dueDate) {
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    return b.createdAt - a.createdAt;
  });
}

function filterTodos(todos, filter) {
  return todos.filter(todo => {
    if (filter.category !== "전체" && todo.category !== filter.category) return false;
    if (filter.status === "완료" && !todo.done) return false;
    if (filter.status === "미완료" && todo.done) return false;
    return true;
  });
}

function calcProgress(todos) {
  const total = todos.length;
  const done = todos.filter(todo => todo.done).length;
  const percent = total === 0 ? 0 : Math.floor(done / total * 100);
  return { done, total, percent };
}

function countByCategory(todos, category) {
  const inCategory = todos.filter(todo => todo.category === category);
  return { done: inCategory.filter(todo => todo.done).length, total: inCategory.length };
}

// ===== 렌더 =====

// ===== 이벤트 =====
