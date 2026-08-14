const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../middleware/auth');

process.env.JWT_SECRET = 'test-secret';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticate middleware', () => {
  test('rejects requests with no Authorization header', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an invalid token', () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a valid token and attaches the user to req', () => {
    const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'candidate' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.email).toBe('test@test.com');
  });
});

describe('authorize middleware', () => {
  test('allows a matching role through', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('blocks a non-matching role with 403', () => {
    const req = { user: { role: 'candidate' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});