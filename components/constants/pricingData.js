export const pricingData = {
  hero: {
    title: "Flexible Pricing for Every Stakeholder",
    subtitle: "Whether you're a buyer managing complex capex projects or a supplier looking to grow — Workwise has a plan that fits."
  },
  buyers: {
    title: "Built to Deliver Value First",
    message: "We follow a simple rule: If you don't gain from us, we don't gain from you.",
    features: [
      {
        title: "No upfront platform fee",
        description: "Start without any financial commitment",
        icon: "X"
      },
      {
        title: "Use for a pilot project",
        description: "Test our platform with a real procurement need",
        icon: "Beaker"
      },
      {
        title: "Pay only when you see value",
        description: "Cost savings, faster procurement, better vendors",
        icon: "DollarSign"
      }
    ],
    cta: {
      label: "Contact Us to Get Started with Your Pilot Project",
      variant: "primary",
      icon: "arrow-right"
    }
  },
  sellers: {
    title: "Choose a Plan Based on Your Ambition",
    plans: [
      {
        name: "Free",
        subtitle: "Get started at no cost",
        price: "₹0/year",
        popular: false,
        features: [
          { name: "Guaranteed Enquiries", included: false, value: null },
          { name: "Search Positioning", included: true, value: "Standard" },
          { name: "Deviation Checker", included: false, value: null },
          { name: "Auto Response Tools", included: false, value: null },
          { name: "Verified Supplier Tag", included: false, value: null },
          { name: "Access to Verified Buyers", included: false, value: null },
          { name: "Analytics & Reporting", included: true, value: "Limited", note: true },
          { name: "Buyer Interaction Tools", included: true, value: "Limited" },
          { name: "Workwise Support", included: true, value: "Email" }
        ],
        cta: {
          label: "Start for Free",
          variant: "dark"
        }
      },
      {
        name: "Silver",
        subtitle: "For growing suppliers",
        price: "₹30,000/year",
        popular: false,
        features: [
          { name: "Guaranteed Enquiries", included: true, value: "5/year" },
          { name: "Search Positioning", included: true, value: "Boosted" },
          { name: "Deviation Checker", included: false, value: null },
          { name: "Auto Response Tools", included: false, value: null },
          { name: "Verified Supplier Tag", included: true, value: null },
          { name: "Access to Verified Buyers", included: false, value: null },
          { name: "Analytics & Reporting", included: true, value: "Basic" },
          { name: "Buyer Interaction Tools", included: true, value: "Standard" },
          { name: "Workwise Support", included: true, value: "Call/WhatsApp/Email" }
        ],
        cta: {
          label: "Upgrade to Silver",
          variant: "warning"
        }
      },
      {
        name: "Gold",
        subtitle: "For ambitious suppliers",
        price: "₹50,000/year",
        popular: true,
        features: [
          { name: "Guaranteed Enquiries", included: true, value: "15/year" },
          { name: "Search Positioning", included: true, value: "Highest Visibility" },
          { name: "Deviation Checker", included: true, value: null },
          { name: "Auto Response Tools", included: true, value: null },
          { name: "Verified Supplier Tag", included: true, value: null },
          { name: "Access to Verified Buyers", included: true, value: null },
          { name: "Analytics & Reporting", included: true, value: "Advanced" },
          { name: "Buyer Interaction Tools", included: true, value: "Priority" },
          { name: "Workwise Support", included: true, value: "Call/WhatsApp/Email" }
        ],
        cta: {
          label: "Get Gold Access",
          variant: "dark"
        }
      }
    ],
    allPlansInclude: [
      "Unlimited profile visibility",
      "Access to buyer RFQs (where relevant)",
      "Dedicated onboarding support"
    ],
    whyUpgrade: {
      title: "Why Upgrade?",
      features: [
        { title: "Stand out from the crowd", description: "Get featured above competitors in search results", icon: "Award" },
        { title: "Be discovered faster", description: "Get found by verified buyers", icon: "Search" },
        { title: "AI-powered tools", description: "Respond instantly to inquiries and RFQs", icon: "Cpu" },
        { title: "Priority RFQ access", description: "Get first access to high-value opportunities", icon: "Zap" }
      ]
    },
    faq: [
      {
        question: "What if I don't receive the guaranteed enquiries?",
        answer: "We ensure minimum outreach — or refund the balance."
      },
      {
        question: "Can I upgrade from Silver to Gold later?",
        answer: "Yes, anytime during your subscription year."
      },
      {
        question: "Are payments refundable?",
        answer: "Pro-rata refunds for unused enquiry quota (conditions apply)."
      }
    ]
  }
}; 