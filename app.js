const STORAGE_KEY = "agenda-tareas-web";
const THEME_STORAGE_KEY = "cronograma-theme";
const ALERT_CHECK_INTERVAL_MS = 30000;

const taskForm = document.querySelector("#taskForm");
const taskList = document.querySelector("#taskList");
const taskListDisclosure = document.querySelector(".task-list-disclosure");
const messageArea = document.querySelector("#messageArea");
const formFeedback = document.querySelector("#formFeedback");
const enableNotificationsBtn = document.querySelector("#enableNotificationsBtn");
const clearMessagesBtn = document.querySelector("#clearMessagesBtn");
const formTitle = document.querySelector("#formTitle");
const submitTaskBtn = document.querySelector("#submitTaskBtn");
const cancelEditBtn = document.querySelector("#cancelEditBtn");
const searchFilter = document.querySelector("#searchFilter");
const dateFilter = document.querySelector("#dateFilter");
const dateFilterMode = document.querySelector("#dateFilterMode");
const dateRangeFrom = document.querySelector("#dateRangeFrom");
const dateRangeTo = document.querySelector("#dateRangeTo");
const dateFilterDayFields = document.querySelector("#dateFilterDayFields");
const dateFilterRangeFields = document.querySelector("#dateFilterRangeFields");
const priorityFilter = document.querySelector("#priorityFilter");
const clearFiltersBtn = document.querySelector("#clearFiltersBtn");
const resultsSummary = document.querySelector("#resultsSummary");
const calendarGrid = document.querySelector("#calendarGrid");
const calendarMonthLabel = document.querySelector("#calendarMonthLabel");
const prevMonthBtn = document.querySelector("#prevMonthBtn");
const nextMonthBtn = document.querySelector("#nextMonthBtn");
const resetCalendarBtn = document.querySelector("#resetCalendarBtn");
const calendarViewSelect = document.querySelector("#calendarViewSelect");
const monthCalendarView = document.querySelector("#monthCalendarView");
const weekCalendarView = document.querySelector("#weekCalendarView");
const weekCalendarGrid = document.querySelector("#weekCalendarGrid");
const taskTimeStartInput = document.querySelector("#taskTimeStart");
const taskTimeEndInput = document.querySelector("#taskTimeEnd");
const themeLightBtn = document.querySelector("#themeLightBtn");
const themeDarkBtn = document.querySelector("#themeDarkBtn");

let tasks = loadTasks();
let editingTaskId = null;
let currentCalendarDate = dateFilter.value ? createDateFromInput(dateFilter.value) : new Date();
let currentCalendarView = "month";

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getPreferredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch (error) {
    /* localStorage no disponible */
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = next;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch (error) {
    /* ignore */
  }

  if (themeLightBtn && themeDarkBtn) {
    const isLight = next === "light";
    themeLightBtn.classList.toggle("is-active", isLight);
    themeDarkBtn.classList.toggle("is-active", !isLight);
    themeLightBtn.setAttribute("aria-pressed", String(isLight));
    themeDarkBtn.setAttribute("aria-pressed", String(!isLight));
  }
}

