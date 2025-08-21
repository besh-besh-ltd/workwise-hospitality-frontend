export const industryPageData = {
  hero: {
    title: "Procurement Built for Power Capex Projects",
    description: "From ₹1 Cr to ₹100 Cr packages - Workwise simplifies your vendor discovery, quote handling, and technical evaluation across disciplines.",
    buttonLabel: "Book a Call for Your Power Project"
  },

  challenges: [
    {
      id: 1,
      icon: 'users',
      title: 'Multi-vendor coordination',
      description: 'Managing dozens of vendors across multiple project phases with clear communication'
    },
    {
      id: 2,
      icon: 'file-alt',
      title: 'BOQ variability in tenders',
      description: 'Handling complex BOQs with thousands of line items and inconsistent formats'
    },
    {
      id: 3,
      icon: 'sitemap',
      title: 'Discipline fragmentation',
      description: 'Coordinating electrical, mechanical, and civil teams with different requirements'
    },
    {
      id: 4,
      icon: 'clipboard-check',
      title: 'PSU approval chains',
      description: 'Navigating complex approval workflows and technical evaluations'
    }
  ],

  projects: [
    {
      id: 1,
      name: "400kV Substation",
      cost: "₹85 Cr",
      categories: [
        { icon: 'bolt', label: "Electrical" },
        { icon: 'building', label: "Civil" }
      ],
      description: "Complete procurement management for a greenfield 400kV substation with 25+ vendors"
    },
    {
      id: 2,
      name: "Underground Cabling",
      cost: "₹32 Cr",
      categories: [
        { icon: 'bolt', label: "Electrical" },
        { icon: 'building', label: "Civil" }
      ],
      description: "Urban power distribution network with 12km of HT/LT underground cabling"
    },
    {
      id: 3,
      name: "Switchgear EPCs",
      cost: "₹18 Cr",
      categories: [
        { icon: 'bolt', label: "Electrical" },
        { icon: 'cogs', label: "Mechanical" }
      ],
      description: "Modernization of industrial switchgear systems for power distribution company"
    }
  ],

  disciplines: [
    {
      id: 1,
      icon: 'bolt',
      label: "Electrical"
    },
    {
      id: 2,
      icon: 'cog',
      label: "Mechanical"
    },
    {
      id: 3,
      icon: 'building',
      label: "Civil"
    },
    {
      id: 4,
      icon: 'pipes',
      label: "Piping"
    },
    {
      id: 5,
      icon: 'thermometer-half',
      label: "Instrumentation"
    },
    {
      id: 6,
      icon: 'fire-extinguisher',
      label: "Fire & Safety"
    },
    {
      id: 7,
      icon: 'fan',
      label: "HVAC"
    }
  ],

  testimonials: [
    {
      id: 1,
      quote: "Workwise transformed our vendor management process, reducing the time to finalize technical evaluations by 40% for our 400kV substation project.",
      authorName: "Rajesh Kumar",
      authorTitle: "Procurement Head, NTPC",
      company: "Power Utility"
    },
    {
      id: 2,
      quote: "The BOQ simplification tool saved us countless hours on our underground cabling project. What used to take days now takes minutes.",
      authorName: "Priya Sharma",
      authorTitle: "Project Manager, L&T Power",
      company: "EPC",
      hasLink: true,
      linkText: "See how EPCs use Workwise →"
    },
    {
      id: 3,
      quote: "Workwise's vendor discovery module helped us find specialized switchgear manufacturers we didn't know existed, improving our bid competitiveness.",
      authorName: "Vikram Singh",
      authorTitle: "Procurement Director, Tata Power",
      company: "Power Distribution"
    }
  ],

  modules: [
    {
      id: "boq",
      icon: 'file-invoice',
      name: "BOQ Simplification",
      description: "Upload any format, get a clean structure that standardizes even the most complex power project BOQs",
      link: "#"
    },
    {
      id: "vendor",
      icon: 'search',
      name: "Vendor Discovery",
      description: "Access 12,000+ PSU vendors specialized in power sector equipment and services",
      link: "#"
    },
    {
      id: "quote",
      icon: 'chart-bar',
      name: "Quote Evaluation",
      description: "Deviation-aware comparison chart that highlights technical and commercial differences",
      link: "#"
    }
  ],

  faqs: [
    {
      question: "How do I find reliable vendors for Power industry projects?",
      answer: "Workwise offers a vendor discovery module with 12,000+ PSU-approved vendors across various disciplines in the Power sector. You can filter by experience, certifications, and past project history."
    },
    {
      question: "What makes procurement in Power projects different?",
      answer: "Power projects involve unique challenges like multi-vendor coordination across electrical, civil, and mechanical disciplines, complex BOQ structures, and stringent PSU approval processes. Workwise is designed to address these sector-specific challenges."
    },
    {
      question: "How can I compare supplier quotes in Power industry tenders?",
      answer: "Workwise's Quote Evaluation module creates deviation-aware comparison charts that highlight technical and commercial differences across vendors, making it easier to evaluate complex Power industry proposals."
    },
    {
      question: "Is Workwise suitable for procurement tool for Power capex projects of all sizes?",
      answer: "Yes, Workwise scales from ₹1 Cr to ₹100+ Cr power projects. The platform is modular, allowing you to use only the features you need based on project complexity and team size."
    }
  ],

  cta: {
    title: "Ready to Transform Your Power Project Procurement?",
    description: "Join industry leaders who are already using Workwise to streamline their procurement processes.",
    primaryButton: {
      label: "Book a Demo",
      variant: "white"
    },
    secondaryButton: {
      label: "See Success Stories",
      variant: "outline"
    }
  }
}; 

