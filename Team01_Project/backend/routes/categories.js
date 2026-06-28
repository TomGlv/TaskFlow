const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticate);

// GET /api/categories
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  res.json(db.prepare('SELECT * FROM categories WHERE user_id = ?').all([req.user.userId]));
});

// POST /api/categories
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const result = db
    .prepare('INSERT INTO categories (name, user_id) VALUES (?, ?)')
    .run([name.trim(), req.user.userId]);

  res.status(201).json(
    db.prepare('SELECT * FROM categories WHERE id = ?').get([result.lastInsertRowid])
  );
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const result = db
    .prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')
    .run([req.params.id, req.user.userId]);

  if (result.changes === 0) return res.status(404).json({ error: 'Category not found' });
  res.json({ message: 'Category deleted successfully' });
});

module.exports = router;
