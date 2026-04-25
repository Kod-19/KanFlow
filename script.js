// DOM Elements
const todoColumn = document.getElementById("todo-content");
const inprogressColumn = document.getElementById("inprogress-content");
const doneColumn = document.getElementById("done-content");

const todoProgressBar = document.getElementById("todo-progress");
const todoProgressText = document.getElementById("todo-progress-text");
const inprogressProgressBar = document.getElementById("inprogress-progress");
const inprogressProgressText = document.getElementById("inprogress-progress-text");
const doneProgressBar = document.getElementById("done-progress");
const doneProgressText = document.getElementById("done-progress-text");

const todoCountBadge = document.getElementById("todo-count");
const inprogressCountBadge = document.getElementById("inprogress-count");
const doneCountBadge = document.getElementById("done-count");

const viewTrashBtn = document.getElementById("view-trash-btn");
const trashPage = document.getElementById("trash-page");
const backFromTrashBtn = document.getElementById("back-from-trash");
const emptyTrashPageBtn = document.getElementById("empty-trash-page-btn");
const trashPageItems = document.getElementById("trash-page-items");

const modal = document.getElementById("modal");
const modalTitle = document.querySelector(".modal-header h2");
const closeBtn = document.querySelector(".close");
const cancelModalBtn = document.getElementById("cancel-modal");
const saveCardBtn = document.getElementById("save-card");
const clearDueBtn = document.getElementById("clear-due-btn");
const cardInput = document.getElementById("card-input");
const cardDescriptionInput = document.getElementById("card-description");
const cardDueTimeInput = document.getElementById("card-due-time");
const titleLabel = document.querySelector('label[for="card-input"]');
const descriptionLabel = document.querySelector('label[for="card-description"]');
const dueLabel = document.querySelector('label[for="card-due-time"]');

const columns = {
    todo: todoColumn,
    inprogress: inprogressColumn,
    done: doneColumn
};

const COLUMN_NAMES = {
    todo: "To Do",
    inprogress: "In Progress",
    done: "Done"
};

let tasks = [];
let trashItems = [];

let currentColumn = "todo";
let modalMode = "create";
let activeTaskId = null;
let activeMenuTaskId = null;

let draggedTaskId = null;

// Touch drag state
let touchStartX = 0;
let touchStartY = 0;
let touchDraggedTaskId = null;
let touchDraggedCardEl = null;
let touchDragActive = false;
let touchClone = null;
let touchDropTarget = null;
let touchCurrentColumn = null;
let isScrolling = false;
let dragThresholdMet = false;
let touchPressTimer = null;
let touchCurrentX = 0;
let touchCurrentY = 0;
const DRAG_THRESHOLD = 10;
const TOUCH_LONG_PRESS_MS = 180;
const MOBILE_BREAKPOINT = 768;
const EDGE_SCROLL_ZONE = 56;
const EDGE_SCROLL_STEP = 16;
let touchMoveRaf = null;
let touchNeedsFrame = false;

function generateId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatColumnName(column) {
    return COLUMN_NAMES[column] || column;
}

function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString();
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
}

function toDatetimeLocalValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
}

function findTaskById(taskId) {
    return tasks.find((task) => task.id === taskId) || null;
}

function saveState() {
    const state = {
        version: 2,
        tasks,
        trashItems
    };
    localStorage.setItem("kanbanState", JSON.stringify(state));
}

function parseLegacyTasksFromHtml(html, column) {
    if (!html) return [];
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const cards = Array.from(temp.querySelectorAll(".card"));
    const migrated = [];

    cards.forEach((card) => {
        const title = card.querySelector("h3")?.textContent?.trim();
        if (!title) return;
        migrated.push({
            id: generateId(),
            title,
            description: "",
            createdAt: new Date().toISOString(),
            dueAt: null,
            column
        });
    });

    return migrated;
}

