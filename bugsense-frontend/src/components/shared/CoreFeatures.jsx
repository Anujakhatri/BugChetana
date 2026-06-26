import React from 'react';
import { Link } from 'react-router-dom';

export function FeatureCard({ icon, title, description, badgeText, href }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative flex flex-col h-full group">
      {badgeText && (
        <span className="absolute top-4 right-4 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-100">
          {badgeText}
        </span>
      )}
      
      <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 mb-6 flex-grow leading-relaxed">
        {description}
      </p>
      
      {href && (
        <div className="mt-auto pt-4 border-t border-slate-100">
          {href.startsWith('/') ? (
            <Link to={href} className="text-blue-600 font-medium text-sm hover:text-blue-700 inline-flex items-center">
              Learn more <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          ) : (
            <a href={href} className="text-blue-600 font-medium text-sm hover:text-blue-700 inline-flex items-center">
              Learn more <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
