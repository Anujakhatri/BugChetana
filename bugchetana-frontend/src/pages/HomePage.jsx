import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bug, Zap, Flame, Users,
  ArrowRight, ShieldCheck, Database, GitPullRequest
} from 'lucide-react';
import { FeatureCard } from '@/components/shared/CoreFeatures.jsx';

// Custom SVG Icons for brands (since lucide-react removed them)
const GithubIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const LinkedinIcon = ({ className }) => (
  <svg className={className} fill="currentColor" stroke="none" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8 animate-fade-in-up">
          <ShieldCheck className="h-4 w-4" />
          <span>91% prediction accuracy</span>
        </div> */}

        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6 max-w-4xl">
          Find bugs before <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">they find you.</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed">
          BugChetana uses AI to predict, classify, and route incoming bugs directly to your Developers, QA engineers, and Release Managers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Get Started <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#features"
            className="flex items-center justify-center bg-white text-slate-700 border border-slate-300 px-8 py-3.5 rounded-lg font-medium text-lg hover:bg-slate-50 transition-colors"
          >
            See How It Works
          </a>
        </div>
      </section>

      {/* Core Features Section */}
      <section id="features" className="py-20 bg-white border-y border-slate-200 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Core Features</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Everything you need to streamline your bug tracking and resolution process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <FeatureCard
              icon={<Zap className="h-6 w-6 text-blue-500" />}
              title="AI Bug Prediction"
              description="AI classifies incoming bugs before your team even sees them."
            />
            <FeatureCard
              icon={<Flame className="h-6 w-6 text-orange-500" />}
              title="Bug Roast Mode"
              description="Get a brutally honest AI breakdown of what went wrong and why."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6 text-emerald-500" />}
              title="Role-Based Workflow"
              description="Separate views for Developers, QA engineers, and Release Managers."
            />
            <FeatureCard
              icon={<GithubIcon className="h-6 w-6 text-slate-700" />}
              title="GitHub OAuth"
              description="Sign in with GitHub, link repos, auto-import issues."
            />
          </div>

          <div className="flex justify-center mt-12">
            <Link
              to="/register"
              className="bg-slate-900 text-white px-8 py-3.5 rounded-lg font-medium text-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-slate-50 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Set up in minutes. Let AI handle the triage.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 relative">
            {/* Desktop connecting line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>

            {/* Step 1 */}
            <div className="flex-1 bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-md">
                1
              </div>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <GithubIcon className="h-6 w-6 text-slate-700" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Register & Connect</h3>
              <p className="text-slate-600">
                Sign up and seamlessly connect your GitHub repositories.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex-1 bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-md">
                2
              </div>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <GitPullRequest className="h-6 w-6 text-slate-700" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Submit or Import</h3>
              <p className="text-slate-600">
                Manually submit bugs or let bugchetana auto-import your issues.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex-1 bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-md">
                3
              </div>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <Database className="h-6 w-6 text-slate-700" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">AI Triage</h3>
              <p className="text-slate-600">
                Let AI classify, predict severity, and route bugs to the right team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Bug className="h-6 w-6 text-blue-400" />
            <span className="text-white font-bold text-lg">BugChetana</span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-slate-400 text-sm">Built by Anu</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
              <span className="sr-only">GitHub</span>
              <GithubIcon className="h-5 w-5" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
              <span className="sr-only">LinkedIn</span>
              <LinkedinIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
