export const eventsData = {
  hero: {
    title: "Join Us at India's Leading Industry Events",
    subtitle: "We regularly participate in exhibitions and conferences - as exhibitors, sponsors, speakers, and delegates. Browse our upcoming and past events, and register your interest to meet us there."
  },
  filters: {
    eventType: {
      label: "All Events",
      options: ["All Events", "Exhibitions", "Conferences", "Trade Shows", "Seminars"]
    },
    location: {
      label: "All Locations",
      options: ["All Locations", "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune"]
    },
    participationType: {
      label: "All Participation Type",
      options: ["All Participation Type", "Exhibitor", "Sponsor", "Speaker", "Delegate"]
    }
  },
  events: [
    {
      id: 1,
      name: "India Industrial Expo 2023",
      date: "15-17 Dec 2023",
      location: "Mumbai",
      venue: "Mumbai Exhibition Centre",
      role: "Exhibitor",
      participationTypes: ["Exhibitor", "Sponsor"],
      description: "Join us at India's largest industrial procurement exhibition. Visit our booth #A42 to discover our latest procurement solutions.",
      status: "Upcoming",
      image: "/assets/images/placeholder.jpeg"
    },
    {
      id: 2,
      name: "Supply Chain Summit 2024",
      date: "22-24 Jan 2024",
      location: "Bangalore",
      venue: "Bangalore Convention Centre",
      role: "Speaker",
      participationTypes: ["Speaker"],
      description: "Our CEO will deliver a keynote on 'Digital Transformation in Procurement' on Day 2 at 11:00 AM.",
      status: "Upcoming",
      image: "/assets/images/placeholder.jpeg"
    },
    {
      id: 3,
      name: "Manufacturing Tech Expo",
      date: "8-10 Feb 2024",
      location: "Delhi",
      venue: "Delhi Trade Centre",
      role: "Exhibitor",
      participationTypes: ["Exhibitor"],
      description: "Explore our latest procurement platform features at booth #C15. Schedule a personalized demo with our team.",
      status: "Upcoming",
      image: "/assets/images/placeholder.jpeg"
    },
    {
      id: 4,
      name: "Procurement Leaders Forum",
      date: "15-17 Nov 2023",
      location: "Chennai",
      venue: "Chennai Trade Centre",
      role: "Speaker",
      participationTypes: ["Speaker", "Sponsor"],
      description: "Our CTO presented on 'AI in Procurement' and we showcased our platform at the innovation booth.",
      status: "Past",
      image: "/assets/images/placeholder.jpeg"
    },
    {
      id: 5,
      name: "India Supply Chain Expo",
      date: "5-7 Oct 2023",
      location: "Hyderabad",
      venue: "HITEX Exhibition Centre",
      role: "Exhibitor",
      participationTypes: ["Exhibitor"],
      description: "We demonstrated our platform's capabilities for streamlining industrial procurement processes.",
      status: "Past",
      image: "/assets/images/placeholder.jpeg"
    },
    {
      id: 6,
      name: "Digital Procurement Summit",
      date: "20-22 Sep 2023",
      location: "Pune",
      venue: "Pune International Exhibition Centre",
      role: "Sponsor",
      participationTypes: ["Sponsor", "Delegate"],
      description: "We sponsored the networking lunch and participated in panel discussions on digital transformation.",
      status: "Past",
      image: "/assets/images/placeholder.jpeg"
    }
  ],
  finalCta: {
    title: "Want to Meet Us at an Event Near You?",
    subtitle: "Stay updated on our upcoming events, receive exclusive invitations, and get notified when we're exhibiting in your city.",
    button: {
      label: "Get Event Updates by Email",
      variant: "white",
      icon: "none"
    }
  }
}; 