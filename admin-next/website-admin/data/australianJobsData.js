const cities = {
  melbourne: {
    slug: "melbourne",
    name: "Melbourne",
    state: "VIC",
    description: "Navigate Melbourne's rich, diverse commercial sectors, tech hubs, and creative industries with localized application consulting.",
    suburbs: ["Richmond", "South Yarra", "Fitzroy", "St Kilda", "Docklands", "Collingwood", "Brunswick", "East Melbourne"],
    industries: ["Information Technology", "Creative & Design", "Education & Research", "Healthcare & Biotech", "Financial Services"],
    industryDescriptions: [
      "Strong demand for software, cloud, data, and support candidates across Melbourne's startup and enterprise hiring market.",
      "Studios and agencies regularly hire for branding, UI, content, and digital production roles across inner Melbourne.",
      "Universities and training providers create steady openings in teaching, administration, academic support, and research delivery.",
      "Hospitals, clinics, and biotech employers continue hiring across patient support, labs, compliance, and health operations.",
      "Banks, insurers, and advisory firms look for analysts, coordinators, and client-facing professionals with clean documentation."
    ]
  },
  sydney: {
    slug: "sydney",
    name: "Sydney",
    state: "NSW",
    description: "Accelerate your career in Australia's financial capital, corporate center, and largest tech cluster with target-aligned support.",
    suburbs: ["Surry Hills", "Pyrmont", "North Sydney", "Parramatta", "Macquarie Park", "Alexandria", "Chatswood", "Darlinghurst"],
    industries: ["Investment Banking & Finance", "Software Engineering", "Professional Services", "Media & Advertising", "Construction & Engineering"],
    industryDescriptions: [
      "Sydney's finance market stays active for banking operations, funds management, compliance, and advisory support talent.",
      "Engineering teams across product, platform, security, and fintech businesses keep hiring software talent in Sydney.",
      "Consulting, legal, HR, and business advisory firms value polished resumes and strong client-service positioning.",
      "Agencies and in-house teams recruit for campaign delivery, account management, copy, and digital growth roles.",
      "Major builds and infrastructure programs support demand for project coordinators, estimators, site teams, and engineers."
    ]
  },
  brisbane: {
    slug: "brisbane",
    name: "Brisbane",
    state: "QLD",
    description: "Capitalize on Brisbane's infrastructure growth, tourism sectors, and expanding tech services ahead of local developments.",
    suburbs: ["Fortitude Valley", "South Brisbane", "Milton", "Newstead", "Bowen Hills", "Spring Hill", "Chermside", "West End"],
    industries: ["Government & Public Sector", "Tourism & Hospitality", "Mining & Resources", "Technology Startups", "Healthcare Delivery"],
    industryDescriptions: [
      "Departments and councils often seek administrators, project officers, policy support, and service delivery professionals.",
      "Hotels, venues, and tourism operators continue hiring across guest service, events, food, and front-line supervision.",
      "Resource employers need reliable operations, safety, scheduling, procurement, and technical support candidates.",
      "Brisbane startups hire across product support, software, growth marketing, and customer success as teams scale.",
      "Clinics, aged care, and hospital networks create regular openings in coordination, patient care, and administration."
    ]
  },
  perth: {
    slug: "perth",
    name: "Perth",
    state: "WA",
    description: "Unlock opportunities in Western Australia's resource powerhouses, logistics networks, and growing professional sectors.",
    suburbs: ["Subiaco", "West Perth", "East Perth", "Fremantle", "Osborne Park", "Belmont", "South Perth", "Joondalup"],
    industries: ["Mining & Resource Operations", "Engineering Consultancies", "Logistics & Maritime", "Corporate Finance", "Renewable Energy"],
    industryDescriptions: [
      "WA resource employers hire for site admin, maintenance planning, safety, shutdown support, and operations coordination.",
      "Consultancies often recruit civil, mechanical, and project delivery professionals for local and remote projects.",
      "Ports, freight, and warehousing networks create roles in dispatch, transport planning, supply chain, and compliance.",
      "Perth corporate teams need finance officers, payroll staff, analysts, and commercial support across growing firms.",
      "Clean energy projects are opening roles in project support, field coordination, stakeholder engagement, and technical delivery."
    ]
  },
  adelaide: {
    slug: "adelaide",
    name: "Adelaide",
    state: "SA",
    description: "Position yourself in Adelaide's innovation precincts, defense contracting networks, and health sciences hubs.",
    suburbs: ["Kent Town", "North Adelaide", "Norwood", "Thebarton", "Mawson Lakes", "Bowden", "Unley", "Adelaide CBD"],
    industries: ["Defense Contracting", "Space & Aerospace Tech", "Wine & Agriculture Tech", "Medical Research", "Advanced Manufacturing"],
    industryDescriptions: [
      "Defense suppliers value clear compliance-ready resumes for project, procurement, engineering, and support functions.",
      "Adelaide's aerospace ecosystem hires across systems support, testing, documentation, and technical coordination.",
      "Agritech and wine businesses recruit for production planning, quality, logistics, and field operations support.",
      "Research institutes and health labs need coordinators, analysts, and regulated documentation capability.",
      "Manufacturing employers continue hiring across production, QA, maintenance, scheduling, and process improvement roles."
    ]
  },
  geelong: {
    slug: "geelong",
    name: "Geelong",
    state: "VIC",
    description: "Tap into Geelong's transitioning economy, manufacturing heritage, service hubs, and regional business opportunities.",
    suburbs: ["Newtown", "East Geelong", "South Geelong", "Belmont", "North Geelong", "Grovedale", "Waurn Ponds", "Geelong West"],
    industries: ["Insurance & Claims (NDIS/TAC)", "Regional Government", "Carbon Fiber & Advanced Materials", "Education Services", "Tourism Operations"],
    industryDescriptions: [
      "Claims, support coordination, and case management roles remain active across NDIS, TAC, and insurance-linked services.",
      "Regional government employers seek administration, policy support, customer service, and program delivery talent.",
      "Advanced materials businesses hire for production support, quality, logistics, and technical operations roles.",
      "Schools, campuses, and training centers create demand for education support, admin, and engagement positions.",
      "Visitor services and local operators recruit across bookings, events, hospitality, and front-desk coordination."
    ]
  },
  vic: {
    slug: "vic",
    name: "Victoria State",
    state: "VIC",
    description: "Broaden your career search across Victoria's regional cities, agricultural centers, and statewide logistics networks.",
    suburbs: ["Ballarat", "Bendigo", "Shepparton", "Wodonga", "Mildura", "Traralgon", "Warrnambool", "Latrobe Valley"],
    industries: ["Agribusiness & Food Tech", "State Logistics", "Regional Public Health", "Infrastructure Projects", "Community Services"],
    industryDescriptions: [
      "Regional Victoria offers steady hiring in food production, farm support, quality systems, and agribusiness operations.",
      "Transport corridors and distribution networks create openings in dispatch, warehousing, planning, and inventory control.",
      "Hospitals and regional health providers need admin, allied support, care coordination, and patient-facing staff.",
      "Civil and utilities projects continue hiring project support, field teams, safety officers, and contract administrators.",
      "Community organisations recruit for case work, outreach, disability support, and local service coordination roles."
    ]
  }
};

