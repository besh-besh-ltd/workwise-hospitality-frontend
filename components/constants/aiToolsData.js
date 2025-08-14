// AI Tools Data - All tools in one file
export const aiToolsData = {
  // Shared data for the AI tools page
  trustSignals: {
    title: "Trusted by Industry Leaders",
    logos: ["IOCL", "NTPC", "ONGC", "PowerGrid"],
    testimonials: [
      {
        text: "Workwise's AI tools saved us 3 days of manual work.",
        author: "Procurement Head, EPC Company"
      },
      {
        text: "The structured output made our RFQ process seamless.",
        author: "Project Manager, Infrastructure Firm"
      }
    ],
    badges: ["ISO", "AWS", "IIT-built"],
    tagline: "Workwise AI is built by industrial experts and IIT Bombay engineers."
  },

  // Audience data for "Who It's For" section
  audience: [
    {
      icon: "users",
      title: "EPC Buyer",
      description: "Create comprehensive procurement plans with automated cost analysis and risk assessment",
      iconColor: "#0d6efd"
    },
    {
      icon: "list-alt",
      title: "Contractor",
      description: "Create faster BOQs with 1-click summaries and resource allocation recommendations",
      iconColor: "#198754"
    },
    {
      icon: "file-alt",
      title: "Tender Team",
      description: "Streamline bid preparation with intelligent document analysis and competitive positioning",
      iconColor: "#fd7e14"
    },
    {
      icon: "calculator",
      title: "Cost Estimator",
      description: "Generate precise cost breakdowns with AI-powered historical data analysis",
      iconColor: "#6f42c1"
    }
  ],
  // BOQ Simplification
  boqSimplifier: {
    slug: "boq-simplification",
    title: "BOQ Simplification",
    subtitle: "Transform complex BOQs into structured data",
    bgGradient: "linear-gradient(45deg, #7E22CE, #9333EA)",
    iconColor: "#7E22CE",
    icon: "stream",
    buttonText: "Simplify BOQ/PR/PI",
    buttonVariant: "secondary",
    buttonStyle: { backgroundColor: "#9333EA", border: "none" },
    note: "Free processing for up to 100 line items",
    hero: {
      title: "Upload Your BOQ/PR/PI - Let Workwise AI Do the Heavy Lifting",
      subtitle: "Powered by Wisely - Your Smart Procurement Assistant",
      primaryButton: {
        label: "Upload to Start",
        variant: "primary",
        icon: "upload"
      },
      image: "/assets/images/placeholder.jpeg"
    },
    benefits: {
      title: "Save Time. Avoid Errors. Get Instant Clarity.",
      features: [
        {
          icon: "list",
          title: "Smart Categorization",
          description: "Simplify messy BOQs, PRs, or PIs across multiple sub-sheets"
        },
        {
          icon: "screwdriver-wrench",
          title: "Clean & Structured",
          description: "Auto-extract specs, sizing, quantity, UOM, and comments"
        },
        {
          icon: "robot",
          title: "RFQ Ready",
          description: "Get grouped output by package, product variant, or skid"
        }
      ]
    },
    howItWorks: {
      title: "How Wisely Works",
      steps: [
        {
          step: 1,
          title: "Upload your file",
          description: "Upload any BOQ in Excel, PDF, or Word format"
        },
        {
          step: 2,
          title: "Wisely reads and structures",
          description: "Workwise AI reads, extracts, and structures data"
        },
        {
          step: 3,
          title: "Get results instantly",
          description: "Your results are emailed + previewed instantly on site"
        }
      ]
    },
    outputPreview: {
      title: "See What You'll Get",
      previews: [
        {
          title: "Structured BOQ",
          image: "/assets/images/placeholder.jpeg",
          description: "Clean, categorized line items ready for RFQ"
        },
        {
          title: "Cost Breakdown",
          image: "/assets/images/placeholder.jpeg",
          description: "Material, service, and manpower breakdown"
        }
      ],
      note: "Only 1 file processed for free",
      previewNote: "Preview result online or download with watermark"
    },
    trustSignals: {
      title: "Trusted by India's Top Industrial Teams",
      logos: ["IOCL", "NTPC", "ONGC", "PowerGrid"],
      testimonials: [
        {
          text: "Workwise's BOQ simplification saved us 3 days of manual work.",
          author: "Procurement Head, EPC Company"
        },
        {
          text: "The structured output made our RFQ process seamless.",
          author: "Project Manager, Infrastructure Firm"
        }
      ],
      badges: ["ISO", "AWS", "IIT-built"],
      tagline: "Workwise AI is built by industrial experts and IIT Bombay engineers."
    },
    leadForm: {
      title: "Get Your BOQ Simplified",
      subtitle: "We'll share your result on email. Free usage is limited to 1 file.",
      fields: [
        {
          name: "fullName",
          label: "Full Name",
          type: "text",
          required: true,
          placeholder: "Enter your full name"
        },
        {
          name: "companyName",
          label: "Company Name",
          type: "text",
          required: true,
          placeholder: "Enter your company name"
        },
        {
          name: "designation",
          label: "Designation",
          type: "text",
          required: true,
          placeholder: "Enter your designation"
        },
        {
          name: "workEmail",
          label: "Work Email",
          type: "email",
          required: true,
          placeholder: "Enter your work email"
        },
        {
          name: "phoneNumber",
          label: "Phone Number",
          type: "tel",
          required: false,
          placeholder: "Enter your phone number"
        }
      ],
      termsText: "I agree to terms",
      submitButton: "Get BOQ Simplified"
    },
    emailResult: {
      title: "Your BOQ Has Been Simplified",
      message: "Powered by Wisely — Your Smart Procurement Assistant",
      cta: "Create RFQ from this BOQ"
    },
    outputView: {
      title: "Your Simplified BOQ",
      downloadText: "Download (with watermark)",
      cta: "Create RFQ from this BOQ",
      chatbotTeaser: {
        title: "Coming Soon: Ask Wisely",
        description: "You'll soon be able to chat with Wisely about this document. Stay tuned."
      }
    },
    bottomCta: {
      title: "Want to Automate Your Entire Procurement Workflow?",
      button: {
        label: "Book a Call With Our Team",
        variant: "primary",
        icon: "phone"
      }
    },
    faqs: [
      {
        question: "What file formats are supported?",
        answer: "We support Excel (.xlsx, .xls), PDF, and Word (.docx, .doc) formats."
      },
      {
        question: "Is the result editable?",
        answer: "Yes, the simplified BOQ is provided in Excel format and is fully editable."
      },
      {
        question: "Can I run multiple files?",
        answer: "Free processing is limited to 1 file. Contact us for bulk processing options."
      },
      {
        question: "What if I need detailed vendor quotes?",
        answer: "Our platform can help you create RFQs and connect with verified vendors for quotes."
      }
    ]
  },

  // Cost Estimation
  costEstimator: {
    slug: "cost-estimation",
    title: "Cost Estimation",
    subtitle: "Generate accurate cost estimates from BOQs",
    bgGradient: "linear-gradient(45deg, #F59E0B, #FACC15)",
    iconColor: "#F59E0B",
    icon: "money-bill",
    buttonText: "Get BOQ Cost Estimate",
    buttonVariant: "warning",
    note: "Free processing for up to 100 line items",
    hero: {
      title: "Estimate Project Cost in Minutes - Not Weeks",
      subtitle: "Upload your BOQ and let Workwise AI calculate material cost, service & manpower inputs, and total project estimation with smart logic.",
      primaryButton: {
        label: "Upload to Estimate",
        variant: "primary",
        icon: "upload"
      },
      image: "/assets/images/placeholder.jpeg"
    },
    benefits: {
      title: "Quick Estimations. Smarter Budgeting. No More Guesswork.",
      features: [
        {
          icon: "money-bill",
          title: "Cost Breakdown",
          description: "Get accurate material cost for each line item in your BOQ"
        },
        {
          icon: "chart-line",
          title: "Market Rates",
          description: "Add manual inputs for service, manpower, contingencies, etc."
        },
        {
          icon: "bolt",
          title: "Rapid Estimation",
          description: "View clean, structured project-level cost chart with L1-L2-L3 vendors (if available)"
        }
      ]
    },
    howItWorks: {
      title: "How Wisely Works",
      steps: [
        {
          step: 1,
          title: "Upload your BOQ",
          description: "Upload any BOQ in Excel, PDF, or Word format"
        },
        {
          step: 2,
          title: "AI analyzes and estimates",
          description: "Workwise AI categorizes items and applies market rates"
        },
        {
          step: 3,
          title: "Get detailed breakdown",
          description: "Complete cost estimate with material, service, and manpower breakdown"
        }
      ]
    },
    outputPreview: {
      title: "See What You'll Get",
      previews: [
        {
          title: "Cost Breakdown Table",
          image: "/assets/images/placeholder.jpeg",
          description: "Detailed cost breakdown by category"
        },
        {
          title: "Project Summary",
          image: "/assets/images/placeholder.jpeg",
          description: "Total project cost with percentage breakdown"
        }
      ],
      note: "Only 1 file processed for free",
      previewNote: "Preview result online or download with watermark"
    },
    trustSignals: {
      title: "Trusted by India's Top Industrial Teams",
      logos: ["IOCL", "NTPC", "ONGC", "PowerGrid"],
      testimonials: [
        {
          text: "Workwise's cost estimation is incredibly accurate and saved us weeks of manual work.",
          author: "Cost Manager, EPC Company"
        },
        {
          text: "The market rate data helped us win more competitive bids.",
          author: "Bid Manager, Infrastructure Firm"
        }
      ],
      badges: ["ISO", "AWS", "IIT-built"],
      tagline: "Workwise AI is built by industrial experts and IIT Bombay engineers."
    },
    leadForm: {
      title: "Get Your Cost Estimate",
      subtitle: "We'll share your result on email. Free usage is limited to 1 file.",
      fields: [
        {
          name: "fullName",
          label: "Full Name",
          type: "text",
          required: true,
          placeholder: "Enter your full name"
        },
        {
          name: "companyName",
          label: "Company Name",
          type: "text",
          required: true,
          placeholder: "Enter your company name"
        },
        {
          name: "designation",
          label: "Designation",
          type: "text",
          required: true,
          placeholder: "Enter your designation"
        },
        {
          name: "workEmail",
          label: "Work Email",
          type: "email",
          required: true,
          placeholder: "Enter your work email"
        },
        {
          name: "phoneNumber",
          label: "Phone Number",
          type: "tel",
          required: false,
          placeholder: "Enter your phone number"
        }
      ],
      termsText: "I agree to terms",
      submitButton: "Get Cost Estimate"
    },
    emailResult: {
      title: "Your Cost Estimate is Ready",
      message: "Powered by Wisely — Your Smart Procurement Assistant",
      cta: "Get Vendor Quotes in 48 Hours"
    },
    outputView: {
      title: "Your Project Cost Estimate",
      downloadText: "Download (with watermark)",
      cta: "Get Vendor Quotes in 48 Hours",
      chatbotTeaser: {
        title: "Coming Soon: Ask Wisely",
        description: "You'll soon be able to chat with Wisely about this estimate. Stay tuned."
      }
    },
    bottomCta: {
      title: "Want to Automate Your Entire Procurement Workflow?",
      button: {
        label: "Book a Call With Our Team",
        variant: "primary",
        icon: "phone"
      }
    },
    faqs: [
      {
        question: "How accurate are the cost estimates?",
        answer: "Our estimates are based on current market rates and historical data, typically within 10-15% accuracy."
      },
      {
        question: "Can I customize the cost breakdown?",
        answer: "Yes, you can add custom cost heads and adjust rates based on your requirements."
      },
      {
        question: "What cost categories are included?",
        answer: "We cover material costs, service costs, manpower, equipment rental, and other project overheads."
      },
      {
        question: "Can I get vendor quotes based on this estimate?",
        answer: "Yes, our platform can help you create RFQs and connect with verified vendors for competitive quotes."
      }
    ]
  },

  // Tender Summary
  tenderSummary: {
    slug: "tender-summary",
    title: "Tender Summary",
    subtitle: "Extract key information from complex tender documents",
    bgGradient: "linear-gradient(45deg, #1D4ED8, #2563EB)",
    iconColor: "#1D4ED8",
    icon: "chart-column",
    buttonText: "Get Tender Summary",
    buttonVariant: "primary",
    note: "Free processing for documents up to 500 pages",
    hero: {
      title: "Upload Tender. Skip the 500-Page Scroll.",
      subtitle: "Let Workwise AI read the tender for you and give you a crisp, actionable summary in minutes.",
      primaryButton: {
        label: "Upload to Start",
        variant: "primary",
        icon: "upload"
      },
      image: "/assets/images/placeholder.jpeg"
    },
    benefits: {
      title: "Understand Tenders in Minutes - Not Days",
      features: [
        {
          icon: "wand-magic-sparkles",
          title: "AI-Powered Analysis",
          description: "Get all key sections summarized - eligibility, scope, submission checklists, timelines"
        },
        {
          icon: "clock",
          title: "Save Time",
          description: "Know whether a tender is relevant for you before investing hours"
        },
        {
          icon: "chart-column",
          title: "Interactive Q&A",
          description: "Share and discuss with your team instantly - no more full-tender forwarding"
        }
      ]
    },
    howItWorks: {
      title: "How Wisely Works",
      steps: [
        {
          step: 1,
          title: "Upload your tender",
          description: "Upload any tender document in PDF format"
        },
        {
          step: 2,
          title: "AI extracts insights",
          description: "Workwise AI reads and extracts key information"
        },
        {
          step: 3,
          title: "Get structured summary",
          description: "Organized summary with deadlines, requirements, and key points"
        }
      ]
    },
    outputPreview: {
      title: "See What You'll Get",
      previews: [
        {
          title: "Tender Summary",
          image: "/assets/images/placeholder.jpeg",
          description: "Key requirements, deadlines, and scope"
        },
        {
          title: "Compliance Checklist",
          image: "/assets/images/placeholder.jpeg",
          description: "Mandatory requirements and documents"
        }
      ],
      note: "Only 1 file processed for free",
      previewNote: "Preview result online or download with watermark"
    },
    trustSignals: {
      title: "Trusted by India's Top Industrial Teams",
      logos: ["IOCL", "NTPC", "ONGC", "PowerGrid"],
      testimonials: [
        {
          text: "Workwise's tender summary helped us identify all key requirements in minutes.",
          author: "Tender Manager, EPC Company"
        },
        {
          text: "We never miss deadlines now thanks to the structured timeline.",
          author: "Bid Coordinator, Infrastructure Firm"
        }
      ],
      badges: ["ISO", "AWS", "IIT-built"],
      tagline: "Workwise AI is built by industrial experts and IIT Bombay engineers."
    },
    leadForm: {
      title: "Get Your Tender Summary",
      subtitle: "We'll share your result on email. Free usage is limited to 1 file.",
      fields: [
        {
          name: "fullName",
          label: "Full Name",
          type: "text",
          required: true,
          placeholder: "Enter your full name"
        },
        {
          name: "companyName",
          label: "Company Name",
          type: "text",
          required: true,
          placeholder: "Enter your company name"
        },
        {
          name: "designation",
          label: "Designation",
          type: "text",
          required: true,
          placeholder: "Enter your designation"
        },
        {
          name: "workEmail",
          label: "Work Email",
          type: "email",
          required: true,
          placeholder: "Enter your work email"
        },
        {
          name: "phoneNumber",
          label: "Phone Number",
          type: "tel",
          required: false,
          placeholder: "Enter your phone number"
        }
      ],
      termsText: "I agree to terms",
      submitButton: "Get Tender Summary"
    },
    emailResult: {
      title: "Your Tender Summary is Ready",
      message: "Powered by Wisely — Your Smart Procurement Assistant",
      cta: "Create BOQ from this Tender"
    },
    outputView: {
      title: "Your Tender Summary",
      downloadText: "Download (with watermark)",
      cta: "Create BOQ from this Tender",
      chatbotTeaser: {
        title: "Coming Soon: Ask Wisely",
        description: "You'll soon be able to chat with Wisely about this tender. Stay tuned."
      }
    },
    bottomCta: {
      title: "Want to Automate Your Entire Procurement Workflow?",
      button: {
        label: "Book a Call With Our Team",
        variant: "primary",
        icon: "phone"
      }
    },
    faqs: [
      {
        question: "What file formats are supported?",
        answer: "We support PDF format for tender documents. For other formats, please contact us."
      },
      {
        question: "How accurate is the information extraction?",
        answer: "Our AI achieves 95%+ accuracy in extracting key information from tender documents."
      },
      {
        question: "Can I ask questions about the tender?",
        answer: "Yes, you can ask up to 10 questions about your tender document for free."
      },
      {
        question: "What information is extracted?",
        answer: "We extract deadlines, key requirements, scope, technical specifications, and compliance requirements."
      }
    ]
  },

  // Technical Summary
  technicalSummary: {
    slug: "technical-summary",
    title: "Technical Summary",
    subtitle: "Simplify complex technical specifications",
    bgGradient: "linear-gradient(45deg, #15803D, #22C55E)",
    iconColor: "#15803D",
    icon: "lightbulb",
    buttonText: "Simplify Technical Document",
    buttonVariant: "success",
    note: "Free processing for documents up to 25 pages",
    hero: {
      title: "Understand Any Technical Document - Without Reading All 25 Pages",
      subtitle: "Upload any spec sheet, TDS, or scanned PDF - get a smart summary with key clauses in minutes, powered by Wisely.",
      primaryButton: {
        label: "Upload to Start",
        variant: "primary",
        icon: "upload"
      },
      image: "/assets/images/placeholder.jpeg"
    },
    benefits: {
      title: "Read Less. Understand More. Share Instantly.",
      features: [
        {
          icon: "lightbulb",
          title: "Simplified Insights",
          description: "Auto-summarizes key specs, clauses, and tables - no manual scanning"
        },
        {
          icon: "robot",
          title: "AI Assistant",
          description: "Works even on scanned, stamped, or image-based PDFs"
        },
        {
          icon: "share-alt",
          title: "Shareable Reports",
          description: "Perfect for both buyers issuing enquiries and sellers reviewing responses"
        }
      ]
    },
    howItWorks: {
      title: "How Wisely Works",
      steps: [
        {
          step: 1,
          title: "Upload your document",
          description: "Upload any technical document in PDF or Word format"
        },
        {
          step: 2,
          title: "AI simplifies content",
          description: "Workwise AI converts technical jargon into clear language"
        },
        {
          step: 3,
          title: "Get simplified summary",
          description: "Clear, actionable insights ready for your team"
        }
      ]
    },
    outputPreview: {
      title: "See What You'll Get",
      previews: [
        {
          title: "Simplified Summary",
          image: "/assets/images/placeholder.jpeg",
          description: "Clear, non-technical summary of key points"
        },
        {
          title: "Key Insights",
          image: "/assets/images/placeholder.jpeg",
          description: "Actionable insights and recommendations"
        }
      ],
      note: "Only 1 file processed for free",
      previewNote: "Preview result online or download with watermark"
    },
    trustSignals: {
      title: "Trusted by India's Top Industrial Teams",
      logos: ["IOCL", "NTPC", "ONGC", "PowerGrid"],
      testimonials: [
        {
          text: "Workwise's technical summary made complex specifications easy to understand.",
          author: "Technical Manager, EPC Company"
        },
        {
          text: "Our team can now quickly understand technical requirements without jargon.",
          author: "Project Manager, Infrastructure Firm"
        }
      ],
      badges: ["ISO", "AWS", "IIT-built"],
      tagline: "Workwise AI is built by industrial experts and IIT Bombay engineers."
    },
    leadForm: {
      title: "Get Your Technical Summary",
      subtitle: "We'll share your result on email. Free usage is limited to 1 file.",
      fields: [
        {
          name: "fullName",
          label: "Full Name",
          type: "text",
          required: true,
          placeholder: "Enter your full name"
        },
        {
          name: "companyName",
          label: "Company Name",
          type: "text",
          required: true,
          placeholder: "Enter your company name"
        },
        {
          name: "designation",
          label: "Designation",
          type: "text",
          required: true,
          placeholder: "Enter your designation"
        },
        {
          name: "workEmail",
          label: "Work Email",
          type: "email",
          required: true,
          placeholder: "Enter your work email"
        },
        {
          name: "phoneNumber",
          label: "Phone Number",
          type: "tel",
          required: false,
          placeholder: "Enter your phone number"
        }
      ],
      termsText: "I agree to terms",
      submitButton: "Get Technical Summary"
    },
    emailResult: {
      title: "Your Technical Summary is Ready",
      message: "Powered by Wisely — Your Smart Procurement Assistant",
      cta: "Try Full Technical Evaluation"
    },
    outputView: {
      title: "Your Technical Summary",
      downloadText: "Download (with watermark)",
      cta: "Try Full Technical Evaluation",
      chatbotTeaser: {
        title: "Coming Soon: Ask Wisely",
        description: "You'll soon be able to chat with Wisely about this document. Stay tuned."
      }
    },
    bottomCta: {
      title: "Want to Automate Your Entire Procurement Workflow?",
      button: {
        label: "Book a Call With Our Team",
        variant: "primary",
        icon: "phone"
      }
    },
    faqs: [
      {
        question: "What file formats are supported?",
        answer: "We support PDF and Word (.docx, .doc) formats for technical documents."
      },
      {
        question: "How accurate is the simplification?",
        answer: "Our AI maintains technical accuracy while making content accessible to non-technical audiences."
      },
      {
        question: "Can I ask questions about the document?",
        answer: "Yes, you can ask up to 10 questions about your technical document for free."
      },
      {
        question: "What types of technical documents work best?",
        answer: "We work well with specifications, manuals, standards, and technical reports."
      }
    ]
  }
}; 