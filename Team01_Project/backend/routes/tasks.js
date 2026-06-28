const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks  (supports ?status= &priority= &category_id= &search=)
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, priority, category_id, search } = req.query;

  let sql = `
    SELECT t.*, c.name AS category_name
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
  `;
  const params = [req.user.userId];

  if (status)      { sql += ' AND t.status = ?';      params.push(status); }
  if (priority)    { sql += ' AND t.priority = ?';    params.push(priority); }
  if (category_id) { sql += ' AND t.category_id = ?'; params.push(category_id); }
  if (search)      { sql += ' AND t.title LIKE ?';    params.push(`%${search}%`); }

  sql += ' ORDER BY t.created_at DESC';

  res.json(db.prepare(sql).all(params));
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const task = db
    .prepare(
      `SELECT t.*, c.name AS category_name
       FROM tasks t LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ? AND t.user_id = ?`
    )
    .get([req.params.id, req.user.userId]);

  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST /api/tasks
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { title, description, status, priority, due_date, category_id } = req.body;

  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = db
    .prepare(
      `INSERT INTO tasks (title, description, status, priority, due_date, category_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run([
      title,
      description || null,
      status || 'todo',
      priority || 'medium',
      due_date || null,
      category_id || null,
      req.user.userId,
    ]);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get([result.lastInsertRowid]);
  res.status(201).json(task);
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = db
    .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get([req.params.id, req.user.userId]);

  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, due_date, category_id } = req.body;

  db.prepare(
    `UPDATE tasks SET
       title       = ?,
       description = ?,
       status      = ?,
       priority    = ?,
       due_date    = ?,
       category_id = ?,
       updated_at  = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  ).run([
    title       !== undefined ? title       : existing.title,
    description !== undefined ? description : existing.description,
    status      !== undefined ? status      : existing.status,
    priority    !== undefined ? priority    : existing.priority,
    due_date    !== undefined ? due_date    : existing.due_date,
    category_id !== undefined ? category_id : existing.category_id,
    req.params.id,
    req.user.userId,
  ]);

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get([req.params.id]));
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const result = db
    .prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
    .run([req.params.id, req.user.userId]);

  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task deleted successfully' });
});

module.exports = router;
