const Database = require('better-sqlite3');
const path = require('path');

let _db = null;

function getDB() {
  if (_db) return _db;

  const dbPath =
    process.env.NODE_ENV === 'test'
      ? ':memory:'
      : path.join(__dirname, 'taskflow.db');

  _db = new Database(dbPath);
  _db.exec('PRAGMA foreign_keys = ON;');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT    NOT NULL UNIQUE,
      email    TEXT    NOT NULL UNIQUE,
      password TEXT    NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      name    TEXT    NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      description TEXT,
      status      TEXT    DEFAULT 'todo'
                  CHECK(status IN ('todo','in_progress','done')),
      priority    TEXT    DEFAULT 'medium'
                  CHECK(priority IN ('low','medium','high')),
      due_date    TEXT,
      category_id INTEGER,
      user_id     INTEGER NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  return _db;
}

function resetDB() {
  const db = getDB();
  db.exec('DELETE FROM tasks; DELETE FROM categories; DELETE FROM users;');
}

module.exports = { getDB, resetDB };
