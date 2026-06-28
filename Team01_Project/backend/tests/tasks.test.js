const request = require('supertest');
const app = require('../server');
const { resetDB } = require('../database');

let token;

beforeEach(async () => {
  resetDB();
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'carol', email: 'carol@test.com', password: 'password123' });
  token = res.body.token;
});

// ─── CREATE ──────────────────────────────────────────────────────────────────

describe('POST /api/tasks', () => {
  test('creates a task with defaults', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Buy milk' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy milk');
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
  });

  test('creates a task with all fields', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ship feature', priority: 'high', status: 'in_progress', due_date: '2024-12-31' });

    expect(res.status).toBe(201);
    expect(res.body.priority).toBe('high');
    expect(res.body.due_date).toBe('2024-12-31');
  });

  test('fails without title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No title here' });
    expect(res.status).toBe(400);
  });

  test('fails without auth token', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Ghost task' });
    expect(res.status).toBe(401);
  });
});

// ─── READ ─────────────────────────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  beforeEach(async () => {
    await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`)
      .send({ title: 'Task A', priority: 'high', status: 'todo' });
    await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`)
      .send({ title: 'Task B', priority: 'low', status: 'done' });
  });

  test('returns all tasks for the authenticated user', async () => {
    const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters by status=done', async () => {
    const res = await request(app)
      .get('/api/tasks?status=done')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Task B');
  });

  test('filters by priority=high', async () => {
    const res = await request(app)
      .get('/api/tasks?priority=high')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Task A');
  });

  test('searches tasks by title keyword', async () => {
    const res = await request(app)
      .get('/api/tasks?search=Task A')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveLength(1);
  });

  test('returns empty array when no tasks match filter', async () => {
    const res = await request(app)
      .get('/api/tasks?status=in_progress')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveLength(0);
  });
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────

describe('PUT /api/tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original', status: 'todo' });
    taskId = res.body.id;
  });

  test('updates title and status', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated', status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.status).toBe('done');
  });

  test('returns 404 for a non-existent task', async () => {
    const res = await request(app)
      .put('/api/tasks/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe('DELETE /api/tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Trash me' });
    taskId = res.body.id;
  });

  test('deletes an existing task', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('returns 404 on second delete of same task', async () => {
    await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('cannot delete another user\'s task', async () => {
    const other = await request(app)
      .post('/api/auth/register')
      .send({ username: 'dave', email: 'dave@test.com', password: 'password123' });

    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${other.body.token}`);
    expect(res.status).toBe(404);
  });
});