function migrateLegacyState(parsedState) {
    const legacyTasks = [];
    legacyTasks.push(...parseLegacyTasksFromHtml(parsedState.todo, "todo"));
    legacyTasks.push(...parseLegacyTasksFromHtml(parsedState.inprogress, "inprogress"));
    legacyTasks.push(...parseLegacyTasksFromHtml(parsedState.done, "done"));

    let legacyTrash = [];
    try {
        const parsedTrash = typeof parsedState.trash === "string" ? JSON.parse(parsedState.trash) : [];
        if (Array.isArray(parsedTrash)) {
            legacyTrash = parsedTrash.map((item) => {
                const titleFromHtml = item?.html?.match(/<h3>([^<]+)<\/h3>/)?.[1] || "Untitled Task";
                return {
                    id: generateId(),
                    title: item?.title || titleFromHtml,
                    description: "",
                    createdAt: new Date().toISOString(),
                    dueAt: null,
                    column: item?.column || "todo",
                    deletedAt: item?.timestamp || new Date().toISOString()
                };
            });
        }
    } catch (err) {
        console.error("Legacy trash migration failed:", err);
    }

    tasks = legacyTasks;
    trashItems = legacyTrash;
    saveState();
}

function loadState() {
    const savedState = localStorage.getItem("kanbanState");
    if (!savedState) {
        tasks = [];
        trashItems = [];
        return;
    }

    try {
        const parsed = JSON.parse(savedState);
        const isStructured = parsed?.version === 2 && Array.isArray(parsed.tasks);

        if (isStructured) {
            tasks = parsed.tasks.map((task) => ({
                id: task.id || generateId(),
                title: task.title || "Untitled Task",
                description: task.description || "",
                createdAt: task.createdAt || new Date().toISOString(),
                dueAt: task.dueAt || null,
                column: ["todo", "inprogress", "done"].includes(task.column) ? task.column : "todo"
            }));

            trashItems = Array.isArray(parsed.trashItems)
                ? parsed.trashItems.map((item) => ({
                    id: item.id || generateId(),
                    title: item.title || "Untitled Task",
                    description: item.description || "",
                    createdAt: item.createdAt || new Date().toISOString(),
                    dueAt: item.dueAt || null,
                    column: ["todo", "inprogress", "done"].includes(item.column) ? item.column : "todo",
                    deletedAt: item.deletedAt || new Date().toISOString()
                }))
                : [];
            return;
        }

        migrateLegacyState(parsed);
    } catch (err) {
        console.error("Failed to load state:", err);
        tasks = [];
        trashItems = [];
    }
}

function createTaskElement(task) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.taskId = task.id;
    card.setAttribute("draggable", "true");

    const descriptionHtml = task.description
        ? `<p class="card-description">${escapeHtml(task.description)}</p>`
        : "";

    const dueHtml = task.dueAt
        ? `<p class="card-due">Due: ${escapeHtml(formatDateTime(task.dueAt))}</p>`
        : "";

    card.innerHTML = `
        <button class="card-options-btn" aria-label="Task options">⋯</button>
        <h3>${escapeHtml(task.title)}</h3>
        ${descriptionHtml}
        <div class="card-meta">
            <p>Added on ${escapeHtml(formatDate(task.createdAt))}</p>
            ${dueHtml}
        </div>
        <div class="card-options-menu" role="menu">
            <button class="card-menu-item" data-action="edit">Edit Task</button>
            <button class="card-menu-item" data-action="due">Set Due Time</button>
            <button class="card-menu-item danger" data-action="delete">Delete Task</button>
        </div>
    `;

    attachCardEvents(card);
    return card;
}

function renderAllTasks() {
    Object.values(columns).forEach((column) => {
        column.innerHTML = "";
    });

    ["todo", "inprogress", "done"].forEach((columnId) => {
        const columnTasks = tasks.filter((task) => task.column === columnId);
        columnTasks.forEach((task) => {
            columns[columnId].appendChild(createTaskElement(task));
        });
    });

    closeActiveMenu();
    updateProgressBars();
}

