const STORAGE_KEY = "agenda-tareas-web";
const ALERT_CHECK_INTERVAL_MS = 30000;

const taskForm = document.querySelector("#taskForm");
const taskList = document.querySelector("#taskList");
const messageArea = document.querySelector("#messageArea");
const enableNotificationsBtn = document.querySelector("#enableNotificationsBtn");
const clearMessagesBtn = document.querySelector("#clearMessagesBtn");
const formTitle = document.querySelector("#formTitle");
const submitTaskBtn = document.querySelector("#submitTaskBtn");
const cancelEditBtn = document.querySelector("#cancelEditBtn");
const searchFilter = document.querySelector("#searchFilter");
const statusFilter = document.querySelector("#statusFilter");
const dateFilter = document.querySelector("#dateFilter");
const priorityFilter = document.querySelector("#priorityFilter");
const periodFilter = document.querySelector("#periodFilter");
const clearFiltersBtn = document.querySelector("#clearFiltersBtn");
const resultsSummary = document.querySelector("#resultsSummary");
const calendarGrid = document.querySelector("#calendarGrid");
const calendarMonthLabel = document.querySelector("#calendarMonthLabel");
const selectedDateSummary = document.querySelector("#selectedDateSummary");
const prevMonthBtn = document.querySelector("#prevMonthBtn");
const nextMonthBtn = document.querySelector("#nextMonthBtn");
const resetCalendarBtn = document.querySelector("#resetCalendarBtn");
const dayViewBtn = document.querySelector("#dayViewBtn");
const monthViewBtn = document.querySelector("#monthViewBtn");
const weekViewBtn = document.querySelector("#weekViewBtn");
const dayCalendarView = document.querySelector("#dayCalendarView");
const dayCalendarStrip = document.querySelector("#dayCalendarStrip");
const monthCalendarView = document.querySelector("#monthCalendarView");
const weekCalendarView = document.querySelector("#weekCalendarView");
const weekCalendarGrid = document.querySelector("#weekCalendarGrid");

let tasks = loadTasks();
let editingTaskId = null;
let currentCalendarDate = dateFilter.value ? createDateFromInput(dateFilter.value) : new Date();
let currentCalendarView = "day";

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    return savedTasks ? JSON.parse(savedTasks) : [];
  } catch (error) {
    console.error("No se pudieron cargar las tareas.", error);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createTaskTimestamp(task) {
  return new Date(`${task.date}T${task.time}`).getTime();
}

function formatDate(task) {
  const taskDate = new Date(`${task.date}T${task.time}`);

  return taskDate.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeValue) {
  const [hours, minutes] = timeValue.split(":");
  return `${hours}:${minutes}`;
}

function getReminderLabel(task) {
  if (!task.alarmEnabled) {
    return "Desactivado";
  }

  if (task.reminderMinutes === 0) {
    return "Al momento";
  }

  return `${task.reminderMinutes} min antes`;
}

function getActiveFilters() {
  return {
    search: searchFilter.value.trim().toLowerCase(),
    status: statusFilter.value,
    date: dateFilter.value,
    priority: priorityFilter.value,
    period: periodFilter.value,
  };
}

function getTaskPriority(task) {
  return task.priority || "medium";
}

function getPriorityLabel(priority) {
  if (priority === "high") {
    return "Alta";
  }

  if (priority === "low") {
    return "Baja";
  }

  return "Media";
}

function getPriorityWeight(priority) {
  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  return 1;
}

function isSameDay(firstDate, secondDate) {
  return firstDate.toDateString() === secondDate.toDateString();
}

function isInCurrentWeek(taskDate, currentDate) {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - diffToMonday);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return taskDate >= startOfWeek && taskDate < endOfWeek;
}

