// 화면 그리기, 이벤트 처리, localStorage 저장.
// 상태 변경은 항상 "이벤트 → TodoCore 함수로 새 상태 → save() → render()" 흐름으로만 한다.
(function () {
  "use strict";

  const STORAGE_KEY = "todo-app:v1";
  const CATEGORY_LABELS = { work: "업무", personal: "개인", study: "공부" };

  const els = {
    form: document.getElementById("add-form"),
    category: document.getElementById("category-select"),
    input: document.getElementById("todo-input"),
    list: document.getElementById("todo-list"),
  };

  let state = load();

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      // 저장소를 쓸 수 없으면 빈 목록으로 시작한다.
    }
    return TodoCore.parseSaved(raw).state;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 저장에 실패해도 앱은 계속 동작한다.
    }
  }

  function commit(next) {
    if (next === state) return;
    state = next;
    save();
    render();
  }

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  // ---------- 그리기 ----------

  function render() {
    renderProgress();
    renderList();
  }

  function setBar(id, percent) {
    const bar = document.getElementById(id);
    bar.setAttribute("aria-valuenow", String(percent));
    bar.querySelector(".bar-fill").style.width = percent + "%";
  }

  function renderProgress() {
    const progress = TodoCore.getProgress(state.todos);
    const { all } = progress;
    document.getElementById("progress-all-text").textContent =
      `${all.done} / ${all.total} · ${all.percent}%`;
    setBar("progress-all-bar", all.percent);

    for (const category of TodoCore.CATEGORIES) {
      const { done, total, percent } = progress[category];
      document.getElementById(`progress-${category}-text`).textContent = `${done}/${total}`;
      setBar(`progress-${category}-bar`, percent);
    }
  }

  function renderList() {
    els.list.replaceChildren(...TodoCore.getVisibleTodos(state).map(renderItem));
  }

  function renderItem(todo) {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.completed ? " completed" : "");
    li.dataset.id = todo.id;

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "todo-toggle";
    toggle.checked = todo.completed;
    toggle.setAttribute("aria-label", `${todo.text} 완료`);

    const badge = document.createElement("span");
    badge.className = `badge badge-${todo.category}`;
    badge.textContent = CATEGORY_LABELS[todo.category];

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "todo-delete";
    del.textContent = "삭제";
    del.setAttribute("aria-label", `${todo.text} 삭제`);

    li.append(toggle, badge, text, del);
    return li;
  }

  // ---------- 이벤트 ----------

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = TodoCore.addTodo(state, {
      id: newId(),
      text: els.input.value,
      category: els.category.value,
      now: Date.now(),
    });
    if (next !== state) els.input.value = "";
    commit(next);
    els.input.focus();
  });

  els.list.addEventListener("change", (event) => {
    if (!event.target.classList.contains("todo-toggle")) return;
    const id = event.target.closest(".todo-item").dataset.id;
    commit(TodoCore.toggleTodo(state, id));
  });

  els.list.addEventListener("click", (event) => {
    const button = event.target.closest(".todo-delete");
    if (!button) return;
    const id = button.closest(".todo-item").dataset.id;
    commit(TodoCore.deleteTodo(state, id));
  });

  // ---------- 시작 ----------

  els.category.value = state.settings.lastCategory;
  render();
})();
