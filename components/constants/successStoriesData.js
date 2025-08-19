// Success Stories Data
export const successStoriesData = {
  // Hero Section Data
  hero: {
    title: "Real Results from Companies Like Yours",
    subtitle: "See how EPCs, Consultants, Clients, and Vendors use Workwise to cut time, reduce cost, and simplify procurement.",
    ctaButton: {
      text: "Talk to us about your project",
      subtext: "→ Book a Call"
    }
  },

  // Filter Options
  filters: {
    stakeholderType: {
      label: "Stakeholder Type",
      options: [
        'All Types',
        'EPC/Contractor',
        'Consultant', 
        'Industrial Client',
        'Vendor / OEM'
      ]
    },
    projectValueRange: {
      label: "Project Value Range",
      options: [
        'All Ranges',
        '₹1-10 Cr',
        '₹10-50 Cr',
        '₹50-100 Cr',
        '₹100-500 Cr',
        '₹500-1000 Cr',
        '₹1000-2000 Cr'
      ]
    }
  },

  // Load More Button
  loadMoreButton: {
    text: "Load More Stories"
  },

  // CTA Section
  cta: {
    title: "Ready to achieve similar results?",
    primaryButton: {
      label: "Book a Call",
      variant: "white",
      icon: "phone"
    },
    secondaryButton: {
      label: "View More Stories",
      variant: "outline",
      icon: "none"
    }
  },

  // Stories Data
  stories: [
    {
      id: 1,
      industry: "Power EPC",
      achievement: "Saved ₹9.4L on electrical procurement using reverse auction",
      stakeholderType: "EPC Contractor",
      location: "Maharashtra",
      icon: "zap",
      projectValueRange: "₹50L - ₹1Cr",
      challenge: "Procurement for HT panels and cables lacked competitive vendor participation, leading to inflated quotes.",
      solution: "Used Workwise reverse auction and BOQ normalization to get vendors to compete on a level field.",
      outcome: "Saved ₹9.4L on final procurement while maintaining technical requirements and delivery commitments.",
      testimonial: "Reverse auction gave us pricing we thought was impossible - ₹9.4L saved without a single compromise."
    },
    {
      id: 2,
      industry: "Steel Manufacturing",
      achievement: "Reduced vendor discovery time by 15 days for critical equipment",
      stakeholderType: "Industrial Client",
      location: "Gujarat",
      icon: "building",
      projectValueRange: "Above ₹1Cr",
      challenge: "Finding specialized equipment vendors for rolling mill components was taking weeks with limited industry connections.",
      solution: "Leveraged Workwise's extensive vendor network and industry-specific search filters to identify qualified suppliers quickly.",
      outcome: "Reduced vendor discovery time by 15 days, connected with 8 specialized suppliers, improved equipment quality by 25%.",
      testimonial: "Workwise opened up a whole new network of reliable vendors we never knew existed."
    },
    {
      id: 3,
      industry: "Infrastructure",
      achievement: "Streamlined BOQ process, saved 8 days on project planning",
      stakeholderType: "Consultant",
      location: "Delhi NCR",
      icon: "wrench",
      projectValueRange: "₹10L - ₹50L",
      challenge: "BOQs for multi-disciplinary infrastructure projects were fragmented, leading to weeks of coordination between teams and vendors.",
      solution: "Implemented Workwise's BOQ simplifier and structured dashboards - BOQs were consolidated and transformed into categorized packages in minutes.",
      outcome: "Reduced BOQ prep time by 8 days, enabling faster RFQ generation and vendor discussions, improving timeline predictability.",
      testimonial: "Workwise turned a week-long BOQ nightmare into a 30-minute process - our planning cycle is now ahead, not behind."
    },
    {
      id: 4,
      industry: "Petrochemical",
      achievement: "Increased vendor response rate by 40% through platform reach",
      stakeholderType: "Vendor/OEM",
      location: "Mumbai",
      icon: "settings",
      projectValueRange: "Above ₹1Cr",
      challenge: "Despite a strong product offering, the OEM struggled with low enquiry responses due to limited buyer networks.",
      solution: "Leveraged Workwise's vendor discovery engine to connect the supplier with 30+ pre-qualified buyers across chemical and petrochemical sectors.",
      outcome: "Response rate increased by 40%, securing competitive RFQs from tier-1 buyers and new business conversions.",
      testimonial: "Workwise expanded our buyer field overnight and raised our response rate by 40% - business growth we never expected this fast."
    },
    {
      id: 5,
      industry: "Water Treatment",
      achievement: "Cut procurement cycle by 12 days with automated workflows",
      stakeholderType: "EPC Contractor",
      location: "Karnataka",
      icon: "waves",
      projectValueRange: "₹50L - ₹1Cr",
      challenge: "Manual processing of RFQs, quote consolidation, and PO issuance slowed down project mobilization significantly.",
      solution: "Introduced Workwise RFQ automation and quote tracking tools - sending RFQs, tracking vendor replies, and generating POs happened in one unified system.",
      outcome: "Procurement cycle shortened by 12 days - from BOQ upload to vendor approval - accelerating project kickoff.",
      testimonial: "From weeks to days - Workwise shaved 12 days off our procurement cycle and got construction moving faster than ever."
    },
    {
      id: 6,
      industry: "Commercial Construction",
      achievement: "Achieved 18% cost reduction on HVAC procurement",
      stakeholderType: "Industrial Client",
      location: "Pune",
      icon: "building",
      projectValueRange: "₹10L - ₹50L",
      challenge: "HVAC system procurement faced rising vendor costs and limited quotes, leading to budget overruns.",
      solution: "Ran a reverse auction through Workwise for HVAC packages - multiple vendors bid competitively in real time.",
      outcome: "Obtained final vendor pricing that was 18% below traditional tender estimates, while maintaining quality standards.",
      testimonial: "Workwise's auction dropped our HVAC procurement cost by 18% - without compromising on specs. Truly game changing."
    },
    {
      id: 7,
      industry: "Oil & Gas",
      achievement: "Reduced procurement time by 60% through digital workflows",
      stakeholderType: "EPC Contractor",
      location: "Gujarat",
      icon: "zap",
      projectValueRange: "Above ₹1Cr",
      challenge: "Procurement across mechanical and instrumentation packages involved email threads, manual Excel comparison, and vendor misalignment.",
      solution: "Used Workwise to automate BOQ-to-RFQ flow, centralize vendor communication, and enable AI-powered technical evaluation.",
      outcome: "End-to-end procurement timeline reduced by 60%, with structured vendor comparison and faster technical approvals.",
      testimonial: "What used to take weeks is now happening in days - Workwise has digitized our entire procurement stack."
    },
    {
      id: 8,
      industry: "Pharmaceutical",
      achievement: "Saved ₹12L on laboratory equipment procurement",
      stakeholderType: "Industrial Client",
      location: "Maharashtra",
      icon: "settings",
      projectValueRange: "₹50L - ₹1Cr",
      challenge: "The client struggled with price transparency and spec mismatches during procurement of advanced laboratory equipment.",
      solution: "Ran a reverse auction through Workwise, backed by AI-based technical deviation checker for spec alignment.",
      outcome: "Finalized a compliant vendor at ₹12L lower cost compared to previous benchmarks.",
      testimonial: "Workwise brought both clarity and competition - ₹12L saved with zero compromise on specs."
    },
    {
      id: 9,
      industry: "Renewable Energy",
      achievement: "Streamlined vendor onboarding, reduced time by 20 days",
      stakeholderType: "Consultant",
      location: "Rajasthan",
      icon: "zap",
      projectValueRange: "₹10L - ₹50L",
      challenge: "For a 50 MW solar park, onboarding new, approved vendors took over a month due to due diligence bottlenecks.",
      solution: "Used Workwise's verified vendor pool + support team to identify, onboard, and finalize qualified vendors.",
      outcome: "Vendor onboarding time reduced by 20 days, enabling faster procurement closure and project mobilization.",
      testimonial: "We saved 3 weeks just on vendor onboarding. That alone made Workwise a no-brainer for our project."
    },
    {
      id: 10,
      industry: "Automotive",
      achievement: "Increased supplier diversity by 35% through platform",
      stakeholderType: "Vendor/OEM",
      location: "Tamil Nadu",
      icon: "building",
      projectValueRange: "Above ₹1Cr",
      challenge: "The OEM was dependent on a narrow vendor base for parts, limiting flexibility and raising risk.",
      solution: "Leveraged Workwise's discovery engine to connect with alternate suppliers in northern and eastern India.",
      outcome: "Supplier diversity improved by 35%, enabling better pricing and delivery assurance.",
      testimonial: "We found quality vendors outside our usual reach - Workwise expanded our base and boosted our resilience."
    },
    {
      id: 11,
      industry: "Mining",
      achievement: "Reduced equipment procurement cost by 22%",
      stakeholderType: "EPC Contractor",
      location: "Odisha",
      icon: "wrench",
      projectValueRange: "₹50L - ₹1Cr",
      challenge: "For a mining infrastructure project, equipment costs were overshooting by 20-25% due to poor vendor response and non-transparent pricing.",
      solution: "Ran reverse auctions for bulk equipment + enabled structured comparison with normalization.",
      outcome: "Equipment finalization at 22% lower cost than original quotations, with high-quality vendor shortlist.",
      testimonial: "22% cost saved. One platform managed our discovery, negotiation, and technical alignment - brilliant."
    },
    {
      id: 12,
      industry: "Food Processing",
      achievement: "Cut procurement cycle time by 45% with automation",
      stakeholderType: "Industrial Client",
      location: "Punjab",
      icon: "settings",
      projectValueRange: "₹10L - ₹50L",
      challenge: "Manual procurement processes for food processing equipment were causing significant delays in project timelines.",
      solution: "Implemented Workwise automation tools to streamline the entire procurement workflow from RFQ to PO generation.",
      outcome: "Procurement cycle time reduced by 45%, enabling faster project implementation and reduced operational overhead.",
      testimonial: "Workwise automation cut our procurement time nearly in half - we can focus on what matters most now."
    }
  ]
}; 