function updateColumnCounters() {
    const todoCount = tasks.filter((task) => task.column === "todo").length;
    const inprogressCount = tasks.filter((task) => task.column === "inprogress").length;
    const doneCount = tasks.filter((task) => task.column === "done").length;

    if (todoCountBadge) todoCountBadge.textContent = String(todoCount);
    if (inprogressCountBadge) inprogressCountBadge.textContent = String(inprogressCount);
    if (doneCountBadge) doneCountBadge.textContent = String(doneCount);
}

function updateColumnEmptyState(column, icon, message) {
    const cards = column.querySelectorAll(".card");
    const existingEmpty = column.querySelector(".empty-state");

    if (cards.length === 0 && !existingEmpty) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.innerHTML = `<span class="empty-icon">${icon}</span><p>${message}</p>`;
        column.appendChild(emptyState);
    }

    if (cards.length > 0 && existingEmpty) {
        existingEmpty.remove();
    }
}

function updateEmptyStates() {
    updateColumnEmptyState(todoColumn, "✨", "No tasks yet. Click \"Add Card\" to get started!");
    updateColumnEmptyState(inprogressColumn, "🚀", "No tasks in progress. Drag a task here!");
    updateColumnEmptyState(doneColumn, "🏆", "Completed tasks will appear here!");
}

function updateProgressBars() {
    const todoCount = tasks.filter((task) => task.column === "todo").length;
    const inprogressCount = tasks.filter((task) => task.column === "inprogress").length;
    const doneCount = tasks.filter((task) => task.column === "done").length;
    const totalCount = tasks.length;

    const todoPercent = totalCount > 0 ? (todoCount / totalCount) * 100 : 0;
    const inprogressPercent = totalCount > 0 ? (inprogressCount / totalCount) * 100 : 0;
    const donePercent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

    if (todoProgressBar) todoProgressBar.style.width = `${todoPercent}%`;
    if (todoProgressText) todoProgressText.textContent = `${Math.round(todoPercent)}%`;

    if (inprogressProgressBar) inprogressProgressBar.style.width = `${inprogressPercent}%`;
    if (inprogressProgressText) inprogressProgressText.textContent = `${Math.round(inprogressPercent)}%`;

    if (doneProgressBar) doneProgressBar.style.width = `${donePercent}%`;
    if (doneProgressText) doneProgressText.textContent = `${Math.round(donePercent)}%`;

    updateColumnCounters();
    updateEmptyStates();
    updateTrashButton();
}

function updateTrashButton() {
    if (!viewTrashBtn) return;
    const countSpan = viewTrashBtn.querySelector(".trash-count");
    if (countSpan) countSpan.textContent = String(trashItems.length);
}

function createTask({ title, description, dueAt, column }) {
    const task = {
        id: generateId(),
        title: title.trim(),
        description: (description || "").trim(),
        createdAt: new Date().toISOString(),
        dueAt: dueAt || null,
        column
    };
    tasks.push(task);
    saveState();
    renderAllTasks();
}

function updateTask(taskId, patch) {
    const idx = tasks.findIndex((task) => task.id === taskId);
    if (idx < 0) return;
    tasks[idx] = {
        ...tasks[idx],
        ...patch
    };
    saveState();
    renderAllTasks();
}

function deleteTask(taskId) {
    const idx = tasks.findIndex((task) => task.id === taskId);
    if (idx < 0) return;

    const [task] = tasks.splice(idx, 1);
    trashItems.unshift({
        ...task,
        deletedAt: new Date().toISOString()
    });

    saveState();
    renderAllTasks();
    updateTrashPageDisplay();
}

function moveTask(taskId, targetColumn) {
    const task = findTaskById(taskId);
    if (!task) return;
    task.column = targetColumn;
    saveState();
    renderAllTasks();
}

