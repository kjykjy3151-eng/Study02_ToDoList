// 생성: 2026-10-05 20:42 KST

// ===== 저장 =====

const STORAGE_KEY = "todos.v1";
const DAILY_LOG_KEY = "dailyLog.v1";
const PREFS_KEY = "prefs.v1";

// render 가 의존하는 최소 형식: 객체이고, id, text 는 문자열, category 는 세 카테고리 중 하나, done 은 불리언, dueDate 는 null 또는 문자열.
// completedAt 은 null 또는 문자열이고, 이 필드가 생기기 전에 저장된 할 일에는 없으므로 없어도(undefined) 받아들인다. 없으면 null 로 본다.
function isTodo(value) {
  return typeof value === "object" && value !== null
    && typeof value.id === "string"
    && typeof value.text === "string"
    && ["업무", "개인", "공부"].includes(value.category)
    && typeof value.done === "boolean"
    && (value.dueDate === null || typeof value.dueDate === "string")
    && (value.completedAt === undefined || value.completedAt === null || typeof value.completedAt === "string");
}

// 저장된 값이 없으면 빈 배열. 파싱에 실패하거나 배열이 아니면 원본을 broken 키로 옮기고 빈 배열로 시작한다.
// 배열 안의 형식이 맞지 않는 요소는 그 요소만 버리고 나머지는 살린다. 버린 요소는 화면에 그릴 수 없는 것이라 보관하지 않는다:
// broken 키로 옮기지 않으며, 저장소에는 남아 있다가 다음 저장(saveTodos) 때 함께 지워진다.
// broken 키는 값 전체를 파싱할 수 없을 때만 쓴다.
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

// 날짜별 완료 수 {"2026-10-09": 5}. 저장된 값이 없으면 빈 객체. 파싱에 실패하거나 객체가 아니면 loadTodos 와 같이 broken 키로 옮기고 빈 객체로 시작한다.
// 날짜 형식이 아니거나 0 이상의 정수가 아닌 항목은 그 항목만 버린다.
function loadDailyLog(key = DAILY_LOG_KEY) {
  const raw = localStorage.getItem(key);
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const log = {};
      for (const day of Object.keys(parsed)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isInteger(parsed[day]) && parsed[day] >= 0) log[day] = parsed[day];
      }
      return log;
    }
  } catch (err) {
    // 아래에서 손상값으로 처리한다.
  }
  localStorage.setItem(key + ".broken", raw);
  localStorage.removeItem(key);
  return {};
}

function saveDailyLog(log, key = DAILY_LOG_KEY) {
  localStorage.setItem(key, JSON.stringify(log));
}

// 표시 설정 {theme: "light" | "dark" | null, layout: "auto" | "single"}. theme 가 null 이면 OS 설정을 따른다.
// 저장된 값이 없으면 기본값. 파싱에 실패하거나 객체가 아니면 loadDailyLog 와 같이 broken 키로 옮기고 기본값으로 시작한다.
// 객체 안에서 허용된 값이 아닌 필드는 그 필드만 기본값으로 되돌린다.
function loadPrefs(key = PREFS_KEY) {
  const raw = localStorage.getItem(key);
  if (raw === null) return { theme: null, layout: "auto" };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return {
        theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : null,
        layout: parsed.layout === "single" ? "single" : "auto",
      };
    }
  } catch (err) {
    // 아래에서 손상값으로 처리한다.
  }
  localStorage.setItem(key + ".broken", raw);
  localStorage.removeItem(key);
  return { theme: null, layout: "auto" };
}

function savePrefs(prefs, key = PREFS_KEY) {
  localStorage.setItem(key, JSON.stringify(prefs));
}

// ===== 상태 =====

const state = {
  todos: [],
  dailyLog: {}, // 날짜별 완료 수. 할 일을 지워도 줄지 않는 누적 기록이다.
  filter: { category: "전체", status: "전체" },
  prefs: { theme: null, layout: "auto" }, // 필터와 달리 저장한다. 새로고침할 때마다 테마가 되돌아가는 다크 모드는 쓸 수 없다.
};

// 지금 인라인 수정 중인 항목의 id. 수정 중이 아니면 null. Esc 가 이 값을 먼저 비워서 뒤따르는 blur 가 저장으로 처리되지 않게 한다.
let editingId = null;

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

// 분모가 0이면 0%. 전체 진행률과 카테고리 탭이 같은 내림 규칙을 쓰도록 한곳에 둔다.
function percentOf(done, total) {
  return total === 0 ? 0 : Math.floor(done / total * 100);
}

function calcProgress(todos) {
  const total = todos.length;
  const done = todos.filter(todo => todo.done).length;
  return { done, total, percent: percentOf(done, total) };
}

function countByCategory(todos, category) {
  const inCategory = todos.filter(todo => todo.category === category);
  return { done: inCategory.filter(todo => todo.done).length, total: inCategory.length };
}

