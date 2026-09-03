import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const connectMongoDB = jest.fn();
const findOne = jest.fn();
const countDocuments = jest.fn();
const compare = jest.fn();

async function loadAdminUserService() {
  jest.resetModules();
  jest.doMock('@/lib/mongodb', () => ({
    __esModule: true,
    default: connectMongoDB,
  }));
  jest.doMock('@/models/AdminUser', () => ({
    __esModule: true,
    default: {
      findOne,
      countDocuments,
    },
  }));
  jest.doMock('bcryptjs', () => ({
    __esModule: true,
    default: {
      compare,
      hash: jest.fn(),
    },
  }));

  return import('@/lib/admin/auth/admin-user-service');
}

function buildAdminUser(overrides = {}) {
  return {
    _id: 'admin-1',
    email: 'vijay9jobsapplicationservices@gmail.com',
    name: 'Vijay',
    passwordHash: 'stored-hash',
    lastLoginAt: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('admin user service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('authenticates the only admin when the known mailbox alias is used', async () => {
    const { authenticateAdminUser } = await loadAdminUserService();
    const adminUser = buildAdminUser();
    findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(adminUser);
    countDocuments.mockResolvedValue(1);
    compare.mockResolvedValue(true);

    const result = await authenticateAdminUser({
      email: '9jobsapplicationservice@gmail.com',
      password: 'correct-password',
    });

    expect(result).toEqual({
      id: 'admin-1',
      email: 'vijay9jobsapplicationservices@gmail.com',
      name: 'Vijay',
    });
    expect(countDocuments).toHaveBeenCalledWith({});
    expect(compare).toHaveBeenCalledWith('correct-password', 'stored-hash');
    expect(adminUser.save).toHaveBeenCalled();
  });
});