function restoreFromTrashToColumn(index, column) {
    if (index < 0 || index >= trashItems.length) return;
    const [item] = trashItems.splice(index, 1);

    const idInUse = tasks.some((task) => task.id === item.id);
    tasks.push({
        id: idInUse ? generateId() : item.id,
        title: item.title,
        description: item.description || "",
        createdAt: item.createdAt || new Date().toISOString(),
        dueAt: item.dueAt || null,
        column
    });

    saveState();
    renderAllTasks();
    updateTrashPageDisplay();
}

function updateTrashPageDisplay() {
    if (!trashPageItems) return;

    if (trashItems.length === 0) {
        trashPageItems.innerHTML = "<div class=\"no-items-message\">✨ No deleted items! Your trash is empty.</div>";
        return;
    }

    trashPageItems.innerHTML = "";
    trashItems.forEach((item, index) => {
        const trashCard = document.createElement("div");
        trashCard.className = "trash-item-card";
        trashCard.innerHTML = `
            <div class="trash-item-info">
                <h3>${escapeHtml(item.title)}</h3>
                <p>🗑️ Deleted from: <strong>${escapeHtml(formatColumnName(item.column))}</strong> | 🕒 ${escapeHtml(formatDateTime(item.deletedAt))}</p>
            </div>
            <div class="trash-item-actions">
                <select class="column-select" data-index="${index}">
                    <option value="">↩️ Restore to...</option>
                    <option value="todo">📝 To Do</option>
                    <option value="inprogress">⚡ In Progress</option>
                    <option value="done">✅ Done</option>
                </select>
                <button class="restore-btn" data-index="${index}">↻ Restore</button>
            </div>
        `;

        const select = trashCard.querySelector(".column-select");
        const restoreBtn = trashCard.querySelector(".restore-btn");
        restoreBtn.onclick = () => {
            const selectedColumn = select.value;
            if (!selectedColumn) {
                alert("Please select a column to restore to.");
                return;
            }
            restoreFromTrashToColumn(index, selectedColumn);
        };

        trashPageItems.appendChild(trashCard);
    });
}

function closeActiveMenu() {
    if (!activeMenuTaskId) return;
    const activeCard = document.querySelector(`.card[data-task-id="${activeMenuTaskId}"]`);
    const activeMenu = activeCard?.querySelector(".card-options-menu");
    if (activeMenu) activeMenu.classList.remove("open");
    activeMenuTaskId = null;
}

function toggleTaskMenu(taskId) {
    const card = document.querySelector(`.card[data-task-id="${taskId}"]`);
    if (!card) return;
    const menu = card.querySelector(".card-options-menu");
    if (!menu) return;

    if (activeMenuTaskId && activeMenuTaskId !== taskId) {
        closeActiveMenu();
    }

    const willOpen = !menu.classList.contains("open");
    menu.classList.toggle("open", willOpen);
    activeMenuTaskId = willOpen ? taskId : null;
}

function applyModalModeUI() {
    const showAllFields = modalMode !== "due";
    titleLabel.style.display = showAllFields ? "block" : "none";
    cardInput.style.display = showAllFields ? "block" : "none";
    descriptionLabel.style.display = showAllFields ? "block" : "none";
    cardDescriptionInput.style.display = showAllFields ? "block" : "none";

    dueLabel.style.display = "block";
    cardDueTimeInput.style.display = "block";
    clearDueBtn.style.display = activeTaskId ? "inline-block" : "none";

    if (modalMode === "create") {
        modalTitle.textContent = "➕ Create New Task";
        saveCardBtn.textContent = "Create Task";
    } else if (modalMode === "edit") {
        modalTitle.textContent = "✏️ Edit Task";
        saveCardBtn.textContent = "Save Changes";
    } else {
        modalTitle.textContent = "⏰ Set Due Time";
        saveCardBtn.textContent = "Save Due Time";
    }
}

function openTaskModal(mode, taskId = null, columnId = "todo") {
    modalMode = mode;
    activeTaskId = taskId;
    currentColumn = columnId;

    const task = taskId ? findTaskById(taskId) : null;

    cardInput.value = task?.title || "";
    cardDescriptionInput.value = task?.description || "";
    cardDueTimeInput.value = toDatetimeLocalValue(task?.dueAt || null);

    applyModalModeUI();
    modal.style.display = "flex";
    closeActiveMenu();

    if (modalMode === "due") {
        cardDueTimeInput.focus();
    } else {
        cardInput.focus();
    }
}

