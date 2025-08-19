// Module Page Data - Generic template for all modules
export const modulePageData = {
  // BOQ Understanding & Simplification
  boq: {
    hero: {
      title: "Make Your BOQ Usable in Minutes - No Excel Cleanup Needed",
      subtitle: "Upload any BOQ in Excel or PDF, and get a clean, structured version- ready for procurement.",
      primaryButton: {
        label: "Try BOQ Simplifier",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      },
      image: "/assets/images/placeholder.jpeg"
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Clean up messy BOQs, no more Excel rework",
          description: "",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "Group line items by similar product variants, package or discipline (auto or manual)",
          description: "",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "Instantly ready your BOQ for RFQ creation or cost estimation",
          description: "",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works-Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Upload any BOQ file (Excel or PDF)",
          description: ""
        },
        {
          stepNumber: 2,
          title: "AI parses, cleans, groups, and simplifies data",
          description: ""
        },
        {
          stepNumber: 3,
          title: "Download structured BOQ or proceed to create RFQs",
          description: ""
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "Earlier, we used to spend half a day just cleaning BOQs. With Workwise, it's 5 minutes and done.",
        authorName: "Senior Procurement Engineer",
        authorTitle: "Oil & Gas Contractor",
        authorImage: "/assets/images/placeholder.jpeg"
      },
      realOutcomes: {
        title: "Real Outcomes",
        items: [
          "90% reduction in manual cleanup",
          "Output used directly in RFQ & Cost Estimation workflows",
          "Standardized BOQ helped reduce errors in quote comparison"
        ]
      }
    },
    faq: {
      title: "Frequently Asked Questions",
      questions: [
        {
          question: "Can I upload PDF or scanned BOQs?",
          answer: "Yes. Workwise supports PDF, Excel. Scanned PDFs work best if text-recognizable."
        },
        {
          question: "Can I re-edit the simplified BOQ after download?",
          answer: "Yes. You can review, edit, and download it in Excel."
        },
        {
          question: "Does the system auto-detect categories like Electrical or Civil?",
          answer: "Yes. It uses AI to tag disciplines and group similar items."
        },
        {
          question: "Can I upload multiple BOQs at once?",
          answer: "For now, upload one at a time. Multi-upload is coming soon."
        }
      ]
    },
    finalCta: {
      title: "Want to try this on your own BOQ?",
      primaryButton: {
        label: "Try BOQ Simplifier",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "outline",
        icon: "phone"
      }
    }
  },

  // RFQ Creation & Management
  rfq: {
    hero: {
      title: "Create RFQs in Minutes, Not Days",
      subtitle: "Directly convert your BOQ into multiple RFQs, auto-filled, and vendor-ready",
      primaryButton: {
        label: "Try RFQ Generator",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      },
      image: "/assets/images/placeholder.jpeg"
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Generate multiple RFQs instantly from your BOQ, manual effort reduced significantly",
          description: "",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "Setup automated reminders on Whatsapp/Email",
          description: "",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "Track status of sent RFQs, vendor responses, and revisions in one dashboard",
          description: "",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works-Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Import simplified BOQ or enter line items manually",
          description: ""
        },
        {
          stepNumber: 2,
          title: "AI fetches each product with its sizing, specification, quantity, unit and map it to relevant vendors",
          description: ""
        },
        {
          stepNumber: 3,
          title: "Send RFQs via WhatsApp/Email and track responses live, plus send automated reminders to all in single click",
          description: ""
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "We used to create RFQs over 2-3 days with back-and-forth on specs. Now we generate and send it all in 15–20 minutes.",
        authorName: "Procurement Lead",
        authorTitle: "Turnkey Infra EPC",
        authorImage: "/assets/images/placeholder.jpeg"
      },
      realOutcomes: {
        title: "Real Outcomes",
        items: [
          "80% faster RFQ cycle",
          "Clearer scope → fewer vendor clarifications",
          "Increased vendor response rate"
        ]
      }
    },
    faq: {
      title: "Frequently Asked Questions",
      questions: [
        {
          question: "Can I send RFQs directly via WhatsApp or only email?",
          answer: "Yes. Workwise supports both WhatsApp and email-no login required for vendors to respond."
        },
        {
          question: "Can I target different vendors for different packages in one RFQ?",
          answer: "Yes. You can group BOQ items into packages and select different vendor sets per package."
        },
        {
          question: "Does Workwise track whether vendors have opened the RFQ?",
          answer: "Yes. You get read receipts and activity status for each vendor."
        },
        {
          question: "What file formats can be used to generate RFQs?",
          answer: "Excel, PDF, and CSV are supported. You can also build RFQs manually from within Workwise."
        },
        {
          question: "Can I edit RFQs after sending it to vendors?",
          answer: "Yes. You can edit, revise RFQs, and vendors get notification of the revision done."
        }
      ]
    },
    finalCta: {
      title: "Want to Try This for Your Next Enquiry?",
      primaryButton: {
        label: "Try RFQ Generator",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "outline",
        icon: "phone"
      }
    }
  },

  // Vendor Discovery & Supplier Management
  vendors: {
    hero: {
      title: "Find the Right Vendors, Without Endless Searching",
      subtitle: "Access 12,500+ verified vendors, add your own in one click, or let our team do it for you-domestic, international, and hard-to-find.",
      primaryButton: {
        label: "Explore Vendor Network",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      },
      image: "/assets/images/placeholder.jpeg"
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Instantly access 12,500+ PSU-approved vendors, including hard-to-find international partners",
          description: "",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "Add your own vendors in one click, or upload a list for assisted onboarding",
          description: "",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "Get end-to-end vendor support-from discovery to follow-up and negotiation",
          description: "",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works-Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Search or filter from Workwise’s PSU-approved vendor base",
          description: ""
        },
        {
          stepNumber: 2,
          title: "Add your own vendors-manually or via upload-we onboard them for you",
          description: ""
        },
        {
          stepNumber: 3,
          title: "Our expert team helps with vendor follow-ups, onboarding, and negotiations",
          description: ""
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "We needed a valve manufacturer from Europe who was approved by PSU. Workwise helped us close it in 3 days.",
        authorName: "Project Procurement Manager",
        authorTitle: "Oil & Gas EPC",
        authorImage: "/assets/images/placeholder.jpeg"
      },
      realOutcomes: {
        title: "Real Outcomes",
        items: [
          "12,500+ vendors across 40+ product categories",
          "Verified sources from India, Europe, SE Asia, and the Gulf",
          "50% faster vendor finalization in new project stages"
        ]
      }
    },
    faq: {
      title: "Frequently Asked Questions",
      questions: [
        {
          question: "Are these vendors verified or approved by any authority?",
          answer: "Yes. Over 12,500 vendors listed on Workwise are PSU-approved or client-approved across India and international markets."
        },
        {
          question: "Can I add my own vendors to the platform?",
          answer: "Absolutely. You can instantly add a vendor manually, or upload a list and our team will onboard them for you."
        },
        {
          question: "Can Workwise help me find new vendors for a specialized product?",
          answer: "Yes. Our service team supports new vendor development for any specific product or project need."
        },
        {
          question: "Will I be able to filter vendors by make or location?",
          answer: "Yes. You can search and filter by product category, make, approval, location, and other tags."
        },
        {
          question: "Can Workwise negotiate with vendors on our behalf?",
          answer: "Yes. You can opt-in for vendor negotiation support from our expert procurement team."
        }
      ]
    },
    finalCta: {
      title: "Need Reliable Vendors for Your Next Project?",
      primaryButton: {
        label: "Explore Vendor Network",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "outline",
        icon: "phone"
      }
    }
  },

  // Technical & Commercial Evaluation
  evaluation: {
    hero: {
      title: "AI‑Powered Technical & Commercial Evaluation-Faster, Smarter, Fairer",
      subtitle: "From extracting technical clauses to IS/BIS/ASTM deviation checks, to normalized commercial comparisons-Workwise gives you full clarity in minutes.",
      primaryButton: {
        label: "Try Evaluation Module",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      },
      image: "/assets/images/placeholder.jpeg"
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Auto‑extract section‑wise technical clauses from spec documents, ready for vendor RFQs.",
          description: "",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "AI deviation checks against BIS/ASTM codes with suggestions & proof for client approval.",
          description: "",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "Normalized commercial comparisons with L1,L2,L3 ranking, factoring in all cost elements, delivery & payment terms.",
          description: "",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works-Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Upload your technical specification file (TDS or detailed spec)",
          description: ""
        },
        {
          stepNumber: 2,
          title: "AI extracts key clauses for vendor RFQ & auto‑checks deviations against BIS/ASTM codes once responses arrive",
          description: ""
        },
        {
          stepNumber: 3,
          title: "System generates normalized commercial tables with payment term adjustments & overall BOQ/project cost ranking",
          description: ""
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "We reduced technical evaluation from weeks to hours, and could share deviation proof with clients instantly for faster approvals.",
        authorName: "Procurement Head",
        authorTitle: "Large EPC Contractor",
        authorImage: "/assets/images/placeholder.jpeg"
      },
      realOutcomes: {
        title: "Real Outcomes",
        items: [
          "90% faster technical evaluation & approval process",
          "Zero missed critical deviations in vendor quotes",
          "Transparent, comparable pricing for fair vendor selection"
        ]
      }
    },
    faq: {
      title: "Frequently Asked Questions",
      questions: [
        {
          question: "What file formats are supported for technical specifications?",
          answer: "We support Excel and PDF formats. Scanned PDFs work best if text‑recognizable."
        },
        {
          question: "How does the AI deviation checker work?",
          answer: "It compares vendor‑quoted specs against your RFQ specs and relevant IS/BIS/ASTM manufacturing codes, flagging mismatches and suggesting actions."
        },
        {
          question: "Can I share deviation results with my client?",
          answer: "Yes. Deviation reports include proof references, making it easy to forward for client approvals."
        },
        {
          question: "How does commercial normalization work?",
          answer: "The system adjusts rates to a common baseline by adding missing costs (freight, packaging, taxes) and factoring in payment terms (1% interest per month for credit days)."
        },
        {
          question: "Does the module provide overall cost ranking?",
          answer: "Yes. You get a BOQ/project‑level cost chart with L1, L2, L3 rankings and total calculated amounts."
        }
      ]
    },
    finalCta: {
      title: "Ready for Clear, Accurate Vendor Comparisons?",
      primaryButton: {
        label: "Try Evaluation Module",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "outline",
        icon: "phone"
      }
    }
  },

  // Negotiation Management
  negotiation: {
    hero: {
      title: "Negotiate Smarter with Multiple Auction Strategies",
      subtitle: "From reverse auctions to custom bidding formats, Workwise helps you close the best deals transparently and efficiently.",
      primaryButton: {
        label: "Try Negotiation Module",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      },
      image: "/assets/images/placeholder.jpeg"
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Run reverse auctions by default for transparent, competitive pricing.",
          description: "",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "Use target price & snap bidding to push prices down further.",
          description: "",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "Access multiple customizable auction formats-tailored to your project needs.",
          description: "",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works-Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Select package & invite shortlisted vendors to participate in auction",
          description: ""
        },
        {
          stepNumber: 2,
          title: "Set auction type, target price, rules, and enable features like snap bidding",
          description: ""
        },
        {
          stepNumber: 3,
          title: "Run auction in real‑time with vendor participation and instant results",
          description: ""
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "We’ve consistently saved 4-8% more after technical evaluation by running reverse auctions through Workwise.",
        authorName: "Procurement Manager",
        authorTitle: "EPC Contractor",
        authorImage: "/assets/images/placeholder.jpeg"
      },
      realOutcomes: {
        title: "Real Outcomes",
        items: [
          "Increased cost savings even after commercial evaluation",
          "Transparent, fair competition among vendors",
          "Flexible formats for different procurement scenarios"
        ]
      }
    },
    faq: {
      title: "Frequently Asked Questions",
      questions: [
        {
          question: "What auction types does Workwise support?",
          answer: "Default is reverse auction, but we also support rank, Dutch, English, referential, and custom auction formats."
        },
        {
          question: "How does reverse auction work on Workwise?",
          answer: "You set the reverse auction start & end date‑time during rfq creation-always after the RFQ quote submission deadline. Once the start time arrives, all vendors who submitted quotes are notified of the current lowest rate. As vendors revise their bids during the auction, every update to the lowest rate triggers instant notifications to all participants, allowing them to respond competitively until the auction closes."
        },
        {
          question: "What is target price setting?",
          answer: "It allows you to define a benchmark rate vendors must match or beat to stay competitive."
        },
        {
          question: "What is snap bidding?",
          answer: "An optional short auction round at the end to encourage vendors to give their best final price."
        },
        {
          question: "Can I customize auction rules for each purchase?",
          answer: "Yes. You can define duration, bid increments, visibility rules, and format per package/rfq/enquiry/purchase"
        },
        {
          question: "Can vendors participate without login?",
          answer: "Yes. They receive a secure auction link via email/WhatsApp."
        }
      ]
    },
    finalCta: {
      title: "Ready to Maximize Your Procurement Savings?",
      primaryButton: {
        label: "Try Negotiation Module",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "outline",
        icon: "phone"
      }
    }
  },

  // PO & Payment Lifecycle Management
  payments: {
    hero: {
      title: "From Vendor Finalization to Final Payment-All in One Flow",
      subtitle: "Define PO approval hierarchies, auto‑generate POs, and track every milestone-from dispatches and GRNs to client and supplier payments.",
      primaryButton: {
        label: "Try PO Management Module",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      },
      image: "/assets/images/placeholder.jpeg"
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Automate PO creation with defined approval hierarchies.",
          description: "",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "Track every delivery, invoice, GRN, and payment milestone in one place.",
          description: "",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "Manage staggered dispatches, partial GRNs, and corresponding payments easily.",
          description: "",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works-Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Finalize vendor => triggers sequential approvals as per PO hierarchy",
          description: ""
        },
        {
          stepNumber: 2,
          title: "Final approver’s confirmation auto‑creates PO for accounts team to review & send",
          description: ""
        },
        {
          stepNumber: 3,
          title: "Track PO lifecycle: seller invoice → delivery challan(s) → GRN(s) → client invoice → payment milestones",
          description: ""
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "We issue 40–50 POs daily, and tracking them was a nightmare: missed payments, even double payments at times. Workwise has eliminated those errors completely.",
        authorName: "Accounts Head",
        authorTitle: "EPC Contractor",
        authorImage: "/assets/images/placeholder.jpeg"
      },
      realOutcomes: {
        title: "Real Outcomes",
        items: [
          "100% visibility on supplier & client payment timelines",
          "No missed approvals or delayed POs",
          "Streamlined handover between procurement, accounts, and project teams"
        ]
      }
    },
    faq: {
      title: "Frequently Asked Questions",
      questions: [
        {
          question: "Can I define multiple levels of PO approval?",
          answer: "Yes. Admins can set up multi‑level approval hierarchies, and the system sends notifications sequentially to each approver."
        },
        {
          question: "Can POs be edited before sending to the vendor?",
          answer: "Yes. The accounts team can review and edit the PO before sending it to the vendor."
        },
        {
          question: "How does milestone tracking work?",
          answer: "You can define payment milestones based on PO terms, track them for both supplier and client, and get automated reminders."
        },
        {
          question: "Can it handle staggered dispatches?",
          answer: "Yes. Multiple dispatches can be linked to the same PO, each with its own delivery challan, GRN, and payment status."
        },
        {
          question: "Does the system track both supplier and client payments?",
          answer: "Yes. You can track when you need to pay the supplier and when to collect from the client-with reminders for both."
        }
      ]
    },
    finalCta: {
      title: "Want Complete Control Over POs & Payments?",
      primaryButton: {
        label: "Try PO Management Module",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "outline",
        icon: "phone"
      }
    }
  }
};