function createDateFromInput(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCalendarMonth(date) {
  return date.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function formatSelectedDate(dateValue) {
  return createDateFromInput(dateValue).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatDayName(date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
  });
}

function getStartOfWeek(date) {
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);
  const diffToMonday = (baseDate.getDay() + 6) % 7;
  baseDate.setDate(baseDate.getDate() - diffToMonday);
  return baseDate;
}

function formatWeekRange(date) {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return `${startOfWeek.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  })} - ${endOfWeek.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function getTaskStatus(task) {
  if (task.completed) {
    return { key: "completed", label: "Completada" };
  }

  const now = Date.now();
  const taskTime = createTaskTimestamp(task);
  const diffMinutes = Math.round((taskTime - now) / 60000);

  if (diffMinutes < 0) {
    return { key: "overdue", label: "Urgente" };
  }

  if (diffMinutes <= 60) {
    return { key: "soon", label: "Proxima" };
  }

  return { key: "pending", label: "Pendiente" };
}

function getCalendarDayTasks(dateValue) {
  return tasks
    .filter((task) => task.date === dateValue)
    .sort((firstTask, secondTask) => createTaskTimestamp(firstTask) - createTaskTimestamp(secondTask));
}

function getCalendarDayTone(dayTasks) {
  if (dayTasks.some((task) => getTaskStatus(task).key === "overdue")) {
    return "has-overdue";
  }

  if (dayTasks.some((task) => getTaskStatus(task).key === "soon")) {
    return "has-soon";
  }

  if (dayTasks.some((task) => getTaskStatus(task).key === "pending")) {
    return "has-pending";
  }

  if (dayTasks.some((task) => getTaskStatus(task).key === "completed")) {
    return "has-completed";
  }

  return "";
}

function getDominantPriority(dayTasks) {
  const activeTasks = dayTasks.filter((task) => !task.completed);
  const sourceTasks = activeTasks.length ? activeTasks : dayTasks;

  if (!sourceTasks.length) {
    return "";
  }

  const counts = {
    high: 0,
    medium: 0,
    low: 0,
  };

  sourceTasks.forEach((task) => {
    counts[getTaskPriority(task)] += 1;
  });

  return Object.entries(counts).sort((firstEntry, secondEntry) => {
    if (secondEntry[1] !== firstEntry[1]) {
      return secondEntry[1] - firstEntry[1];
    }

    return getPriorityWeight(secondEntry[0]) - getPriorityWeight(firstEntry[0]);
  })[0][0];
}

function getCalendarDayPriorityTone(dayTasks) {
  const dominantPriority = getDominantPriority(dayTasks);
  return dominantPriority ? `priority-${dominantPriority}-day` : "";
}

function getCalendarPreviewMarkup(dayTasks, limit = 2) {
  const taskPreviews = dayTasks
    .slice(0, limit)
    .map((task) => {
      const status = getTaskStatus(task);
      const priority = getTaskPriority(task);
      return `
        <span class="calendar-task-item ${status.key} priority-${priority}">
          ${formatTime(task.time)} · ${escapeHtml(task.activity)}
        </span>
      `;
    })
    .join("");
  const moreCount =
    dayTasks.length > limit ? `<span class="calendar-more">+${dayTasks.length - limit} mas</span>` : "";

  return {
    taskPreviews,
    moreCount,
  };
}

function createCalendarDayButton(dayDate, options = {}) {
  const { showDayName = false, previewLimit = 2, extraClassName = "" } = options;
  const dayValue = formatDateInputValue(dayDate);
  const dayTasks = getCalendarDayTasks(dayValue);
  const dayStatusTone = getCalendarDayTone(dayTasks);
  const dayPriorityTone = getCalendarDayPriorityTone(dayTasks);
  const dominantPriority = getDominantPriority(dayTasks);
  const todayValue = formatDateInputValue(new Date());
  const selectedDateValue = dateFilter.value;
  const { taskPreviews, moreCount } = getCalendarPreviewMarkup(dayTasks, previewLimit);
  const button = document.createElement("button");

  button.type = "button";
  button.className = `calendar-day ${extraClassName} ${dayPriorityTone} ${dayStatusTone}`.trim();
  if (dayValue === todayValue) {
    button.classList.add("today");
  }
  if (selectedDateValue && dayValue === selectedDateValue) {
    button.classList.add("selected");
  }

  button.dataset.date = dayValue;
  button.setAttribute("aria-pressed", String(dayValue === selectedDateValue));
  button.innerHTML = `
    <div class="calendar-day-header">
      <div class="calendar-day-heading">
        ${showDayName ? `<span class="calendar-day-name">${escapeHtml(formatDayName(dayDate))}</span>` : ""}
        <span class="calendar-day-number">${dayDate.getDate()}</span>
      </div>
      ${dayTasks.length ? `<span class="calendar-task-count ${dominantPriority}">${dayTasks.length}</span>` : ""}
    </div>
    ${dominantPriority ? `<span class="calendar-day-priority">Prioridad dominante: ${getPriorityLabel(dominantPriority)}</span>` : ""}
    <div class="calendar-task-list">
      ${taskPreviews || '<span class="calendar-more">Sin actividades</span>'}
      ${moreCount}
    </div>
  `;

  return button;
}

function formatDayNameShort(date) {
  return date
    .toLocaleDateString("es-ES", {
      weekday: "short",
    })
    .replace(".", "");
}

function createDayStripButton(dayDate) {
  const dayValue = formatDateInputValue(dayDate);
  const dayTasks = getCalendarDayTasks(dayValue);
  const dayStatusTone = getCalendarDayTone(dayTasks);
  const dayPriorityTone = getCalendarDayPriorityTone(dayTasks);
  const dominantPriority = getDominantPriority(dayTasks);
  const todayValue = formatDateInputValue(new Date());
  const selectedDateValue = dateFilter.value;
  const button = document.createElement("button");

  button.type = "button";
  button.className = `day-strip-btn ${dayPriorityTone} ${dayStatusTone}`.trim();
  if (dayValue === todayValue) {
    button.classList.add("today");
  }
  if (selectedDateValue && dayValue === selectedDateValue) {
    button.classList.add("selected");
  }

  button.dataset.date = dayValue;
  button.setAttribute(
    "aria-label",
    `${formatDayName(dayDate)} ${dayDate.getDate()}, ${dayDate.getFullYear()}`
  );
  button.setAttribute("aria-pressed", String(dayValue === selectedDateValue));

  const weekday = document.createElement("span");
  weekday.className = "day-strip-weekday";
  weekday.textContent = formatDayNameShort(dayDate);

  const number = document.createElement("span");
  number.className = "day-strip-number";
  number.textContent = String(dayDate.getDate());

  button.append(weekday, number);

  if (dayTasks.length) {
    const badge = document.createElement("span");
    badge.className = `day-strip-count ${dominantPriority}`;
    badge.textContent = String(dayTasks.length);
    badge.setAttribute("aria-hidden", "true");
    button.appendChild(badge);
  }

  return button;
}

function updateSelectedDateSummary() {
  if (
    (currentCalendarView === "week" || currentCalendarView === "day") &&
    !dateFilter.value
  ) {
    selectedDateSummary.textContent = `Semana del ${formatWeekRange(
      currentCalendarDate
    )}. Selecciona un dia para filtrar la lista rapidamente.`;
    return;
  }

  if (!dateFilter.value) {
    selectedDateSummary.textContent =
      "Selecciona un dia para ver rapidamente las actividades pendientes.";
    return;
  }

  const dayTasks = getCalendarDayTasks(dateFilter.value);
  const pendingCount = dayTasks.filter((task) => !task.completed).length;
  const formattedDate = formatSelectedDate(dateFilter.value);

  if (!dayTasks.length) {
    selectedDateSummary.textContent = `No hay actividades registradas para ${formattedDate}.`;
    return;
  }

  if (!pendingCount) {
    selectedDateSummary.textContent = `Todas las actividades de ${formattedDate} ya estan completadas.`;
    return;
  }

  selectedDateSummary.textContent = `Tienes ${pendingCount} actividad${pendingCount === 1 ? "" : "es"} pendiente${pendingCount === 1 ? "" : "s"} para ${formattedDate}.`;
}

function updateCalendarHeader() {
  dayViewBtn.classList.toggle("is-active", currentCalendarView === "day");
  monthViewBtn.classList.toggle("is-active", currentCalendarView === "month");
  weekViewBtn.classList.toggle("is-active", currentCalendarView === "week");

  dayCalendarView.classList.toggle("hidden", currentCalendarView !== "day");
  monthCalendarView.classList.toggle("hidden", currentCalendarView !== "month");
  weekCalendarView.classList.toggle("hidden", currentCalendarView !== "week");

  if (currentCalendarView === "week" || currentCalendarView === "day") {
    calendarMonthLabel.textContent = formatWeekRange(currentCalendarDate);
    prevMonthBtn.textContent = "Semana anterior";
    nextMonthBtn.textContent = "Semana siguiente";
    return;
  }

  calendarMonthLabel.textContent = formatCalendarMonth(currentCalendarDate);
  prevMonthBtn.textContent = "Mes anterior";
  nextMonthBtn.textContent = "Mes siguiente";
}

function renderDayStrip() {
  dayCalendarStrip.innerHTML = "";
  const startOfWeek = getStartOfWeek(currentCalendarDate);

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + dayOffset);
    dayCalendarStrip.appendChild(createDayStripButton(dayDate));
  }
}

function renderMonthCalendar() {
  const visibleMonth = new Date(currentCalendarDate);
  visibleMonth.setDate(1);

  calendarGrid.innerHTML = "";

  const monthYear = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const firstDayOfMonth = new Date(monthYear, monthIndex, 1);
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();

  for (let index = 0; index < firstWeekday; index += 1) {
    const placeholder = document.createElement("div");
    placeholder.className = "calendar-day placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    calendarGrid.appendChild(placeholder);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayDate = new Date(monthYear, monthIndex, day);
    const button = createCalendarDayButton(dayDate);
    calendarGrid.appendChild(button);
  }
}

function renderWeekCalendar() {
  const startOfWeek = getStartOfWeek(currentCalendarDate);
  weekCalendarGrid.innerHTML = "";

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + dayOffset);
    const dayCard = createCalendarDayButton(dayDate, {
      showDayName: true,
      previewLimit: 4,
      extraClassName: "week-calendar-day",
    });
    weekCalendarGrid.appendChild(dayCard);
  }
}

function renderCalendar() {
  updateCalendarHeader();
  renderDayStrip();
  renderMonthCalendar();
  renderWeekCalendar();
  updateSelectedDateSummary();
}

function handleCalendarDateSelection(event) {
  const button = event.target.closest("button[data-date]");
  if (!button) {
    return;
  }

  const selectedDate = button.dataset.date;
  dateFilter.value = selectedDate;
  currentCalendarDate = createDateFromInput(selectedDate);
  updateTaskList();
}

function handleDateFilterChange() {
  if (dateFilter.value) {
    currentCalendarDate = createDateFromInput(dateFilter.value);
  }

  updateTaskList();
}

function moveCalendarMonth(offset) {
  if (currentCalendarView === "week" || currentCalendarView === "day") {
    const nextWeek = new Date(currentCalendarDate);
    nextWeek.setDate(currentCalendarDate.getDate() + offset * 7);
    currentCalendarDate = nextWeek;
  } else {
    currentCalendarDate = new Date(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth() + offset,
      1
    );
  }

  renderCalendar();
}

function clearCalendarDateFilter() {
  dateFilter.value = "";
  currentCalendarDate = new Date();
  updateTaskList();
}

function setCalendarView(view) {
  currentCalendarView = view;
  renderCalendar();
}

function updateFormMode() {
  const isEditing = editingTaskId !== null;

  formTitle.textContent = isEditing ? "Editar tarea" : "Nueva tarea";
  submitTaskBtn.textContent = isEditing ? "Guardar cambios" : "Guardar tarea";
  cancelEditBtn.classList.toggle("hidden", !isEditing);
}

function resetForm() {
  editingTaskId = null;
  taskForm.reset();
  document.querySelector("#taskAlarm").checked = true;
  updateFormMode();
}

function addMessage(text, tone = "info") {
  const emptyMessage = messageArea.querySelector(".empty-message");
  if (emptyMessage) {
    emptyMessage.remove();
  }

  const item = document.createElement("article");
  item.className = `message-item ${tone}`;

  const timestamp = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  item.innerHTML = `
    <strong>${timestamp}</strong>
    <p>${escapeHtml(text)}</p>
  `;

  messageArea.prepend(item);
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    addMessage("Este navegador no admite notificaciones del sistema.", "warning");
    return "denied";
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    addMessage("Notificaciones activadas correctamente.", "success");
  } else {
    addMessage("Las notificaciones fueron bloqueadas por el navegador.", "warning");
  }

  return permission;
}

function notifyTask(task) {
  const taskMoment = `${formatDate(task)} a las ${formatTime(task.time)}`;
  const message = `Recordatorio: ${task.activity} - ${taskMoment}`;

  addMessage(message, "warning");

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Alarma de cumplimiento", {
      body: message,
    });
  }
}

function getFilteredTasks() {
  const filters = getActiveFilters();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return tasks.filter((task) => {
    const status = getTaskStatus(task);
    const taskDate = new Date(`${task.date}T00:00:00`);
    const priority = getTaskPriority(task);
    const matchesSearch =
      !filters.search || task.activity.toLowerCase().includes(filters.search);
    const matchesStatus = filters.status === "all" || status.key === filters.status;
    const matchesDate = !filters.date || task.date === filters.date;
    const matchesPriority = filters.priority === "all" || priority === filters.priority;
    const matchesPeriod =
      filters.period === "all" ||
      (filters.period === "today" && isSameDay(taskDate, now)) ||
      (filters.period === "week" && isInCurrentWeek(taskDate, now));

    return matchesSearch && matchesStatus && matchesDate && matchesPriority && matchesPeriod;
  });
}

function updateTaskList() {
  const filteredTasks = getFilteredTasks();
  const sortedTasks = [...filteredTasks].sort((firstTask, secondTask) => {
    return createTaskTimestamp(firstTask) - createTaskTimestamp(secondTask);
  });

  if (!tasks.length) {
    resultsSummary.textContent = "Mostrando todas las tareas.";
  } else if (!filteredTasks.length) {
    resultsSummary.textContent = "No hay tareas que coincidan con los filtros.";
  } else if (filteredTasks.length === tasks.length) {
    resultsSummary.textContent = `Mostrando todas las tareas (${tasks.length}).`;
  } else {
    resultsSummary.textContent = `Mostrando ${filteredTasks.length} de ${tasks.length} tareas.`;
  }

  renderCalendar();

  if (!sortedTasks.length) {
    taskList.innerHTML = tasks.length
      ? '<p class="empty-state">No hay tareas con ese filtro.</p>'
      : '<p class="empty-state">Todavia no hay tareas registradas.</p>';
    return;
  }

  taskList.innerHTML = "";

  sortedTasks.forEach((task) => {
    const status = getTaskStatus(task);
    const priority = getTaskPriority(task);
    const taskItem = document.createElement("article");
    taskItem.className = `task-item ${status.key}`;

    taskItem.innerHTML = `
      <div class="task-header">
        <div>
          <h3 class="task-title">${escapeHtml(task.activity)}</h3>
          <p class="small-note">${task.alarmEnabled ? "Con alarma activa" : "Sin alarma"}${task.isDuplicate ? " | Tarea duplicada" : ""}</p>
        </div>
        <div class="task-badges">
          <span class="priority-chip ${priority}">${getPriorityLabel(priority)}</span>
          <span class="status-chip ${status.key}">${status.label}</span>
        </div>
      </div>

      <div class="task-meta-grid">
        <div class="task-meta">
          <strong>Fecha</strong>
          <span>${formatDate(task)}</span>
        </div>
        <div class="task-meta">
          <strong>Hora</strong>
          <span>${formatTime(task.time)}</span>
        </div>
        <div class="task-meta">
          <strong>Recordatorio</strong>
          <span>${getReminderLabel(task)}</span>
        </div>
        <div class="task-meta">
          <strong>Prioridad</strong>
          <span>${getPriorityLabel(priority)}</span>
        </div>
      </div>

      <div class="task-actions">
        <button class="action-btn complete" type="button" data-action="toggle" data-id="${task.id}">
          ${task.completed ? "Reabrir" : "Completar"}
        </button>
        <button class="action-btn edit" type="button" data-action="edit" data-id="${task.id}">
          Editar
        </button>
        <button class="action-btn duplicate" type="button" data-action="duplicate" data-id="${task.id}">
          Duplicar
        </button>
        <button class="action-btn delete" type="button" data-action="delete" data-id="${task.id}">
          Eliminar
        </button>
      </div>
    `;

    taskList.appendChild(taskItem);
  });
}

function createTaskFromForm(formData) {
  return {
    id: generateId(),
    date: formData.get("taskDate"),
    activity: formData.get("taskActivity").trim(),
    time: formData.get("taskTime"),
    reminderMinutes: Number(formData.get("taskReminder")),
    priority: formData.get("taskPriority") || "medium",
    alarmEnabled: formData.get("taskAlarm") === "on",
    completed: false,
    isDuplicate: false,
    notified: false,
  };
}

function updateTaskFromForm(task, formData) {
  task.date = formData.get("taskDate");
  task.activity = formData.get("taskActivity").trim();
  task.time = formData.get("taskTime");
  task.reminderMinutes = Number(formData.get("taskReminder"));
  task.priority = formData.get("taskPriority") || "medium";
  task.alarmEnabled = formData.get("taskAlarm") === "on";
  resetTaskNotification(task);
}

function resetTaskNotification(task) {
  task.notified = false;
}

function startEditTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  editingTaskId = task.id;
  document.querySelector("#taskDate").value = task.date;
  document.querySelector("#taskActivity").value = task.activity;
  document.querySelector("#taskTime").value = task.time;
  document.querySelector("#taskReminder").value = String(task.reminderMinutes);
  document.querySelector("#taskPriority").value = getTaskPriority(task);
  document.querySelector("#taskAlarm").checked = task.alarmEnabled;
  updateFormMode();
  addMessage(`Editando tarea: ${task.activity}.`, "info");
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const formData = new FormData(taskForm);
  const newTask = createTaskFromForm(formData);

  if (!newTask.activity) {
    addMessage("La actividad no puede estar vacia.", "danger");
    return;
  }

  if (editingTaskId) {
    const taskToUpdate = tasks.find((task) => task.id === editingTaskId);
    if (!taskToUpdate) {
      resetForm();
      addMessage("La tarea que intentabas editar ya no existe.", "warning");
      updateTaskList();
      return;
    }

    updateTaskFromForm(taskToUpdate, formData);
    saveTasks();
    updateTaskList();
    addMessage(`Tarea actualizada: ${taskToUpdate.activity}.`, "success");
    resetForm();
    return;
  }

  tasks.push(newTask);
  saveTasks();
  updateTaskList();
  resetForm();

  addMessage(`Tarea guardada: ${newTask.activity}.`, "success");
}

function duplicateTask(taskId) {
  const originalTask = tasks.find((task) => task.id === taskId);
  if (!originalTask) {
    return;
  }

  const duplicate = {
    ...originalTask,
    id: generateId(),
    activity: `${originalTask.activity} (copia)`,
    completed: false,
    isDuplicate: true,
    notified: false,
  };

  tasks.push(duplicate);
  saveTasks();
  updateTaskList();
  addMessage(`Tarea duplicada: ${duplicate.activity}.`, "success");
}

function toggleTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  task.completed = !task.completed;
  resetTaskNotification(task);
  saveTasks();
  updateTaskList();
  addMessage(
    task.completed
      ? `Tarea completada: ${task.activity}.`
      : `Tarea reabierta: ${task.activity}.`,
    "info"
  );
}

function deleteTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  tasks = tasks.filter((item) => item.id !== taskId);

  if (editingTaskId === taskId) {
    resetForm();
  }

  saveTasks();
  updateTaskList();

  if (task) {
    addMessage(`Tarea eliminada: ${task.activity}.`, "danger");
  }
}

function handleTaskActions(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "toggle") {
    toggleTask(id);
  }

  if (action === "edit") {
    startEditTask(id);
  }

  if (action === "duplicate") {
    duplicateTask(id);
  }

  if (action === "delete") {
    deleteTask(id);
  }
}

function clearMessages() {
  messageArea.innerHTML = '<p class="empty-message">Aqui apareceran las alertas y recordatorios.</p>';
}

function clearFilters() {
  searchFilter.value = "";
  statusFilter.value = "all";
  dateFilter.value = "";
  priorityFilter.value = "all";
  periodFilter.value = "all";
  currentCalendarDate = new Date();
  updateTaskList();
}

function checkTaskAlerts() {
  const now = Date.now();
  let hasChanges = false;

  tasks.forEach((task) => {
    if (!task.alarmEnabled || task.completed || task.notified) {
      return;
    }

    const taskTime = createTaskTimestamp(task);
    const reminderTime = taskTime - task.reminderMinutes * 60000;

    if (now >= reminderTime) {
      notifyTask(task);
      task.notified = true;
      hasChanges = true;
    }
  });

  if (hasChanges) {
    saveTasks();
    updateTaskList();
  }
}

taskForm.addEventListener("submit", handleTaskSubmit);
taskList.addEventListener("click", handleTaskActions);
calendarGrid.addEventListener("click", handleCalendarDateSelection);
weekCalendarGrid.addEventListener("click", handleCalendarDateSelection);
dayCalendarStrip.addEventListener("click", handleCalendarDateSelection);
enableNotificationsBtn.addEventListener("click", requestNotificationPermission);
clearMessagesBtn.addEventListener("click", clearMessages);
cancelEditBtn.addEventListener("click", resetForm);
searchFilter.addEventListener("input", updateTaskList);
statusFilter.addEventListener("change", updateTaskList);
dateFilter.addEventListener("change", handleDateFilterChange);
priorityFilter.addEventListener("change", updateTaskList);
periodFilter.addEventListener("change", updateTaskList);
clearFiltersBtn.addEventListener("click", clearFilters);
prevMonthBtn.addEventListener("click", () => moveCalendarMonth(-1));
nextMonthBtn.addEventListener("click", () => moveCalendarMonth(1));
resetCalendarBtn.addEventListener("click", clearCalendarDateFilter);
dayViewBtn.addEventListener("click", () => setCalendarView("day"));
monthViewBtn.addEventListener("click", () => setCalendarView("month"));
weekViewBtn.addEventListener("click", () => setCalendarView("week"));

updateFormMode();
updateTaskList();
checkTaskAlerts();
window.setInterval(checkTaskAlerts, ALERT_CHECK_INTERVAL_MS);