function closeModal() {
    modal.style.display = "none";
    modalMode = "create";
    activeTaskId = null;
    currentColumn = "todo";
}

function handleSaveFromModal() {
    const title = cardInput.value.trim();
    const description = cardDescriptionInput.value.trim();
    const dueAt = fromDatetimeLocalValue(cardDueTimeInput.value);

    if (modalMode === "create") {
        if (!title) {
            alert("Please enter a task title.");
            return;
        }
        createTask({ title, description, dueAt, column: currentColumn });
        closeModal();
        return;
    }

    if (!activeTaskId) return;

    if (modalMode === "edit") {
        if (!title) {
            alert("Please enter a task title.");
            return;
        }
        updateTask(activeTaskId, { title, description, dueAt });
    } else if (modalMode === "due") {
        updateTask(activeTaskId, { dueAt });
    }

    closeModal();
}

function showAddCardPrompt(columnId) {
    openTaskModal("create", null, columnId);
}

function attachCardEvents(card) {
    card.addEventListener("dragstart", dragStart);
    card.addEventListener("dragend", dragEnd);
    card.addEventListener("touchstart", touchDragStart, { passive: false });
    card.addEventListener("touchmove", touchDragMove, { passive: false });
    card.addEventListener("touchend", touchDragEnd);
    card.addEventListener("touchcancel", touchDragEnd);

    const optionsBtn = card.querySelector(".card-options-btn");
    const menu = card.querySelector(".card-options-menu");
    const taskId = card.dataset.taskId;

    optionsBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleTaskMenu(taskId);
    });

    optionsBtn.addEventListener("touchstart", (event) => event.stopPropagation(), { passive: true });
    menu.addEventListener("touchstart", (event) => event.stopPropagation(), { passive: true });

    menu.querySelectorAll(".card-menu-item").forEach((menuItem) => {
        menuItem.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const action = menuItem.dataset.action;
            if (action === "edit") {
                openTaskModal("edit", taskId);
            } else if (action === "due") {
                openTaskModal("due", taskId);
            } else if (action === "delete") {
                deleteTask(taskId);
            }
            closeActiveMenu();
        });
    });
}

function dragStart(event) {
    const card = event.target.closest(".card");
    if (!card) return;

    if (event.target.closest(".card-options-btn") || event.target.closest(".card-options-menu")) {
        event.preventDefault();
        return;
    }

    draggedTaskId = card.dataset.taskId;
    if (!draggedTaskId) return;
    event.dataTransfer.setData("text/plain", draggedTaskId);
    event.dataTransfer.effectAllowed = "move";
    card.classList.add("dragging");
    closeActiveMenu();
}

function dragEnd(event) {
    const card = event.target.closest(".card");
    if (card) card.classList.remove("dragging");
    draggedTaskId = null;
}

function makeColumnDroppable(columnElement, columnId) {
    columnElement.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        columnElement.classList.add("dragover");
    });

    columnElement.addEventListener("dragleave", () => {
        columnElement.classList.remove("dragover");
    });

    columnElement.addEventListener("drop", (event) => {
        event.preventDefault();
        columnElement.classList.remove("dragover");
        if (draggedTaskId) {
            moveTask(draggedTaskId, columnId);
        }
    });
}

function makeTrashZoneDroppable() {
    const trashZone = document.getElementById("trash-drop-zone");

    trashZone.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        trashZone.classList.add("drag-over");
    });

    trashZone.addEventListener("dragleave", () => {
        trashZone.classList.remove("drag-over");
    });

    trashZone.addEventListener("drop", (event) => {
        event.preventDefault();
        trashZone.classList.remove("drag-over");
        if (draggedTaskId) {
            deleteTask(draggedTaskId);
        }
    });
}

