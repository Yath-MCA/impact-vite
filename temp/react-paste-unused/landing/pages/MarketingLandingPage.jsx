import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  FileCheck,
  Users,
  Workflow,
  ListChecks,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { BRANDING } from '../../../config/theme';

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'features', label: 'Features' },
  { id: 'contact', label: 'Contact' }
];

const UNIQUE_POINTS = [
  'Fast review cycles with transparent, trackable updates',
  'Accurate editorial collaboration from first comment to final approval',
  'One powerful tool to complete the full review cycle and generate reviewed PDF output instantly'
];

const WE_DO_POINTS = [
  'Faster feedback cycles',
  'Simplified editing workflows',
  'Seamless collaboration'
];

const WORKFLOW_BENEFITS = [
  'Speed up approval cycles',
  'Improve collaboration',
  'Maintain publishing quality standards'
];

const FEATURE_CARDS = [
  {
    icon: MessageSquare,
    title: 'Add comments',
    description: 'Capture contextual feedback directly where changes are needed.'
  },
  {
    icon: Workflow,
    title: 'Raise queries',
    description: 'Ask authors and editors targeted questions with clear status tracking.'
  },
  {
    icon: FileCheck,
    title: 'Request changes',
    description: 'Flag revision points and monitor closure without email back-and-forth.'
  },
  {
    icon: Users,
    title: 'Collaborate in real time',
    description: 'Keep teams aligned with synchronized updates and faster decision-making.'
  },
  {
    icon: ListChecks,
    title: 'Move to next cycle automatically',
    description: 'Progress workflows smoothly as soon as each stage is complete.'
  },
  {
    icon: Sparkles,
    title: 'Instant reviewed PDF',
    description: 'Generate final reviewed PDFs for books and journals with one click.'
  }
];

