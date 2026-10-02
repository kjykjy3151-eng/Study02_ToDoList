// 할 일 앱의 순수 로직.
// 모든 함수는 상태를 받아 새 상태를 돌려주며, 받은 상태를 직접 바꾸지 않는다.
// DOM, window, localStorage에 의존하지 않는다.
(function () {
  "use strict";

  const VERSION = 1;
  const MAX_TEXT_LENGTH = 100;
  const CATEGORIES = ["work", "personal", "study"];
  const FILTERS = ["all", ...CATEGORIES];
  const DEFAULT_SETTINGS = { filter: "all", lastCategory: "work" };

  function createState() {
    return { version: VERSION, todos: [], settings: { ...DEFAULT_SETTINGS } };
  }

  // 앞뒤 공백을 제거하고 최대 길이로 자른다. 비어 있으면 null.
  function normalizeText(text) {
    if (typeof text !== "string") return null;
    const trimmed = text.trim();
    return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : null;
  }

  // id가 일치하는 할 일만 바꾼다. 없는 id면 원래 상태를 그대로 돌려준다.
  function mapTodo(state, id, change) {
    if (!state.todos.some((todo) => todo.id === id)) return state;
    return {
      ...state,
      todos: state.todos.map((todo) => (todo.id === id ? change(todo) : todo)),
    };
  }

  function addTodo(state, { id, text, category, now }) {
    const normalized = normalizeText(text);
    if (!normalized || !CATEGORIES.includes(category)) return state;
    const todo = {
      id,
      text: normalized,
      category,
      completed: false,
      createdAt: now,
      completedAt: null,
    };
    return {
      ...state,
      todos: [...state.todos, todo],
      settings: { ...state.settings, lastCategory: category },
    };
  }

  function updateTodoText(state, id, text) {
    const normalized = normalizeText(text);
    if (!normalized) return state;
    return mapTodo(state, id, (todo) => ({ ...todo, text: normalized }));
  }

  // 완료로 바꾸면 completedAt에 now를 기록하고, 완료를 풀면 null로 되돌린다.
  function toggleTodo(state, id, now) {
    return mapTodo(state, id, (todo) => ({
      ...todo,
      completed: !todo.completed,
      completedAt: todo.completed ? null : now,
    }));
  }

  function deleteTodo(state, id) {
    if (!state.todos.some((todo) => todo.id === id)) return state;
    return { ...state, todos: state.todos.filter((todo) => todo.id !== id) };
  }

  function clearCompleted(state) {
    return { ...state, todos: state.todos.filter((todo) => !todo.completed) };
  }

  function setFilter(state, filter) {
    if (!FILTERS.includes(filter)) return state;
    return { ...state, settings: { ...state.settings, filter } };
  }

  // 필터를 적용하고, 미완료 → 완료, 각 그룹 안에서는 추가한 순서대로 정렬한다.
  function getVisibleTodos(state) {
    const { filter } = state.settings;
    return state.todos
      .filter((todo) => filter === "all" || todo.category === filter)
      .sort((a, b) => Number(a.completed) - Number(b.completed) || a.createdAt - b.createdAt);
  }

  function summarize(todos) {
    const total = todos.length;
    const done = todos.filter((todo) => todo.completed).length;
    return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
  }

  function getProgress(todos) {
    const progress = { all: summarize(todos) };
    for (const category of CATEGORIES) {
      progress[category] = summarize(todos.filter((todo) => todo.category === category));
    }
    return progress;
  }

  function isValidTodo(todo) {
    return (
      todo !== null &&
      typeof todo === "object" &&
      typeof todo.id === "string" &&
      todo.id !== "" &&
      typeof todo.text === "string" &&
      todo.text.trim() !== "" &&
      CATEGORIES.includes(todo.category) &&
      typeof todo.completed === "boolean" &&
      Number.isFinite(todo.createdAt)
    );
  }

  // 저장된 문자열을 검사해 { state, status }를 돌려준다.
  // status: "ok" | "empty" | "corrupt"
  function parseSaved(raw) {
    if (raw === null || raw === undefined || raw === "") {
      return { state: createState(), status: "empty" };
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { state: createState(), status: "corrupt" };
    }

    if (
      data === null ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      data.version !== VERSION ||
      !Array.isArray(data.todos)
    ) {
      return { state: createState(), status: "corrupt" };
    }

    // 형식이 틀린 항목과 id가 중복된 항목은 버린다.
    // 최대 길이를 넘는 내용은 버리지 않고 자른다 (예전 버전은 200자까지 허용했다).
    // completedAt이 없던 예전 데이터는 null로 채운다.
    const seen = new Set();
    const todos = [];
    for (const todo of data.todos) {
      if (!isValidTodo(todo) || seen.has(todo.id)) continue;
      seen.add(todo.id);
      const { id, text, category, completed, createdAt } = todo;
      const completedAt = completed && Number.isFinite(todo.completedAt) ? todo.completedAt : null;
      todos.push({ id, text: normalizeText(text), category, completed, createdAt, completedAt });
    }

    const settings = data.settings || {};
    return {
      state: {
        version: VERSION,
        todos,
        settings: {
          filter: FILTERS.includes(settings.filter) ? settings.filter : DEFAULT_SETTINGS.filter,
          lastCategory: CATEGORIES.includes(settings.lastCategory)
            ? settings.lastCategory
            : DEFAULT_SETTINGS.lastCategory,
        },
      },
      status: "ok",
    };
  }

  const TodoCore = {
    MAX_TEXT_LENGTH,
    CATEGORIES,
    createState,
    addTodo,
    updateTodoText,
    toggleTodo,
    deleteTodo,
    clearCompleted,
    setFilter,
    getVisibleTodos,
    getProgress,
    parseSaved,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TodoCore;
  } else {
    window.TodoCore = TodoCore;
  }
})();