function touchDragStart(event) {
    const card = event.target.closest(".card");
    if (!card) return;
    if (event.target.closest(".card-options-btn") || event.target.closest(".card-options-menu")) return;

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchCurrentX = touch.clientX;
    touchCurrentY = touch.clientY;
    touchDraggedCardEl = card;
    touchDraggedTaskId = card.dataset.taskId;
    touchCurrentColumn = findTaskById(touchDraggedTaskId)?.column || null;
    touchDragActive = false;
    isScrolling = false;
    dragThresholdMet = false;

    if (touchPressTimer) clearTimeout(touchPressTimer);
    const pressDelay = window.innerWidth <= MOBILE_BREAKPOINT ? 130 : TOUCH_LONG_PRESS_MS;
    touchPressTimer = setTimeout(() => {
        if (!touchDraggedTaskId || !touchDraggedCardEl || isScrolling || dragThresholdMet || touchDragActive) return;
        beginTouchDrag(touchCurrentX, touchCurrentY);
    }, pressDelay);
}

function beginTouchDrag(clientX, clientY) {
    if (!touchDraggedCardEl || touchDragActive) return;

    touchDragActive = true;
    closeActiveMenu();
    touchDraggedCardEl.classList.add("dragging");
    touchDraggedCardEl.style.opacity = "0.3";

    touchClone = touchDraggedCardEl.cloneNode(true);
    touchClone.style.position = "fixed";
    touchClone.style.top = `${clientY}px`;
    touchClone.style.left = `${clientX}px`;
    touchClone.style.width = `${touchDraggedCardEl.offsetWidth}px`;
    touchClone.style.opacity = "0.8";
    touchClone.style.pointerEvents = "none";
    touchClone.style.zIndex = "9999";
    touchClone.style.transform = "translate(-50%, -50%)";
    touchClone.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.3)";
    touchClone.style.willChange = "transform, top, left";
    touchClone.style.transition = "none";
    document.body.appendChild(touchClone);

    if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
    }

    document.querySelectorAll(".column-content").forEach((column) => {
        column.classList.add("drag-target-ready");
    });
    document.getElementById("trash-drop-zone").classList.add("drag-target-ready");
}

function touchDragMove(event) {
    if (!touchDraggedTaskId || !touchDraggedCardEl) return;
    const touch = event.touches[0];
    touchCurrentX = touch.clientX;
    touchCurrentY = touch.clientY;
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);

    if (!isScrolling && !dragThresholdMet) {
        if (deltaY > DRAG_THRESHOLD && deltaY > deltaX) {
            if (touchPressTimer) {
                clearTimeout(touchPressTimer);
                touchPressTimer = null;
            }
            isScrolling = true;
            touchDraggedTaskId = null;
            touchDraggedCardEl = null;
            return;
        }

        if (deltaX > DRAG_THRESHOLD && deltaX > deltaY) {
            dragThresholdMet = true;
            event.preventDefault();
            if (touchPressTimer) {
                clearTimeout(touchPressTimer);
                touchPressTimer = null;
            }
            beginTouchDrag(touch.clientX, touch.clientY);
        }
    }

    if (touchDragActive && touchClone) {
        event.preventDefault();
        touchNeedsFrame = true;
        if (!touchMoveRaf) {
            touchMoveRaf = requestAnimationFrame(processTouchDragFrame);
        }
    }
}

