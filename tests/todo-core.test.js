const test = require("node:test");
const assert = require("node:assert/strict");
const TodoCore = require("../todo-core.js");

const {
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
} = TodoCore;

// 테스트용 상태를 만든다. 항목마다 createdAt을 1, 2, 3...으로 준다.
function stateWith(items) {
  let state = createState();
  items.forEach((item, i) => {
    state = addTodo(state, {
      id: item.id,
      text: item.text || item.id,
      category: item.category || "work",
      now: i + 1,
    });
    if (item.completed) state = toggleTodo(state, item.id, 1000 + i);
  });
  return state;
}

function ids(todos) {
  return todos.map((t) => t.id);
}

test.describe("createState", () => {
  test("빈 목록과 기본 설정으로 시작한다", () => {
    assert.deepEqual(createState(), {
      version: 1,
      todos: [],
      settings: { filter: "all", lastCategory: "work" },
    });
  });
});

test.describe("addTodo", () => {
  test("할 일을 추가한다", () => {
    const state = addTodo(createState(), {
      id: "a",
      text: "보고서 작성",
      category: "study",
      now: 100,
    });
    assert.deepEqual(state.todos, [
      {
        id: "a",
        text: "보고서 작성",
        category: "study",
        completed: false,
        createdAt: 100,
        completedAt: null,
      },
    ]);
  });

  test("앞뒤 공백을 제거한다", () => {
    const state = addTodo(createState(), { id: "a", text: "  장보기  ", category: "personal", now: 1 });
    assert.equal(state.todos[0].text, "장보기");
  });

  test("빈 입력이나 공백만 있는 입력은 추가하지 않는다", () => {
    const initial = createState();
    assert.equal(addTodo(initial, { id: "a", text: "", category: "work", now: 1 }), initial);
    assert.equal(addTodo(initial, { id: "a", text: "   ", category: "work", now: 1 }), initial);
  });

  test("100자를 넘으면 100자로 자른다", () => {
    const state = addTodo(createState(), { id: "a", text: "가".repeat(150), category: "work", now: 1 });
    assert.equal(state.todos[0].text.length, 100);
  });

  test("lastCategory를 추가한 카테고리로 갱신한다", () => {
    const state = addTodo(createState(), { id: "a", text: "공부", category: "study", now: 1 });
    assert.equal(state.settings.lastCategory, "study");
  });

  test("허용되지 않은 카테고리는 추가하지 않는다", () => {
    const initial = createState();
    assert.equal(addTodo(initial, { id: "a", text: "x", category: "hobby", now: 1 }), initial);
  });

  test("원래 상태를 바꾸지 않는다", () => {
    const initial = createState();
    const snapshot = structuredClone(initial);
    addTodo(initial, { id: "a", text: "x", category: "study", now: 1 });
    assert.deepEqual(initial, snapshot);
  });
});

test.describe("updateTodoText", () => {
  test("내용을 바꾸고 앞뒤 공백을 제거한다", () => {
    const state = updateTodoText(stateWith([{ id: "a", text: "old" }]), "a", "  new  ");
    assert.equal(state.todos[0].text, "new");
  });

  test("빈 내용이면 기존 내용을 유지한다", () => {
    const initial = stateWith([{ id: "a", text: "old" }]);
    assert.equal(updateTodoText(initial, "a", "   "), initial);
  });

  test("100자를 넘으면 100자로 자른다", () => {
    const state = updateTodoText(stateWith([{ id: "a" }]), "a", "나".repeat(101));
    assert.equal(state.todos[0].text.length, 100);
  });

  test("없는 id면 상태를 그대로 돌려준다", () => {
    const initial = stateWith([{ id: "a" }]);
    assert.equal(updateTodoText(initial, "zzz", "new"), initial);
  });

  test("원래 상태를 바꾸지 않는다", () => {
    const initial = stateWith([{ id: "a", text: "old" }]);
    const snapshot = structuredClone(initial);
    updateTodoText(initial, "a", "new");
    assert.deepEqual(initial, snapshot);
  });
});

