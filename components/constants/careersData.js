import { 
  faRocket, 
  faUsers, 
  faLightbulb, 
  faHeart,
  faCode,
  faChartLine,
  faWrench,
  faGraduationCap,
  faBriefcase,
  faMapMarkerAlt,
  faClock,
  faDollarSign
} from '@fortawesome/free-solid-svg-icons';

export const careersData = {
  hero: {
    title: "Join Our Mission to Transform Procurement",
    subtitle: "Build the future of industrial procurement with cutting-edge AI and a team that values innovation, growth, and impact.",
    image: "/assets/images/careers-hero-placeholder.jpg"
  },

  companyCulture: {
    title: "Why Work With Us?",
    subtitle: "We're building something extraordinary, and we need extraordinary people to join us.",
    values: [
      {
        icon: faRocket,
        title: "Innovation First",
        description: "Work on cutting-edge AI solutions that are transforming how industries procure materials and services.",
        color: "#3B82F6"
      },
      {
        icon: faUsers,
        title: "Collaborative Growth",
        description: "Join a team where every voice matters, ideas are celebrated, and growth is continuous.",
        color: "#10B981"
      },
      {
        icon: faLightbulb,
        title: "Impact-Driven",
        description: "See your work directly impact thousands of EPCs and contractors across India.",
        color: "#F59E0B"
      },
      {
        icon: faHeart,
        title: "People-Centric",
        description: "Flexible work culture, competitive benefits, and genuine care for your well-being.",
        color: "#EF4444"
      }
    ]
  },

  openPositions: {
    title: "Open Positions",
    subtitle: "Ready to make a difference? Check out our current openings.",
    positions: [
      {
        id: "sde1-fullstack-aws-mumbai",
        title: "SDE-1, Full Stack Developer — AWS",
        department: "Engineering",
        location: "Mumbai",
        type: "Full-time",
        experience: "1-3 years",
        description: "Own backend services and APIs in Node.js/PostgreSQL, design scalable systems, and deploy on AWS (Lambda, S3, EC2, EFS, RDS, Fargate, CloudFront, Load Balancer). Set up CI/CD and ship fast in a 0→1 environment.",
        requirements: [
          "Strong in Node.js and PostgreSQL",
          "Hands-on with AWS services and deployments",
          "Good grasp of system design; working knowledge of Next.js & Bootstrap",
          "CI/CD pipeline setup and maintenance"
        ],
        responsibilities: [
          "Design, build, and maintain backend services/APIs",
          "Define data models and optimize database performance",
          "Architect scalable services and solve performance bottlenecks",
          "Own AWS infra and CI/CD for rapid delivery"
        ],
        tags: ["Node.js", "PostgreSQL", "AWS", "Next.js", "CI/CD"]
      },
      {
        id: "sde1-bengaluru",
        title: "SDE-1",
        department: "Engineering",
        location: "Bengaluru",
        type: "Full-time",
        experience: "1-3 years",
        description: "Full stack ownership with Next.js, Node.js, PostgreSQL, and AWS. Ship fast, take risks, and lead features end‑to‑end.",
        requirements: [
          "Next.js, Node.js, PostgreSQL, AWS",
          "System design and strong problem solving",
          "High execution velocity in 0→1 setups"
        ],
        responsibilities: [
          "Develop backend services and web features",
          "Design scalable architecture and resilient systems",
          "Fix performance issues and mentor juniors"
        ],
        tags: ["Next.js", "Node.js", "PostgreSQL", "AWS", "System Design"]
      },
      {
        id: "sales-associate-mumbai",
        title: "Sales Associate",
        department: "Sales",
        location: "Mumbai",
        type: "Full-time",
        experience: "2-4 years",
        description: "Own in‑person enterprise sales across Maharashtra & Gujarat with uncapped revenue share. Build relationships, understand procurement challenges, and close clients.",
        requirements: [
          "B2B sales experience (Tier‑1 preferred)",
          "Strong client communication; Marathi preferred",
          "Understanding of procurement workflows"
        ],
        responsibilities: [
          "Field meetings, discovery, and solution pitching",
          "Build playbooks with leadership and report pipeline",
          "Hit targets and grow accounts"
        ],
        tags: ["B2B Sales", "Field Sales", "Procurement", "Enterprise"]
      },
      {
        id: "pre-sales-bengaluru",
        title: "Pre‑Sales Specialist",
        department: "Growth",
        location: "Bengaluru",
        type: "Full-time",
        experience: "1-3 years",
        description: "Own outbound research and qualification to book discovery calls. Build outreach assets and handle early inbound.",
        requirements: [
          "Lead research and qualification (BANT)",
          "Outbound via LinkedIn/Email/WhatsApp/Calls",
          "Strong copy and stakeholder engagement"
        ],
        responsibilities: [
          "Build target lists and contact decision makers",
          "Qualify and hand off to sales with full context",
          "Create templates, decks, FAQs, and log learnings"
        ],
        tags: ["Pre‑Sales", "Outbound", "Lead Gen", "B2B"]
      },
      {
        id: "founding-growth-bengaluru",
        title: "Founding Member, Product Growth",
        department: "Growth",
        location: "Bengaluru",
        type: "Full-time",
        experience: "2+ years",
        description: "Full‑stack growth role owning TOFU→BOFU across buyers and paid sellers: content, SEO, webinars, lead magnets, outbound, qualification, and onboarding.",
        requirements: [
          "2+ years in marketing, pre‑sales, or GTM",
          "Strong written copy; hands‑on with AI tools",
          "Comfortable with Canva/Figma, Sheets, scraping/automation",
          "Bias for action and switching creative↔analytical tasks"
        ],
        responsibilities: [
          "Own LinkedIn (founder + brand), SEO content, webinars/events",
          "Build forms/CTAs/landing pages; set up WhatsApp/email nurtures",
          "Run outbound across LinkedIn/WhatsApp/email/calls and qualify",
          "Support sales with collateral and product narratives"
        ],
        tags: ["Growth", "Content", "SEO", "Outbound", "Pre‑Sales"]
      },
      {
        id: "client-success-mumbai",
        title: "Client Success Associate",
        department: "Customer Success",
        location: "Mumbai",
        type: "Full-time",
        experience: "1-3 years",
        description: "Onboard suppliers, drive RFQ responses, and build long‑term relationships to maximize platform value.",
        requirements: [
          "Vendor/supplier management (oil & gas preferred)",
          "Excellent listening and phone communication",
          "Strong follow‑ups and organization"
        ],
        responsibilities: [
          "Outreach, onboarding, and education for suppliers",
          "Monitor/respond to RFQs and improve engagement",
          "Collect feedback and report performance metrics"
        ],
        tags: ["Supplier Success", "Onboarding", "RFQ", "Account Management"]
      }
    ]
  },

  benefits: {
    title: "Benefits & Perks",
    subtitle: "We take care of our people so they can focus on doing their best work.",
    categories: [
      {
        title: "Health & Wellness",
        items: [
          "Comprehensive health insurance for you and family",
          "Mental health support and counseling",
          "Fitness and wellness programs",
          "Flexible work arrangements"
        ]
      },
      {
        title: "Learning & Growth",
        items: [
          "Professional development budget",
          "Conference and training opportunities",
          "Mentorship programs",
          "Career advancement paths"
        ]
      },
      {
        title: "Work-Life Balance",
        items: [
          "Flexible working hours",
          "Remote work options",
          "Generous leave policies",
          "Family-friendly policies"
        ]
      },
      {
        title: "Team & Culture",
        items: [
          "Regular team events and offsites",
          "Collaborative work environment",
          "Recognition and rewards",
          "Inclusive and diverse culture"
        ]
      }
    ]
  },

  applicationForm: {
    title: "Apply for Open Roles",
    subtitle: "Tell us about yourself and which role interests you.",
    fields: [
      {
        name: "name",
        label: "Full Name",
        type: "text",
        required: true,
        placeholder: "Enter your full name"
      },
      {
        name: "email",
        label: "Email Address",
        type: "email",
        required: true,
        placeholder: "Enter your email address"
      },
      {
        name: "phone",
        label: "Phone Number",
        type: "text",
        required: true,
        placeholder: "Enter your phone number"
      },
      {
        name: "position",
        label: "Position Applied For",
        type: "select",
        required: true,
        options: [
          "Select a position",
          "SDE-1, Full Stack Developer — AWS (Mumbai)",
          "SDE-1 (Bengaluru)", 
          "Sales Associate (Mumbai)",
          "Pre‑Sales Specialist (Bengaluru)",
          "Founding Member, Product Growth (Bengaluru)",
          "Client Success Associate (Mumbai)",
          "Other (specify in message)"
        ]
      },
      {
        name: "experience",
        label: "Years of Experience",
        type: "select",
        required: true,
        options: [
          "Select experience level",
          "0-2 years",
          "2-5 years",
          "5-8 years",
          "8+ years"
        ]
      },
      {
        name: "resume",
        label: "Upload Resume/CV",
        type: "file",
        required: true,
        placeholder: "Choose file (PDF, DOC, DOCX)"
      },
      {
        name: "coverLetter",
        label: "Cover Letter / Why Workwise?",
        type: "textarea",
        required: false,
        placeholder: "Tell us why you'd like to join our team and what excites you about this role..."
      },
      {
        name: "portfolio",
        label: "Portfolio/Work Samples (Optional)",
        type: "textarea",
        required: false,
        placeholder: "Links to your portfolio, GitHub, or any relevant work samples..."
      }
    ]
  },

  stats: {
    title: "Workwise by the Numbers",
    items: [
      {
        number: "50+",
        label: "Team Members",
        icon: faUsers
      },
      {
        number: "100+",
        label: "EPC Clients",
        icon: faBriefcase
      },
      {
        number: "₹500Cr+",
        label: "Projects Managed",
        icon: faChartLine
      },
      {
        number: "24/7",
        label: "Support",
        icon: faClock
      }
    ]
  }
};
