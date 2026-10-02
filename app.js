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
    filters: document.getElementById("filters"),
    empty: document.getElementById("empty-message"),
    clearCompleted: document.getElementById("clear-completed"),
    notice: document.getElementById("notice"),
  };

  // 저장소를 쓸 수 있는지, 불러온 데이터가 손상됐었는지. 안내 문구에 쓴다.
  let storageOk = true;
  let loadedCorrupt = false;
  let state = load();
  // 지금 수정 중인 할 일의 id. 화면 상태라 저장하지 않는다.
  let editingId = null;

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      storageOk = false;
    }

    const { state: loaded, status } = TodoCore.parseSaved(raw);
    if (status === "corrupt") {
      loadedCorrupt = true;
      try {
        localStorage.setItem(STORAGE_KEY + ":corrupt", raw);
      } catch {
        storageOk = false;
      }
    }
    return loaded;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 저장에 실패해도 앱은 계속 동작한다.
      storageOk = false;
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
    renderNotice();
    renderProgress();
    renderFilters();
    renderList();
    renderFooter();
  }

  function renderNotice() {
    let message = "";
    if (!storageOk) {
      message = "이 브라우저에서는 저장되지 않습니다";
    } else if (loadedCorrupt) {
      message = "저장된 데이터를 읽을 수 없어 새로 시작합니다";
    }
    els.notice.textContent = message;
    els.notice.hidden = message === "";
  }

  function renderFilters() {
    for (const button of els.filters.querySelectorAll("[data-filter]")) {
      const pressed = button.dataset.filter === state.settings.filter;
      button.setAttribute("aria-pressed", String(pressed));
    }
  }

  function renderFooter() {
    const { done } = TodoCore.getProgress(state.todos).all;
    els.clearCompleted.hidden = done === 0;
    els.clearCompleted.textContent = `완료 항목 지우기 (${done})`;
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
    const visible = TodoCore.getVisibleTodos(state);
    els.list.replaceChildren(...visible.map(renderItem));

    if (state.todos.length === 0) {
      els.empty.textContent = "할 일을 추가해 보세요";
    } else if (visible.length === 0) {
      els.empty.textContent = "이 카테고리에 할 일이 없습니다";
    }
    els.empty.hidden = visible.length > 0;

    const editInput = els.list.querySelector(".todo-edit-input");
    if (editInput) {
      editInput.focus();
      editInput.setSelectionRange(editInput.value.length, editInput.value.length);
    }
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

    let text;
    if (todo.id === editingId) {
      text = document.createElement("input");
      text.type = "text";
      text.className = "todo-edit-input";
      text.maxLength = TodoCore.MAX_TEXT_LENGTH;
      text.value = todo.text;
      text.setAttribute("aria-label", `${todo.text} 수정`);
    } else {
      text = document.createElement("span");
      text.className = "todo-text";
      text.textContent = todo.text;
    }

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "todo-edit";
    edit.textContent = "수정";
    edit.setAttribute("aria-label", `${todo.text} 수정`);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "todo-delete";
    del.textContent = "삭제";
    del.setAttribute("aria-label", `${todo.text} 삭제`);

    li.append(toggle, badge, text, edit, del);
    return li;
  }

  // ---------- 수정 ----------

  function startEdit(id) {
    editingId = id;
    renderList();
  }

  // Enter 뒤에 blur가 이어서 와도 한 번만 처리하도록, 수정 중인 id일 때만 진행한다.
  function finishEdit(id, text) {
    if (editingId !== id) return;
    editingId = null;
    const next = TodoCore.updateTodoText(state, id, text);
    if (next === state) {
      renderList();
    } else {
      commit(next);
    }
  }

  function cancelEdit() {
    editingId = null;
    renderList();
  }

  function itemId(element) {
    return element.closest(".todo-item").dataset.id;
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
    commit(TodoCore.toggleTodo(state, itemId(event.target)));
  });

  els.list.addEventListener("click", (event) => {
    if (event.target.closest(".todo-delete")) {
      commit(TodoCore.deleteTodo(state, itemId(event.target)));
    } else if (event.target.closest(".todo-edit")) {
      startEdit(itemId(event.target));
    }
  });

  els.list.addEventListener("dblclick", (event) => {
    if (event.target.classList.contains("todo-text")) startEdit(itemId(event.target));
  });

  els.list.addEventListener("keydown", (event) => {
    if (!event.target.classList.contains("todo-edit-input")) return;
    // 한글 조합 중의 Enter는 조합을 끝내는 키라서 무시한다.
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      finishEdit(itemId(event.target), event.target.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  });

  els.list.addEventListener("focusout", (event) => {
    if (!event.target.classList.contains("todo-edit-input")) return;
    finishEdit(itemId(event.target), event.target.value);
  });

  els.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (button) commit(TodoCore.setFilter(state, button.dataset.filter));
  });

  els.clearCompleted.addEventListener("click", () => {
    const { done } = TodoCore.getProgress(state.todos).all;
    if (window.confirm(`완료한 할 일 ${done}개를 지울까요?`)) {
      commit(TodoCore.clearCompleted(state));
    }
  });

  // ---------- 시작 ----------

  els.category.value = state.settings.lastCategory;
  render();
})();
