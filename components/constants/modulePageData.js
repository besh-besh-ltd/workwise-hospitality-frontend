// Module Page Data - Generic template for all modules
export const modulePageData = {
  // BOQ Understanding & Simplification
  boq: {
    hero: {
      title: "Make Your BOQ Usable in Minutes — No Excel Cleanup Needed",
      subtitle: "Upload any BOQ in Excel, PDF, or Word — Workwise converts it into a clean, structured, editable format ready for procurement.",
      primaryButton: {
        label: "Try BOQ Simplifier",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      }
    },
    benefits: {
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
    },
    howItWorks: {
      title: "How It Works — Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Upload Your BOQ",
          description: "Excel, PDF, Word — any format accepted. Simply drag and drop or browse to select your file."
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
    },
    customerSayings: {
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
    },
    faq: {
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
      }
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Generate multiple RFQs instantly",
          description: "Generate multiple RFQs instantly from your BOQ, manual effort reduced significantly.",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "Share via WhatsApp and email",
          description: "Share RFQs via WhatsApp and email to your selected vendors, and setup automated reminders.",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "Track status and responses",
          description: "Track status of sent RFQs, vendor responses, and revisions in one dashboard.",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works — Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Import simplified BOQ",
          description: "Import simplified BOQ or enter line items manually."
        },
        {
          stepNumber: 2,
          title: "AI maps to vendors",
          description: "AI fetches each product with its sizing, specification, quantity, unit and map it to relevant vendors."
        },
        {
          stepNumber: 3,
          title: "Send and track RFQs",
          description: "Send RFQs via WhatsApp/Email and track responses live, plus send automated reminders to all in single click."
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "We used to create RFQs over 2-3 days with back-and-forth on specs. Now we generate and send it all in 15–20 minutes.",
        authorName: "Procurement Lead",
        authorTitle: "Turnkey Infra EPC"
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
          answer: "Yes. Workwise supports both WhatsApp and email — no login required for vendors to respond."
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
      subtitle: "Access 12,500+ verified vendors, add your own in one click, or let our team do it for you — domestic, international, and hard-to-find.",
      primaryButton: {
        label: "Explore Vendor Network",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      }
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Access 12,500+ PSU-approved vendors",
          description: "Instantly access 12,500+ PSU-approved vendors, including hard-to-find international partners.",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "Add your own vendors in one click",
          description: "Add your own vendors in one click, or upload a list for assisted onboarding.",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "End-to-end vendor support",
          description: "Get end-to-end vendor support — from discovery to follow-up and negotiation.",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works — Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Search or filter vendors",
          description: "Search or filter from Workwise's PSU-approved vendor base."
        },
        {
          stepNumber: 2,
          title: "Add your own vendors",
          description: "Add your own vendors — manually or via upload — we onboard them for you."
        },
        {
          stepNumber: 3,
          title: "Expert team support",
          description: "Our expert team helps with vendor follow-ups, onboarding, and negotiations."
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "We needed a valve manufacturer from Europe who was approved by PSU. Workwise helped us close it in 3 days.",
        authorName: "Project Procurement Manager",
        authorTitle: "Oil & Gas EPC"
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
      title: "Evaluate Quotes Smartly, Make Better Decisions",
      subtitle: "Compare vendor quotes side-by-side, identify deviations, and make informed decisions with AI-powered analysis.",
      primaryButton: {
        label: "Try Evaluation Tool",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      }
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Side-by-side quote comparison",
          description: "Compare vendor quotes side-by-side with automated deviation detection and analysis.",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "AI-powered deviation detection",
          description: "Automatically identify price deviations, specification differences, and compliance issues.",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "Export smart comparison charts",
          description: "Generate and export detailed comparison reports for stakeholder review and decision making.",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works — Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Upload vendor quotes",
          description: "Upload vendor quotes in any format — Excel, PDF, or manual entry."
        },
        {
          stepNumber: 2,
          title: "System flags deviations",
          description: "System automatically flags deviations and compares values across all quotes."
        },
        {
          stepNumber: 3,
          title: "Download smart chart",
          description: "Download/export smart comparison chart for decision making and stakeholder review."
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "The evaluation tool saved us hours of manual comparison. We can now spot deviations instantly and make faster decisions.",
        authorName: "Procurement Manager",
        authorTitle: "Infrastructure EPC"
      },
      realOutcomes: {
        title: "Real Outcomes",
        items: [
          "70% faster quote evaluation",
          "Reduced evaluation errors by 90%",
          "Better vendor selection decisions"
        ]
      }
    },
    faq: {
      title: "Frequently Asked Questions",
      questions: [
        {
          question: "Can I compare quotes in different formats?",
          answer: "Yes. Workwise can handle quotes in Excel, PDF, and manual entry formats for comparison."
        },
        {
          question: "How does the deviation detection work?",
          answer: "AI analyzes price variations, specification differences, and compliance gaps automatically."
        },
        {
          question: "Can I export comparison reports?",
          answer: "Yes. You can export detailed comparison charts and reports for stakeholder review."
        },
        {
          question: "Does it support technical evaluation too?",
          answer: "Yes. The tool evaluates both commercial and technical aspects of vendor quotes."
        }
      ]
    },
    finalCta: {
      title: "Ready to Evaluate Your Next Quotes?",
      primaryButton: {
        label: "Try Evaluation Tool",
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
      title: "Negotiate Smarter, Close Deals Faster",
      subtitle: "Streamline negotiation processes with automated workflows, track discussions, and close deals efficiently.",
      primaryButton: {
        label: "Try Negotiation Tool",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      }
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Automated negotiation workflows",
          description: "Streamline negotiation processes with automated workflows and approval chains.",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "Track all discussions",
          description: "Track all negotiation discussions, changes, and approvals in one centralized system.",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "Close deals efficiently",
          description: "Close deals efficiently with automated document generation and approval processes.",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works — Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Initiate negotiation",
          description: "Start negotiation process with selected vendors based on evaluation results."
        },
        {
          stepNumber: 2,
          title: "Track discussions",
          description: "Track all discussions, changes, and approvals in automated workflows."
        },
        {
          stepNumber: 3,
          title: "Generate final documents",
          description: "Generate final documents and close deals with automated approval processes."
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "Our negotiation process used to take weeks. Now we can track everything and close deals in days.",
        authorName: "Senior Procurement Officer",
        authorTitle: "Manufacturing Company"
      },
      realOutcomes: {
        title: "Real Outcomes",
        items: [
          "60% faster negotiation cycles",
          "Improved transparency in discussions",
          "Better deal closure rates"
        ]
      }
    },
    faq: {
      title: "Frequently Asked Questions",
      questions: [
        {
          question: "Can I track negotiation history?",
          answer: "Yes. All negotiation discussions, changes, and approvals are tracked in the system."
        },
        {
          question: "Does it support multi-level approvals?",
          answer: "Yes. You can set up automated approval workflows with multiple stakeholders."
        },
        {
          question: "Can I generate final documents automatically?",
          answer: "Yes. Final documents can be generated automatically based on negotiation outcomes."
        },
        {
          question: "Is there audit trail for negotiations?",
          answer: "Yes. Complete audit trail is maintained for all negotiation activities and decisions."
        }
      ]
    },
    finalCta: {
      title: "Ready to Streamline Your Negotiations?",
      primaryButton: {
        label: "Try Negotiation Tool",
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
      title: "Manage PO & Payments Seamlessly",
      subtitle: "Streamline purchase order creation, payment tracking, and vendor management in one integrated platform.",
      primaryButton: {
        label: "Try Payment Tool",
        variant: "black",
        icon: "none"
      },
      secondaryButton: {
        label: "Book a Call",
        variant: "white",
        icon: "phone"
      }
    },
    benefits: {
      title: "Top Benefits You Get",
      features: [
        {
          title: "Automated PO generation",
          description: "Generate purchase orders automatically from approved negotiations and vendor selections.",
          iconBgColor: "bg-primary",
          iconColor: "text-white"
        },
        {
          title: "Track payment lifecycle",
          description: "Track payment lifecycle from PO creation to vendor payment with automated workflows.",
          iconBgColor: "bg-success",
          iconColor: "text-white"
        },
        {
          title: "Integrated vendor management",
          description: "Manage vendor relationships, payment terms, and compliance in one integrated system.",
          iconBgColor: "bg-warning",
          iconColor: "text-white"
        }
      ]
    },
    howItWorks: {
      title: "How It Works — Step by Step",
      steps: [
        {
          stepNumber: 1,
          title: "Generate PO",
          description: "Generate purchase orders automatically from approved negotiations and selections."
        },
        {
          stepNumber: 2,
          title: "Track deliveries",
          description: "Track deliveries, quality checks, and payment milestones automatically."
        },
        {
          stepNumber: 3,
          title: "Process payments",
          description: "Process payments based on delivery milestones and vendor payment terms."
        }
      ]
    },
    customerSayings: {
      title: "What Real Customers Are Saying",
      testimonial: {
        quote: "The payment management system has eliminated our manual tracking. Everything is automated and transparent.",
        authorName: "Finance Manager",
        authorTitle: "Construction Company"
      },
      realOutcomes: {
        title: "Real Outcomes",
        items: [
          "80% reduction in payment processing time",
          "Improved vendor relationships",
          "Better cash flow management"
        ]
      }
    },
    faq: {
      title: "Frequently Asked Questions",
      questions: [
        {
          question: "Can I generate POs automatically?",
          answer: "Yes. Purchase orders can be generated automatically from approved negotiations and vendor selections."
        },
        {
          question: "Does it track payment milestones?",
          answer: "Yes. The system tracks payment milestones based on delivery and quality check completion."
        },
        {
          question: "Can I manage vendor payment terms?",
          answer: "Yes. You can set up and manage vendor payment terms and compliance requirements."
        },
        {
          question: "Is there integration with accounting systems?",
          answer: "Yes. The system can integrate with your existing accounting and ERP systems."
        }
      ]
    },
    finalCta: {
      title: "Ready to Streamline Your PO & Payments?",
      primaryButton: {
        label: "Try Payment Tool",
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
  title: "How It Works — Step by Step",
  steps: [
    {
      stepNumber: 1,
      title: "Upload Your BOQ",
      description: "Excel, PDF, Word — any format accepted. Simply drag and drop or browse to select your file."
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