function processTouchDragFrame() {
    touchMoveRaf = null;
    if (!touchDragActive || !touchClone || !touchNeedsFrame) return;
    touchNeedsFrame = false;

    touchClone.style.top = `${touchCurrentY}px`;
    touchClone.style.left = `${touchCurrentX}px`;

    const elementAtCursor = document.elementFromPoint(touchCurrentX, touchCurrentY);
    const columnContent = elementAtCursor?.closest(".column-content");
    const trashZone = elementAtCursor?.closest("#trash-drop-zone");

    document.querySelectorAll(".column-content, #trash-drop-zone").forEach((el) => {
        el.classList.remove("drag-over");
    });

    if (columnContent) {
        columnContent.classList.add("drag-over");
        touchDropTarget = columnContent;
    } else if (trashZone) {
        trashZone.classList.add("drag-over");
        touchDropTarget = trashZone;
    } else {
        touchDropTarget = null;
    }

    maybeAutoScrollDuringTouchDrag(columnContent);

    if (touchNeedsFrame) {
        touchMoveRaf = requestAnimationFrame(processTouchDragFrame);
    }
}

function maybeAutoScrollDuringTouchDrag(columnContent) {
    const edgeZone = window.innerWidth <= MOBILE_BREAKPOINT ? EDGE_SCROLL_ZONE : 40;
    const scrollStep = window.innerWidth <= MOBILE_BREAKPOINT ? EDGE_SCROLL_STEP : 10;

    if (columnContent) {
        const rect = columnContent.getBoundingClientRect();
        const nearTop = touchCurrentY < rect.top + edgeZone;
        const nearBottom = touchCurrentY > rect.bottom - edgeZone;

        if (nearTop) {
            columnContent.scrollBy({ top: -scrollStep, behavior: "auto" });
        } else if (nearBottom) {
            columnContent.scrollBy({ top: scrollStep, behavior: "auto" });
        }
        return;
    }

    const nearTop = touchCurrentY < edgeZone;
    const nearBottom = touchCurrentY > window.innerHeight - edgeZone;
    if (nearTop) {
        window.scrollBy({ top: -scrollStep, behavior: "auto" });
    } else if (nearBottom) {
        window.scrollBy({ top: scrollStep, behavior: "auto" });
    }
}

function touchDragEnd(event) {
    if (touchPressTimer) {
        clearTimeout(touchPressTimer);
        touchPressTimer = null;
    }

    if (touchMoveRaf) {
        cancelAnimationFrame(touchMoveRaf);
        touchMoveRaf = null;
    }
    touchNeedsFrame = false;

    if (touchClone) {
        touchClone.remove();
        touchClone = null;
    }

    if (touchDragActive && touchDraggedTaskId && touchDraggedCardEl) {
        event.preventDefault();
        touchDraggedCardEl.style.opacity = "1";
        touchDraggedCardEl.classList.remove("dragging");

        if (touchDropTarget) {
            if (touchDropTarget.id === "trash-drop-zone") {
                deleteTask(touchDraggedTaskId);
            } else {
                const destinationColumnId = touchDropTarget.id.replace("-content", "");
                if (["todo", "inprogress", "done"].includes(destinationColumnId) && touchCurrentColumn !== destinationColumnId) {
                    moveTask(touchDraggedTaskId, destinationColumnId);
                } else {
                    renderAllTasks();
                }
            }
        } else {
            renderAllTasks();
        }
    }

    document.querySelectorAll(".column-content, #trash-drop-zone").forEach((el) => {
        el.classList.remove("drag-over", "drag-target-ready");
    });

    touchDraggedTaskId = null;
    touchDraggedCardEl = null;
    touchDragActive = false;
    touchCurrentColumn = null;
    touchDropTarget = null;
    isScrolling = false;
    dragThresholdMet = false;
    touchCurrentX = 0;
    touchCurrentY = 0;
    touchStartX = 0;
    touchStartY = 0;
}

function showTrashPage() {
    trashPage.classList.add("show");
    document.body.style.overflow = "hidden";
    updateTrashPageDisplay();
}

function hideTrashPage() {
    trashPage.classList.remove("show");
    document.body.style.overflow = "";
}