const pagesConfig = [
  // Melbourne
  {
    city: "melbourne",
    slug: null,
    keyword: "Melbourne Jobs",
    title: "Jobs in Melbourne | Local Job Search Assistance | 9 Jobs (9jobs)",
    metaDescription: "Find your next career opportunity in Melbourne. Partner with 9 Jobs (9jobs) for local resume writing, LinkedIn optimization, and daily job application services."
  },
  {
    city: "melbourne",
    slug: "get-jobs",
    keyword: "Get Jobs in Melbourne",
    title: "How to Get Jobs in Melbourne VIC | Professional Support | 9 Jobs (9jobs)",
    metaDescription: "Discover how to get jobs in Melbourne. Learn about local hiring networks, optimize your profiles for VIC recruiters, and accelerate your job search."
  },
  {
    city: "melbourne",
    slug: "jobs",
    keyword: "Jobs in Melbourne",
    title: "Jobs in Melbourne VIC | Local Vacancies & Sourcing | 9 Jobs (9jobs)",
    metaDescription: "Explore the local employment landscape in Melbourne. Get an optimized resume and SEEK profile to capture attention from VIC sourcing teams."
  },
  {
    city: "melbourne",
    slug: "careers",
    keyword: "Careers Melbourne",
    title: "Careers Melbourne | Local Career Search Support | 9 Jobs (9jobs)",
    metaDescription: "Build a lasting career in Melbourne. 9 Jobs (9jobs) offers resume rewrites, interview preparation, and done-for-you applications to VIC employers."
  },
  {
    city: "melbourne",
    slug: "resume",
    keyword: "Resume Melbourne",
    title: "Resume Writing Services Melbourne | Professional Writers | 9 Jobs (9jobs)",
    metaDescription: "Need an ATS-friendly resume for Melbourne recruiters? Get a localized document tailored to VIC hiring benchmarks from 9 Jobs (9jobs) experts."
  },
  {
    city: "melbourne",
    slug: "interview-coaching",
    keyword: "Interview Coaching Melbourne",
    title: "Interview Coaching Melbourne | Mock Interviews & Prep | 9 Jobs (9jobs)",
    metaDescription: "Master the STAR method for Melbourne interviews. Get local coaching, communication guidance, and mock practice with 9 Jobs (9jobs) career coaches."
  },
  {
    city: "melbourne",
    slug: "jobs-melbourne",
    keyword: "Jobs Melbourne",
    title: "Jobs Melbourne | Local Sourcing & Vacancies | 9 Jobs (9jobs)",
    metaDescription: "Find jobs in Melbourne. Standard resume configurations, local SEO setups, and daily job application assistance from 9 Jobs (9jobs)."
  },
  {
    city: "melbourne",
    slug: "get-jobs-vic",
    keyword: "Get Jobs in Melbourne VIC",
    title: "How to Get Jobs in Melbourne VIC | Professional Support | 9 Jobs (9jobs)",
    metaDescription: "Learn how to get jobs in Melbourne VIC. Adjust your location filters, format your resume for VIC databases, and secure callbacks."
  },

  // Sydney
  {
    city: "sydney",
    slug: null,
    keyword: "Sydney Jobs",
    title: "Jobs in Sydney NSW | Local Sourcing & Career Support | 9 Jobs (9jobs)",
    metaDescription: "Land your next role in Sydney. Get localized resume writing, LinkedIn profile optimization, and job application support from 9 Jobs (9jobs)."
  },
  {
    city: "sydney",
    slug: "get-jobs",
    keyword: "Get Jobs in Sydney NSW",
    title: "How to Get Jobs in Sydney NSW | Local Strategy Guide | 9 Jobs (9jobs)",
    metaDescription: "Learn how to get jobs in Sydney, NSW. Optimize your resume for corporate filters, adjust your SEEK preferences, and secure callbacks."
  },
  {
    city: "sydney",
    slug: "jobs",
    keyword: "Jobs in Sydney NSW",
    title: "Jobs in Sydney NSW | Local Sourcing & Vacancies | 9 Jobs (9jobs)",
    metaDescription: "Browse opportunities in Sydney, NSW. Discover local recruitment hubs, optimize your keyword profile, and stand out to hiring managers."
  },
  {
    city: "sydney",
    slug: "career-services",
    keyword: "Career Services Sydney NSW",
    title: "Career Services Sydney NSW | Professional Coaching | 9 Jobs (9jobs)",
    metaDescription: "Accelerate your job search in Sydney. Local career consulting, resume tailoring, and done-for-you daily application submissions."
  },
  {
    city: "sydney",
    slug: "resume-writer",
    keyword: "Resume Writer Sydney NSW",
    title: "Professional Resume Writer Sydney | CV Writing Services | 9 Jobs (9jobs)",
    metaDescription: "Get a high-impact, ATS-optimized resume written specifically for Sydney recruiters and hiring systems by the 9 Jobs (9jobs) team."
  },
  {
    city: "sydney",
    slug: "interview-coaching",
    keyword: "Interview Coaching Sydney NSW",
    title: "Interview Coaching Sydney | Executive Interview Prep | 9 Jobs (9jobs)",
    metaDescription: "Improve your interview callback conversion in Sydney. Mock practice, STAR response preparation, and local communication alignment."
  },

  // Brisbane
  {
    city: "brisbane",
    slug: null,
    keyword: "Brisbane Jobs",
    title: "Jobs in Brisbane QLD | Career Opportunities & Sourcing | 9 Jobs (9jobs)",
    metaDescription: "Explore job opportunities in Brisbane. Partner with 9 Jobs (9jobs) for local resume optimization, LinkedIn updates, and application outsourcing."
  },
  {
    city: "brisbane",
    slug: "get-jobs",
    keyword: "Get Jobs in Brisbane QLD",
    title: "How to Get Jobs in Brisbane QLD | Local Sourcing Tips | 9 Jobs (9jobs)",
    metaDescription: "Secure a professional role in Brisbane, QLD. Tailor your profile for Queensland databases and outsource your application workflow."
  },
  {
    city: "brisbane",
    slug: "jobs",
    keyword: "Jobs in Brisbane QLD",
    title: "Jobs in Brisbane QLD | Local Employment Sourcing | 9 Jobs (9jobs)",
    metaDescription: "Find vacancies in Brisbane. Optimize your resume format and SEEK configuration to match local recruiter keyword filters."
  },
  {
    city: "brisbane",
    slug: "resume-writer",
    keyword: "Resume Writer Brisbane QLD",
    title: "Resume Writer Brisbane | Local Resume Writing Services | 9 Jobs (9jobs)",
    metaDescription: "Need an ATS-compliant resume in Brisbane? Work with local writers to tailor your achievements to QLD industry benchmarks."
  },

  // Perth
  {
    city: "perth",
    slug: null,
    keyword: "Perth Jobs",
    title: "Jobs in Perth WA | Local Sourcing & Professional Support | 9 Jobs (9jobs)",
    metaDescription: "Land your target role in Perth. Professional resume rewrites, LinkedIn optimization, and automated application services from 9 Jobs (9jobs)."
  },
  {
    city: "perth",
    slug: "get-jobs",
    keyword: "Get Jobs in Perth WA",
    title: "How to Get Jobs in Perth WA | Professional Sourcing | 9 Jobs (9jobs)",
    metaDescription: "Learn how to target the Perth job market. Adjust your location settings, optimize resume keywords, and pass local recruiter screens."
  },
  {
    city: "perth",
    slug: "jobs",
    keyword: "Jobs in Perth WA",
    title: "Jobs in Perth WA | Professional Vacancies & CV Help | 9 Jobs (9jobs)",
    metaDescription: "Explore careers in Perth, WA. Optimize your profile metadata, pass applicant tracking systems, and secure mock interview calls."
  },
  {
    city: "perth",
    slug: "resume-writer",
    keyword: "Resume Writer Perth WA",
    title: "Resume Writer Perth | ATS Resume Writing Services | 9 Jobs (9jobs)",
    metaDescription: "Get a professionally written, localized resume tailored for Perth's resource and corporate sectors from 9 Jobs (9jobs) experts."
  },
  {
    city: "perth",
    slug: "career-coaching",
    keyword: "Career Coaching Perth WA",
    title: "Career Coaching Perth | Professional Career Consulting | 9 Jobs (9jobs)",
    metaDescription: "Navigate career transitions in Perth. Structural planning, local network insights, and tailored mock interview support."
  },
  {
    city: "perth",
    slug: "jobs-perth",
    keyword: "Jobs Perth",
    title: "Jobs Perth | Local Sourcing & Professional Support | 9 Jobs (9jobs)",
    metaDescription: "Accelerate your search with professional jobs in Perth. Get ATS-optimized resumes and SEEK profile setups to stand out in Western Australia."
  },
  {
    city: "perth",
    slug: "jobs-in-perth",
    keyword: "Jobs in Perth",
    title: "Jobs in Perth | Local Vacancies & Sourcing Support | 9 Jobs (9jobs)",
    metaDescription: "Find vacancies and jobs in Perth, WA. Optimize your profile settings, pass applicant tracking systems, and secure mock interview calls."
  },
  {
    city: "perth",
    slug: "jobs-in-perth-wa",
    keyword: "Jobs in Perth WA",
    title: "Jobs in Perth WA | Local Sourcing & Professional CVs | 9 Jobs (9jobs)",
    metaDescription: "Browse opportunities and jobs in Perth WA. Rebuild your CV, optimize your SEEK preferences, and outsource your applications."
  },

  // Adelaide
  {
    city: "adelaide",
    slug: null,
    keyword: "Adelaide Jobs",
    title: "Jobs in Adelaide SA | Sourcing & Profile Optimization | 9 Jobs (9jobs)",
    metaDescription: "Find your next role in Adelaide. Get custom resume writing, LinkedIn keyword optimization, and daily application support from 9 Jobs (9jobs)."
  },
  {
    city: "adelaide",
    slug: "get-jobs",
    keyword: "Get Jobs in Adelaide SA",
    title: "How to Get Jobs in Adelaide SA | Local Career Advice | 9 Jobs (9jobs)",
    metaDescription: "Understand how to navigate Adelaide's specialized job market. Connect with recruiters and optimize profiles for local SA queries."
  },
  {
    city: "adelaide",
    slug: "jobs",
    keyword: "Jobs in Adelaide SA",
    title: "Jobs in Adelaide SA | Professional Sourcing & Resumes | 9 Jobs (9jobs)",
    metaDescription: "Explore Adelaide's growing defense, manufacturing, and tech opportunities. Optimize your resume for South Australian benchmarks."
  },

  // Geelong
  {
    city: "geelong",
    slug: null,
    keyword: "Geelong Jobs",
    title: "Jobs in Geelong VIC | Regional Sourcing Assistance | 9 Jobs (9jobs)",
    metaDescription: "Target Geelong's local market. Get a resume rewrite, LinkedIn keyword tuning, and local application assistance from 9 Jobs (9jobs)."
  },
  {
    city: "geelong",
    slug: "jobs",
    keyword: "Jobs in Geelong VIC",
    title: "Jobs in Geelong VIC | Regional Vacancies & Profile Help | 9 Jobs (9jobs)",
    metaDescription: "Discover regional careers in Geelong, VIC. Optimize your digital settings to get discovered by local recruiters in regional Victoria."
  },
  {
    city: "geelong",
    slug: "resume-help",
    keyword: "Resume Help Geelong VIC",
    title: "Resume Help Geelong | Professional Resume Optimization | 9 Jobs (9jobs)",
    metaDescription: "Get local, professional resume formatting help in Geelong. Rebuild your CV to pass regional ATS filters and secure callbacks."
  },
  {
    city: "geelong",
    slug: "career-coaching",
    keyword: "Career Coaching Geelong VIC",
    title: "Career Coaching Geelong | Regional Professional Support | 9 Jobs (9jobs)",
    metaDescription: "Navigate regional career pathways in Geelong. Target local government, insurance, and manufacturing roles with confidence."
  },

  // Victoria
  {
    city: "vic",
    slug: null,
    keyword: "Victoria Jobs",
    title: "Jobs in Victoria State | Regional Professional Sourcing | 9 Jobs (9jobs)",
    metaDescription: "Find career opportunities across Victoria. Rebuild your resume, update your SEEK visibility, and outsource your applications."
  },
  {
    city: "vic",
    slug: "jobs",
    keyword: "Jobs in VIC",
    title: "Jobs in VIC | Regional Sourcing & Professional CVs | 9 Jobs (9jobs)",
    metaDescription: "Target vacancies in regional Victoria. Optimize your profile settings, pass automated screens, and get found by VIC agencies."
  },
  {
    city: "vic",
    slug: "resume-help",
    keyword: "Resume Help VIC",
    title: "Resume Help VIC | Regional Resume Writing Services | 9 Jobs (9jobs)",
    metaDescription: "Get a high-impact, ATS-optimized resume tailored for Victorian regional hiring managers and government agencies."
  },
  {
    city: "vic",
    slug: "career-coaching",
    keyword: "Career Coaching VIC",
    title: "Career Coaching VIC | Regional Career Search Help | 9 Jobs (9jobs)",
    metaDescription: "Identify career pathways and land interviews in regional Victoria with guidance from 9 Jobs (9jobs) career coaches."
  }
];

export {
  cities,
  pagesConfig
};