function initTheme() {
  applyTheme(getPreferredTheme());

  if (themeLightBtn) {
    themeLightBtn.addEventListener("click", () => applyTheme("light"));
  }

  if (themeDarkBtn) {
    themeDarkBtn.addEventListener("click", () => applyTheme("dark"));
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeActivityForIcon(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pickActivityIcon(activityText) {
  const t = normalizeActivityForIcon(activityText);
  const rules = [
    [/reunion|junta|meet|zoom|teams|videollamada|agenda|calendario/, "📅"],
    [/llamada|telefono|call|whatsapp|contactar/, "📞"],
    [/correo|email|mail|mensaje|notificacion/, "✉️"],
    [/informe|reporte|documento|pdf|word|escribir|redactar/, "📄"],
    [/compra|supermercado|tienda|mercado|pedido/, "🛒"],
    [/medico|salud|cita|hospital|clinica|farmacia/, "🏥"],
    [/ejercicio|gym|gimnasio|deporte|correr|caminar|entren/, "🏃"],
    [/viaje|vuelo|avion|tren|hotel|aeropuerto/, "✈️"],
    [/estudiar|clase|examen|curso|universidad|tarea escolar/, "📚"],
    [/comida|cocinar|almuerzo|cena|desayuno|receta/, "🍽️"],
    [/limpiar|lavar|hogar|ordenar|casa/, "🧹"],
    [/pago|factura|banco|dinero|transferencia|precio/, "💳"],
    [/codigo|programar|bug|software|app|web|desarrollo|deploy/, "💻"],
    [/entrega|deadline|plazo|urgente|hoy|vence/, "⏰"],
    [/musica|concierto|cancion|audio|podcast/, "🎵"],
    [/foto|imagen|video|diseno|presentacion|slides/, "🎨"],
    [/cumple|fiesta|celebracion|regalo/, "🎉"],
    [/coche|auto|mecanico|gasolina|taller|conducir/, "🚗"],
    [/mascota|perro|gato|veterinario/, "🐾"],
  ];

  for (const [pattern, icon] of rules) {
    if (pattern.test(t)) {
      return icon;
    }
  }

  return "📋";
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

function getTaskTimeStart(task) {
  return task.timeStart || task.time || "09:00";
}

function getTaskTimeEnd(task) {
  return task.timeEnd || getTaskTimeStart(task);
}

function createTaskTimestamp(task) {
  return new Date(`${task.date}T${getTaskTimeStart(task)}`).getTime();
}

function compareTasksBySchedule(firstTask, secondTask) {
  const startDiff = createTaskTimestamp(firstTask) - createTaskTimestamp(secondTask);
  if (startDiff !== 0) {
    return startDiff;
  }

  const endDiff = timeToMinutes(getTaskTimeEnd(firstTask)) - timeToMinutes(getTaskTimeEnd(secondTask));
  if (endDiff !== 0) {
    return endDiff;
  }

  return String(firstTask.activity || "").localeCompare(String(secondTask.activity || ""), "es");
}

function getReminderMomentMs(task) {
  const mins = Number(task.reminderMinutes);
  const safeMinutes = Number.isFinite(mins) ? mins : 0;
  return createTaskTimestamp(task) - safeMinutes * 60000;
}

function formatDate(task) {
  const taskDate = new Date(`${task.date}T${getTaskTimeStart(task)}`);

  return taskDate.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeValue) {
  const [hours, minutes] = String(timeValue).split(":");
  return `${hours}:${minutes}`;
}

function formatTimeRange(task) {
  const start = getTaskTimeStart(task);
  const end = getTaskTimeEnd(task);
  if (start === end) {
    return formatTime(start);
  }

  return `${formatTime(start)} - ${formatTime(end)}`;
}

function timeToMinutes(timeValue) {
  const parts = String(timeValue).split(":");
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  return hours * 60 + minutes;
}

function validateTimeRangeForm(formData) {
  const timeStart = formData.get("taskTimeStart");
  const timeEnd = formData.get("taskTimeEnd");
  if (!String(timeStart || "").trim() || !String(timeEnd || "").trim()) {
    return "Indica hora de inicio y de fin.";
  }

  if (timeToMinutes(timeEnd) < timeToMinutes(timeStart)) {
    return "La hora de fin debe ser posterior o igual a la de inicio.";
  }

  return "";
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
    dateMode: dateFilterMode ? dateFilterMode.value : "day",
    date: dateFilter.value,
    dateRangeFrom: dateRangeFrom ? dateRangeFrom.value : "",
    dateRangeTo: dateRangeTo ? dateRangeTo.value : "",
    priority: priorityFilter.value,
  };
}

function syncDateFilterModeUI() {
  if (!dateFilterDayFields || !dateFilterRangeFields || !dateFilterMode) {
    return;
  }

  const isRange = dateFilterMode.value === "range";
  dateFilterDayFields.classList.toggle("hidden", isRange);
  dateFilterRangeFields.classList.toggle("hidden", !isRange);
}

function normalizeDateRangeBounds(fromRaw, toRaw) {
  let from = String(fromRaw || "").trim();
  let to = String(toRaw || "").trim();
  if (from && to && from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  return { from, to };
}

function taskMatchesDateFilter(taskDateStr, filters) {
  if (filters.dateMode === "range") {
    const { from, to } = normalizeDateRangeBounds(filters.dateRangeFrom, filters.dateRangeTo);
    if (!from && !to) {
      return true;
    }
    if (from && taskDateStr < from) {
      return false;
    }
    if (to && taskDateStr > to) {
      return false;
    }
    return true;
  }

  return !filters.date || taskDateStr === filters.date;
}

function getDateFilterCalendarState(dayValue) {
  const mode = dateFilterMode ? dateFilterMode.value : "day";
  if (mode === "day") {
    const sel = dateFilter.value;
    return { mode: "day", selected: Boolean(sel && dayValue === sel) };
  }

  const { from, to } = normalizeDateRangeBounds(
    dateRangeFrom ? dateRangeFrom.value : "",
    dateRangeTo ? dateRangeTo.value : ""
  );
  if (!from && !to) {
    return { mode: "range", inRange: false, isStart: false, isEnd: false };
  }

  const inRange = (!from || dayValue >= from) && (!to || dayValue <= to);
  const isStart = Boolean(from && dayValue === from);
  const isEnd = Boolean(to && dayValue === to);
  return { mode: "range", inRange, isStart, isEnd };
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

function getCalendarDayTasks(dateValue) {
  return tasks.filter((task) => task.date === dateValue).sort(compareTasksBySchedule);
}

function getCalendarDayTone(dayTasks) {
  if (!dayTasks.length) {
    return "";
  }

  const allCompleted = dayTasks.every((task) => task.completed);
  if (allCompleted) {
    return "day-all-completed";
  }

  const dominant = getDominantPriority(dayTasks);
  return dominant ? `priority-${dominant}-day` : "";
}

function createCalendarDayButton(dayDate, options = {}) {
  const { showDayName = false, extraClassName = "" } = options;
  const dayValue = formatDateInputValue(dayDate);
  const dayTasks = getCalendarDayTasks(dayValue);
  const dayStatusTone = getCalendarDayTone(dayTasks);
  const todayValue = formatDateInputValue(new Date());
  const calState = getDateFilterCalendarState(dayValue);
  const button = document.createElement("button");

  button.type = "button";
  button.className = `calendar-day ${extraClassName} ${dayStatusTone}`.trim();
  if (dayValue === todayValue) {
    button.classList.add("today");
  }
  if (calState.mode === "day" && calState.selected) {
    button.classList.add("selected");
  }
  if (calState.mode === "range") {
    if (calState.inRange) {
      button.classList.add("calendar-day--in-range");
    }
    if (calState.isStart) {
      button.classList.add("calendar-day--range-start");
    }
    if (calState.isEnd) {
      button.classList.add("calendar-day--range-end");
    }
  }

  button.dataset.date = dayValue;
  const pressed =
    calState.mode === "day"
      ? calState.selected
      : calState.isStart || calState.isEnd;
  button.setAttribute("aria-pressed", String(pressed));

  const countLabel = dayTasks.length === 1 ? "1 actividad" : `${dayTasks.length} actividades`;
  const countMarkup =
    dayTasks.length > 0
      ? `<span class="calendar-activity-count" aria-label="${countLabel}">${dayTasks.length}</span>`
      : "";

  button.innerHTML = `
    <div class="calendar-day-inner">
      ${showDayName ? `<span class="calendar-day-name">${escapeHtml(formatDayName(dayDate))}</span>` : ""}
      <div class="calendar-day-meta">
        <span class="calendar-day-number">${dayDate.getDate()}</span>
        ${countMarkup}
      </div>
    </div>
  `;

  return button;
}

function updateCalendarHeader() {
  if (calendarViewSelect) {
    calendarViewSelect.value = currentCalendarView;
  }
  monthCalendarView.classList.toggle("hidden", currentCalendarView !== "month");
  weekCalendarView.classList.toggle("hidden", currentCalendarView !== "week");

  if (currentCalendarView === "week") {
    calendarMonthLabel.textContent = formatWeekRange(currentCalendarDate);
    prevMonthBtn.textContent = "Semana anterior";
    nextMonthBtn.textContent = "Semana siguiente";
    return;
  }

  calendarMonthLabel.textContent = formatCalendarMonth(currentCalendarDate);
  prevMonthBtn.textContent = "Mes anterior";
  nextMonthBtn.textContent = "Mes siguiente";
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
      extraClassName: "week-calendar-day",
    });
    weekCalendarGrid.appendChild(dayCard);
  }
}

function renderCalendar() {
  updateCalendarHeader();
  renderMonthCalendar();
  renderWeekCalendar();
}

function handleCalendarDateSelection(event) {
  const button = event.target.closest("button[data-date]");
  if (!button) {
    return;
  }

  const selectedDate = button.dataset.date;
  if (dateFilterMode) {
    dateFilterMode.value = "day";
  }
  syncDateFilterModeUI();
  dateFilter.value = selectedDate;
  if (dateRangeFrom) {
    dateRangeFrom.value = "";
  }
  if (dateRangeTo) {
    dateRangeTo.value = "";
  }
  currentCalendarDate = createDateFromInput(selectedDate);
  updateTaskList();
}

function handleDateFilterChange() {
  if (dateFilterMode && dateFilterMode.value === "day" && dateFilter.value) {
    currentCalendarDate = createDateFromInput(dateFilter.value);
  }

  updateTaskList();
}

function handleDateFilterModeChange() {
  syncDateFilterModeUI();
  updateTaskList();
}

function moveCalendarMonth(offset) {
  if (currentCalendarView === "week") {
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
  if (dateRangeFrom) {
    dateRangeFrom.value = "";
  }
  if (dateRangeTo) {
    dateRangeTo.value = "";
  }
  if (dateFilterMode) {
    dateFilterMode.value = "day";
  }
  syncDateFilterModeUI();
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

let formFeedbackTimeoutId = null;
const shownOnceFormFeedback = new Set();

function clearFormFeedback() {
  if (formFeedbackTimeoutId) {
    window.clearTimeout(formFeedbackTimeoutId);
    formFeedbackTimeoutId = null;
  }
  if (!formFeedback) {
    return;
  }
  formFeedback.classList.add("hidden");
  formFeedback.textContent = "";
  formFeedback.className = "form-feedback hidden";
}

function showFormFeedback(text, tone = "info", options = {}) {
  if (!formFeedback) {
    return;
  }

  const body = String(text).trim();
  if (options.oncePerText && shownOnceFormFeedback.has(body)) {
    return;
  }

  if (options.oncePerText) {
    shownOnceFormFeedback.add(body);
    window.setTimeout(() => shownOnceFormFeedback.delete(body), 120000);
  }

  if (formFeedbackTimeoutId) {
    window.clearTimeout(formFeedbackTimeoutId);
    formFeedbackTimeoutId = null;
  }

  formFeedback.textContent = body;
  formFeedback.className = `form-feedback form-feedback--${tone}`;
  formFeedback.classList.remove("hidden");

  formFeedbackTimeoutId = window.setTimeout(() => {
    formFeedbackTimeoutId = null;
    formFeedback.classList.add("hidden");
    formFeedback.textContent = "";
    formFeedback.className = "form-feedback hidden";
  }, 6000);
}

function getClosestAlertTask() {
  const now = Date.now();
  const pool = tasks.filter((task) => task.alarmEnabled && !task.completed);
  if (!pool.length) {
    return null;
  }

  const dueNotAcknowledged = pool.filter(
    (task) => !task.notified && now >= getReminderMomentMs(task)
  );
  if (dueNotAcknowledged.length) {
    return [...dueNotAcknowledged].sort(
      (a, b) => getReminderMomentMs(a) - getReminderMomentMs(b)
    )[0];
  }

  const upcoming = pool
    .map((task) => ({ task, at: getReminderMomentMs(task) }))
    .filter((entry) => entry.at > now)
    .sort((a, b) => a.at - b.at);
  if (upcoming.length) {
    return upcoming[0].task;
  }

  return null;
}

function renderClosestAlertPanel() {
  if (!messageArea) {
    return;
  }

  const task = getClosestAlertTask();
  if (!task) {
    messageArea.innerHTML =
      '<p class="empty-message">Aqui veras el recordatorio mas cercano en el tiempo.</p>';
    return;
  }

  const reminderAt = getReminderMomentMs(task);
  const stamp = new Date(reminderAt).toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const now = Date.now();
  const dueNow = !task.notified && now >= reminderAt;
  const tone = dueNow ? "warning" : "info";
  const schedule = `${formatDate(task)} · ${formatTimeRange(task)}`;
  const headline = dueNow ? "Recordatorio" : "Proximo recordatorio";
  const line = `${headline}: ${task.activity} — ${schedule}`;

  const item = document.createElement("article");
  item.className = `message-item ${tone}`;
  item.innerHTML = `
    <strong>${escapeHtml(stamp)}</strong>
    <p>${escapeHtml(line)}</p>
  `;
  messageArea.innerHTML = "";
  messageArea.appendChild(item);
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showFormFeedback("Este navegador no admite notificaciones del sistema.", "warning");
    return "denied";
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    showFormFeedback("Notificaciones activadas correctamente.", "success");
  } else {
    showFormFeedback("Las notificaciones fueron bloqueadas por el navegador.", "warning");
  }

  return permission;
}

function notifyTask(task) {
  const taskMoment = `${formatDate(task)} · ${formatTimeRange(task)}`;
  const message = `Recordatorio: ${task.activity} - ${taskMoment}`;

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Alarma de cumplimiento", {
      body: message,
    });
  }
}

