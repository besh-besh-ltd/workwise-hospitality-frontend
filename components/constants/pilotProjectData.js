import { 
  faCheck, 
  faFileAlt, 
  faPaperPlane, 
  faSearch, 
  faChartLine, 
  faFileContract, 
  faHandshake,
  faRocket,
  faShield,
  faLock,
  faBrain,
  faWrench,
  faUsers
} from '@fortawesome/free-solid-svg-icons';

export const pilotProjectData = {
  hero: {
    title: "Claim Pilot Project Access: Start Risk-Free",
    subtitle: "Get full access to Workwise for your current project. No commitments, just real value."
  },

  whyPilot: {
    title: "Why a Pilot?",
    benefits: [
      {
        icon: faCheck,
        text: "So you can experience how Workwise cuts 75% of procurement time"
      },
      {
        icon: faCheck,
        text: "So you can validate 6-9% cost savings across packages"
      },
      {
        icon: faCheck,
        text: "So you can be sure before committing long-term"
      }
    ]
  },

  pilotFeatures: {
    title: "What You Get in the Pilot",
    features: [
      {
        icon: faFileAlt,
        title: "BOQ Simplification & Package Creation",
        iconBg: "#3B82F6"
      },
      {
        icon: faPaperPlane,
        title: "RFQ Automation & WhatsApp/Email Sending",
        iconBg: "#10B981"
      },
      {
        icon: faSearch,
        title: "Vendor Discovery & Response Tracking",
        iconBg: "#F59E0B"
      },
      {
        icon: faChartLine,
        title: "Quote Comparison & Deviation Checker",
        iconBg: "#8B5CF6"
      },
      {
        icon: faFileContract,
        title: "PO & Payment Tracker (limited use)",
        iconBg: "#EF4444"
      },
      {
        icon: faHandshake,
        title: "Negotiation features like reverse auction and more",
        iconBg: "#06B6D4"
      }
    ]
  },

  formSection: {
    title: "Ready to Try It on Your Current Project?",
    subtitle: "We'll onboard you within 1 business day. Limited pilot slots each month.",
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
        name: "mobileNumber",
        label: "Mobile Number",
        type: "text",
        required: true,
        placeholder: "Enter your mobile number"
      },
      {
        name: "projectType",
        label: "Type of Project",
        type: "select",
        required: true,
        options: ["Select project type", "Industrial", "Infra", "Energy", "Others"]
      },
      {
        name: "boqUpload",
        label: "Upload Your BOQ or PR (Optional)",
        type: "file",
        required: false,
        placeholder: "Choose file..."
      },
      {
        name: "agreement",
        label: "I want to see Workwise in action and agree to be contacted",
        type: "checkbox",
        required: true
      }
    ],
    buttonText: "🔘 Claim My Free Pilot Now"
  },

  trustIndicators: {
    indicators: [
      {
        icon: faShield,
        text: "ISO Certified"
      },
      {
        icon: faLock,
        text: "Data Encrypted"
      },
      {
        icon: faUsers,
        text: "Used by 100+ EPCs"
      },
      {
        icon: faBrain,
        text: "Built by IIT & Industry Experts"
      },
      {
        icon: faWrench,
        text: "Trusted by Vendors of Top PSUs"
      }
    ]
  },

  testimonial: {
    quote: "Workwise cleaned a 400-line BOQ and created RFQs in under 10 minutes.",
    author: "Project Manager",
    company: "₹400 Cr Infra EPC"
  }
};