// Multi-industry data map for dynamic landing pages
// Slugs supported: power, energy, petrochemical, steel-cement, infrastructure, heavy-equipment, marine-mining
export const industriesPageData = {
  power: industryPageData,
  energy: {
    hero: {
      title: "Procurement Built for Energy Capex Projects",
      description: "From ₹1 Cr to ₹100 Cr packages - Workwise simplifies your vendor discovery, quote handling, and technical evaluation across disciplines.",
      buttonLabel: "Book a Call for Your Energy Project"
    },
    challenges: [
      { id: 1, icon: 'users', title: 'Multi-vendor coordination', description: 'Managing dozens of vendors across multiple project phases with clear communication' },
      { id: 2, icon: 'file-alt', title: 'BOQ variability in tenders', description: 'Handling complex BOQs with thousands of line items and inconsistent formats' },
      { id: 3, icon: 'sitemap', title: 'Discipline fragmentation', description: 'Coordinating electrical, mechanical, and civil teams with different requirements' },
      { id: 4, icon: 'clipboard-check', title: 'PSU approval chains', description: 'Navigating complex approval workflows and technical evaluations' },
    ],
    projects: [
      { id: 1, name: "Refinery Expansion", cost: "₹120 Cr", categories: [ { icon: 'bolt', label: 'Electrical' }, { icon: 'building', label: 'Civil' } ], description: "End-to-end vendor management for refinery expansion packages" },
      { id: 2, name: "Solar Plant EPC", cost: "₹60 Cr", categories: [ { icon: 'bolt', label: 'Electrical' }, { icon: 'building', label: 'Civil' } ], description: "Procurement for 100MW solar plant including switchyards and cabling" },
      { id: 3, name: "Gas Compression", cost: "₹35 Cr", categories: [ { icon: 'cogs', label: 'Mechanical' }, { icon: 'bolt', label: 'Electrical' } ], description: "Compression packages with multi-vendor coordination and QA" },
    ],
    disciplines: [
      { id: 1, icon: 'bolt', label: 'Electrical' },
      { id: 2, icon: 'cog', label: 'Mechanical' },
      { id: 3, icon: 'building', label: 'Civil' },
      { id: 4, icon: 'pipes', label: 'Piping' },
      { id: 5, icon: 'thermometer-half', label: 'Instrumentation' },
      { id: 6, icon: 'fire-extinguisher', label: 'Fire & Safety' },
      { id: 7, icon: 'fan', label: 'HVAC' },
    ],
    testimonials: [
      { id: 1, quote: "Workwise streamlined vendor onboarding for our refinery capex packages.", authorName: "Operations Head", authorTitle: "Oil & Gas EPC", company: "Energy" },
      { id: 2, quote: "The platform reduced time-to-quote for our solar EPC project.", authorName: "Project Manager", authorTitle: "Renewables Developer", company: "Energy" },
      { id: 3, quote: "Vendor discovery for hydrogen skids was quick and transparent.", authorName: "Procurement Lead", authorTitle: "Hydrogen OEM", company: "Energy" },
    ],
    modules: [
      { id: 'boq', icon: 'file-invoice', name: 'BOQ Simplification', description: 'Upload any format, get a clean structure that standardizes even the most complex energy project BOQs', link: '/modules/boq' },
      { id: 'vendor', icon: 'search', name: 'Vendor Discovery', description: 'Access 12,000+ PSU vendors specialized in energy sector equipment and services', link: '/modules/vendors' },
      { id: 'quote', icon: 'chart-bar', name: 'Quote Evaluation', description: 'Deviation-aware comparison chart that highlights technical and commercial differences', link: '/modules/evaluation' },
    ],
    faqs: [
      { question: "How do I find reliable vendors for Energy industry projects?", answer: "Workwise offers a vendor discovery module with 12,000+ PSU-approved vendors across Energy sectors. You can filter by experience, certifications, and past project history." },
      { question: "What makes procurement in Energy projects different?", answer: "Energy projects involve multi-vendor coordination, diverse disciplines, and complex BOQs. Workwise addresses these sector-specific challenges." },
      { question: "How can I compare supplier quotes in Energy tenders?", answer: "Workwise's Quote Evaluation module creates deviation-aware comparison charts that highlight technical and commercial differences across vendors." },
      { question: "Is Workwise suitable for procurement tool for Energy capex projects of all sizes?", answer: "Yes, Workwise scales from ₹1 Cr to ₹100+ Cr projects with modular features based on complexity and team size." },
    ],
    cta: {
      title: "Ready to Transform Your Energy Project Procurement?",
      description: "Join industry leaders who are already using Workwise to streamline their procurement processes.",
      primaryButton: { label: 'Book a Demo', variant: 'white' },
      secondaryButton: { label: 'See Success Stories', variant: 'outline' },
    },
  },
  'petrochemical': {
    hero: { title: "Procurement Built for Petrochemical & Chemical Capex Projects", description: "From ₹1 Cr to ₹100 Cr packages-Workwise simplifies your vendor discovery, quote handling, and technical evaluation across disciplines.", buttonLabel: "Book a Call for Your Petrochemical Project" },
    challenges: [
      { id: 1, icon: 'users', title: 'Multi-vendor coordination', description: 'Managing dozens of vendors across multiple project phases with clear communication' },
      { id: 2, icon: 'file-alt', title: 'BOQ variability in tenders', description: 'Handling complex BOQs with thousands of line items and inconsistent formats' },
      { id: 3, icon: 'sitemap', title: 'Discipline fragmentation', description: 'Coordinating electrical, mechanical, and civil teams with different requirements' },
      { id: 4, icon: 'clipboard-check', title: 'PSU approval chains', description: 'Navigating complex approval workflows and technical evaluations' },
    ],
    projects: [
      { id: 1, name: "Process Plant Expansion", cost: "₹95 Cr", categories: [ { icon: 'pipes', label: 'Piping' }, { icon: 'cogs', label: 'Mechanical' } ], description: "EPC procurement for reactors, exchangers, and packaged skids" },
      { id: 2, name: "Chemical Storage Farm", cost: "₹28 Cr", categories: [ { icon: 'building', label: 'Civil' }, { icon: 'bolt', label: 'Electrical' } ], description: "Turnkey procurement for storage tanks and allied systems" },
      { id: 3, name: "Utility Systems", cost: "₹22 Cr", categories: [ { icon: 'bolt', label: 'Electrical' }, { icon: 'thermometer-half', label: 'Instrumentation' } ], description: "Utilities, instrumentation, and controls procurement" },
    ],
    disciplines: [
      { id: 1, icon: 'bolt', label: 'Electrical' },
      { id: 2, icon: 'cog', label: 'Mechanical' },
      { id: 3, icon: 'building', label: 'Civil' },
      { id: 4, icon: 'pipes', label: 'Piping' },
      { id: 5, icon: 'thermometer-half', label: 'Instrumentation' },
      { id: 6, icon: 'fire-extinguisher', label: 'Fire & Safety' },
      { id: 7, icon: 'fan', label: 'HVAC' },
    ],
    testimonials: [
      { id: 1, quote: "Workwise helped us onboard specialized process equipment vendors quickly.", authorName: "Head - Projects", authorTitle: "Petrochem EPC", company: "Petrochemical" },
      { id: 2, quote: "Deviation checks made quote comparison much faster.", authorName: "Senior Buyer", authorTitle: "Chemical OEM", company: "Petrochemical" },
      { id: 3, quote: "Vendor discovery saved weeks for our tank farm procurement.", authorName: "Procurement Lead", authorTitle: "Chemicals", company: "Petrochemical" },
    ],
    modules: [
      { id: 'boq', icon: 'file-invoice', name: 'BOQ Simplification', description: 'Upload any format, get a clean structure that standardizes even complex chemical BOQs', link: '/modules/boq' },
      { id: 'vendor', icon: 'search', name: 'Vendor Discovery', description: 'Access 12,000+ PSU vendors for process equipment and packaged skids', link: '/modules/vendors' },
      { id: 'quote', icon: 'chart-bar', name: 'Quote Evaluation', description: 'Deviation-aware comparison chart that highlights technical and commercial differences', link: '/modules/evaluation' },
    ],
    faqs: [
      { question: "How do I find reliable vendors for Petrochemical industry projects?", answer: "Use vendor discovery with filters for certifications, materials, and past projects." },
      { question: "What makes procurement in Petrochemical projects different?", answer: "Specialized equipment, QA/QC, and multi-discipline coordination require robust workflows that Workwise provides." },
      { question: "How can I compare supplier quotes in Petrochemical tenders?", answer: "Use the evaluation module to highlight deviations and normalize commercial terms." },
      { question: "Is Workwise suitable for procurement tool for Petrochemical capex projects of all sizes?", answer: "Yes, scalable from ₹1 Cr to ₹100+ Cr projects with modular features." },
    ],
    cta: { title: "Ready to Transform Your Petrochemical Project Procurement?", description: "Join industry leaders who are already using Workwise to streamline their procurement processes.", primaryButton: { label: 'Book a Demo', variant: 'white' }, secondaryButton: { label: 'See Success Stories', variant: 'outline' } },
  },
  'steel-cement': {
    hero: { title: "Procurement Built for Steel & Cement Capex Projects", description: "From ₹1 Cr to ₹100 Cr packages-Workwise simplifies your vendor discovery, quote handling, and technical evaluation across disciplines.", buttonLabel: "Book a Call for Your Steel & Cement Project" },
    challenges: [
      { id: 1, icon: 'users', title: 'Multi-vendor coordination', description: 'Managing dozens of vendors across multiple project phases with clear communication' },
      { id: 2, icon: 'file-alt', title: 'BOQ variability in tenders', description: 'Handling complex BOQs with thousands of line items and inconsistent formats' },
      { id: 3, icon: 'sitemap', title: 'Discipline fragmentation', description: 'Coordinating electrical, mechanical, and civil teams with different requirements' },
      { id: 4, icon: 'clipboard-check', title: 'PSU approval chains', description: 'Navigating complex approval workflows and technical evaluations' },
    ],
    projects: [
      { id: 1, name: "Rolling Mill Upgrade", cost: "₹70 Cr", categories: [ { icon: 'cogs', label: 'Mechanical' }, { icon: 'bolt', label: 'Electrical' } ], description: "EPC procurement for mill upgrade and automation" },
      { id: 2, name: "Clinker Line Expansion", cost: "₹90 Cr", categories: [ { icon: 'building', label: 'Civil' }, { icon: 'pipes', label: 'Piping' } ], description: "Civil, piping, and mechanical packages for clinker line" },
      { id: 3, name: "Material Handling", cost: "₹18 Cr", categories: [ { icon: 'cogs', label: 'Mechanical' }, { icon: 'bolt', label: 'Electrical' } ], description: "Conveyors and handling systems procurement" },
    ],
    disciplines: [ { id: 1, icon: 'bolt', label: 'Electrical' }, { id: 2, icon: 'cog', label: 'Mechanical' }, { id: 3, icon: 'building', label: 'Civil' }, { id: 4, icon: 'pipes', label: 'Piping' }, { id: 5, icon: 'thermometer-half', label: 'Instrumentation' }, { id: 6, icon: 'fire-extinguisher', label: 'Fire & Safety' }, { id: 7, icon: 'fan', label: 'HVAC' } ],
    testimonials: [ { id: 1, quote: "Vendor management for our mill upgrade was simplified.", authorName: "Capex Head", authorTitle: "Steel Plant", company: "Steel & Cement" }, { id: 2, quote: "RFP cycles reduced significantly for our clinker line.", authorName: "Project Lead", authorTitle: "Cement EPC", company: "Steel & Cement" }, { id: 3, quote: "Finding OEMs for critical equipment became faster.", authorName: "Procurement", authorTitle: "Materials Handling", company: "Steel & Cement" } ],
    modules: [ { id: 'boq', icon: 'file-invoice', name: 'BOQ Simplification', description: 'Upload any format, get a clean structure suitable for steel and cement BOQs', link: '/modules/boq' }, { id: 'vendor', icon: 'search', name: 'Vendor Discovery', description: 'Access vendors across mills, kilns, and handling systems', link: '/modules/vendors' }, { id: 'quote', icon: 'chart-bar', name: 'Quote Evaluation', description: 'Deviation-aware comparison chart that highlights technical and commercial differences', link: '/modules/evaluation' } ],
    faqs: [ { question: "How do I find reliable vendors for Steel & Cement industry projects?", answer: "Use vendor discovery filters for OEM experience and certifications." }, { question: "What makes procurement in Steel & Cement projects different?", answer: "Heavy equipment, specialized OEMs, and civil coordination. Workwise supports end-to-end workflows." }, { question: "How can I compare supplier quotes in Steel & Cement tenders?", answer: "Use evaluation to standardize quotes and surface deviations." }, { question: "Is Workwise suitable for procurement tool for Steel & Cement capex projects of all sizes?", answer: "Yes, scalable from ₹1 Cr to ₹100+ Cr." } ],
    cta: { title: "Ready to Transform Your Steel & Cement Project Procurement?", description: "Join industry leaders who are already using Workwise to streamline their procurement processes.", primaryButton: { label: 'Book a Demo', variant: 'white' }, secondaryButton: { label: 'See Success Stories', variant: 'outline' } },
  },
  'infrastructure': {
    hero: { title: "Procurement Built for Infrastructure Capex Projects", description: "From ₹1 Cr to ₹100 Cr packages-Workwise simplifies your vendor discovery, quote handling, and technical evaluation across disciplines.", buttonLabel: "Book a Call for Your Infrastructure Project" },
    challenges: [ { id: 1, icon: 'users', title: 'Multi-vendor coordination', description: 'Managing dozens of vendors across multiple project phases with clear communication' }, { id: 2, icon: 'file-alt', title: 'BOQ variability in tenders', description: 'Handling complex BOQs with thousands of line items and inconsistent formats' }, { id: 3, icon: 'sitemap', title: 'Discipline fragmentation', description: 'Coordinating electrical, mechanical, and civil teams with different requirements' }, { id: 4, icon: 'clipboard-check', title: 'PSU approval chains', description: 'Navigating complex approval workflows and technical evaluations' } ],
    projects: [ { id: 1, name: "Smart City Utilities", cost: "₹55 Cr", categories: [ { icon: 'bolt', label: 'Electrical' }, { icon: 'building', label: 'Civil' } ], description: "Procurement for utility upgrades and cabling" }, { id: 2, name: "Metro Subsystems", cost: "₹110 Cr", categories: [ { icon: 'cogs', label: 'Mechanical' }, { icon: 'bolt', label: 'Electrical' } ], description: "Subsystem equipment and services" }, { id: 3, name: "Urban Lighting", cost: "₹25 Cr", categories: [ { icon: 'bolt', label: 'Electrical' } ], description: "Smart lighting procurement and commissioning" } ],
    disciplines: [ { id: 1, icon: 'bolt', label: 'Electrical' }, { id: 2, icon: 'cog', label: 'Mechanical' }, { id: 3, icon: 'building', label: 'Civil' }, { id: 4, icon: 'pipes', label: 'Piping' }, { id: 5, icon: 'thermometer-half', label: 'Instrumentation' }, { id: 6, icon: 'fire-extinguisher', label: 'Fire & Safety' }, { id: 7, icon: 'fan', label: 'HVAC' } ],
    testimonials: [ { id: 1, quote: "Workwise accelerated vendor finalization for our metro subsystems.", authorName: "Program Manager", authorTitle: "Infra EPC", company: "Infrastructure" }, { id: 2, quote: "Quote comparison is far clearer now across bidders.", authorName: "Procurement Lead", authorTitle: "Smart City", company: "Infrastructure" }, { id: 3, quote: "Onboarding for lighting vendors was seamless.", authorName: "Project Manager", authorTitle: "Urban Lighting", company: "Infrastructure" } ],
    modules: [ { id: 'boq', icon: 'file-invoice', name: 'BOQ Simplification', description: 'Upload any format, get a clean structure suitable for infra BOQs', link: '/modules/boq' }, { id: 'vendor', icon: 'search', name: 'Vendor Discovery', description: 'Access vendors across metro, smart city and utilities', link: '/modules/vendors' }, { id: 'quote', icon: 'chart-bar', name: 'Quote Evaluation', description: 'Deviation-aware comparison chart that highlights technical and commercial differences', link: '/modules/evaluation' } ],
    faqs: [ { question: "How do I find reliable vendors for Infrastructure industry projects?", answer: "Use vendor discovery filters for project references and scope." }, { question: "What makes procurement in Infrastructure projects different?", answer: "City-scale utilities, multi-agency approvals, and complex BOQs-Workwise supports this with structured workflows." }, { question: "How can I compare supplier quotes in Infrastructure tenders?", answer: "Evaluation module standardizes inputs and flags deviations." }, { question: "Is Workwise suitable for procurement tool for Infrastructure capex projects of all sizes?", answer: "Yes, scalable from ₹1 Cr to ₹100+ Cr." } ],
    cta: { title: "Ready to Transform Your Infrastructure Project Procurement?", description: "Join industry leaders who are already using Workwise to streamline their procurement processes.", primaryButton: { label: 'Book a Demo', variant: 'white' }, secondaryButton: { label: 'See Success Stories', variant: 'outline' } },
  },
  'heavy-equipment': {
    hero: { title: "Procurement Built for Heavy Engineering Equipment & Machine Tools Manufacturing Capex Projects", description: "From ₹1 Cr to ₹100 Cr packages-Workwise simplifies your vendor discovery, quote handling, and technical evaluation across disciplines.", buttonLabel: "Book a Call for Your Heavy Engineering Project" },
    challenges: [ { id: 1, icon: 'users', title: 'Multi-vendor coordination', description: 'Managing dozens of vendors across multiple project phases with clear communication' }, { id: 2, icon: 'file-alt', title: 'BOQ variability in tenders', description: 'Handling complex BOQs with thousands of line items and inconsistent formats' }, { id: 3, icon: 'sitemap', title: 'Discipline fragmentation', description: 'Coordinating electrical, mechanical, and civil teams with different requirements' }, { id: 4, icon: 'clipboard-check', title: 'PSU approval chains', description: 'Navigating complex approval workflows and technical evaluations' } ],
    projects: [ { id: 1, name: "Machine Shop Expansion", cost: "₹22 Cr", categories: [ { icon: 'cogs', label: 'Mechanical' }, { icon: 'bolt', label: 'Electrical' } ], description: "CNC, utilities and handling systems procurement" }, { id: 2, name: "Foundry Upgrade", cost: "₹30 Cr", categories: [ { icon: 'building', label: 'Civil' }, { icon: 'cogs', label: 'Mechanical' } ], description: "Civil and mechanical packages for capacity addition" }, { id: 3, name: "Press Shop Automation", cost: "₹18 Cr", categories: [ { icon: 'cogs', label: 'Mechanical' }, { icon: 'bolt', label: 'Electrical' } ], description: "Automation and material handling" } ],
    disciplines: [ { id: 1, icon: 'bolt', label: 'Electrical' }, { id: 2, icon: 'cog', label: 'Mechanical' }, { id: 3, icon: 'building', label: 'Civil' }, { id: 4, icon: 'pipes', label: 'Piping' }, { id: 5, icon: 'thermometer-half', label: 'Instrumentation' }, { id: 6, icon: 'fire-extinguisher', label: 'Fire & Safety' }, { id: 7, icon: 'fan', label: 'HVAC' } ],
    testimonials: [ { id: 1, quote: "Shortlisting OEMs became faster and more transparent.", authorName: "Operations", authorTitle: "Machine Tools OEM", company: "Heavy Engineering" }, { id: 2, quote: "We standardized BOQs across multiple shops.", authorName: "Capex Buyer", authorTitle: "Manufacturing", company: "Heavy Engineering" }, { id: 3, quote: "Evaluation outputs are much clearer for management approvals.", authorName: "Head Procurement", authorTitle: "OEM", company: "Heavy Engineering" } ],
    modules: [ { id: 'boq', icon: 'file-invoice', name: 'BOQ Simplification', description: 'Upload any format, get a clean structure for machine tools and OEM BOQs', link: '/modules/boq' }, { id: 'vendor', icon: 'search', name: 'Vendor Discovery', description: 'Access OEM and subsystem vendors across categories', link: '/modules/vendors' }, { id: 'quote', icon: 'chart-bar', name: 'Quote Evaluation', description: 'Deviation-aware comparison chart that highlights technical and commercial differences', link: '/modules/evaluation' } ],
    faqs: [ { question: "How do I find reliable vendors for Heavy Engineering Equipment & Machine Tools Manufacturing projects?", answer: "Use vendor discovery with filters for OEM type, capacity, and certifications." }, { question: "What makes procurement in this sector different?", answer: "Complex assemblies and multi-shop coordination-Workwise provides structured workflows." }, { question: "How can I compare supplier quotes in these tenders?", answer: "Use evaluation to standardize commercial terms and flag deviations." }, { question: "Is Workwise suitable for capex projects of all sizes?", answer: "Yes, scalable from ₹1 Cr to ₹100+ Cr." } ],
    cta: { title: "Ready to Transform Your Heavy Engineering Project Procurement?", description: "Join industry leaders who are already using Workwise to streamline their procurement processes.", primaryButton: { label: 'Book a Demo', variant: 'white' }, secondaryButton: { label: 'See Success Stories', variant: 'outline' } },
  },
  'marine-mining': {
    hero: { title: "Procurement Built for Marine & Mining Capex Projects", description: "From ₹1 Cr to ₹100 Cr packages-Workwise simplifies your vendor discovery, quote handling, and technical evaluation across disciplines.", buttonLabel: "Book a Call for Your Marine/Mining Project" },
    challenges: [ { id: 1, icon: 'users', title: 'Multi-vendor coordination', description: 'Managing dozens of vendors across multiple project phases with clear communication' }, { id: 2, icon: 'file-alt', title: 'BOQ variability in tenders', description: 'Handling complex BOQs with thousands of line items and inconsistent formats' }, { id: 3, icon: 'sitemap', title: 'Discipline fragmentation', description: 'Coordinating electrical, mechanical, and civil teams with different requirements' }, { id: 4, icon: 'clipboard-check', title: 'PSU approval chains', description: 'Navigating complex approval workflows and technical evaluations' } ],
    projects: [ { id: 1, name: "Shipyard Utilities", cost: "₹40 Cr", categories: [ { icon: 'bolt', label: 'Electrical' }, { icon: 'building', label: 'Civil' } ], description: "Procurement for shipyard utilities and services" }, { id: 2, name: "Port Handling Systems", cost: "₹65 Cr", categories: [ { icon: 'cogs', label: 'Mechanical' }, { icon: 'bolt', label: 'Electrical' } ], description: "Bulk handling equipment and utilities" }, { id: 3, name: "Mining Conveyor Line", cost: "₹55 Cr", categories: [ { icon: 'cogs', label: 'Mechanical' }, { icon: 'bolt', label: 'Electrical' } ], description: "Long-distance conveying and substations" } ],
    disciplines: [ { id: 1, icon: 'bolt', label: 'Electrical' }, { id: 2, icon: 'cog', label: 'Mechanical' }, { id: 3, icon: 'building', label: 'Civil' }, { id: 4, icon: 'pipes', label: 'Piping' }, { id: 5, icon: 'thermometer-half', label: 'Instrumentation' }, { id: 6, icon: 'fire-extinguisher', label: 'Fire & Safety' }, { id: 7, icon: 'fan', label: 'HVAC' } ],
    testimonials: [ { id: 1, quote: "Workwise reduced vendor search time for our port systems.", authorName: "Capex Manager", authorTitle: "Port", company: "Marine & Mining" }, { id: 2, quote: "Quote normalization helped us compare bids easily.", authorName: "Procurement", authorTitle: "Shipyard", company: "Marine & Mining" }, { id: 3, quote: "Finding OEMs for conveyors and substations was much faster.", authorName: "Project Lead", authorTitle: "Mining", company: "Marine & Mining" } ],
    modules: [ { id: 'boq', icon: 'file-invoice', name: 'BOQ Simplification', description: 'Upload any format, get a clean structure for marine and mining BOQs', link: '/modules/boq' }, { id: 'vendor', icon: 'search', name: 'Vendor Discovery', description: 'Access vendors across shipyards, ports and mines', link: '/modules/vendors' }, { id: 'quote', icon: 'chart-bar', name: 'Quote Evaluation', description: 'Deviation-aware comparison chart that highlights technical and commercial differences', link: '/modules/evaluation' } ],
    faqs: [ { question: "How do I find reliable vendors for Marine & Mining industry projects?", answer: "Use vendor discovery with filters for port, shipyard, and mining experience." }, { question: "What makes procurement in Marine & Mining projects different?", answer: "Harsh environments, heavy equipment, and utilities-Workwise supports these needs with robust workflows." }, { question: "How can I compare supplier quotes in Marine & Mining tenders?", answer: "Evaluation module standardizes commercial and technical inputs." }, { question: "Is Workwise suitable for procurement tool for Marine & Mining capex projects of all sizes?", answer: "Yes, scalable from ₹1 Cr to ₹100+ Cr." } ],
    cta: { title: "Ready to Transform Your Marine & Mining Project Procurement?", description: "Join industry leaders who are already using Workwise to streamline their procurement processes.", primaryButton: { label: 'Book a Demo', variant: 'white' }, secondaryButton: { label: 'See Success Stories', variant: 'outline' } },
  },
};