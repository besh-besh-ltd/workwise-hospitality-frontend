import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faClock, faShield, faLink, faPhone, faWrench, faTruck, faBriefcase, faFileAlt, faListUl, faCalculator, faFileContract, faUsers, faBuilding, faCloud, faLock, faBrain, faHammer, faSearch, faMoneyBill } from '@fortawesome/free-solid-svg-icons';
import { FaRobot, FaMicrochip, FaProjectDiagram } from 'react-icons/fa';

export const homepageData = {
  hero: {
    title: "Procurement se Profit Banao",
    subtitle: "India's #1 Project Procurement Platform — Built for EPCs, Contractors & Industrial Buyers",
    valueProps: [
      {
        icon: <FontAwesomeIcon icon={faRocket} />,
        text: "Save 6-9% Cost",
        color: "#0EA5E9"
      },
      {
        icon: <FontAwesomeIcon icon={faClock} />,
        text: "Cut Time by 75%",
        color: "#0EA5E9"
      },
      {
        icon: <FontAwesomeIcon icon={faShield} />,
        text: "ISO-Certified",
        color: "#0EA5E9"
      },
      {
        icon: <FontAwesomeIcon icon={faLink} />,
        text: "ERP-Integrated",
        color: "#0EA5E9"
      }
    ],
    primaryButton: {
      label: "Book a Call",
      variant: "white",
      icon: "phone"
    },
    secondaryButton: {
      label: "Try Free Tools",
      variant: "outline-white",
      icon: "wrench"
    },
    visualContent: {
      video: null // Will be set in the component
    }
  },
  
  // Tool cards data
  toolCards: [
    {
      title: "Tender Summary",
      subtitle: "Skip 600 pages. Upload any tender document and get the key highlights in seconds.",
      bgGradient: "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)",
      icon: "file-alt",
      features: [
        {
          icon: "chart-column",
          title: "AI-Powered Analysis",
          description: "Extract key information from complex documents"
        },
        {
          icon: "clock",
          title: "Save Time",
          description: "Get insights in seconds, not hours"
        },
        {
          icon: "lightbulb",
          title: "Interactive Q&A",
          description: "Ask questions about your documents"
        }
      ],
      buttonText: "Try Now",
      buttonVariant: "primary",
      iconColor: "#0EA5E9",
      note: "Free processing for documents up to 500 pages"
      ,url: "/ai-tools/tender-summary"
    },
    {
      title: "BOQ Simplifier",
      subtitle: "From messy to structured. Upload your BOQ and get a clean, editable format ready for RFQ.",
      bgGradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      icon: "list",
      features: [
        {
          icon: "list",
          title: "Smart Categorization",
          description: "Auto-categorize line items by type and category"
        },
        {
          icon: "screwdriver-wrench",
          title: "Clean & Structured",
          description: "Standardize formats and units for easier processing"
        },
        {
          icon: "robot",
          title: "RFQ Ready",
          description: "Convert BOQs directly into RFQ formats"
        }
      ],
      buttonText: "Try Now",
      buttonVariant: "primary",
      iconColor: "#10B981",
      note: "Free processing for up to 100 line items"
      ,url: "/ai-tools/boq-simplification"
    },
    {
      title: "Project Cost Estimator",
      subtitle: "Upload your BOQ to estimate project cost instantly.",
      bgGradient: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
      icon: "calculator",
      features: [
        {
          icon: "money-bill",
          title: "Cost Breakdown",
          description: "Detailed breakdown of all project components"
        },
        {
          icon: "chart-line",
          title: "Market Rates",
          description: "Real-time pricing from current market data"
        },
        {
          icon: "bolt",
          title: "Rapid Estimation",
          description: "Get understanding in minutes, not days"
        }
      ],
      buttonText: "Try Now",
      buttonVariant: "primary",
      iconColor: "#8B5CF6",
      note: "Free for projects up to ₹50 lakhs"
      ,url: "/ai-tools/cost-estimation"
    },
    {
      title: "Technical Document Summary",
      subtitle: "Upload your technical files and get section wise summary of key clauses.",
      bgGradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      icon: "file-contract",
      features: [
        {
          icon: "lightbulb",
          title: "Simplified Insights",
          description: "Complex technical language made simple"
        },
        {
          icon: "robot",
          title: "AI Assistant",
          description: "Get answers to technical questions instantly"
        },
        {
          icon: "share",
          title: "Rapid Estimation",
          description: "Get understanding in minutes, not days"
        }
      ],
      buttonText: "Try Now",
      buttonVariant: "primary",
      iconColor: "#F59E0B",
      note: "Free for documents up to 200 pages"
      ,url: "/ai-tools/technical-summary"
    }
  ],

  // Company logos for carousel
  companyLogos: [
    "/assets/images/companylogo/Indian-Oil-Emblem.png",
    "/assets/images/companylogo/bhel.png",
    "/assets/images/companylogo/ntpc.png",
    "/assets/images/companylogo/ongc.jpg",
    "/assets/images/companylogo/gail.png",
    "/assets/images/companylogo/sail.png",
    "/assets/images/companylogo/bpcl.png",
    "/assets/images/companylogo/cil.png",
    "/assets/images/companylogo/nhpc.png",
    "/assets/images/companylogo/nmdc.png"
  ],

  // Carousel settings for company logos
  carouselSettings: {
    dots: false,
    infinite: true,
    speed: 10000,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "linear",
    pauseOnHover: false,
    arrows: false,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 4,
        }
      },
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 3,
        }
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
        }
      }
    ]
  },

  // Trust & Security section data
  trustSection: {
    title: "Trusted. Verified. Secure.",
    icon: faShield,
    iconBg: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    stats: [
      {
        title: "Buyers on Workwise",
        icon: faUsers,
        iconBg: "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)",
        items: [
          "102+ Contractors/EPCs",
          "26 Consultants",
          "21 Clients"
        ]
      },
      {
        title: "Sellers on Workwise",
        icon: faBuilding,
        iconBg: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
        items: [
          "11,000+ Domestic Vendors",
          "1,500+ International Vendors"
        ]
      }
    ],
    securityFeatures: [
      {
        title: "ISO Certified Platform",
        icon: faShield,
        iconBg: "linear-gradient(135deg, #10B981 0%, #059669 100%)"
      },
      {
        title: "Hosted on AWS Cloud",
        icon: faCloud,
        iconBg: "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)"
      },
      {
        title: "End-to-End Data Encryption",
        icon: faLock,
        iconBg: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
      },
      {
        title: "AI Framework by IIT Bombay",
        icon: faBrain,
        iconBg: "linear-gradient(135deg, #10B981 0%, #059669 100%)"
      }
    ]
  },

  // Why Choose Workwise section
  whyChooseSection: {
    title: "Why You Should Choose Workwise",
    cards: [
      {
        title: "12,500+ PSU-Approved Vendors",
        description: "Find the right supplier fast — verified OEMs, dealers, and traders.",
        icon: faBriefcase,
        iconBg: "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)"
      },
      {
        title: "Built by Contractors, for Contractors",
        description: "We faced the same chaos, so we built a solution that actually works.",
        icon: faHammer,
        iconBg: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
      },
      {
        title: "Tailor-Made for Industrial Capex Projects",
        description: "Workwise is tailor-made for complex EPC and infrastructure buying- not FMCG, not e-commerce.",
        icon: faBuilding,
        iconBg: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)"
      }
    ]
  },

  // Modular Offerings section
  modularOfferings: {
    title: "Simplify Procurement, From BOQ/PR to Final Payment",
    intro: "Each one is built for industrial capex needs.",
    modules: [
      {
        title: "BOQ Understanding & Simplification",
        description: "Make your BOQ usable.",
        desktopFeatures: [
          "Upload BOQs in Excel, PDF, or DOC",
          "AI classifies and structures the data",
          "Download clean, editable BOQ"
        ],
        mobileDescription: "Upload any BOQ format → get structured, editable BOQ instantly.",
        icon: faFileAlt,
        iconBg: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
        iconColor: "#F59E0B",
        link: "/modules/boq"
      },
      {
        title: "RFQ Creation & Management",
        description: "Create RFQs in minutes.",
        desktopFeatures: [
          "Auto-generate RFQs from your BOQ",
          "Choose vendors and send enquiries via WhatsApp and email",
          "Track responses and read receipts"
        ],
        mobileDescription: "Turn BOQ into RFQs → send to vendors in one click.",
        icon: faFileContract,
        iconBg: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
        iconColor: "#10B981",
        link: "/modules/rfq"
      },
      {
        title: "Supplier Discovery & Vendor Management",
        description: "Find the right vendors — fast.",
        desktopFeatures: [
          "Access 12,500+ PSU-approved suppliers",
          "Filter by Make, Approval, and Location",
          "View vendor profiles instantly"
        ],
        mobileDescription: "Search 12,000+ verified vendors with smart filters.",
        icon: faUsers,
        iconBg: "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)",
        iconColor: "#0EA5E9",
        link: "/modules/vendors"
      },
      {
        title: "Technical & Commercial Evaluation",
        description: "Compare quotes with clarity.",
        desktopFeatures: [
          "Smart side-by-side quote comparison",
          "View grouped, ungrouped, or normalized layouts",
          "Instantly detect technical deviations"
        ],
        mobileDescription: "Smart quote comparison with deviation flags & multiple views.",
        icon: faListUl,
        iconBg: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
        iconColor: "#a855f7",
        link: "/modules/evaluation"
      },
      {
        title: "Negotiation Management",
        description: "Negotiate better — online.",
        desktopFeatures: [
          "Run reverse auctions by default",
          "Customize with English, Dutch, Rank, or Preferential auctions",
          "See all bids live in one view"
        ],
        mobileDescription: "Run reverse/custom auctions online with full controls.",
        icon: faMoneyBill,
        iconBg: "linear-gradient(135deg, #3B82F6 100%, #1D4ED8 0%)",
        iconColor: "#3B82F6",
        link: "/modules/negotiation"
      },
      {
        title: "PO & Payment Lifecycle Management",
        description: "Track POs till final payment.",
        desktopFeatures: [
          "Auto-generate POs from finalized quotes",
          "Get reminders for due payments or receivables",
          "Track both vendor and client-side payment status"
        ],
        mobileDescription: "Auto-POs and full milestone tracking till final payment.",
        icon: faCalculator,
        iconBg: "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
        iconColor: "#14B8A6",
        link: "/modules/payments"
      }
    ],
    vendorSupport: {
      title: "Need Help with Vendors? We've Got You.",
      subtitle: "In addition to the software modules above, Workwise also offers human support services for:",
      services: [
        {
          title: "New Vendor Discovery",
          description: "We help you find specialized vendors for your unique procurement needs.",
          icon: faSearch,
          iconBg: "#F59E0B"
        },
        {
          title: "Vendor Negotiation",
          description: "Our experts negotiate on your behalf to secure the best terms and pricing.",
          icon: faUsers,
          iconBg: "#F59E0B"
        },
        {
          title: "Vendor Due Diligence & Onboarding",
          description: "Comprehensive background checks and seamless vendor onboarding process.",
          icon: faShield,
          iconBg: "#F59E0B"
        }
      ],
      footerText: "Our team works alongside your procurement team — so you can focus on what matters.",
      buttonText: "Talk to Our Vendor Support Team →"
    }
  },

  // Heavy Industries section
  heavyIndustries: {
    headline: "Built for Heavy Industries. Trusted Across Disciplines.",
    subheadline: "From refineries to substations to utility-scale solar and more — Workwise powers procurement where complexity is high and accuracy matters.",
    industries: [
      {
        name: "Energy (Oil & Gas, Renewables, Hydrogen)",
        icon: "🛢️",
        color: "#F59E0B"
      },
      {
        name: "Power",
        icon: "⚡",
        color: "#10B981"
      },
      {
        name: "Petrochemical & Chemical",
        icon: "🧪",
        color: "#EF4444"
      },
      {
        name: "Steel & Cement",
        icon: "🏭",
        color: "#6B7280"
      },
      {
        name: "Infrastructure",
        icon: "🏗️",
        color: "#0EA5E9"
      },
      {
        name: "Heavy Engineering Equipment & Machine Tools Manufacturing",
        icon: "⚙️",
        color: "#8B5CF6"
      },
      {
        name: "Marine, mining and more",
        icon: "⛏️",
        color: "#6B7280"
      }
    ],
    domains: [
      {
        name: "Electrical",
        icon: "🔌",
        color: "#F59E0B"
      },
      {
        name: "Mechanical",
        icon: "⚙️",
        color: "#0EA5E9"
      },
      {
        name: "Civil",
        icon: "🏗️",
        color: "#8B5CF6"
      },
      {
        name: "Instrumentation",
        icon: "🎛️",
        color: "#10B981"
      },
      {
        name: "Piping",
        icon: "🔧",
        color: "#EF4444"
      },
      {
        name: "HVAC",
        icon: "❄️",
        color: "#0EA5E9"
      },
      {
        name: "Fire & Safety",
        icon: "🚨",
        color: "#6B7280"
      }
    ],
    testimonials: [
      {
        quote: "Earlier, RFQs took 2-3 days to prepare. With Workwise, it's done in 15 minutes.",
        author: "Abhinav Sharma",
        position: "Procurement Head, Power EPC"
      },
      {
        quote: "The comparison chart saved us from making the wrong vendor choice — super helpful.",
        author: "Arnav Singh",
        position: "Project Director, Infrastructure Contractor"
      },
      {
        quote: "Vendor follow-ups and PO tracking used to be a mess. Now it's all in one view.",
        author: "Sushanta Kumar Roy",
        position: "Owner, Oil & Gas Turnkey Contractor"
      }
    ]
  },

  // FAQ Section
  faqSection: {
    headline: "Frequently Asked Questions",
    subheadline: "We've answered the most common questions buyers and vendors ask us about Workwise, AI tools, procurement workflows, and integrations.",
    categories: [
      {
        title: "BOQ Simplification & Estimation FAQs",
        icon: "FaChartColumn",
        iconBg: "#10B981",
        questions: [
          {
            question: "How does Workwise simplify BOQs uploaded in Excel or PDF?",
            answer: "Workwise uses AI to extract, clean, and structure BOQ data from Excel or PDF formats. It groups line items by section or package, also groups similar product variants, standardizes descriptions, and prepares the file for instant RFQ creation or cost estimation."
          },
          {
            question: "Can I get a project cost estimate from my BOQ using Workwise?",
            answer: "Yes. Upload your BOQ and get an AI-powered cost estimate instantly for all materials/products. Estimates are based on market rates, past purchases, and standard schedules (SORs). Tool gives you manual fields to add manpower cost, service costs, equipment renting cost and others to get full project cost."
          },
          {
            question: "How accurate is the BOQ-to-RFQ automation in Workwise?",
            answer: "Workwise auto-maps BOQ line items to relevant product categories and preferred vendors. Users can review and edit before finalizing the RFQ, ensuring complete control and accuracy. AI model is at 95+% accuracy."
          }
        ]
      },
      {
        title: "RFQ Creation & Management FAQs",
        icon: "FaPaperPlane",
        iconBg: "#0EA5E9",
        questions: [
          {
            question: "How can I create an RFQ automatically from a BOQ?",
            answer: "Upload your BOQ, and Workwise auto-generates RFQs grouped by package or product category. You can edit line items, set terms, add attachments, and send enquiries in minutes."
          },
          {
            question: "Can I send RFQs to vendors via WhatsApp using Workwise?",
            answer: "Yes. Workwise allows you to send RFQs via WhatsApp and email, and no vendor login required. Vendors can respond instantly through whichever channel suits them."
          },
          {
            question: "What file formats are supported for RFQ generation?",
            answer: "Workwise supports Excel (.xls/.xlsx), PDF, and CSV files for BOQs. The system processes these into structured RFQs within minutes."
          }
        ]
      },
      {
        title: "Vendor Discovery & Supplier Management FAQs",
        icon: "FaUsers",
        iconBg: "#8B5CF6",
        questions: [
          {
            question: "How does Workwise help in vendor discovery for EPC projects?",
            answer: "Workwise gives you access to 12,000+ vendors PSU-approved suppliers across multiple product categories. You can filter by make, approval, location, or past performance to find the right fit."
          },
          {
            question: "Are the vendors on Workwise PSU-approved?",
            answer: "Yes. A large number of vendors on Workwise are PSU-approved and categorized by product type, location, and past work history with government or industrial clients."
          },
          {
            question: "Can I invite my own vendors to respond on Workwise?",
            answer: "Absolutely. You can invite and add any of your existing vendors to Workwise by yourself instantly, and they will start receiving your enquiries after that."
          }
        ]
      },
      {
        title: "Technical & Commercial Evaluation FAQs",
        icon: "FaChartLine",
        iconBg: "#F59E0B",
        questions: [
          {
            question: "How does Workwise compare vendor quotes automatically?",
            answer: "Workwise generates a smart comparison table that auto-aligns all quotes against your RFQ. It normalizes line items, highlights differences, and supports grouped or ungrouped views."
          },
          {
            question: "What is the technical deviation checker and how does it work?",
            answer: "It's an AI-powered feature that compares submitted quotes to your original specs, automatically highlighting deviations clause-by-clause so your engineering team can approve faster."
          },
          {
            question: "Can I export comparison charts from Workwise?",
            answer: "Yes. All comparison reports/charts can be exported in Excel format."
          }
        ]
      },
      {
        title: "Negotiation FAQs",
        icon: "FaWrench",
        iconBg: "#EF4444",
        questions: [
          {
            question: "What types of auctions are supported by Workwise?",
            answer: "Workwise supports Reverse auction by default, and has capability to customise and provide English, Dutch, Rank, and Preferential Auctions."
          },
          {
            question: "How does reverse auction work on Workwise?",
            answer: "After the quote submission end date, shortlisted vendors receive a notification with Lowest 1(L1) rate everytime there is new L1. They can revise prices in real-time, helping buyers secure best rates transparently."
          },
          {
            question: "Can I customize negotiation workflows for different packages?",
            answer: "Yes. You can define auction type, rules, duration, and participant list per enquiry(RFQ), giving you full flexibility based on project needs."
          }
        ]
      },
      {
        title: "PO & Payment Tracking FAQs",
        icon: "FaCheckSquare",
        iconBg: "#6B7280",
        questions: [
          {
            question: "Can I create purchase orders from within Workwise?",
            answer: "Yes. Workwise enables PO generation directly from finalized RFQs. You can define milestone terms, attach documents, and share it with vendors instantly."
          },
          {
            question: "Does Workwise send reminders for vendor or client payments?",
            answer: "Yes. You'll receive automated reminders for upcoming payments, both to vendors and from your clients, based on delivery and PO status."
          },
          {
            question: "How does Workwise help track PO progress?",
            answer: "Each PO has a live tracker, covering shipment status, invoice, goods receipt, and payments. You can track buyer-side and client-side progress in one place."
          }
        ]
      },
      {
        title: "General Product FAQs",
        icon: "FaBuilding",
        iconBg: "#6366F1",
        questions: [
          {
            question: "Is Workwise suitable for small contractors or only large EPCs?",
            answer: "Workwise is used by both. Whether you manage ₹1 Cr or ₹500 Cr projects, the platform helps streamline procurement and save time, cost, and manual effort. We work on success based model, and hence suitable for a wide range."
          },
          {
            question: "Can Workwise integrate with our existing ERP system (like SAP or Oracle)?",
            answer: "Yes. Workwise supports plug-and-play integrations with major ERPs (SAP, Oracle, Microsoft Dynamics, NetSuite) and legacy systems via API or flat-file exchange."
          },
          {
            question: "How secure is my data on Workwise?",
            answer: "Workwise is ISO-certified, hosted on AWS, and offers end-to-end encryption. Role-based access, quote privacy, and document control ensure enterprise-grade security."
          },
          {
            question: "Is Workwise only for Indian projects or can international teams use it too?",
            answer: "International teams can use Workwise too. The platform supports both domestic and global vendors, and can be adapted to local project requirements."
          }
        ]
      }
    ]
  }
};