// 로컬 시간 기준 "YYYY-MM-DD". toISOString() 은 UTC 로 바꾸므로 한국 시간 늦은 밤의 완료가 전날로 기록된다.
function formatDate(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// today 로 끝나는 최근 7일, 오래된 날이 앞. 기록이 없는 날은 0. 날짜 계산은 Date 생성자에 맡겨 월말, 서머타임을 따로 다루지 않는다.
function lastSevenDays(log, today) {
  const days = [];
  for (let back = 6; back >= 0; back--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
    const key = formatDate(date);
    days.push({ date: key, weekday: WEEKDAYS[date.getDay()], count: log[key] || 0, isToday: back === 0 });
  }
  return days;
}

// 할 일이 하나라도 있고 전부 끝났을 때만 true. 빈 목록은 0 / 0 이지만 달성이 아니다.
function isAllDone(progress) {
  return progress.total > 0 && progress.done === progress.total;
}

// 지금 화면이 다크인가. 저장된 선택(theme)이 있으면 그것이, 없으면 OS 설정(systemDark)이 정한다.
function isDarkTheme(theme, systemDark) {
  return theme === null ? systemDark : theme === "dark";
}

// ===== 렌더 =====

// <li> 하나를 만들어 돌려주기만 한다. 사용자 데이터는 전부 textContent/속성으로 넣는다(innerHTML 금지).
// 체크박스와 삭제 버튼의 접근성 이름. 항목을 처음 그릴 때와 수정 후 부분 갱신할 때 같은 형식을 쓰도록 한곳에 둔다.
function setItemLabels(row, text) {
  row.querySelector(".todo-check").setAttribute("aria-label", text);
  row.querySelector(".todo-delete").setAttribute("aria-label", "삭제: " + text);
}

function renderItem(todo) {
  const li = document.createElement("li");
  li.className = todo.done ? "todo-item is-done" : "todo-item";
  li.dataset.id = todo.id;

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "todo-check";
  check.checked = todo.done;

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
  del.textContent = "✕";

  li.append(check, text, category, due, del);
  setItemLabels(li, todo.text);
  return li;
}

// 최근 7일 표: 머리글 줄에 요일, 본문 줄에 완료 수. 오늘 칸에는 is-today 를 붙인다.
function renderDailyTable(table, days) {
  const head = document.createElement("tr");
  const body = document.createElement("tr");
  for (const day of days) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = day.weekday;
    const td = document.createElement("td");
    td.textContent = String(day.count);
    if (day.isToday) {
      th.className = "is-today";
      td.className = "is-today";
      th.setAttribute("aria-current", "date");
    }
    head.appendChild(th);
    body.appendChild(td);
  }
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  thead.appendChild(head);
  tbody.appendChild(body);
  table.textContent = "";
  table.append(thead, tbody);
}

// 표시 설정을 화면에 반영한다. data-theme 은 저장된 선택이 있을 때만 붙인다. 없으면 style.css 의 미디어 쿼리가 OS 설정으로 정한다.
// 단추의 aria-pressed 는 지금 실제로 보이는 상태를 따른다(선택이 없고 OS 가 다크이면 다크 모드 단추는 눌린 상태다).
function renderPrefs() {
  const root = document.documentElement;
  if (state.prefs.theme === null) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", state.prefs.theme);
  if (state.prefs.layout === "single") root.setAttribute("data-layout", "single");
  else root.removeAttribute("data-layout");

  const dark = isDarkTheme(state.prefs.theme, systemPrefersDark());
  const themeButton = document.getElementById("theme-toggle");
  themeButton.setAttribute("aria-pressed", String(dark));
  themeButton.textContent = "다크 모드: " + (dark ? "켬" : "끔");
  const single = state.prefs.layout === "single";
  const layoutButton = document.getElementById("layout-toggle");
  layoutButton.setAttribute("aria-pressed", String(single));
  layoutButton.textContent = "한 줄 고정: " + (single ? "켬" : "끔");
}

function systemPrefersDark() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
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
  const celebration = document.getElementById("celebration");
  celebration.textContent = "🎉 모든 할 일을 완료했습니다.";
  celebration.hidden = !isAllDone(progress);
  renderDailyTable(document.getElementById("daily-table"), lastSevenDays(state.dailyLog, new Date()));

  // 3. 카테고리 탭: 전체 탭은 전체 개수만, 나머지는 완료/전체와 백분율. 현재 필터와 같은 버튼에 is-active 를 붙인다.
  for (const button of document.querySelectorAll("#category-tabs [data-category]")) {
    const category = button.dataset.category;
    button.classList.toggle("is-active", category === state.filter.category);
    if (category === "전체") {
      button.textContent = "전체 " + state.todos.length;
    } else {
      const count = countByCategory(state.todos, category);
      button.textContent = category + " " + count.done + "/" + count.total + " (" + percentOf(count.done, count.total) + "%)";
    }
  }

  for (const button of document.querySelectorAll("#status-filter [data-status]")) {
    button.classList.toggle("is-active", button.dataset.status === state.filter.status);
  }

  // 4. 빈 상태: 데이터 자체가 없을 때와 필터 때문에 비었을 때 문구를 구분한다.
  const empty = document.getElementById("empty-state");
  empty.hidden = visible.length > 0;
  empty.textContent = state.todos.length === 0
    ? "아직 할 일이 없습니다. 위에서 추가해 보세요."
    : "조건에 맞는 할 일이 없습니다.";
}