// Top Benefits Section Data
export const benefitsData = {
  title: "Top Benefits You Get",
  features: [
    {
      title: "Upload messy BOQs",
      description: "Upload messy BOQs and get structured output by category, organized and ready to use.",
      iconBgColor: "bg-primary",
      iconColor: "text-white"
    },
    {
      title: "Auto-classify items",
      description: "Auto-classify items by discipline (Electrical, Mechanical, etc.) for better organization.",
      iconBgColor: "bg-success",
      iconColor: "text-white"
    },
    {
      title: "Download clean BOQ",
      description: "Download clean BOQ for RFQ or internal use, saving time and reducing errors.",
      iconBgColor: "bg-warning",
      iconColor: "text-white"
    }
  ]
};

// How It Works Section Data
export const howItWorksData = {
  title: "How It Works-Step by Step",
  steps: [
    {
      stepNumber: 1,
      title: "Upload Your BOQ",
      description: "Excel, PDF, Word-any format accepted. Simply drag and drop or browse to select your file."
    },
    {
      stepNumber: 2,
      title: "Get AI-Powered Breakdown",
      description: "Auto-categorized by domain, product type, and section for easier management and understanding."
    },
    {
      stepNumber: 3,
      title: "Download Simplified BOQ",
      description: "Clean, editable Excel ready for RFQs or cost estimation. Save time and reduce errors."
    }
  ]
};

