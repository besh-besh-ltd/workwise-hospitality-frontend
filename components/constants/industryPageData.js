export const industryPageData = {
  hero: {
    title: "Procurement Built for Power Capex Projects",
    description: "From ₹1 Cr to ₹100 Cr packages — Workwise simplifies your vendor discovery, quote handling, and technical evaluation across disciplines.",
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