function updateInstructions() {
    const instructionsBar = document.getElementById("instructions-bar");
    if (!instructionsBar) return;
    const width = window.innerWidth;

    if (width > 768) {
        instructionsBar.innerHTML = `
            <div class="instructions-desktop">
                <div class="instruction-item">
                    <span class="instruction-icon">➕</span>
                    <span class="instruction-text">Click "Add Card" to create tasks</span>
                </div>
                <div class="instruction-item">
                    <span class="instruction-icon">🖱️</span>
                    <span class="instruction-text">Drag cards between columns</span>
                </div>
                <div class="instruction-item">
                    <span class="instruction-icon">⋯</span>
                    <span class="instruction-text">Use options menu to edit, set due time, or delete</span>
                </div>
                <div class="instruction-item">
                    <span class="instruction-icon">🗑️</span>
                    <span class="instruction-text">Drag to trash bin</span>
                </div>
            </div>
        `;
    } else if (width > 480) {
        instructionsBar.innerHTML = `
            <div class="instructions-tablet">
                <div class="tablet-instruction">
                    <span class="instruction-icon">➕</span>
                    <span class="instruction-text">Tap "Add Card" to create</span>
                </div>
                <div class="tablet-instruction">
                    <span class="instruction-icon">👉</span>
                    <span class="instruction-text">Drag cards sideways to move</span>
                </div>
                <div class="tablet-instruction">
                    <span class="instruction-icon">⋯</span>
                    <span class="instruction-text">Tap menu for edit and due time</span>
                </div>
                <div class="tablet-instruction">
                    <span class="instruction-icon">📜</span>
                    <span class="instruction-text">Scroll to see all tasks</span>
                </div>
            </div>
        `;
    } else {
        instructionsBar.innerHTML = `
            <div class="instructions-mobile">
                <div class="mobile-instruction">
                    <span class="instruction-icon">➕</span>
                    <span class="instruction-text">Tap "Add Card" to make a new task</span>
                </div>
                <div class="mobile-instruction">
                    <span class="instruction-icon">👆➡️</span>
                    <span class="instruction-text">Tap & hold, then drag sideways to move tasks</span>
                </div>
                <div class="mobile-instruction">
                    <span class="instruction-icon">⋯</span>
                    <span class="instruction-text">Tap the menu button to edit, set due time, or delete</span>
                </div>
                <div class="mobile-instruction">
                    <span class="instruction-icon">📜</span>
                    <span class="instruction-text">Scroll up/down to see all your tasks</span>
                </div>
            </div>
        `;
    }
}

function handleGlobalClick(event) {
    if (!event.target.closest(".card-options-btn") && !event.target.closest(".card-options-menu")) {
        closeActiveMenu();
    }
    if (event.target === modal) closeModal();
    if (event.target === trashPage) hideTrashPage();
}

function handleEscapeKey(event) {
    if (event.key !== "Escape") return;
    if (modal.style.display === "flex") {
        closeModal();
    }
    closeActiveMenu();
}

function init() {
    makeColumnDroppable(todoColumn, "todo");
    makeColumnDroppable(inprogressColumn, "inprogress");
    makeColumnDroppable(doneColumn, "done");
    makeTrashZoneDroppable();

    loadState();
    renderAllTasks();
    updateTrashPageDisplay();
    updateInstructions();

    window.addEventListener("resize", updateInstructions);
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleEscapeKey);

    closeBtn.onclick = closeModal;
    if (cancelModalBtn) cancelModalBtn.onclick = closeModal;
    if (saveCardBtn) saveCardBtn.onclick = handleSaveFromModal;
    if (clearDueBtn) {
        clearDueBtn.onclick = () => {
            cardDueTimeInput.value = "";
        };
    }

    cardInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && modalMode !== "due") {
            handleSaveFromModal();
        }
    });

    viewTrashBtn.onclick = showTrashPage;
    backFromTrashBtn.onclick = hideTrashPage;
    emptyTrashPageBtn.onclick = () => {
        if (confirm("⚠️ Are you sure you want to permanently delete ALL items in the trash? This action cannot be undone.")) {
            trashItems = [];
            saveState();
            updateTrashButton();
            updateTrashPageDisplay();
        }
    };
}

window.showAddCardPrompt = showAddCardPrompt;
window.onload = init;