// Customer Testimonials Data
export const customerSayingsData = {
  title: "What Real Customers Are Saying",
  testimonial: {
    quote: "Earlier, we used to spend half a day just cleaning BOQs. With Workwise, it's 5 minutes and done.",
    authorName: "Senior Procurement Engineer",
    authorTitle: "Oil & Gas Contractor"
  },
  realOutcomes: {
    title: "Real Outcomes",
    items: [
      "90% reduction in manual cleanup",
      "BOQs from different vendors or clients made comparable",
      "Output used directly in RFQ & Cost Estimation workflows"
    ]
  }
};

// FAQ Data
export const faqData = {
  title: "Frequently Asked Questions",
  questions: [
    {
      question: "Can I upload PDF or scanned BOQs?",
      answer: "Yes. Workwise supports PDF, Excel, and Word. Scanned PDFs work best if text-recognizable."
    },
    {
      question: "Can I re-edit the simplified BOQ after download?",
      answer: "Yes. You can review, edit, and download it in Excel."
    },
    {
      question: "Does the system auto-detect categories like Electrical or Civil?",
      answer: "Yes. It uses AI to tag disciplines and group similar items."
    },
    {
      question: "Can I upload multiple BOQs at once?",
      answer: "For now, upload one at a time. Multi-upload is coming soon."
    }
  ]
};

// Final CTA Section Data
export const finalCtaData = {
  title: "Want to try this on your own BOQ?",
  primaryButton: {
    label: "Try BOQ Simplifier",
    variant: "black",
    icon: "none"
  },
  secondaryButton: {
    label: "Book a Call",
    variant: "outline",
    icon: "phone"
  }
}; 