test.describe("toggleTodo", () => {
  test("완료 여부를 뒤집는다", () => {
    const once = toggleTodo(stateWith([{ id: "a" }]), "a", 500);
    assert.equal(once.todos[0].completed, true);
    assert.equal(toggleTodo(once, "a", 600).todos[0].completed, false);
  });

  test("완료하면 completedAt을 기록하고, 완료를 풀면 null로 되돌린다", () => {
    const once = toggleTodo(stateWith([{ id: "a" }]), "a", 500);
    assert.equal(once.todos[0].completedAt, 500);
    assert.equal(toggleTodo(once, "a", 600).todos[0].completedAt, null);
  });

  test("없는 id면 상태를 그대로 돌려준다", () => {
    const initial = stateWith([{ id: "a" }]);
    assert.equal(toggleTodo(initial, "zzz"), initial);
  });

  test("원래 상태를 바꾸지 않는다", () => {
    const initial = stateWith([{ id: "a" }]);
    const snapshot = structuredClone(initial);
    toggleTodo(initial, "a", 500);
    assert.deepEqual(initial, snapshot);
  });
});

test.describe("deleteTodo", () => {
  test("할 일을 삭제한다", () => {
    const state = deleteTodo(stateWith([{ id: "a" }, { id: "b" }]), "a");
    assert.deepEqual(ids(state.todos), ["b"]);
  });

  test("없는 id면 상태를 그대로 돌려준다", () => {
    const initial = stateWith([{ id: "a" }]);
    assert.equal(deleteTodo(initial, "zzz"), initial);
  });
});

test.describe("clearCompleted", () => {
  test("완료 항목을 모두 지우고 미완료 항목만 남긴다", () => {
    const state = clearCompleted(
      stateWith([{ id: "a", completed: true }, { id: "b" }, { id: "c", completed: true }])
    );
    assert.deepEqual(ids(state.todos), ["b"]);
  });

  test("원래 상태를 바꾸지 않는다", () => {
    const initial = stateWith([{ id: "a", completed: true }]);
    const snapshot = structuredClone(initial);
    clearCompleted(initial);
    assert.deepEqual(initial, snapshot);
  });
});

test.describe("setFilter", () => {
  test("허용된 필터 값을 반영한다", () => {
    for (const filter of ["all", "work", "personal", "study"]) {
      assert.equal(setFilter(createState(), filter).settings.filter, filter);
    }
  });

  test("허용되지 않은 값이면 상태를 그대로 돌려준다", () => {
    const initial = createState();
    assert.equal(setFilter(initial, "done"), initial);
  });
});

test.describe("getVisibleTodos", () => {
  const items = [
    { id: "w1", category: "work" },
    { id: "p1", category: "personal" },
    { id: "w2", category: "work", completed: true },
    { id: "s1", category: "study" },
  ];

  test("미완료가 위, 완료가 아래이고 각 그룹 안에서는 추가한 순서다", () => {
    assert.deepEqual(ids(getVisibleTodos(stateWith(items))), ["w1", "p1", "s1", "w2"]);
  });

  test("카테고리 필터를 적용한다", () => {
    const state = setFilter(stateWith(items), "work");
    assert.deepEqual(ids(getVisibleTodos(state)), ["w1", "w2"]);
  });

  test("완료를 해제하면 원래 자리로 돌아간다", () => {
    let state = stateWith([{ id: "a" }, { id: "b" }, { id: "c" }]);
    state = toggleTodo(state, "b", 500);
    assert.deepEqual(ids(getVisibleTodos(state)), ["a", "c", "b"]);
    state = toggleTodo(state, "b", 600);
    assert.deepEqual(ids(getVisibleTodos(state)), ["a", "b", "c"]);
  });

  test("상태의 todos 배열 순서를 바꾸지 않는다", () => {
    const state = stateWith(items);
    const before = ids(state.todos);
    getVisibleTodos(state);
    assert.deepEqual(ids(state.todos), before);
  });
});

test.describe("getProgress", () => {
  test("할 일이 0개면 모두 0%다", () => {
    const empty = { done: 0, total: 0, percent: 0 };
    assert.deepEqual(getProgress([]), { all: empty, work: empty, personal: empty, study: empty });
  });

  test("퍼센트를 반올림한다 (12개 중 7개 → 58%)", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ id: "t" + i, completed: i < 7 }));
    assert.deepEqual(getProgress(stateWith(items).todos).all, { done: 7, total: 12, percent: 58 });
  });

  test("카테고리별로 집계한다", () => {
    const state = stateWith([
      { id: "w1", category: "work", completed: true },
      { id: "w2", category: "work" },
      { id: "p1", category: "personal", completed: true },
      { id: "s1", category: "study" },
    ]);
    const progress = getProgress(state.todos);
    assert.deepEqual(progress.all, { done: 2, total: 4, percent: 50 });
    assert.deepEqual(progress.work, { done: 1, total: 2, percent: 50 });
    assert.deepEqual(progress.personal, { done: 1, total: 1, percent: 100 });
    assert.deepEqual(progress.study, { done: 0, total: 1, percent: 0 });
  });
});

