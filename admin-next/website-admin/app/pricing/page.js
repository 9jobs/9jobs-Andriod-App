import { ArrowRight, Check, Sparkles } from "lucide-react";
import { CalendlyLink } from "../../components/CalendlyWidget";
import PricingCheckoutButton from "../../components/PricingCheckoutButton";
import ResumePricingSection from "../../components/ResumePricingSection";
import { JsonLd, createBreadcrumbSchema, createSeoMetadata, getRouteSeo } from "../../data/seo";
import { Reveal, StaggerContainer, StaggerItem, HoverCard, PageTransition } from "../../components/homepage/HomeMotion";

const plans = [
  {
    name: "Trial",
    price: "AUD $50",
    period: "/ 2 days",
    summary: "Try the 9Jobs experience for 2 days with a simple one-time checkout under the Standard Plan.",
    items: ["Full platform access", "Resume review", "Application support", "2-day support window"],
    ctaLabel: "Pay AUD $50",
  },
  {
    name: "Standard Plan",
    price: "AUD $150",
    period: "/ week",
    summary: "Standard Plan weekly job-support subscription with recurring billing disclosed before payment.",
    items: [
      "Private checkout link",
      "Amount due today shown before payment",
      "Same amount charged every week until cancelled",
      "Cancellation path included in billing flow",
      "Agreement-linked recurring consent",
    ],
    highlighted: true,
    action: "contact",
    href: "/contact?intent=standard-weekly",
    ctaLabel: "Request private checkout",
  },
  {
    name: "Two-Month Success-Based",
    price: "AUD $200",
    period: "/ onboarding",
    summary: "Start with upfront onboarding fees, then handle any later success fee as a separate one-time charge.",
    items: [
      "Personalised onboarding amount",
      "No automatic weekly recurring charge",
      "Separate success-fee request when triggered",
      "Private billing link and agreement review",
      "Manual approval before any success-fee payment",
    ],
    dark: true,
    action: "contact",
    href: "/contact?intent=success-based",
    ctaLabel: "Request onboarding link",
  },
];

const routeSeo = getRouteSeo("/pricing");

export const metadata = createSeoMetadata(routeSeo);

export default function PricingPage() {
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Pricing", path: "/pricing" },
  ]);

  return (
    <PageTransition>
      <main className="site-main fj-page" data-fj-motion-root="true">
        <JsonLd schema={breadcrumbSchema} />
        <section className="fj-page-hero">
          <div className="fj-container">
            <Reveal direction="down" duration={0.6}>
              <span className="fj-announcement"><span>Plans</span> Clear support for every stage</span>
            </Reveal>
            <StaggerContainer as="div" className="fj-home-copy-stack" stagger={0.12} delayChildren={0.08}>
              <StaggerItem as="div">
                <h1>A plan for anyone. <span className="heading-mark">Anytime.</span></h1>
              </StaggerItem>
              <StaggerItem as="div">
                <p>Start small, add hands-on support when you need it, or build a repeatable workflow for a team.</p>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section fj-section--tight">
          <div className="fj-container">
            <StaggerContainer as="div" className="fj-card-grid fj-card-grid--three" stagger={0.1}>
              {plans.map((plan) => (
                <StaggerItem as="div" key={plan.name}>
                  <HoverCard className={plan.dark ? "fj-pricing-card is-dark" : "fj-pricing-card"} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    {plan.highlighted && <span className="fj-badge">Popular</span>}
                    <h2>{plan.name}</h2>
                    <p>{plan.summary}</p>
                    <strong>{plan.price}</strong>{plan.period && <span className="fj-price-period">{plan.period}</span>}
                    <div className="fj-price-list">
                      {plan.items.map((item) => (
                        <span key={item}><Check size={17} /> {item}</span>
                      ))}
                    </div>

                    <div className="fj-pricing-actions" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto", paddingTop: "24px" }}>
                      <PricingCheckoutButton
                        plan={plan}
                        className={plan.dark ? "fj-button fj-button--lime" : "fj-button"}
                      />
                      <CalendlyLink className="fj-button fj-button--ghost">
                        Get a schedule <ArrowRight size={17} />
                      </CalendlyLink>
                    </div>
                  </HoverCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <ResumePricingSection />

        <section className="fj-section fj-section--tight">
          <div className="fj-container">
            <Reveal direction="up" distance={24}>
              <div className="fj-final-cta">
                <Sparkles size={28} />
                <span>Need a custom setup</span>
                <h2>Book a short demo and we will map the right <span className="heading-mark">flow.</span></h2>
                <CalendlyLink className="fj-button fj-button--dark">
                  Schedule a demo
                </CalendlyLink>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
