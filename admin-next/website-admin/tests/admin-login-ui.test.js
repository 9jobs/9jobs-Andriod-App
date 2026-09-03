import { describe, expect, jest, test } from '@jest/globals';

const push = jest.fn();
const refresh = jest.fn();
const pushToast = jest.fn();

async function renderLoginForm() {
  jest.resetModules();
  jest.doMock('next/navigation', () => ({
    useRouter: () => ({
      push,
      refresh,
    }),
  }));
  jest.doMock('@/components/admin/ToastProvider', () => ({
    useToast: () => ({
      pushToast,
    }),
  }));

  const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: AdminLoginForm } = await import('@/components/admin/AdminLoginForm');
  return renderToStaticMarkup(React.createElement(AdminLoginForm, { nextPath: '/admin/dashboard' }));
}

describe('admin login ui', () => {
  test('renders a sign-in only secure access card', async () => {
    const markup = await renderLoginForm();

    expect(markup).toContain('Secure Access');
    expect(markup).toContain('Admin Login');
    expect(markup).toContain('Login');
    expect(markup).not.toContain('Sign up');
    expect(markup).not.toContain('Forgot password');
    expect(markup).not.toContain('Forgot your password?');
  });
});
