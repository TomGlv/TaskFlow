// Guard: redirect to login if not authenticated
if (!localStorage.getItem('token')) {
  window.location.href = 'index.html';
}

// ─── State ───────────────────────────────────────────────────────────────────
let tasks      = [];
let categories = [];
let editingId  = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const taskList        = document.getElementById('task-list');
const taskStats       = document.getElementById('task-stats');
const filterStatus    = document.getElementById('filter-status');
const filterPriority  = document.getElementById('filter-priority');
const filterCategory  = document.getElementById('filter-category');
const searchInput     = document.getElementById('search-input');
const modal           = document.getElementById('task-modal');
const modalTitle      = document.getElementById('modal-title');
const taskForm        = document.getElementById('task-form');
const btnNewTask      = document.getElementById('btn-new-task');
const btnCloseModal   = document.getElementById('btn-close-modal');
const btnCancelModal  = document.getElementById('btn-cancel-modal');
const btnDeleteTask   = document.getElementById('btn-delete-task');
const btnLogout       = document.getElementById('btn-logout');
const navUsername     = document.getElementById('nav-username');
const categoryList    = document.getElementById('category-list');
const newCategoryInput= document.getElementById('new-category');
const btnAddCategory  = document.getElementById('btn-add-category');
const taskCategorySelect = document.getElementById('task-category');

// ─── Init ─────────────────────────────────────────────────────────────────────
navUsername.textContent = localStorage.getItem('username') || '';

async function init() {
  await loadCategories();
  await loadTasks();
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
async function loadTasks() {
  const params = {};
  if (filterStatus.value)   params.status      = filterStatus.value;
  if (filterPriority.value) params.priority    = filterPriority.value;
  if (filterCategory.value) params.category_id = filterCategory.value;
  if (searchInput.value)    params.search      = searchInput.value;

  try {
    tasks = await api.tasks.list(params);
    renderTasks();
    renderStats();
  } catch (err) {
    if (err.message.includes('token')) { logout(); }
  }
}

function renderTasks() {
  if (!tasks.length) {
    taskList.innerHTML = '<p class="empty-state">No tasks found. Create your first one!</p>';
    return;
  }

  taskList.innerHTML = tasks.map(t => `
    <div class="task-card priority-${t.priority} status-${t.status}" data-id="${t.id}">
      <div class="task-check ${t.status === 'done' ? 'checked' : ''}" data-id="${t.id}" title="Toggle done">
        ${t.status === 'done' ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-title">${escHtml(t.title)}</div>
        ${t.description ? `<div class="task-desc">${escHtml(t.description)}</div>` : ''}
        <div class="task-meta">
          <span class="badge badge-status-${t.status}">${statusLabel(t.status)}</span>
          <span class="badge badge-priority-${t.priority}">${cap(t.priority)}</span>
          ${t.category_name ? `<span class="badge badge-category">${escHtml(t.category_name)}</span>` : ''}
          ${t.due_date      ? `<span class="badge badge-due">Due: ${t.due_date}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  // Card click → open edit modal
  taskList.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.task-check')) return;
      openEditModal(parseInt(card.dataset.id));
    });
  });

  // Checkbox click → toggle done
  taskList.querySelectorAll('.task-check').forEach(chk => {
    chk.addEventListener('click', async () => {
      const task = tasks.find(t => t.id === parseInt(chk.dataset.id));
      if (!task) return;
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await api.tasks.update(task.id, { status: newStatus });
      await loadTasks();
    });
  });
}

function renderStats() {
  const total      = tasks.length;
  const done       = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const todo       = tasks.filter(t => t.status === 'todo').length;

  taskStats.innerHTML = `
    <div class="stat-card"><div class="stat-number">${total}</div><div class="stat-label">Total</div></div>
    <div class="stat-card"><div class="stat-number">${todo}</div><div class="stat-label">To Do</div></div>
    <div class="stat-card"><div class="stat-number">${inProgress}</div><div class="stat-label">In Progress</div></div>
    <div class="stat-card"><div class="stat-number">${done}</div><div class="stat-label">Done</div></div>
  `;
}

// ─── Categories ───────────────────────────────────────────────────────────────
async function loadCategories() {
  categories = await api.categories.list();
  renderCategorySidebar();
  renderCategorySelects();
}

function renderCategorySidebar() {
  categoryList.innerHTML = categories.map(c => `
    <li>
      <span>${escHtml(c.name)}</span>
      <button class="btn-del-cat" data-id="${c.id}" title="Delete">×</button>
    </li>
  `).join('') || '<li style="color:var(--text-muted);font-size:12px">No categories yet</li>';

  categoryList.querySelectorAll('.btn-del-cat').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.categories.delete(btn.dataset.id);
      await loadCategories();
      await loadTasks();
    });
  });
}

function renderCategorySelects() {
  const options = categories.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');

  filterCategory.innerHTML  = `<option value="">All</option>${options}`;
  taskCategorySelect.innerHTML = `<option value="">None</option>${options}`;
}

btnAddCategory.addEventListener('click', async () => {
  const name = newCategoryInput.value.trim();
  if (!name) return;
  await api.categories.create({ name });
  newCategoryInput.value = '';
  await loadCategories();
});

// ─── Modal ────────────────────────────────────────────────────────────────────
function openNewModal() {
  editingId = null;
  modalTitle.textContent = 'New Task';
  taskForm.reset();
  document.getElementById('task-id').value = '';
  btnDeleteTask.classList.add('hidden');
  modal.classList.remove('hidden');
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;
  modalTitle.textContent = 'Edit Task';

  document.getElementById('task-id').value          = id;
  document.getElementById('task-title').value       = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-status').value      = task.status;
  document.getElementById('task-priority').value    = task.priority;
  document.getElementById('task-due-date').value    = task.due_date || '';
  taskCategorySelect.value                           = task.category_id || '';

  btnDeleteTask.classList.remove('hidden');
  modal.classList.remove('hidden');
}

function closeModal() { modal.classList.add('hidden'); }

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    title:       document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-description').value.trim() || null,
    status:      document.getElementById('task-status').value,
    priority:    document.getElementById('task-priority').value,
    due_date:    document.getElementById('task-due-date').value || null,
    category_id: taskCategorySelect.value ? parseInt(taskCategorySelect.value) : null,
  };

  if (editingId) {
    await api.tasks.update(editingId, body);
  } else {
    await api.tasks.create(body);
  }

  closeModal();
  await loadTasks();
});

btnDeleteTask.addEventListener('click', async () => {
  if (!confirm('Delete this task?')) return;
  await api.tasks.delete(editingId);
  closeModal();
  await loadTasks();
});

btnNewTask.addEventListener('click', openNewModal);
btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', closeModal);

// ─── Filters ─────────────────────────────────────────────────────────────────
[filterStatus, filterPriority, filterCategory].forEach(el =>
  el.addEventListener('change', loadTasks)
);

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadTasks, 300);
});

// ─── Logout ───────────────────────────────────────────────────────────────────
function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}
btnLogout.addEventListener('click', logout);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function statusLabel(s) {
  return { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }[s] || s;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
