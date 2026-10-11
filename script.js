
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskDate = document.getElementById("taskDate");
const taskPriority = document.getElementById("taskPriority");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("formTitle");
const clearBtn = document.getElementById("clearBtn");

const STORAGE_KEY = "tasks";
const validPriorities = ["low", "medium", "high"];

let tasks = [];
let currentFilter = "all";
let editingId = null;

// Safely load tasks and keep compatibility with the old version.
try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (Array.isArray(saved)) {
        tasks = saved
            .filter(task => task && typeof task.text === "string")
            .map((task, index) => ({
                id: task.id ?? `task-${index}-${task.text}`,
                text: task.text,
                completed: Boolean(task.completed),
                dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
                priority: validPriorities.includes(task.priority)
                    ? task.priority
                    : "medium"
            }));
    }
} catch (error) {
    console.error("Could not load saved tasks:", error);
    tasks = [];
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        alert("Could not save tasks. Check your browser storage settings.");
        console.error("Could not save tasks:", error);
    }
}

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) return "";

    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

// Create elements safely, without inserting task text as HTML.
function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function getVisibleTasks() {
    if (currentFilter === "active") {
        return tasks.filter(task => !task.completed);
    }

    if (currentFilter === "completed") {
        return tasks.filter(task => task.completed);
    }

    return tasks;
}

function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const active = total - completed;
    const percent = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    document.getElementById("totalCount").textContent = total;
    document.getElementById("activeCount").textContent = active;
    document.getElementById("completedCount").textContent = completed;

    document.getElementById("allFilterCount").textContent = total;
    document.getElementById("activeFilterCount").textContent = active;
    document.getElementById("completedFilterCount").textContent = completed;

    document.getElementById("progressPercent").textContent = `${percent}%`;

    const progressBar = document.getElementById("progressBar");
    const progressTrack = document.getElementById("progressTrack");

    progressBar.style.width = `${percent}%`;
    progressTrack.setAttribute("aria-valuenow", percent);

    document.getElementById("progressMessage").textContent =
        total === 0
            ? "Let's get things done!"
            : percent === 100
                ? "Amazing! All tasks completed."
                : `${completed} of ${total} tasks completed`;
}

function renderTasks() {
    taskList.replaceChildren();

    const visibleTasks = getVisibleTasks();
    emptyState.classList.toggle("hidden", visibleTasks.length !== 0);
    taskList.classList.toggle("hidden", visibleTasks.length === 0);

    if (visibleTasks.length === 0) {
        const message = emptyState.querySelector("p");

        if (tasks.length > 0 && currentFilter === "active") {
            message.textContent = "No active tasks. You're all caught up!";
        } else if (tasks.length > 0 && currentFilter === "completed") {
            message.textContent = "No completed tasks in this view yet.";
        } else {
            message.textContent = "Add a task above and start making progress.";
        }
    }

    visibleTasks.forEach(task => {
        const li = makeElement(
            "li",
            `task-item${task.completed ? " completed" : ""}`
        );

        const checkbox = makeElement("input", "task-check");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", `Complete ${task.text}`);

        checkbox.addEventListener("change", () => {
            task.completed = checkbox.checked;
            saveTasks();
            renderTasks();
        });

        const content = makeElement("div", "task-content");
        const title = makeElement("span", "task-title", task.text);
        content.appendChild(title);

        const meta = makeElement("div", "task-meta");
        const priorityName =
            task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

        meta.appendChild(
            makeElement(
                "span",
                `priority priority-${task.priority}`,
                `${priorityName} priority`
            )
        );

        if (task.dueDate) {
            const overdue =
                !task.completed && task.dueDate < localDateString();

            const dueLabel = overdue
                ? `Overdue · ${formatDate(task.dueDate)}`
                : `Due · ${formatDate(task.dueDate)}`;

            meta.appendChild(
                makeElement(
                    "span",
                    `due-date${overdue ? " overdue" : ""}`,
                    dueLabel
                )
            );
        }

        content.appendChild(meta);

        const actions = makeElement("div", "task-actions");

        const editBtn = makeElement("button", "icon-btn", "Edit");
        editBtn.type = "button";
        editBtn.setAttribute("aria-label", `Edit ${task.text}`);
        editBtn.addEventListener("click", () => startEditing(task));

        const deleteBtn = makeElement("button", "icon-btn delete-btn", "Delete");
        deleteBtn.type = "button";
        deleteBtn.setAttribute("aria-label", `Delete ${task.text}`);
        deleteBtn.addEventListener("click", () => deleteTask(task.id));

        actions.append(editBtn, deleteBtn);
        li.append(checkbox, content, actions);
        taskList.appendChild(li);
    });

    updateProgress();

    document.querySelectorAll(".filter-btn").forEach(button => {
        const selected = button.dataset.filter === currentFilter;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
}

function resetForm() {
    editingId = null;
    taskForm.reset();
    taskPriority.value = "medium";
    formTitle.textContent = "Add a new task";
    saveBtn.textContent = "+ Add Task";
    cancelEditBtn.classList.add("hidden");
}

function startEditing(task) {
    editingId = task.id;
    taskInput.value = task.text;
    taskDate.value = task.dueDate;
    taskPriority.value = task.priority;

    formTitle.textContent = "Edit your task";
    saveBtn.textContent = "Save Changes";
    cancelEditBtn.classList.remove("hidden");

    taskInput.focus();
    taskForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);

    if (editingId === id) resetForm();

    saveTasks();
    renderTasks();
}

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const text = taskInput.value.trim();

    if (!text) {
        taskInput.focus();
        return;
    }

    if (taskDate.value && !/^\d{4}-\d{2}-\d{2}$/.test(taskDate.value)) {
        alert("Please choose a valid due date.");
        return;
    }

    if (editingId !== null) {
        const task = tasks.find(item => item.id === editingId);

        if (task) {
            task.text = text;
            task.dueDate = taskDate.value;
            task.priority = taskPriority.value;
        }
    } else {
        tasks.push({
            id: (window.crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
            text,
            completed: false,
            dueDate: taskDate.value,
            priority: taskPriority.value
        });
    }

    saveTasks();
    resetForm();
    renderTasks();
    taskInput.focus();
});

cancelEditBtn.addEventListener("click", () => {
    resetForm();
});

document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        renderTasks();
    });
});

clearBtn.addEventListener("click", () => {
    if (tasks.length === 0) {
        alert("There are no tasks to clear.");
        return;
    }

    if (confirm("Delete all tasks? This cannot be undone.")) {
        tasks = [];
        resetForm();
        saveTasks();
        renderTasks();
    }
});

// Render saved tasks on page load.
renderTasks();
