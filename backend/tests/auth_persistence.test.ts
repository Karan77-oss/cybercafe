import request from 'supertest';
import app from '../src/app';

jest.setTimeout(30000);

describe('Customer Registration & Re-Login Persistence', () => {
  const timestamp = Date.now();
  const testEmail = `testcustomer_${timestamp}@example.com`;
  const testPhone = `98765${String(timestamp).slice(-5)}`;
  const testPassword = 'Password@123';
  const testName = 'Test Persistent Customer';
  let customerToken: string = '';

  it('registers a new customer successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: testName,
        email: testEmail,
        phone: testPhone,
        password: testPassword,
        address: '123 Market Road, City'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.token).toBeDefined();
    customerToken = res.body.token;
  });

  it('logs out the customer successfully', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('immediately logs back in with the same email and password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
  });

  it('logs in using phone number and password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: testPhone,
        password: testPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.phone).toBe(testPhone);
  });

  it('rejects invalid credentials with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'wrong_password_123'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
