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
        id: "senior-frontend",
        title: "Senior Frontend Developer",
        department: "Engineering",
        location: "Mumbai, Hybrid",
        type: "Full-time",
        experience: "3-6 years",
        salary: "₹15-25 LPA",
        description: "Build intuitive, responsive interfaces that make complex procurement workflows simple and elegant.",
        requirements: [
          "Strong expertise in React.js, Next.js, and modern JavaScript",
          "Experience with responsive design and mobile-first development",
          "Knowledge of state management (Redux, Context API)",
          "Understanding of UI/UX principles and accessibility",
          "Experience with testing frameworks (Jest, React Testing Library)"
        ],
        responsibilities: [
          "Develop and maintain high-quality, scalable frontend applications",
          "Collaborate with design and product teams to implement user interfaces",
          "Optimize applications for maximum speed and scalability",
          "Mentor junior developers and contribute to technical decisions"
        ],
        tags: ["React", "Next.js", "TypeScript", "UI/UX", "Frontend"]
      },
      {
        id: "product-manager",
        title: "Product Manager",
        department: "Product",
        location: "Mumbai, Hybrid",
        type: "Full-time",
        experience: "2-5 years",
        salary: "₹12-20 LPA",
        description: "Drive product strategy and execution for our AI-powered procurement platform.",
        requirements: [
          "Experience in B2B SaaS or enterprise software products",
          "Strong analytical and problem-solving skills",
          "Experience with user research and data analysis",
          "Excellent communication and stakeholder management skills",
          "Understanding of procurement or industrial processes (bonus)"
        ],
        responsibilities: [
          "Define product vision, strategy, and roadmap",
          "Gather and analyze user feedback and market insights",
          "Work closely with engineering and design teams",
          "Drive product launches and go-to-market strategies"
        ],
        tags: ["Product Strategy", "B2B SaaS", "User Research", "Analytics"]
      },
      {
        id: "ai-engineer",
        title: "AI/ML Engineer",
        department: "Engineering",
        location: "Mumbai, Hybrid",
        type: "Full-time",
        experience: "2-5 years",
        salary: "₹18-30 LPA",
        description: "Build intelligent systems that automate and optimize procurement processes.",
        requirements: [
          "Strong background in machine learning and data science",
          "Experience with Python, TensorFlow/PyTorch, and NLP",
          "Knowledge of document processing and OCR technologies",
          "Experience with cloud platforms (AWS, GCP)",
          "Understanding of procurement domain (bonus)"
        ],
        responsibilities: [
          "Develop and deploy ML models for document processing",
          "Optimize AI algorithms for performance and accuracy",
          "Collaborate with product teams to understand requirements",
          "Stay updated with latest AI/ML research and technologies"
        ],
        tags: ["Machine Learning", "Python", "NLP", "AI", "Cloud"]
      },
      {
        id: "sales-executive",
        title: "Enterprise Sales Executive",
        department: "Sales",
        location: "Mumbai, Hybrid",
        type: "Full-time",
        experience: "3-7 years",
        salary: "₹8-15 LPA + Commission",
        description: "Drive revenue growth by acquiring enterprise clients and building long-term relationships.",
        requirements: [
          "Proven track record in B2B enterprise sales",
          "Experience in SaaS or technology sales",
          "Strong networking and relationship-building skills",
          "Understanding of procurement or industrial sector",
          "Excellent presentation and negotiation skills"
        ],
        responsibilities: [
          "Identify and qualify enterprise prospects",
          "Conduct product demonstrations and presentations",
          "Negotiate contracts and close deals",
          "Build and maintain client relationships"
        ],
        tags: ["B2B Sales", "Enterprise", "SaaS", "Procurement"]
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
          "Senior Frontend Developer",
          "Product Manager", 
          "AI/ML Engineer",
          "Enterprise Sales Executive",
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
