import ClientInfoForm from '@/components/ClientInfoForm';
import { PageTransition } from '@/components/homepage/HomeMotion';

export const metadata = {
  title: 'Client Information Details - 9Jobs',
  description: 'Provide your professional details, working rights, and upload your resume to get started with 9Jobs.',
  openGraph: {
    title: 'Client Information Details - 9Jobs',
    description: 'Provide your professional details, working rights, and upload your resume to get started with 9Jobs.',
    url: 'https://9jobs.co/client-information',
    siteName: '9Jobs',
    images: [
      {
        url: 'https://9jobs.co/9jobs-share-card.png',
        width: 1200,
        height: 630,
        alt: '9Jobs logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Client Information Details - 9Jobs',
    description: 'Provide your professional details, working rights, and upload your resume to get started with 9Jobs.',
    images: ['https://9jobs.co/9jobs-share-card.png'],
  },
};

export default function ClientInformationPage() {
  return (
    <PageTransition>
      <main className="site-main fj-page" data-fj-motion-root="true">
        <section className="fj-page-hero fj-contact-hero" style={{ paddingBottom: '2rem' }}>
          <div className="fj-container">
            <span className="fj-announcement" style={{ marginBottom: '1rem' }}>
              <span>Onboarding</span> Client Registration
            </span>
            <div className="fj-home-copy-stack">
              <h1 style={{ fontWeight: 500 }}>
                Client Information <span className="heading-mark" style={{ fontWeight: 500 }}>Details.</span>
              </h1>
              <p>
                Please complete the form below with your current details and upload your latest resume.
              </p>
            </div>
          </div>
        </section>

        <section className="fj-section fj-section--tight">
          <div className="fj-container" style={{ maxWidth: '720px', margin: '0 auto' }}>
            <ClientInfoForm />
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