test.describe("parseSaved", () => {
  const validTodo = {
    id: "a",
    text: "보고서",
    category: "work",
    completed: false,
    createdAt: 10,
    completedAt: null,
  };

  test("정상 데이터를 불러온다", () => {
    const saved = {
      version: 1,
      todos: [validTodo],
      settings: { filter: "study", lastCategory: "personal" },
    };
    assert.deepEqual(parseSaved(JSON.stringify(saved)), { state: saved, status: "ok" });
  });

  test("저장된 값이 없으면 빈 상태로 시작한다", () => {
    for (const raw of [null, undefined, ""]) {
      assert.deepEqual(parseSaved(raw), { state: createState(), status: "empty" });
    }
  });

  test("JSON을 읽을 수 없으면 corrupt다", () => {
    assert.deepEqual(parseSaved("{깨진 JSON"), { state: createState(), status: "corrupt" });
  });

  test("version이 1이 아니면 corrupt다", () => {
    const raw = JSON.stringify({ version: 2, todos: [], settings: {} });
    assert.deepEqual(parseSaved(raw), { state: createState(), status: "corrupt" });
  });

  test("객체가 아니거나 todos가 배열이 아니면 corrupt다", () => {
    for (const value of [[], 42, "text", { version: 1, todos: "x" }]) {
      assert.equal(parseSaved(JSON.stringify(value)).status, "corrupt");
    }
  });

  test("형식이 틀린 항목만 버리고 나머지는 불러온다", () => {
    const raw = JSON.stringify({
      version: 1,
      todos: [
        validTodo,
        { ...validTodo, id: "" },
        { ...validTodo, id: "b", text: "   " },
        { ...validTodo, id: "d", category: "hobby" },
        { ...validTodo, id: "e", completed: "yes" },
        { ...validTodo, id: "f", createdAt: "어제" },
        null,
        { ...validTodo, text: "id 중복" },
        { ...validTodo, id: "g", text: "정상" },
      ],
      settings: { filter: "all", lastCategory: "work" },
    });
    const { state, status } = parseSaved(raw);
    assert.equal(status, "ok");
    assert.deepEqual(ids(state.todos), ["a", "g"]);
  });

  test("100자를 넘는 내용은 버리지 않고 100자로 자른다", () => {
    const raw = JSON.stringify({ version: 1, todos: [{ ...validTodo, text: "x".repeat(200) }] });
    const { state } = parseSaved(raw);
    assert.equal(state.todos.length, 1);
    assert.equal(state.todos[0].text.length, 100);
  });

  test("completedAt이 없던 예전 데이터는 null로 채운다", () => {
    const { completedAt, ...old } = validTodo;
    const raw = JSON.stringify({ version: 1, todos: [old, { ...old, id: "b", completed: true }] });
    const { state } = parseSaved(raw);
    assert.deepEqual(state.todos.map((t) => t.completedAt), [null, null]);
  });

  test("완료 항목의 completedAt은 유지하고, 미완료 항목은 null로 바꾼다", () => {
    const raw = JSON.stringify({
      version: 1,
      todos: [
        { ...validTodo, completed: true, completedAt: 99 },
        { ...validTodo, id: "b", completed: false, completedAt: 99 },
      ],
    });
    assert.deepEqual(parseSaved(raw).state.todos.map((t) => t.completedAt), [99, null]);
  });

  test("잘못된 설정 값은 기본값으로 바꾼다", () => {
    const raw = JSON.stringify({
      version: 1,
      todos: [],
      settings: { filter: "done", lastCategory: 3 },
    });
    assert.deepEqual(parseSaved(raw).state.settings, { filter: "all", lastCategory: "work" });
  });

  test("settings가 없어도 기본값으로 불러온다", () => {
    const raw = JSON.stringify({ version: 1, todos: [validTodo] });
    const { state, status } = parseSaved(raw);
    assert.equal(status, "ok");
    assert.deepEqual(state.settings, { filter: "all", lastCategory: "work" });
  });
});
