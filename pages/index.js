import LandingPage from "@/components/landing/LandingPage";

/**
 * The public landing page — the real hospitality site, carried across whole.
 *
 * Deliberately NOT gated: an IHG stakeholder opening the link should meet the
 * product's own front door, then choose to sign in. The persona picker lives
 * at /login, and the session gate starts at /dashboard.
 */
export default function Home() {
  return <LandingPage />;
}
