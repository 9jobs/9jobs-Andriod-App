import Image from "next/image";
import ContactForm from "../../components/ContactForm";
import { Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { JsonLd, createBreadcrumbSchema, createSeoMetadata, getRouteSeo } from "../../data/seo";
import { Reveal, StaggerContainer, StaggerItem, PageTransition } from "../../components/homepage/HomeMotion";

const routeSeo = getRouteSeo("/contact");

export const metadata = createSeoMetadata(routeSeo);

export default async function ContactPage({ searchParams }) {
  const params = await searchParams;
  const initialMessage =
    params?.intent === "demo" ? "I would like to schedule a 9Jobs demo." : "";
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ]);

  return (
    <PageTransition>
      <main className="site-main fj-page" data-fj-motion-root="true">
        <JsonLd schema={breadcrumbSchema} />
        <section className="fj-page-hero fj-contact-hero">
          <div className="fj-container">
            <Reveal direction="down" duration={0.6}>
              <span className="fj-announcement"><span>Contact</span> We are ready to help</span>
            </Reveal>
            <StaggerContainer as="div" className="fj-home-copy-stack" stagger={0.12} delayChildren={0.08}>
              <StaggerItem as="div">
                <h1>Get in touch with <span className="heading-mark">9Jobs.</span></h1>
              </StaggerItem>
              <StaggerItem as="div">
                <p>Tell us what you want to improve: resume, LinkedIn, applications, interview flow, or a full demo of the platform.</p>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section fj-section--tight">
          <div className="fj-container fj-contact-layout">
            <Reveal direction="left" distance={30} style={{ height: "100%" }}>
              <aside className="fj-contact-panel" style={{ height: "100%" }}>
                <div className="fj-icon-chip"><Sparkles size={22} /></div>
                <span className="fj-label">Contact information</span>
                <div className="fj-contact-visual">
                  <Image
                    src="/framer/contact-panel-team.jpg"
                    alt="9Jobs team collaborating over applications and outreach"
                    width={1000}
                    height={800}
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </div>
                <h2>Fast answers, clear next <span className="heading-mark">steps.</span></h2>
                <p>Share the outcome you want and the 9Jobs team will respond with the most useful path forward.</p>

                <div className="fj-contact-list">
                  <a href="tel:+61422279428"><Phone size={20} /> +61 422 279 428</a>
                  <a href="mailto:9jobsapplicationservice@gmail.com"><Mail size={20} /> 9jobsapplicationservice@gmail.com</a>
                  <span><MapPin size={20} /> Melbourne, Australia</span>
                </div>

                <div className="fj-contact-hours">
                  <strong>Business hours</strong>
                  <p>Monday to Saturday, 8:00 AM to 6:00 PM.</p>
                </div>
              </aside>
            </Reveal>

            <Reveal direction="right" distance={30} delay={0.1}>
              <div className="fj-contact-form-slot">
                <ContactForm initialMessage={initialMessage} />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
