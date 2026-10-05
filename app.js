// 생성: 2026-10-05 20:42 KST

// ===== 저장 =====

const STORAGE_KEY = "todos.v1";

// render 가 의존하는 최소 형식: 객체이고, id, text 는 문자열, done 은 불리언, dueDate 는 null 또는 문자열.
function isTodo(value) {
  return typeof value === "object" && value !== null
    && typeof value.id === "string"
    && typeof value.text === "string"
    && typeof value.done === "boolean"
    && (value.dueDate === null || typeof value.dueDate === "string");
}

// 저장된 값이 없으면 빈 배열. 파싱에 실패하거나 배열이 아니면 원본을 broken 키로 옮기고 빈 배열로 시작한다.
// 배열 안의 형식이 맞지 않는 요소는 그 요소만 버리고 나머지는 살린다(broken 키로는 옮기지 않는다).
function loadTodos(key = STORAGE_KEY) {
  const raw = localStorage.getItem(key);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(isTodo);
  } catch (err) {
    // 아래에서 손상값으로 처리한다.
  }
  localStorage.setItem(key + ".broken", raw);
  localStorage.removeItem(key);
  return [];
}

function saveTodos(todos, key = STORAGE_KEY) {
  localStorage.setItem(key, JSON.stringify(todos));
}

// ===== 상태 =====

const state = {
  todos: [],
  filter: { category: "전체", status: "전체" },
};

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

// <li> 하나를 만들어 돌려주기만 한다. 사용자 데이터는 전부 textContent/속성으로 넣는다(innerHTML 금지).
function renderItem(todo) {
  const li = document.createElement("li");
  li.className = todo.done ? "todo-item is-done" : "todo-item";
  li.dataset.id = todo.id;

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "todo-check";
  check.checked = todo.done;
  check.setAttribute("aria-label", todo.text);

  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;

  const category = document.createElement("span");
  category.className = "todo-category";
  category.textContent = todo.category;

  // "YYYY-MM-DD" 를 "MM/DD" 로 줄여 보여 준다. 마감일이 없으면 비운다.
  const due = document.createElement("span");
  due.className = "todo-due";
  due.textContent = todo.dueDate === null ? "" : todo.dueDate.slice(5).replace("-", "/");

  const del = document.createElement("button");
  del.type = "button";
  del.className = "todo-delete";
  del.setAttribute("aria-label", "삭제: " + todo.text);
  del.textContent = "✕";

  li.append(check, text, category, due, del);
  return li;
}

function render() {
  // 1. 목록: 필터, 정렬을 거친 항목만 그린다.
  const visible = sortTodos(filterTodos(state.todos, state.filter));
  const list = document.getElementById("todo-list");
  list.textContent = "";
  for (const todo of visible) list.appendChild(renderItem(todo));

  // 2. 진행률: 필터와 무관하게 항상 전체 데이터로 계산한다.
  const progress = calcProgress(state.todos);
  document.getElementById("progress-fill").style.width = progress.percent + "%";
  document.getElementById("progress-count").textContent = progress.done + " / " + progress.total;
  document.getElementById("progress-percent").textContent = progress.percent + "%";

  // 3. 카테고리 탭: 전체 탭은 전체 개수만, 나머지는 완료/전체.
  for (const button of document.querySelectorAll("#category-tabs [data-category]")) {
    const category = button.dataset.category;
    if (category === "전체") {
      button.textContent = "전체 " + state.todos.length;
    } else {
      const count = countByCategory(state.todos, category);
      button.textContent = category + " " + count.done + "/" + count.total;
    }
  }

  // 4. 빈 상태: 데이터 자체가 없을 때와 필터 때문에 비었을 때 문구를 구분한다.
  const empty = document.getElementById("empty-state");
  empty.hidden = visible.length > 0;
  empty.textContent = state.todos.length === 0
    ? "아직 할 일이 없습니다. 위에서 추가해 보세요."
    : "조건에 맞는 할 일이 없습니다.";
}

// 변경 함수는 모두 상태 변경, 저장, 다시 그리기 순서로 끝낸다.
function addTodo(text, category, dueDate) {
  const trimmed = text.trim();
  if (trimmed === "") return;
  state.todos.push({
    id: makeId(),
    text: trimmed,
    category,
    done: false,
    dueDate: dueDate || null, // 날짜 입력은 비어 있으면 ""를 주므로 null로 맞춘다.
    createdAt: Date.now(),
  });
  saveTodos(state.todos);
  render();
}

function toggleTodo(id) {
  const todo = state.todos.find(item => item.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  saveTodos(state.todos);
  render();
}

function deleteTodo(id) {
  state.todos = state.todos.filter(item => item.id !== id);
  saveTodos(state.todos);
  render();
}

// ===== 이벤트 =====

document.getElementById("todo-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("todo-input");
  if (input.value.trim() === "") return; // 공백만 입력하면 입력창과 마감일을 그대로 둔다.
  addTodo(input.value, document.getElementById("category-select").value, document.getElementById("due-input").value);
  input.value = "";
  document.getElementById("due-input").value = "";
  input.focus();
});

// 항목은 매번 다시 그려지므로 리스너는 목록 하나에만 붙인다.
document.getElementById("todo-list").addEventListener("click", event => {
  const item = event.target.closest(".todo-item");
  if (!item) return;
  const list = event.currentTarget;
  if (event.target.classList.contains("todo-check")) {
    toggleTodo(item.dataset.id);
    // 다시 그리면서 포커스가 사라지므로, 같은 항목(자리만 옮겨졌다)의 체크박스로 되돌린다.
    for (const li of list.children) {
      if (li.dataset.id === item.dataset.id) li.querySelector(".todo-check").focus();
    }
  } else if (event.target.classList.contains("todo-delete")) {
    const index = Array.from(list.children).indexOf(item);
    deleteTodo(item.dataset.id);
    // 항목이 사라졌으므로 같은 자리의 다음 항목, 없으면 이전 항목, 목록이 비면 입력창으로 보낸다.
    const target = list.children[index] || list.children[index - 1];
    if (target) target.querySelector(".todo-delete").focus();
    else document.getElementById("todo-input").focus();
  }
});

// 시작: 저장된 데이터를 불러와 첫 화면을 그린다. 항상 app.js 맨 아래에 둔다.
state.todos = loadTodos();
render();