// ===== 변경 =====

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
    completedAt: null,
    createdAt: Date.now(),
  });
  saveTodos(state.todos);
  render();
}

function toggleTodo(id) {
  const todo = state.todos.find(item => item.id === id);
  if (!todo) return;
  if (!todo.done) {
    // 완료: 오늘 칸에 1을 더하고, 어느 날 센 것인지 completedAt 에 남긴다.
    const today = formatDate(new Date());
    todo.done = true;
    todo.completedAt = today;
    state.dailyLog[today] = (state.dailyLog[today] || 0) + 1;
  } else {
    // 완료 취소: 오늘이 아니라 완료했던 날 칸에서 1을 뺀다. 0 아래로는 내려가지 않는다.
    // completedAt 이 없는 완료 항목(이 필드가 생기기 전에 완료한 것)은 기록에 센 적이 없으므로 기록을 건드리지 않는다.
    const day = todo.completedAt;
    if (typeof day === "string" && state.dailyLog[day] > 0) state.dailyLog[day] -= 1;
    todo.done = false;
    todo.completedAt = null;
  }
  saveTodos(state.todos);
  saveDailyLog(state.dailyLog);
  render();
}

function deleteTodo(id) {
  state.todos = state.todos.filter(item => item.id !== id);
  saveTodos(state.todos);
  render();
}

// 텍스트가 빈 값이면 저장하지 않지만, 입력창이 열려 있을 수 있으므로 다시 그려서 원래 텍스트를 되돌린다.
function updateTodoText(id, text) {
  const todo = state.todos.find(item => item.id === id);
  if (!todo) return;
  const trimmed = text.trim();
  if (trimmed !== "") {
    todo.text = trimmed;
    saveTodos(state.todos);
  }
  render();
}

// 테마는 지금 보이는 모양의 반대로 바뀐다. 처음 누르면 OS 설정을 따르던 상태에서 명시적인 선택(light, dark)으로 바뀌고, 그 뒤로는 OS 가 바뀌어도 이 선택이 이긴다.
function toggleTheme() {
  state.prefs.theme = isDarkTheme(state.prefs.theme, systemPrefersDark()) ? "light" : "dark";
  savePrefs(state.prefs);
  renderPrefs();
}

function toggleLayout() {
  state.prefs.layout = state.prefs.layout === "single" ? "auto" : "single";
  savePrefs(state.prefs);
  renderPrefs();
}

// 필터는 데이터가 아니므로 저장하지 않는다. 새로고침하면 기본값으로 돌아간다.
function setFilter(partial) {
  state.filter = Object.assign({}, state.filter, partial);
  render();
}

// 항목 id 에 해당하는 <li> 안의 요소에 포커스를 준다. 그 항목이 지금 그려져 있지 않으면 false.
function focusItem(id, selector) {
  for (const li of document.getElementById("todo-list").children) {
    if (li.dataset.id === id) {
      li.querySelector(selector).focus();
      return true;
    }
  }
  return false;
}

// .todo-text 를 입력창으로 바꾼다. 종료 경로는 Enter(저장), Esc(버림), blur(저장) 세 가지다.
function startEdit(id) {
  const todo = state.todos.find(item => item.id === id);
  const li = Array.from(document.getElementById("todo-list").children).find(el => el.dataset.id === id);
  if (!todo || !li) return;
  const label = li.querySelector(".todo-text");

  const input = document.createElement("input");
  input.type = "text";
  input.className = "todo-edit";
  input.value = todo.text;
  input.setAttribute("aria-label", "할 일 수정");

  input.addEventListener("keydown", event => {
    if (event.isComposing) return; // 한글 조합 중의 Enter 는 글자를 확정할 뿐 저장이 아니다.
    if (event.key === "Enter") {
      editingId = null; // render 가 입력창을 떼면서 일으킬 수 있는 blur 가 두 번째 저장이 되지 않게 먼저 비운다.
      updateTodoText(id, input.value);
      focusItem(id, ".todo-check");
    } else if (event.key === "Escape") {
      editingId = null; // 반드시 render 보다 먼저. 그래야 뒤따르는 blur 가 저장으로 처리되지 않는다.
      render();
      focusItem(id, ".todo-check");
    }
  });
  input.addEventListener("blur", () => {
    if (editingId === null) return;
    editingId = null;
    // 다른 항목을 누르다가 일어난 blur 일 수 있다. render 로 목록을 통째로 바꾸면 누르던 요소가 떨어져 나가
    // click 이 만들어지지 않으므로, 상태와 저장소만 고치고 입력창을 글자로 되돌리는 데서 그친다.
    const current = state.todos.find(item => item.id === id);
    const row = input.closest(".todo-item");
    if (!current || !row) return;
    const trimmed = input.value.trim();
    if (trimmed !== "") {
      current.text = trimmed;
      saveTodos(state.todos);
    }
    const restored = document.createElement("span");
    restored.className = "todo-text";
    restored.textContent = current.text;
    input.replaceWith(restored);
    setItemLabels(row, current.text);
  });

  editingId = id;
  label.replaceWith(input);
  input.focus();
}

