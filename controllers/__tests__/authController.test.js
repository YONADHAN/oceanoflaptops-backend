const test = require('node:test');
const assert = require('node:assert');
const HTTP_STATUS = require('../../utils/constants/httpStatus');
const ERROR_MESSAGES = require('../../utils/constants/errorMessages');

// Mock User model BEFORE requiring the controller
const User = require('../../models/userSchema');
const mockUserDb = {
  'valid-user': {
    _id: 'valid-user',
    username: 'test',
    email: 'test@test.com',
    isAdmin: false,
    isBlocked: false,
    password: 'hash', // Should not be returned
    otp: '123'        // Should not be returned
  },
  'valid-admin': {
    _id: 'valid-admin',
    username: 'admin',
    email: 'admin@test.com',
    isAdmin: true,
    isBlocked: false,
  },
  'blocked-user': {
    _id: 'blocked-user',
    isBlocked: true,
  }
};

User.findById = (id) => {
  return {
    select: (fields) => {
      // Basic assertion that we exclude sensitive fields
      assert.ok(fields.includes('-password'));
      assert.ok(fields.includes('-otp'));
      
      const user = mockUserDb[id];
      if (!user) return Promise.resolve(null);
      
      // Simulate excluding fields
      const { password, otp, ...safeUser } = user;
      return Promise.resolve(safeUser);
    }
  };
};

const { getMe } = require('../authController');

test('getMe controller tests', async (t) => {
  
  await t.test('1. Valid user authentication -> returns 200 and safe data', async () => {
    const req = { user: { _id: 'valid-user', role: 'user' } };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; }
    };
    
    await getMe(req, res);
    
    assert.strictEqual(res.statusCode, HTTP_STATUS.OK);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.role, 'user');
    assert.strictEqual(res.data.userData._id, 'valid-user');
    assert.strictEqual(res.data.userData.password, undefined, 'Password should not be exposed');
    assert.strictEqual(res.data.userData.otp, undefined, 'OTP should not be exposed');
  });

  await t.test('4. Valid admin authentication -> returns 200 and safe data', async () => {
    const req = { user: { _id: 'valid-admin', role: 'admin' } };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; }
    };
    
    await getMe(req, res);
    
    assert.strictEqual(res.statusCode, HTTP_STATUS.OK);
    assert.strictEqual(res.data.role, 'admin');
    assert.strictEqual(res.data.userData._id, 'valid-admin');
  });

  await t.test('9. Deleted/nonexistent authenticated account -> returns 404', async () => {
    const req = { user: { _id: 'nonexistent-user', role: 'user' } };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; }
    };
    
    await getMe(req, res);
    
    assert.strictEqual(res.statusCode, HTTP_STATUS.NOT_FOUND);
    assert.strictEqual(res.data.message, ERROR_MESSAGES.USER_NOT_FOUND);
  });

  await t.test('Blocked user -> returns 403', async () => {
    const req = { user: { _id: 'blocked-user', role: 'user' } };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; }
    };
    
    await getMe(req, res);
    
    assert.strictEqual(res.statusCode, HTTP_STATUS.FORBIDDEN);
    assert.strictEqual(res.data.message, 'User is blocked.');
  });
});
