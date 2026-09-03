import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollAnimations from '@/components/ScrollAnimations';
import WhatsAppButton from '@/components/WhatsAppButton';
import ChromeVisibility from '@/components/ChromeVisibility';

export default function AppChrome({ children }) {
  return (
    <>
      <ChromeVisibility />
      <Navbar />
      {children}
      <Footer />
      <ScrollAnimations />
      <WhatsAppButton />
    </>
  );
}