export default function MarketingLandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const sectionIds = useMemo(() => NAV_ITEMS.map((item) => item.id), []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.14 }
    );

    const revealed = document.querySelectorAll('[data-reveal]');
    revealed.forEach((node) => revealObserver.observe(node));

    return () => revealObserver.disconnect();
  }, []);

  useEffect(() => {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: 0.05 }
    );

    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });

    return () => sectionObserver.disconnect();
  }, [sectionIds]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenuOpen(false);
  };

  const navButtonClass = (id) =>
    `px-2 py-1 text-sm font-semibold transition-colors ${activeSection === id ? 'text-primary-600' : 'text-gray-700 hover:text-primary-600'
    }`;

  return (
    <div className="min-h-screen bg-[#fffaf5] text-gray-900">
      <nav
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${isScrolled
          ? 'border-orange-100 bg-white/95 shadow-sm backdrop-blur-md'
          : 'border-transparent bg-transparent'
          }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button onClick={() => scrollToSection('home')} className="flex items-center" type="button" aria-label="Go to home">
            <img src={BRANDING.companyLogo} alt="IMPACT company logo" className="h-9 w-auto" />
          </button>

          <div className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={navButtonClass(item.id)}
              >
                {item.label}
              </button>
            ))}
            <Link
              to="/login"
              className="rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            >
              Login
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="rounded-md p-2 text-gray-700 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-orange-100 bg-white md:hidden">
            <div className="space-y-2 px-4 py-4">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full rounded-md px-2 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-orange-50"
                >
                  {item.label}
                </button>
              ))}
              <Link
                to="/login"
                className="mt-1 block rounded-md bg-primary-500 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main>
        <section id="home" className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-28 lg:pt-40">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-20 top-8 h-56 w-56 rounded-full bg-orange-200/40 blur-3xl" />
            <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-orange-100/70 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,155,85,0.22),_transparent_48%)]" />
          </div>

          <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div data-reveal className="reveal-on-scroll space-y-6">
              <p className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700">
                Enterprise Online Proofing Tool
              </p>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Modern review and approval workflow for publishing teams
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-gray-600">
                Worried about the review and approval process? Say good-bye to the hectic process. Newgen presents
                an online proofing tool that reduces complexity and helps teams publish with confidence.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => scrollToSection('about')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
                >
                  Explore IMPACT
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-lg border border-orange-200 bg-white px-6 py-3 font-semibold text-primary-700 transition-colors hover:border-orange-300"
                >
                  Go to Login
                </Link>
              </div>
            </div>

            <aside data-reveal className="reveal-on-scroll rounded-2xl border border-orange-100 bg-white p-6 shadow-[0_20px_50px_rgba(228,110,34,0.14)]">
              <div className="mb-5 flex items-center gap-3">
                <img src={BRANDING.productIcon} alt="IMPACT product icon" className="h-12 w-12 rounded-xl" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Product Branding</p>
                  <h2 className="text-xl font-bold text-gray-900">IMPACT</h2>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary-600" />Real-time collaboration</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary-600" />Structured editorial review cycle</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary-600" />One-click reviewed PDF output</li>
              </ul>
            </aside>
          </div>
        </section>

        <section id="about" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl" data-reveal>
            <h2 className="reveal-on-scroll mb-4 text-3xl font-bold text-primary-700">About IMPACT</h2>
            <div className="reveal-on-scroll rounded-2xl border border-orange-100 bg-white p-7 shadow-sm">
              <p className="text-lg leading-relaxed text-gray-700">
                Worried about the review and approval process? Say good-bye to the hectic process. Yes, it is time to
                drink our own champagne. Newgen presents an Online Proofing Tool to take up your burden and make you
                stress-free.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-2">
            <article data-reveal className="reveal-on-scroll rounded-2xl border border-orange-100 bg-white p-7 shadow-sm">
              <h3 className="mb-3 text-2xl font-bold text-primary-700">What is IMPACT</h3>
              <p className="leading-relaxed text-gray-700">
                The goal of our platform is to simplify and expedite collaborations. With a few steps, IMPACT
                accurately flattens the complex review and approval process and produces the final PDF with just one
                click.
              </p>
            </article>

            <article data-reveal className="reveal-on-scroll rounded-2xl border border-orange-100 bg-white p-7 shadow-sm">
              <h3 className="mb-3 text-2xl font-bold text-primary-700">Why IMPACT is Unique</h3>
              <p className="mb-4 leading-relaxed text-gray-700">
                IMPACT transforms the traditional review process by offering a fast, transparent, accurate, and
                productive method.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                {UNIQUE_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary-600" />{point}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <article data-reveal className="reveal-on-scroll rounded-2xl border border-orange-100 bg-white p-7 shadow-sm">
              <h3 className="mb-3 text-2xl font-bold text-primary-700">What We Do</h3>
              <p className="mb-4 leading-relaxed text-gray-700">
                We provide advanced editing and workflow features to save time and improve real-time collaboration
                between Authors and Editors.
              </p>
              <ul className="grid gap-3 sm:grid-cols-3">
                {WE_DO_POINTS.map((point) => (
                  <li key={point} className="rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-3 text-sm font-semibold text-gray-700">
                    {point}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                Our intuitive editing interface allows you to review and comment more easily than traditional proofing
                systems.
              </p>
            </article>

            <article data-reveal className="reveal-on-scroll rounded-2xl border border-orange-100 bg-white p-7 shadow-sm">
              <h3 className="mb-3 text-2xl font-bold text-primary-700">Workflow Benefits</h3>
              <p className="mb-4 leading-relaxed text-gray-700">
                Want to make workflow easier? Our online proofing tool provides efficient workflow management to
                simplify even complex publishing processes.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                {WORKFLOW_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary-600" />{benefit}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-8" data-reveal>
              <h3 className="reveal-on-scroll mb-2 text-3xl font-bold text-primary-700">Features</h3>
              <p className="reveal-on-scroll text-gray-700">
                No waiting. No delays. We value your time and experience, so IMPACT is fast, simple, and elegant.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURE_CARDS.map(({ icon: Icon, title, description }, index) => (
                <article
                  key={title}
                  data-reveal
                  className="reveal-on-scroll rounded-2xl border border-orange-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                  style={{ transitionDelay: `${index * 40}ms` }}
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-primary-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="mb-2 text-lg font-bold text-gray-900">{title}</h4>
                  <p className="text-sm leading-relaxed text-gray-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div data-reveal className="reveal-on-scroll mx-auto w-full max-w-7xl rounded-3xl border border-orange-200 bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-10 text-white sm:px-10">
            <h3 className="mb-3 text-3xl font-bold">Call-To-Action</h3>
            <p className="max-w-3xl text-orange-50">
              Get your reviewed PDF for books and journals instantly. Start using IMPACT to reduce friction in every
              review cycle and keep your publishing teams aligned.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 font-semibold text-primary-700 transition-colors hover:bg-orange-50"
              >
                Login to IMPACT
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="inline-flex items-center justify-center rounded-lg border border-white/50 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Review Features
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-orange-100 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-6 md:grid-cols-4">
          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-700">Product Name</h4>
            <p className="mt-2 text-lg font-bold text-gray-900">{BRANDING.productName}</p>
          </section>
          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-700">Company Name</h4>
            <p className="mt-2 text-gray-700">{BRANDING.companyName}</p>
          </section>
          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-700">Quick Links</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              <li><button type="button" onClick={() => scrollToSection('home')} className="hover:text-primary-700">Home</button></li>
              <li><button type="button" onClick={() => scrollToSection('about')} className="hover:text-primary-700">About</button></li>
              <li><button type="button" onClick={() => scrollToSection('features')} className="hover:text-primary-700">Features</button></li>
            </ul>
          </section>
          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-700">Support</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              <li><a href="mailto:impact.helpdesk@newgen.co" className="hover:text-primary-700">impact.helpdesk@newgen.co</a></li>
              <li><Link to="/login" className="hover:text-primary-700">Login</Link></li>
            </ul>
          </section>
        </div>
        <p className="mx-auto mt-8 w-full max-w-7xl border-t border-orange-100 pt-5 text-xs text-gray-500">
          Copyright {new Date().getFullYear()} {BRANDING.companyName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