// ===== 이벤트 =====

document.getElementById("todo-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("todo-input");
  if (input.value.trim() === "") { // 공백만 입력하면 입력창과 마감일을 그대로 두고, 추가 버튼을 눌렀더라도 포커스는 입력창에 둔다.
    input.focus();
    return;
  }
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
    const index = Array.from(list.children).indexOf(item);
    toggleTodo(item.dataset.id);
    // 다시 그리면서 포커스가 사라지므로, 같은 항목(자리만 옮겨졌다)의 체크박스로 되돌린다.
    if (!focusItem(item.dataset.id, ".todo-check")) {
      // 필터 때문에 항목이 목록에서 사라졌다면 그 자리를 이어받은 항목, 없으면 이전 항목, 목록이 비면 입력창으로 보낸다.
      const target = list.children[index] || list.children[index - 1];
      if (target) target.querySelector(".todo-check").focus();
      else document.getElementById("todo-input").focus();
    }
  } else if (event.target.classList.contains("todo-text")) {
    startEdit(item.dataset.id);
  } else if (event.target.classList.contains("todo-delete")) {
    const index = Array.from(list.children).indexOf(item);
    deleteTodo(item.dataset.id);
    // 항목이 사라졌으므로 같은 자리의 다음 항목, 없으면 이전 항목, 목록이 비면 입력창으로 보낸다.
    const target = list.children[index] || list.children[index - 1];
    if (target) target.querySelector(".todo-delete").focus();
    else document.getElementById("todo-input").focus();
  }
});

// 필터 버튼도 목록처럼 위임으로 연결한다. render 는 버튼을 다시 만들지 않으므로 포커스가 유지된다.
document.getElementById("category-tabs").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (button) setFilter({ category: button.dataset.category });
});

document.getElementById("status-filter").addEventListener("click", event => {
  const button = event.target.closest("[data-status]");
  if (button) setFilter({ status: button.dataset.status });
});

document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
document.getElementById("layout-toggle").addEventListener("click", toggleLayout);

// 선택이 없어 OS 설정을 따르는 중에 OS 가 바뀌면 단추의 눌림 상태도 따라가야 한다.
if (typeof window.matchMedia === "function") {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  if (typeof query.addEventListener === "function") query.addEventListener("change", renderPrefs);
}

// 창이 다시 포커스를 받으면 저장소를 다시 읽는다. 다른 탭이 그동안 저장한 내용을 이 탭의 오래된 스냅샷이 덮어쓰지 않게 하려는 것이다.
// 수정 중에는 입력 중인 글을 잃지 않도록 건너뛴다. storage 이벤트는 file:// 문서 사이에서 전달되는지 보장되지 않아 쓰지 않는다.
window.addEventListener("focus", () => {
  // 다른 탭이 바꾼 표시 설정을 이 탭의 오래된 값이 덮어쓰지 않도록 먼저 맞춘다. 수정 중이어도 입력 중인 글과 무관하다.
  const loadedPrefs = loadPrefs();
  if (JSON.stringify(loadedPrefs) !== JSON.stringify(state.prefs)) {
    state.prefs = loadedPrefs;
    renderPrefs();
  }
  if (editingId !== null) return;
  const loaded = loadTodos();
  const loadedLog = loadDailyLog();
  if (JSON.stringify(loaded) === JSON.stringify(state.todos) && JSON.stringify(loadedLog) === JSON.stringify(state.dailyLog)) return;
  state.todos = loaded;
  state.dailyLog = loadedLog;
  render();
});

// 시작: 저장된 데이터를 불러와 첫 화면을 그린다. 항상 app.js 맨 아래에 둔다.
state.todos = loadTodos();
state.dailyLog = loadDailyLog();
state.prefs = loadPrefs();
renderPrefs();
render();
