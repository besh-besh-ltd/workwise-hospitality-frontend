import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faClock, faShield, faLink, faPhone, faWrench, faTruck, faBriefcase, faFileAlt, faListUl, faCalculator, faFileContract, faUsers, faBuilding, faCloud, faLock, faBrain, faHammer, faSearch, faMoneyBill, faChartLine, faCheckCircle, faUpload, faExclamationTriangle, faEnvelope, faBell, faCheck, faTimes, faPercent, faDollarSign, faQuestionCircle, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

export const vendorPageData = {
  hero: {
    title: "Not Just Leads — Real Enquiries. Real Orders.",
    subtitle: "Workwise is built for serious suppliers selling to heavy industries - not just for \"visibility,\" but for actual business. From RFQ to PO, everything happens here.",
    valueProps: [
      {
        icon: <FontAwesomeIcon icon={faCheckCircle} />,
        text: "Verified RFQs Only",
        color: "#10B981"
      },
      {
        icon: <FontAwesomeIcon icon={faBuilding} />,
        text: "PSU Approved",
        color: "#10B981"
      },
      {
        icon: <FontAwesomeIcon icon={faShield} />,
        text: "Secure & Private",
        color: "#10B981"
      },
      {
        icon: <FontAwesomeIcon icon={faMoneyBill} />,
        text: "No Bidding Fees",
        color: "#10B981"
      }
    ],
    primaryButton: {
      label: "Start Selling with Workwise",
      variant: "primary",
      icon: "rocket"
    },
    secondaryButton: {
      label: "Talk to Our Vendor Team",
      variant: "outline-white",
      icon: "phone"
    }
  },

  // Trust markers section
  trustSection: {
    title: "Join India's Largest Procurement Platform for Heavy Industries",
    stats: [
      {
        title: "Active Suppliers",
        items: [
          "11000+ Domestic Suppliers",
          "1500+ International Suppliers"
        ]
      },
      {
        title: "Business Volume",
        items: [
          "2300+ Cr Procurement Routed",
          "500+ Active Projects"
        ]
      }
    ],
    
    // PSU logos for carousel (synced with public/assets/images/companylogo)
    psuLogos: [
      "/assets/images/companylogo/aai.png",
      "/assets/images/companylogo/bhel.png",
      "/assets/images/companylogo/bpcl.png",
      "/assets/images/companylogo/bpil.png",
      "/assets/images/companylogo/cet.png",
      "/assets/images/companylogo/cil.png",
      "/assets/images/companylogo/EIL.png",
      "/assets/images/companylogo/gail.png",
      "/assets/images/companylogo/grse.png",
      "/assets/images/companylogo/HP logo.png",
      "/assets/images/companylogo/iggl.png",
      "/assets/images/companylogo/Indian-Oil-Emblem.png",
      "/assets/images/companylogo/mrpl.png",
      "/assets/images/companylogo/msetc.png",
      "/assets/images/companylogo/nalco.png",
      "/assets/images/companylogo/nhpc.png",
      "/assets/images/companylogo/nmdc.png",
      "/assets/images/companylogo/npcil.png",
      "/assets/images/companylogo/ntpc.png",
      "/assets/images/companylogo/oil.png",
      "/assets/images/companylogo/pdil.png",
      "/assets/images/companylogo/pgci.png",
      "/assets/images/companylogo/sail.png",
      "/assets/images/companylogo/vedanta.png"
    ],

    testimonials: [
      {
        quote: "I started with Free plan, upgraded to Gold in 3 months. Best decision for my business.",
        quoteDesktop: "I started with Free plan, upgraded to Gold in 3 months. Getting regular RFQs from verified buyers has transformed my business growth.",
        quoteMobile: "Started with Free plan, upgraded to Gold in 3 months. Best decision!",
        author: "Rajesh Kumar",
        position: "Steel Fabrication, Mumbai",
        category: "Steel Fabrication"
      },
      {
        quote: "Getting genuine RFQs from EPCs - no time-wasting buyers. Every inquiry is serious.",
        quoteDesktop: "Finally found a platform with genuine RFQs from EPCs and industrial buyers. No more time-wasting inquiries - every lead is serious business.",
        quoteMobile: "Genuine RFQs from EPCs - no time-wasting buyers.",
        author: "Vikram Singh",
        position: "Industrial Equipment, Delhi",
        category: "Industrial Equipment"
      },
      {
        quote: "The Deviation Checker tool saved me hours! Caught errors before submitting quotes.",
        quoteDesktop: "The AI-powered Deviation Checker tool has saved me countless hours by catching errors before I submit quotes. It's like having a quality control expert.",
        quoteMobile: "Deviation Checker saved hours! Catches errors before submission.",
        author: "Priya Sharma",
        position: "Electrical Components, Chennai",
        category: "Electrical Components"
      }
    ],

    securityFeatures: [
      {
        title: "ISO Certified",
        icon: faShield,
        iconBg: "linear-gradient(135deg, #10B981 0%, #059669 100%)"
      },
      {
        title: "AWS Hosted",
        icon: faCloud,
        iconBg: "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)"
      },
      {
        title: "End-to-End Encryption",
        icon: faLock,
        iconBg: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)"
      },
      {
        title: "Role-Based Access",
        icon: faUsers,
        iconBg: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
      }
    ]
  },

  // Why choose section
  whyChooseSection: {
    title: "Built for Industrial Suppliers, Not for the Masses",
    cards: [
      {
        title: "Business Growth",
        description: "Only verified RFQs from trusted buyers. Win more orders with real project enquiries. Free listing to start.",
        icon: faChartLine,
        iconBg: "linear-gradient(135deg, #10B981 0%, #059669 100%)"
      },
      {
        title: "Smart AI Tools",
        description: "Auto-parse your PDF quotations. AI Deviation Checker flags mismatches. Track RFQ status, receive reminders.",
        icon: faBrain,
        iconBg: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)"
      },
      {
        title: "Hassle-Free Workflow",
        description: "Respond via WhatsApp/Email - no login needed. Private data and quote security ensured. Get nudges when buyers review your quote.",
        icon: faWrench,
        iconBg: "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)"
      }
    ]
  },

  // Smart selling tools
  smartTools: {
    title: "Smart Selling Tools",
    subtitle: "AI-powered tools to make your quotation process faster and error-free",
    tools: [
      {
        title: "Quotation Parser",
        description: "Upload PDF → Editable auto-format",
        icon: faUpload,
        iconBg: "#10B981"
      },
      {
        title: "Deviation Checker", 
        description: "Spot mismatches instantly",
        icon: faExclamationTriangle,
        iconBg: "#F59E0B"
      },
      {
        title: "Reminders & Quote Tracking",
        description: "Never miss a deal",
        icon: faBell,
        iconBg: "#8B5CF6"
      }
    ]
  },

  // Pricing section
  pricingSection: {
    title: "Start for Free. Upgrade Anytime.",
    plans: [
      {
        name: "Free",
        enquiryGuarantee: false,
        aiTools: false,
        visibilityBoost: "Standard"
      },
      {
        name: "Silver (₹30K/yr)",
        enquiryGuarantee: "15 RFQs",
        aiTools: false,
        visibilityBoost: "High"
      },
      {
        name: "Gold (₹50K/yr)",
        enquiryGuarantee: "30 RFQs", 
        aiTools: true,
        visibilityBoost: "Top Tier"
      }
    ]
  },

  // Final CTA
  finalCta: {
    title: "Grow Your Business Where the Right Buyers Are",
    subtitle: "Free to list. No bidding fees. Just real enquiries from real projects.",
    primaryButton: {
      label: "Join Now",
      variant: "primary",
      icon: "rocket"
    },
    secondaryButton: {
      label: "Talk to Vendor Success Team",
      variant: "outline-light",
      icon: "phone"
    }
  },

  // FAQ data
  faqSection: {
    categories: [
      {
        title: "Getting Started",
        icon: "FaRocket",
        iconBg: "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)",
        questions: [
          {
            question: "How does the company guarantee work?",
            answer: "We guarantee a minimum number of relevant RFQs based on your plan. If you don't receive the guaranteed number in a month, we extend your plan or provide additional support to ensure you get value for your investment."
          },
          {
            question: "Can I use Workwise if I'm a small supplier?",
            answer: "Yes! We have suppliers of all sizes, from small local vendors to large enterprises. Our Free plan is perfect for small suppliers to get started, and you can upgrade as your business grows."
          },
          {
            question: "How is Workwise different from other procurement platforms?",
            answer: "Unlike general marketplaces, we focus exclusively on heavy industries and infrastructure projects. We verify all buyers and ensure quality RFQs. Plus, our AI tools help you respond faster and more accurately."
          }
        ]
      },
      {
        title: "RFQs & Business",
        icon: "FaBriefcase", 
        iconBg: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
        questions: [
          {
            question: "What types of RFQs will I receive?",
            answer: "You'll receive RFQs related to your registered categories from verified industrial buyers, EPCs, contractors, and PSUs. All RFQs are pre-qualified and relevant to heavy industries and infrastructure projects."
          },
          {
            question: "Do I need to pay to respond to RFQs?",
            answer: "No! Unlike other platforms, we don't charge bidding fees. You can respond to any RFQ for free. We only charge for premium features and guaranteed RFQ volumes."
          },
          {
            question: "How quickly do I need to respond to RFQs?",
            answer: "Most RFQs have response windows of 3-7 days. Our system sends you instant notifications via WhatsApp and email, and you can respond directly without logging into the platform."
          }
        ]
      },
      {
        title: "Tools & Features",
        icon: "FaWrench",
        iconBg: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
        questions: [
          {
            question: "What is the Deviation Checker tool?",
            answer: "Our AI-powered Deviation Checker compares your quotation against the RFQ requirements and flags any mismatches or missing items. This helps you submit complete, accurate quotes and reduces rejections."
          },
          {
            question: "Can I respond to RFQs without logging into Workwise?",
            answer: "Yes! You can respond to RFQs directly via email or WhatsApp. Our system processes your responses automatically. However, using our platform gives you access to additional tools and tracking features."
          },
          {
            question: "Do you provide any support for quotation preparation?",
            answer: "Yes, our Gold plan includes access to AI tools for quotation parsing and formatting. We also provide templates and our support team can help you optimize your quotation process."
          }
        ]
      }
    ]
  },

  // Carousel settings for PSU logos  
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
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
        }
      }
    ]
  }
};
