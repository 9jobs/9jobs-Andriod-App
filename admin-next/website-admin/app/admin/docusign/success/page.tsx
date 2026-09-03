import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { requireAdminPageSession } from '@/lib/admin/auth/require-admin';

export const dynamic = 'force-dynamic';

/**
 * DocuSign success page that confirms successful integration connection.
 * Securely wrapped with admin session check.
 */
export default async function DocuSignSuccessPage() {
  // Ensure the user accessing this page is an authorized admin
  await requireAdminPageSession();

  return (
    <AdminShell eyebrow="DocuSign Integration" title="Connection Status">
      <section 
        className="admin-panel" 
        style={{ 
          maxWidth: '600px', 
          margin: '40px auto', 
          padding: '40px', 
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          borderRadius: '8px',
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '24px' }} aria-hidden="true">
          ✅
        </div>
        
        <h2 
          style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            marginBottom: '16px',
            color: '#111827'
          }}
        >
          DocuSign Connected Successfully
        </h2>
        
        <p 
          style={{ 
            color: '#4b5563', 
            marginBottom: '36px', 
            fontSize: '16px', 
            lineHeight: '1.6',
            maxWidth: '460px',
            margin: '0 auto 36px'
          }}
        >
          You can now use DocuSign API from your 9Jobs admin panel.
        </p>
        
        <div>
          <Link 
            href="/admin/website-admin/dashboard" 
            className="admin-primary-button" 
            style={{ 
              display: 'inline-block', 
              padding: '12px 28px', 
              fontSize: '16px',
              fontWeight: 500,
              textDecoration: 'none',
              borderRadius: '6px',
              transition: 'background-color 0.2s'
            }}
          >
            Return to Dashboard
          </Link>
        </div>
      </section>
    </AdminShell>
  );
}
