const request = require('supertest');
const app = require('../server');
const { resetDB } = require('../database');

beforeEach(() => resetDB());

describe('POST /api/auth/register', () => {
  const validUser = { username: 'alice', email: 'alice@test.com', password: 'secret123' };

  test('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.username).toBe('alice');
  });

  test('fails when fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'alice' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('fails when password is shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@test.com', password: '123' });
    expect(res.status).toBe(400);
  });

  test('fails with duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, username: 'alice2' });
    expect(res.status).toBe(409);
  });

  test('fails with duplicate username', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'other@test.com' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'bob@test.com', password: 'password123' });
  });

  test('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.username).toBe('bob');
  });

  test('fails with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('fails with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'password123' });
    expect(res.status).toBe(401);
  });

  test('fails when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bob@test.com' });
    expect(res.status).toBe(400);
  });
});
