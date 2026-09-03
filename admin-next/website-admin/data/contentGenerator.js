import { cities, pagesConfig } from "./australianJobsData";

export function getContentForPage(citySlug, pageSlug = null) {
  const city = cities[citySlug];
  if (!city) return null;

  const config = pagesConfig.find(p => p.city === citySlug && p.slug === pageSlug);
  if (!config) return null;

  const h1 = config.keyword;

  // 1. Introduction / Market Overview (approx 350 words)
  const introduction = `Navigating the professional job market in ${city.name}, ${city.state}, requires a deep, localized understanding of the regional economy, local business expectations, and corporate environment. As one of Australia's key economic engines, ${city.name} hosts a highly competitive workforce across diverse sectors such as ${city.industries.slice(0, 3).join(", ")}, and ${city.industries[3] || "tech"}. Sourcing professional opportunities in this landscape is not just about submitting online applications; it demands a strategic alignment with how local hiring authorities operate. Over the past few years, the recruitment methods in ${city.state} have shifted heavily towards automated talent acquisition, requiring candidates to present a highly refined and keyword-rich professional brand. Whether you are aiming for executive leadership roles in the CBD or technical positions in growing innovation hubs like ${city.suburbs[0]} or ${city.suburbs[1]}, your application must speak directly to local benchmarks. Employers in ${city.name} value candidates who demonstrate clear local context, a strong work ethic, and a solid understanding of Australian commercial dynamics. To capture the attention of recruiters, your profile must stand out in local databases and search queries, ensuring that you clear automated screens and progress directly to interviews. Partnering with 9Jobs gives you the local expertise to position yourself effectively, ensuring your career journey is backed by data-driven strategies and premium documentation that stands out in a crowded market.`;

  // 2. City-Specific Sub-Slug Career Guide (approx 550 words)
  let strategyGuide = "";
  if (!pageSlug) {
    strategyGuide = `Achieving long-term career success in ${city.name} requires a multi-layered approach to your job search. A successful search is built on three main pillars: an ATS-compliant resume, a fully optimized LinkedIn profile, and a highly visible SEEK profile. Recruiters in ${city.name} receive hundreds of applications for every advertised vacancy on major job boards. To manage this volume, they search internal databases and platforms like SEEK and LinkedIn using complex boolean queries. If your digital footprint does not contain the precise combination of local keywords and industry certifications, your profile remains invisible. Additionally, passing the human screening phase requires a resume layout that is clean, chronological, and focuses on accomplishments rather than basic duties. Our team at 9Jobs specializes in creating this professional alignment. We rewrite your CV from scratch, ensure your LinkedIn profile matches your document exactly, and guide you through the local interview methods so you can apply with confidence. Furthermore, we help you understand the local networking landscape, identifying key industry groups and associations in ${city.name} where you can build professional relationships and uncover opportunities that are never advertised publicly. By aligning your application materials with local hiring conventions and optimizing your search workflow, we help you reduce your job hunt duration and secure a role that matches your skills and salary expectations.`;
  } else if (pageSlug === "get-jobs" || pageSlug === "get-jobs-vic") {
    strategyGuide = `If you want to know how to get jobs in ${city.name}, you must understand that the 'hidden job market' accounts for a significant portion of local hires. Many professional opportunities are filled through headhunting, internal transfers, or specialized recruitment agencies before they are ever published online. To tap into this network in ${city.state}, you need a proactive sourcing strategy. This includes connecting with top local recruitment specialists who focus on your industry, optimizing your LinkedIn settings to 'Open to Work' for specific hiring regions, and building a resume that passes the automated filters used by large agencies. When applying to roles in ${city.name}, ensure your contact information, target location, and working rights or visa status are explicitly clear. Many recruiters filter out candidates whose locations appear to be overseas or interstate. Outsourcing your application process to a service like 9Jobs allows you to maintain a consistent daily application volume, ensuring you are among the first applicants for every newly posted position. Our team helps you identify the leading recruitment agencies in ${city.name}, teaches you how to follow up effectively after submitting applications, and helps you optimize your online presence so that headhunters can discover you. By taking a proactive, systematic approach to the local market, you can navigate the recruitment landscape with ease and secure interviews for high-paying roles.`;
  } else if (pageSlug === "jobs" || pageSlug === "jobs-melbourne" || pageSlug === "jobs-perth" || pageSlug === "jobs-in-perth" || pageSlug === "jobs-in-perth-wa") {
    strategyGuide = `Looking for jobs in ${city.name} requires a structured campaign that targets the most active hiring platforms. In Australia, SEEK remains the primary job search channel, followed by LinkedIn and Jora. However, simply uploading your resume and clicking 'Quick Apply' is rarely successful. To secure callbacks in ${city.name}, your profile must be optimized to match the job descriptions. This means analyzing the advertisements for target keywords and integrating them naturally into your CV and profiles. Furthermore, employers in ${city.name} look for candidates who show clear value through metrics—such as budgets managed, team sizes led, or revenue growth generated. Rather than listing tasks, your application should highlight outcomes. 9Jobs helps you navigate this by providing daily job sourcing and tailored applications, placing your optimized resume directly in front of active hiring managers in ${city.name} and ensuring you secure consistent mock interview practice. We analyze local employment trends, identify which companies are currently expanding their teams in ${city.name}, and target our sourcing efforts to match these high-growth sectors. This targeted approach ensures that your applications are highly relevant, greatly increasing your chances of securing callbacks and landing your ideal position in the local market.`;
  } else if (pageSlug === "resume" || pageSlug === "resume-writer" || pageSlug === "resume-help") {
    strategyGuide = `A professional resume in ${city.name} is the single most important document in your job search toolkit. Australian resume writing conventions differ significantly from those in other global regions. A standard CV in ${city.state} should be between 2 and 3 pages, written in reverse-chronological order, and must exclude personal details like age, marital status, or a profile picture. More importantly, it must be formatted to pass Applicant Tracking Systems (ATS) like Workday, Taleo, and SuccessFactors. These systems parse your resume, stripping away styling to index your skills and work history. If your resume uses multi-column layouts, graphics, tables, or non-standard fonts, the scanner may scramble your details, leading to an automatic rejection. 9Jobs' resume writers specialize in building clean, single-column documents that parse perfectly, utilizing strong action verbs and metrics-focused accomplishments to prove your expertise to ${city.name} hiring teams. We work with you to extract your key achievements, translate your professional history into Australian English, and format your document to match the exact standards expected by local recruiters. Our writers understand the specific keyword densities and formatting rules that pass automated screens, ensuring that your resume gets read by actual decision-makers and leads to interview invitations.`;
  } else if (pageSlug === "interview-coaching") {
    strategyGuide = `Mastering the interview stage is crucial to landing your target job in ${city.name}. Employers in ${city.state} heavily favor behavioral interviewing techniques, specifically the STAR method (Situation, Task, Action, Result). During your interview, recruiters will ask questions like 'Tell me about a time you handled a difficult stakeholder' or 'Describe a project that did not go according to plan.' Your answers must be structured, concise, and focused on your specific contributions and the measurable outcome. Communication in ${city.name} corporate environments is expected to be clear, professional, and collaborative. Working with an interview coach helps you refine your presentation, eliminate verbal filler, and practice answering high-pressure questions. 9Jobs provides personalized coaching sessions to help you craft compelling narratives, run realistic mock interviews, and build the confidence needed to secure your job offer. Our coaches help you analyze the job description to anticipate the questions you will face, teach you how to structure your responses to highlight your leadership and problem-solving abilities, and guide you on local communication nuances. We also help you prepare insightful questions to ask the interviewer, demonstrating your genuine interest in the role and your strategic thinking.`;
  } else if (pageSlug === "careers" || pageSlug === "career-services" || pageSlug === "career-coaching") {
    strategyGuide = `Navigating career transitions or planning your next step in ${city.name} requires professional guidance and a clear roadmap. The local job market is dynamic, with emerging tech hubs and infrastructure projects creating new opportunities while traditional sectors evolve. Career services provide the framework to assess your transferable skills, identify target sectors in ${city.state}, and build a resume that matches your new direction. Whether you are transitioning from technical roles to management or moving into a new industry, our consultants help you frame your experience to appeal to ${city.name} employers. We work with you to design a personalized search strategy, manage your digital reputation, and ensure your applications are tailored to local expectations. With 9Jobs, you receive end-to-end support that covers resume rewriting, LinkedIn optimization, and daily application submissions, giving you a competitive advantage. Our consultants offer objective feedback on your career goals, help you identify skill gaps that may be holding you back, and provide actionable advice on how to position yourself for promotions or salary increases. By partnering with 9Jobs, you gain a trusted career advisor who is dedicated to helping you achieve your professional potential.`;
  } else {
    strategyGuide = `Navigating the recruitment pathways in ${city.name} is a structured process that relies on high-quality documentation and digital profile visibility. To secure interview invitations in the local ${city.state} job market, your application must align with local hiring standards and the expectations of regional employers. This involves tailoring your achievements, highlighting local projects, and ensuring your CV uses appropriate Australian English terminology. 9Jobs works directly with professionals in ${city.name} to optimize their local job search workflow, rebuilding resume packages, setting up online seeker profiles, and providing tailored interview preparation to ensure high callback rates. Our comprehensive services are designed to give you a competitive edge, helping you stand out to recruiters and secure callbacks for premium roles. We take the time to understand your unique career goals, analyze the local market demand, and customize our support to match your specific needs, ensuring a smooth and successful job search experience.`;
  }

  // 3. Suburbs We Serve Section (approx 350 words)
  const suburbsSection = `Our local career consulting and resume writing services extend throughout the greater ${city.name} metropolitan area, ensuring that job seekers receive hyper-localized support. We serve professionals across all major commercial and residential hubs in the region, including ${city.suburbs.slice(0, -1).join(", ")}, and ${city.suburbs[city.suburbs.length - 1]}. Each of these suburbs represents a unique facet of ${city.name}'s economic ecosystem, from bustling corporate offices and business parks to creative studios and industrial districts. Whether you are based in the heart of the CBD or in surrounding growth corridors, our services are accessible and customized to the local industry dynamics. We understand the specific transit networks, commuter habits, and corporate preferences that define the workplace culture in different parts of ${city.name}. We know that employers in certain suburbs may favor specific industry backgrounds—such as tech and creative services in urban hubs or logistics and manufacturing in the outer corridors. By partnering with 9Jobs, you gain access to a dedicated team that understands the local landscape, ensuring that your application is optimized for the specific employers and recruitment networks operating in your neighborhood. We help you highlight experience that is highly relevant to local businesses, demonstrating your understanding of regional market conditions and making you an attractive candidate for local roles.`;

  // 4. ATS & SEEK Optimization Standards (approx 450 words)
  const atsSection = `In the modern Australian recruitment landscape, the vast majority of applications are filtered by technology before they reach human eyes. Applicant Tracking Systems (ATS) are used by almost all mid-to-large employers in ${city.name} to manage candidate volumes. These software platforms scan resumes for specific keywords, education history, and job titles to assign a match score. Applications below a certain score are automatically archived, meaning that even highly qualified candidates can be rejected if their resumes are not optimized. To clear this digital screen, your resume must be built on a clean, single-column layout without complex design elements. In addition to ATS compliance, your SEEK profile is a critical component of your job search. In Australia, recruiters use the SEEK Candidate Search database to actively source talent. If your SEEK profile is incomplete, lacks a professional summary, or does not list the correct target job titles and location settings, you will miss out on headhunting opportunities. LinkedIn operates similarly, using search algorithms that prioritize profiles with complete details, keyword-rich summaries, and active engagement. 9Jobs ensures that your entire professional footprint—including your resume, SEEK profile, and LinkedIn presence—is fully aligned and optimized to maximize your visibility and search ranking among local recruiters. We verify that your profiles are populated with high-volume search terms, adjust your visibility settings to ensure maximum exposure, and show you how to leverage these platforms to build a strong professional brand. By aligning all aspects of your job search, we help you capture the attention of both automated systems and human hiring managers, giving you a massive advantage.`;

  // 5. Local SEO FAQs (at least 3-4 FAQ items, approx 450 words)
  const faqs = [
    [
      `What are the most active job search platforms in ${city.name}?`,
      `In ${city.name} and across ${city.state}, SEEK remains the primary platform for active vacancies, accounting for the largest share of job postings. LinkedIn is also widely used for professional and corporate roles, while platforms like Jora and Indeed aggregate listings from various sites. For public sector opportunities, the official ${city.name} and ${city.state} government careers portals are the primary sources. To maximize your reach, we recommend maintaining active, fully optimized profiles on both SEEK and LinkedIn, as recruiters use both platforms extensively to find and contact qualified candidates.`
    ],
    [
      `How does the 9Jobs daily application service work for ${city.name} roles?`,
      `Our daily job application service is designed to take the manual labor out of your search. After optimizing your resume, LinkedIn, and SEEK profiles, our local sourcing team monitors the job market in ${city.name} every day. When we find roles matching your exact criteria, we tailor your application cover letters and submit them directly on your behalf, ensuring you maintain a consistent daily volume of high-quality applications. We track every submission in a dedicated client dashboard, providing you with real-time updates and ensuring you are ready when recruiters start calling.`
    ],
    [
      `What industries are currently driving job growth in ${city.name}?`,
      `Currently, the job market in ${city.name} is driven by expansion in ${city.industries.slice(0, 3).join(", ")}, along with infrastructure development. Recruiters are actively searching for skilled professionals in these sectors who can demonstrate immediate value, clear communication, and local regulatory alignment. Our writing team stays up-to-date with these industry trends, ensuring that we highlight the specific skills and qualifications that are currently in high demand among local hiring managers.`
    ],
    [
      `Should I include my visa status on my resume for ${city.name} employers?`,
      `Yes. In Australia, recruiters prefer absolute transparency regarding working rights. If you hold a permanent residency, citizenship, or a valid subclass visa (such as a TSS 482, Working Holiday 417, or Graduate 485 visa), listing this details clearly in your professional summary helps eliminate doubt and prevents recruiters from discarding your application due to working rights uncertainty. Our team will guide you on the best way to present this information to ensure it is clear, professional, and reassuring to employers.`
    ]
  ];

  // Breadcrumb structure
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Australian Jobs", url: "/jobs" },
    { name: `${city.name} Jobs`, url: `/jobs/${citySlug}` }
  ];
  if (pageSlug) {
    let url = `/jobs/${citySlug}/${pageSlug}`;
    breadcrumbs.push({
      name: config.keyword,
      url: url
    });
  }

  // Cross links to other cities (Related Locations)
  const allLocations = [
    { city: "melbourne", name: "Jobs in Melbourne", href: "/jobs/melbourne" },
    { city: "sydney", name: "Jobs in Sydney NSW", href: "/jobs/sydney" },
    { city: "brisbane", name: "Jobs in Brisbane QLD", href: "/jobs/brisbane" },
    { city: "perth", name: "Jobs in Perth WA", href: "/jobs/perth" },
    { city: "adelaide", name: "Jobs in Adelaide SA", href: "/jobs/adelaide" },
    { city: "geelong", name: "Jobs in Geelong VIC", href: "/jobs/geelong" },
    { city: "vic", name: "Jobs in Victoria VIC", href: "/jobs/vic" }
  ];

  const otherCities = allLocations
    .filter(loc => loc.city !== citySlug)
    .map(loc => ({
      name: loc.name,
      href: loc.href
    }));

  // Extra Market Analysis (approx 150 words)
  const extraMarketAnalysis = `Our career development team closely tracks employment metrics within the ${city.name} CBD and surrounding commercial zones. In recent quarters, corporate entities have increasingly adopted centralized hiring portals, making CV format standardization essential. When we restructure your resume, we don't just fix layout errors; we strategically map your accomplishments against the specific competencies demanded by local employers. This includes aligning project scales with Australian standards, articulating technical qualifications in local terms, and ensuring your professional summary communicates your career goals with clarity. Master your job hunt in ${city.name} with 9Jobs, utilizing our expert-led services to navigate the market with confidence and secure your dream role.`;

  return {
    ...config,
    cityMeta: city,
    h1,
    introduction,
    strategyGuide,
    suburbsSection,
    atsSection,
    faqs,
    breadcrumbs,
    otherCities,
    extraMarketAnalysis
  };
}
