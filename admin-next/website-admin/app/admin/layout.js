import { ToastProvider } from '@/components/admin/ToastProvider';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }) {
  return <ToastProvider>{children}</ToastProvider>;
}