function getFilteredTasks() {
  const filters = getActiveFilters();

  return tasks.filter((task) => {
    const priority = getTaskPriority(task);
    const matchesSearch =
      !filters.search || task.activity.toLowerCase().includes(filters.search);
    const matchesDate = taskMatchesDateFilter(task.date, filters);
    const matchesPriority = filters.priority === "all" || priority === filters.priority;

    return matchesSearch && matchesDate && matchesPriority;
  });
}

function updateTaskList() {
  const filteredTasks = getFilteredTasks();
  const sortedTasks = [...filteredTasks].sort(compareTasksBySchedule);

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
    if (taskListDisclosure) {
      taskListDisclosure.classList.remove("task-list-disclosure--all-completed");
    }
    renderClosestAlertPanel();
    return;
  }

  taskList.innerHTML = "";

  sortedTasks.forEach((task) => {
    const priority = getTaskPriority(task);
    const taskItem = document.createElement("article");
    const completedClass = task.completed ? " task-item--completed" : "";
    taskItem.className = `task-item priority-${priority}${completedClass}`;

    const activityIcon = pickActivityIcon(task.activity);

    taskItem.innerHTML = `
      <div class="task-header">
        <div class="task-heading">
          <span class="task-activity-icon" title="Tipo de actividad" aria-hidden="true">${activityIcon}</span>
          <div class="task-heading-text">
            <h3 class="task-title">${escapeHtml(task.activity)}</h3>
            <p class="small-note">${task.completed ? "Completada. " : ""}${task.alarmEnabled ? "Con alarma activa" : "Sin alarma"}${task.isDuplicate ? " | Tarea duplicada" : ""}</p>
          </div>
        </div>
        <div class="task-badges">
          <span class="priority-chip ${priority}">${getPriorityLabel(priority)}</span>
        </div>
      </div>

      <div class="task-meta-grid">
        <div class="task-meta">
          <strong>Fecha</strong>
          <span>${formatDate(task)}</span>
        </div>
        <div class="task-meta">
          <strong>Horario</strong>
          <span>${formatTimeRange(task)}</span>
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

  if (taskListDisclosure) {
    const allFilteredCompleted =
      sortedTasks.length > 0 && sortedTasks.every((task) => task.completed);
    taskListDisclosure.classList.toggle("task-list-disclosure--all-completed", allFilteredCompleted);
  }

  renderClosestAlertPanel();
}

function createTaskFromForm(formData) {
  return {
    id: generateId(),
    date: formData.get("taskDate"),
    activity: formData.get("taskActivity").trim(),
    timeStart: formData.get("taskTimeStart"),
    timeEnd: formData.get("taskTimeEnd"),
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
  task.timeStart = formData.get("taskTimeStart");
  task.timeEnd = formData.get("taskTimeEnd");
  delete task.time;
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
  const start = getTaskTimeStart(task);
  const end = getTaskTimeEnd(task);
  taskTimeStartInput.value = start;
  taskTimeEndInput.value = end;
  document.querySelector("#taskReminder").value = String(task.reminderMinutes);
  document.querySelector("#taskPriority").value = getTaskPriority(task);
  document.querySelector("#taskAlarm").checked = task.alarmEnabled;
  updateFormMode();
  showFormFeedback(`Editando tarea: ${task.activity}.`, "info");
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const formData = new FormData(taskForm);
  const rangeError = validateTimeRangeForm(formData);
  if (rangeError) {
    showFormFeedback(rangeError, "danger");
    return;
  }

  const newTask = createTaskFromForm(formData);

  if (!newTask.activity) {
    showFormFeedback("La actividad no puede estar vacia.", "danger");
    return;
  }

  if (editingTaskId) {
    const taskToUpdate = tasks.find((task) => task.id === editingTaskId);
    if (!taskToUpdate) {
      resetForm();
      showFormFeedback("La tarea que intentabas editar ya no existe.", "warning");
      updateTaskList();
      return;
    }

    updateTaskFromForm(taskToUpdate, formData);
    saveTasks();
    updateTaskList();
    showFormFeedback(`Tarea actualizada: ${taskToUpdate.activity}.`, "success");
    resetForm();
    return;
  }

  tasks.push(newTask);
  saveTasks();
  updateTaskList();
  resetForm();

  showFormFeedback(`Tarea guardada: ${newTask.activity}.`, "success");
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
    timeStart: getTaskTimeStart(originalTask),
    timeEnd: getTaskTimeEnd(originalTask),
  };
  delete duplicate.time;

  tasks.push(duplicate);
  saveTasks();
  updateTaskList();
  showFormFeedback(`Tarea duplicada: ${duplicate.activity}.`, "success");
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
  if (task.completed) {
    showFormFeedback(`Tarea completada: ${task.activity}.`, "info");
  } else {
    showFormFeedback(`Tarea reabierta: ${task.activity}.`, "info", { oncePerText: true });
  }
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
    showFormFeedback(`Tarea eliminada: ${task.activity}.`, "danger");
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
  clearFormFeedback();
}

function clearFilters() {
  searchFilter.value = "";
  dateFilter.value = "";
  if (dateRangeFrom) {
    dateRangeFrom.value = "";
  }
  if (dateRangeTo) {
    dateRangeTo.value = "";
  }
  if (dateFilterMode) {
    dateFilterMode.value = "day";
  }
  syncDateFilterModeUI();
  priorityFilter.value = "all";
  currentCalendarDate = new Date();
  updateTaskList();
}

function checkTaskAlerts() {
  const now = Date.now();
  const eligible = tasks.filter(
    (task) =>
      task.alarmEnabled &&
      !task.completed &&
      !task.notified &&
      now >= getReminderMomentMs(task)
  );

  if (!eligible.length) {
    return;
  }

  eligible.sort((firstTask, secondTask) => {
    const startA = createTaskTimestamp(firstTask);
    const startB = createTaskTimestamp(secondTask);
    const distA = Math.abs(startA - now);
    const distB = Math.abs(startB - now);
    if (distA !== distB) {
      return distA - distB;
    }

    if (startA !== startB) {
      return startA - startB;
    }

    return String(firstTask.activity || "").localeCompare(String(secondTask.activity || ""), "es");
  });

  const task = eligible[0];
  notifyTask(task);
  task.notified = true;
  saveTasks();
  updateTaskList();
}

taskForm.addEventListener("submit", handleTaskSubmit);
taskList.addEventListener("click", handleTaskActions);
calendarGrid.addEventListener("click", handleCalendarDateSelection);
weekCalendarGrid.addEventListener("click", handleCalendarDateSelection);
enableNotificationsBtn.addEventListener("click", requestNotificationPermission);
clearMessagesBtn.addEventListener("click", clearMessages);
cancelEditBtn.addEventListener("click", resetForm);
searchFilter.addEventListener("input", updateTaskList);
dateFilter.addEventListener("change", handleDateFilterChange);
if (dateFilterMode) {
  dateFilterMode.addEventListener("change", handleDateFilterModeChange);
}
if (dateRangeFrom) {
  dateRangeFrom.addEventListener("change", updateTaskList);
}
if (dateRangeTo) {
  dateRangeTo.addEventListener("change", updateTaskList);
}
priorityFilter.addEventListener("change", updateTaskList);
clearFiltersBtn.addEventListener("click", clearFilters);
prevMonthBtn.addEventListener("click", () => moveCalendarMonth(-1));
nextMonthBtn.addEventListener("click", () => moveCalendarMonth(1));
resetCalendarBtn.addEventListener("click", clearCalendarDateFilter);
if (calendarViewSelect) {
  calendarViewSelect.addEventListener("change", (event) => {
    const nextView = event.target.value;
    if (nextView === "month" || nextView === "week") {
      setCalendarView(nextView);
    }
  });
}

const analogScheduleDialog = document.querySelector("#analogScheduleDialog");
const analogScheduleCancelBtn = document.querySelector("#analogScheduleCancelBtn");
const analogScheduleSaveBtn = document.querySelector("#analogScheduleSaveBtn");
const analogScheduleError = document.querySelector("#analogScheduleError");
const analogClocksMount = document.querySelector("#analogClocksMount");

const analogState = {
  start: { h: 9, m: 0 },
  end: { h: 10, m: 0 },
};

let analogClockRef = null;
let analogClockActiveKey = "start";
let analogModeStartBtn = null;
let analogModeEndBtn = null;
let analogMeridiemAmBtn = null;
let analogMeridiemPmBtn = null;

function padTimeUnit(value) {
  return String(value).padStart(2, "0");
}

function formatHMParts(hours, minutes) {
  const h = ((hours % 24) + 24) % 24;
  const m = ((minutes % 60) + 60) % 60;
  return `${padTimeUnit(h)}:${padTimeUnit(m)}`;
}

function hour24To12Parts(h24) {
  const h = ((h24 % 24) + 24) % 24;
  const isPm = h >= 12;
  let hour12 = h % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }
  return { hour12, isPm };
}

function hour12AndMeridiemTo24(hour12, isPm) {
  if (!isPm) {
    if (hour12 === 12) {
      return 0;
    }
    return hour12;
  }
  if (hour12 === 12) {
    return 12;
  }
  return hour12 + 12;
}

function formatAnalogReadout(h24, minutes) {
  const h = ((h24 % 24) + 24) % 24;
  const m = ((minutes % 60) + 60) % 60;
  const { hour12, isPm } = hour24To12Parts(h);
  const suffix = isPm ? "p. m." : "a. m.";
  return `${hour12}:${padTimeUnit(m)} ${suffix}`;
}

function parseTimeInputToParts(value) {
  const trimmed = String(value || "").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }

  return { h, m };
}

function syncAnalogStateFromInputs() {
  const startParsed = parseTimeInputToParts(taskTimeStartInput.value);
  const endParsed = parseTimeInputToParts(taskTimeEndInput.value);
  analogState.start = startParsed || { h: 9, m: 0 };
  analogState.end = endParsed || { h: 10, m: 0 };
}

function setAnalogClockMode(key) {
  if (key !== "start" && key !== "end") {
    return;
  }

  analogClockActiveKey = key;

  if (analogModeStartBtn && analogModeEndBtn) {
    analogModeStartBtn.classList.toggle("is-active", key === "start");
    analogModeEndBtn.classList.toggle("is-active", key === "end");
    analogModeStartBtn.setAttribute("aria-selected", String(key === "start"));
    analogModeEndBtn.setAttribute("aria-selected", String(key === "end"));
  }

  updateAnalogMeridiemButtons();
  updateAnalogClockHands();
}

function updateAnalogMeridiemButtons() {
  if (!analogMeridiemAmBtn || !analogMeridiemPmBtn) {
    return;
  }

  const { h } = analogState[analogClockActiveKey];
  const isPm = h >= 12;
  analogMeridiemAmBtn.classList.toggle("is-active", !isPm);
  analogMeridiemPmBtn.classList.toggle("is-active", isPm);
  analogMeridiemAmBtn.setAttribute("aria-selected", String(!isPm));
  analogMeridiemPmBtn.setAttribute("aria-selected", String(isPm));
}

function setAnalogMeridiem(isPm) {
  const key = analogClockActiveKey;
  const { hour12 } = hour24To12Parts(analogState[key].h);
  analogState[key].h = hour12AndMeridiemTo24(hour12, isPm);
  updateAnalogMeridiemButtons();
  updateAnalogClockHands();
}

function updateAnalogClockHands() {
  const ref = analogClockRef;
  if (!ref) {
    return;
  }

  const key = analogClockActiveKey;
  const { h, m } = analogState[key];
  const minRad = ((m * 6 - 90) * Math.PI) / 180;
  const hourRad = ((((h % 12) + m / 60) * 30 - 90) * Math.PI) / 180;
  const hourLen = 46;
  const minLen = 72;

  ref.handHour.setAttribute("x2", String(Math.cos(hourRad) * hourLen));
  ref.handHour.setAttribute("y2", String(Math.sin(hourRad) * hourLen));
  ref.handMin.setAttribute("x2", String(Math.cos(minRad) * minLen));
  ref.handMin.setAttribute("y2", String(Math.sin(minRad) * minLen));
  ref.readoutLabel.textContent = key === "start" ? "Inicio" : "Fin";
  ref.readout.textContent = formatAnalogReadout(h, m);

  if (ref.summary) {
    ref.summary.textContent = `Inicio ${formatAnalogReadout(analogState.start.h, analogState.start.m)} · Fin ${formatAnalogReadout(analogState.end.h, analogState.end.m)}`;
  }
}

function hideAnalogScheduleError() {
  if (analogScheduleError) {
    analogScheduleError.textContent = "";
    analogScheduleError.classList.add("hidden");
  }
}

function showAnalogScheduleError(message) {
  if (!analogScheduleError) {
    return;
  }

  analogScheduleError.textContent = message;
  analogScheduleError.classList.remove("hidden");
}

function polarFromClockPointer(event, svg) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }

  const p = pt.matrixTransform(ctm.inverse());
  const x = p.x;
  const y = p.y;
  const r = Math.hypot(x, y);
  const degNorm = (Math.atan2(x, -y) * 180) / Math.PI;
  const deg = degNorm < 0 ? degNorm + 360 : degNorm;
  return { r, deg };
}

function applyClockPointerToState(event) {
  const ref = analogClockRef;
  if (!ref || !ref.svg) {
    return;
  }

  const key = analogClockActiveKey;
  const polar = polarFromClockPointer(event, ref.svg);
  if (!polar || polar.r < 18) {
    return;
  }

  if (polar.r >= 66 && polar.r <= 96) {
    const slot = Math.floor((polar.deg + 15) / 30) % 12;
    const hour12 = slot === 0 ? 12 : slot;
    const isPm = analogState[key].h >= 12;
    analogState[key].h = hour12AndMeridiemTo24(hour12, isPm);
    updateAnalogMeridiemButtons();
    updateAnalogClockHands();
    return;
  }

  if (polar.r >= 24 && polar.r < 66) {
    analogState[key].m = Math.floor((polar.deg + 3) / 6) % 60;
    updateAnalogClockHands();
  }
}

function buildAnalogClock() {
  const NS = "http://www.w3.org/2000/svg";
  const wrap = document.createElement("div");
  wrap.className = "analog-clock";

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "-100 -100 200 200");
  svg.setAttribute("class", "analog-clock__svg");
  svg.style.touchAction = "none";
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Reloj para elegir hora de inicio o fin");

  const face = document.createElementNS(NS, "circle");
  face.setAttribute("r", "98");
  face.setAttribute("class", "analog-clock__face");
  svg.appendChild(face);

  for (let i = 0; i < 60; i += 1) {
    const rad = ((i * 6 - 90) * Math.PI) / 180;
    const inner = i % 5 === 0 ? 54 : 56;
    const outer = 62;
    const tick = document.createElementNS(NS, "line");
    tick.setAttribute("x1", String(Math.cos(rad) * inner));
    tick.setAttribute("y1", String(Math.sin(rad) * inner));
    tick.setAttribute("x2", String(Math.cos(rad) * outer));
    tick.setAttribute("y2", String(Math.sin(rad) * outer));
    tick.setAttribute("class", i % 5 === 0 ? "analog-clock__tick analog-clock__tick--major" : "analog-clock__tick");
    svg.appendChild(tick);
  }

  for (let k = 1; k <= 12; k += 1) {
    const rad = ((k * 30 - 90) * Math.PI) / 180;
    const tx = Math.cos(rad) * 84;
    const ty = Math.sin(rad) * 84;
    const text = document.createElementNS(NS, "text");
    text.setAttribute("x", String(tx));
    text.setAttribute("y", String(ty));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("class", "analog-clock__hour-label");
    text.textContent = String(k);
    svg.appendChild(text);
  }

  const handHour = document.createElementNS(NS, "line");
  handHour.setAttribute("x1", "0");
  handHour.setAttribute("y1", "0");
  handHour.setAttribute("stroke-linecap", "round");
  handHour.setAttribute("class", "analog-clock__hand analog-clock__hand--hour");

  const handMin = document.createElementNS(NS, "line");
  handMin.setAttribute("x1", "0");
  handMin.setAttribute("y1", "0");
  handMin.setAttribute("stroke-linecap", "round");
  handMin.setAttribute("class", "analog-clock__hand analog-clock__hand--minute");

  const hub = document.createElementNS(NS, "circle");
  hub.setAttribute("r", "5");
  hub.setAttribute("class", "analog-clock__hub");

  svg.appendChild(handHour);
  svg.appendChild(handMin);
  svg.appendChild(hub);

  const readoutLabel = document.createElement("div");
  readoutLabel.className = "analog-clock__readout-label";
  readoutLabel.textContent = "Inicio";

  const readout = document.createElement("div");
  readout.className = "analog-clock__readout";
  readout.setAttribute("aria-live", "polite");

  const summary = document.createElement("p");
  summary.className = "analog-clock__summary";

  wrap.appendChild(svg);
  wrap.appendChild(readoutLabel);
  wrap.appendChild(readout);
  wrap.appendChild(summary);

  const ref = { wrap, svg, handHour, handMin, readoutLabel, readout, summary };

  svg.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    applyClockPointerToState(e);
  });

  svg.addEventListener("pointermove", (e) => {
    if (svg.hasPointerCapture(e.pointerId)) {
      e.preventDefault();
      applyClockPointerToState(e);
    }
  });

  svg.addEventListener("pointerup", (e) => {
    if (svg.hasPointerCapture(e.pointerId)) {
      svg.releasePointerCapture(e.pointerId);
    }
  });

  svg.addEventListener("pointercancel", (e) => {
    if (svg.hasPointerCapture(e.pointerId)) {
      svg.releasePointerCapture(e.pointerId);
    }
  });

  return ref;
}

function openAnalogScheduleDialog(preferredMode) {
  if (!analogScheduleDialog || typeof analogScheduleDialog.showModal !== "function") {
    return;
  }

  hideAnalogScheduleError();
  syncAnalogStateFromInputs();

  if (preferredMode === "start" || preferredMode === "end") {
    setAnalogClockMode(preferredMode);
  } else {
    setAnalogClockMode("start");
  }

  analogScheduleDialog.showModal();
}

function trySaveAnalogScheduleFromDialog() {
  const { start, end } = analogState;
  const startTotal = start.h * 60 + start.m;
  const endTotal = end.h * 60 + end.m;

  if (endTotal < startTotal) {
    showAnalogScheduleError("La hora de fin debe ser posterior o igual a la de inicio.");
    return;
  }

  taskTimeStartInput.value = formatHMParts(start.h, start.m);
  taskTimeEndInput.value = formatHMParts(end.h, end.m);
  hideAnalogScheduleError();
  if (analogScheduleDialog) {
    analogScheduleDialog.close();
  }
}

function initAnalogScheduleDialog() {
  if (!analogClocksMount) {
    return;
  }

  const modeBar = document.createElement("div");
  modeBar.className = "analog-clock-mode";
  modeBar.setAttribute("role", "tablist");
  modeBar.setAttribute("aria-label", "Editar hora de inicio o fin");

  analogModeStartBtn = document.createElement("button");
  analogModeStartBtn.type = "button";
  analogModeStartBtn.className = "analog-clock-mode__btn is-active";
  analogModeStartBtn.setAttribute("role", "tab");
  analogModeStartBtn.setAttribute("aria-selected", "true");
  analogModeStartBtn.id = "analogModeStartBtn";
  analogModeStartBtn.textContent = "Inicio";

  analogModeEndBtn = document.createElement("button");
  analogModeEndBtn.type = "button";
  analogModeEndBtn.className = "analog-clock-mode__btn";
  analogModeEndBtn.setAttribute("role", "tab");
  analogModeEndBtn.setAttribute("aria-selected", "false");
  analogModeEndBtn.id = "analogModeEndBtn";
  analogModeEndBtn.textContent = "Fin";

  modeBar.appendChild(analogModeStartBtn);
  modeBar.appendChild(analogModeEndBtn);

  const meridiemBar = document.createElement("div");
  meridiemBar.className = "analog-clock-meridiem";
  meridiemBar.setAttribute("role", "tablist");
  meridiemBar.setAttribute("aria-label", "Antes o despues del mediodia");

  analogMeridiemAmBtn = document.createElement("button");
  analogMeridiemAmBtn.type = "button";
  analogMeridiemAmBtn.className = "analog-clock-meridiem__btn is-active";
  analogMeridiemAmBtn.setAttribute("role", "tab");
  analogMeridiemAmBtn.setAttribute("aria-selected", "true");
  analogMeridiemAmBtn.id = "analogMeridiemAmBtn";
  analogMeridiemAmBtn.textContent = "a. m.";

  analogMeridiemPmBtn = document.createElement("button");
  analogMeridiemPmBtn.type = "button";
  analogMeridiemPmBtn.className = "analog-clock-meridiem__btn";
  analogMeridiemPmBtn.setAttribute("role", "tab");
  analogMeridiemPmBtn.setAttribute("aria-selected", "false");
  analogMeridiemPmBtn.id = "analogMeridiemPmBtn";
  analogMeridiemPmBtn.textContent = "p. m.";

  meridiemBar.appendChild(analogMeridiemAmBtn);
  meridiemBar.appendChild(analogMeridiemPmBtn);

  analogClockRef = buildAnalogClock();
  analogClocksMount.appendChild(modeBar);
  analogClocksMount.appendChild(meridiemBar);
  analogClocksMount.appendChild(analogClockRef.wrap);

  analogModeStartBtn.addEventListener("click", () => setAnalogClockMode("start"));
  analogModeEndBtn.addEventListener("click", () => setAnalogClockMode("end"));
  analogMeridiemAmBtn.addEventListener("click", () => setAnalogMeridiem(false));
  analogMeridiemPmBtn.addEventListener("click", () => setAnalogMeridiem(true));

  if (taskTimeStartInput) {
    taskTimeStartInput.addEventListener("click", () => openAnalogScheduleDialog("start"));
  }

  if (taskTimeEndInput) {
    taskTimeEndInput.addEventListener("click", () => openAnalogScheduleDialog("end"));
  }

  if (analogScheduleCancelBtn) {
    analogScheduleCancelBtn.addEventListener("click", () => {
      hideAnalogScheduleError();
      if (analogScheduleDialog) {
        analogScheduleDialog.close();
      }
    });
  }

  if (analogScheduleSaveBtn) {
    analogScheduleSaveBtn.addEventListener("click", trySaveAnalogScheduleFromDialog);
  }
}

initAnalogScheduleDialog();

initTheme();
syncDateFilterModeUI();
updateFormMode();
updateTaskList();
checkTaskAlerts();
window.setInterval(checkTaskAlerts, ALERT_CHECK_INTERVAL_MS);
