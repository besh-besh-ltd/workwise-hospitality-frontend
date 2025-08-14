import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { HeroSection } from '@/components/ui/HeroSection';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { DynamicCard } from '@/components/ui/DynamicCard';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { CtaSection } from '@/components/ui/CtaSection';
import { Button } from '@/components/ui/Button';
import { stakeholdersPageData } from '@/components/constants/stakeholderPageData';
import { FileText, Users, Briefcase, Calculator, Shield, Clock, Lock } from 'lucide-react';
import { TestimonialCard } from '@/components/ui/TestimonialCard';

const iconMap = {
  file: FileText,
  users: Users,
  briefcase: Briefcase,
  calculator: Calculator,
  shield: Shield,
  clock: Clock,
  lock: Lock,
};

const ComparisonTable = ({ rows }) => (
  <div className="table-responsive">
    <table className="table align-middle">
      <thead>
        <tr>
          <th className="text-muted small">Procurement Activity</th>
          <th className="text-muted small">Without Workwise</th>
          <th className="text-muted small">With Workwise</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={idx}>
            <td className="fw-medium text-dark small">{r.activity}</td>
            <td className="text-danger small">{r.without}</td>
            <td className="text-success small">{r.with}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StakeholderPage = () => {
  const router = useRouter();
  const { stakeholder } = router.query;
  const key = typeof stakeholder === 'string' ? stakeholder.toLowerCase() : 'epcs';
  useEffect(() => {
    if (!router.isReady) return;
    const slug = typeof stakeholder === 'string' ? stakeholder.toLowerCase() : '';
    const vendorAliases = ['vendors', 'vendor', 'oems', 'oem', 'vendors-oems', 'vendors-and-oems', 'suppliers', 'supplier'];
    if (vendorAliases.includes(slug)) {
      router.replace('/for-vendors');
    }
  }, [router, router.isReady, stakeholder]);
  const data = stakeholdersPageData[key] || stakeholdersPageData['epcs'];

  const AnimatedCounter = ({ targetValue, suffix = '', duration = 1500 }) => {
    const [value, setValue] = React.useState(0);
    const ref = React.useRef(null);
    const hasAnimated = React.useRef(false);
    React.useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            const start = performance.now();
            const animate = (now) => {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.floor(eased * targetValue));
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          }
        });
      }, { threshold: 0.4 });
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, [targetValue, duration]);
    return (
      <div ref={ref} className="fw-bold" style={{ fontSize: '1.75rem' }}>
        {value.toLocaleString()}<span>{suffix}</span>
      </div>
    );
  };

  return (
    <>
      {/* Hero */}
      <HeroSection
        title={data.hero.title}
        subtitle={data.hero.subtitle}
        layout="centered"
        size="medium"
        textAlign="left"
        primaryButton={{ label: data.hero.buttonLabel, variant: 'black' }}
        showVisual={false}
      />

      {/* Benefits */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-4">
            <h2 className="h4 fw-bold text-dark">Benefits</h2>
          </div>
          <div className="row g-4">
            {data.benefits.map((b, idx) => (
              <div key={idx} className="col-md-4">
                <FeatureCard
                  title={b.title}
                  description={b.description}
                  icon={iconMap[b.icon]}
                  iconBgColor="bg-primary"
                  iconColor="text-white"
                  className="h-100 shadow-sm"
                />
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <Button className="w-auto" variant="primary">Book a Call</Button>
          </div>
        </div>
      </section>

      {/* Trusted + Success Stories */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="row text-center mb-4 g-3 justify-content-center">
            {data.trust.counters.map((c, idx) => (
              <div key={idx} className="col-6 col-md-3">
                <div className="p-4 bg-white rounded shadow-sm h-100">
                  <div className="text-primary mb-1"><AnimatedCounter targetValue={parseInt((c.value||'').replace(/[^0-9]/g,''))} suffix={(c.value||'').replace(/[0-9]/g,'')} /></div>
                  <div className="text-muted small">{c.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="row g-4 mb-3">
            {data.trust.success.map((s, idx) => (
              <div key={idx} className="col-md-4">
                <TestimonialCard quote={s.quote} authorName={s.author} className="h-100 shadow-sm" />
              </div>
            ))}
          </div>
          <div className="text-center mt-2">
            <Button className="w-auto" variant="secondary">Let’s Talk</Button>
          </div>
        </div>
      </section>

      {/* Functionalities */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-4">
            <h2 className="h4 fw-bold text-dark">Functionalities That Matter</h2>
          </div>
          <div className="row g-4">
            {data.features.map((f, idx) => (
              <div key={idx} className="col-md-4">
                <FeatureCard title={f.title} description={f.description} />
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <Button className="w-auto" variant="primary">See It in Action</Button>
          </div>
        </div>
      </section>

      {/* Industries & Disciplines */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-6">
              <div className="bg-white rounded shadow-sm p-4 h-100">
                <h5 className="fw-bold text-dark mb-3">Industries</h5>
                <ul className="list-unstyled mb-0 small text-muted">
                  {data.industries.map((i) => (<li key={i} className="mb-2">{i}</li>))}
                </ul>
              </div>
            </div>
            <div className="col-md-6">
              <div className="bg-white rounded shadow-sm p-4 h-100">
                <h5 className="fw-bold text-dark mb-3">Disciplines</h5>
                <ul className="list-unstyled mb-0 small text-muted">
                  {data.disciplines.map((d) => (<li key={d} className="mb-2">{d}</li>))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video CTA placeholder (embed to be added) */}
      <section className="py-5">
        <div className="container text-center">
          <h2 className="h4 fw-bold text-dark mb-2">{data.video.title}</h2>
          <p className="text-muted">{data.video.subtitle}</p>
          <div className="ratio ratio-16x9 rounded-3 overflow-hidden shadow-sm">
            <iframe
              src={data.video.url}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className="mt-3">
            <Button className="w-auto" variant="secondary">Book a Demo</Button>
          </div>
        </div>
      </section>

      {/* With vs Without - reuse homepage pattern: two-column rows */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-3">
            <h2 className="h5 fw-bold text-dark">With Workwise vs Without Workwise</h2>
          </div>
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="table-responsive d-none d-lg-block">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th className="bg-dark text-white fw-bold px-4 py-3" style={{ width: '30%' }}>Procurement Activity</th>
                    <th className="bg-danger text-white fw-bold text-center px-4 py-3" style={{ width: '35%' }}>Without Workwise</th>
                    <th className="bg-success text-white fw-bold text-center px-4 py-3" style={{ width: '35%' }}>With Workwise</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comparison.map((r, i) => (
                    <tr key={i} className={i % 2 === 1 ? '' : ''}>
                      <td className="px-4 py-3 fw-medium text-dark">{r.activity}</td>
                      <td className="px-4 py-3 text-danger">{r.without}</td>
                      <td className="px-4 py-3 text-success">{r.with}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile stacked */}
            <div className="d-lg-none p-3">
              {data.comparison.map((r, i) => (
                <div key={i} className="card border-0 shadow-sm mb-3" style={{ background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : '#fff' }}>
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center mb-2">
                      <h6 className="fw-bold text-dark mb-0">{r.activity}</h6>
                    </div>
                    <div className="d-flex flex-column g-2">
                      <div className="d-flex align-items-center mb-2">
                        <small className="text-danger fw-bold me-2">Without:</small>
                        <span className="text-danger" style={{ fontSize: '0.9rem' }}>{r.without}</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <small className="text-success fw-bold me-2">With:</small>
                        <span className="text-success" style={{ fontSize: '0.9rem' }}>{r.with}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-3">
            <Button className="w-auto" variant="primary">Book a Call</Button>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-4">
            <h2 className="h5 fw-bold text-dark">Frequently Asked Questions</h2>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <FaqAccordion questions={data.faqs} />
            </div>
          </div>
          <div className="text-center mt-4">
            <Button className="w-auto" variant="secondary">Let’s Talk</Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <CtaSection
        title={data.hero.title}
        description={data.hero.subtitle}
        primaryButton={{ label: data.hero.buttonLabel, variant: 'white' }}
        className="mt-0"
      />
    </>
  );
};

export default StakeholderPage;


