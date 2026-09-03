"use client";

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Calendar } from 'lucide-react';

export default function SocialCaption({ content, publishedAt, platform }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const ctaText = 'Need help with jobs, interviews, or career guidance in Australia? Contact 9Jobs today.';
  let mainCaption = String(content || '').trim();
  let hasCta = false;

  if (mainCaption.includes(ctaText)) {
    mainCaption = mainCaption.replace(ctaText, '').trim();
    hasCta = true;
  }

  // Define limit for truncation
  const charLimit = 220;
  const isLong = mainCaption.length > charLimit;
  
  const displayCaption = isExpanded || !isLong 
    ? mainCaption 
    : `${mainCaption.slice(0, charLimit).trim()}...`;

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    return new Intl.DateTimeFormat('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateValue));
  };

  return (
    <div className="fj-social-caption-wrapper w-full mt-6 flex flex-col gap-4">
      {/* Date & Metadata header */}
      <div className="flex items-center gap-3 text-sm text-gray-500 font-semibold border-b border-gray-100 pb-3" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
        <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full text-xs font-bold capitalize text-gray-600" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800 }}>
          <MessageSquare size={12} /> {platform === 'linkedin' ? 'LinkedIn' : 'Facebook'}
        </span>
        <span className="flex items-center gap-1.5 text-gray-400" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
          <Calendar size={13} /> {formatDate(publishedAt)}
        </span>
      </div>

      {/* Caption Text with line breaks & emojis */}
      <div 
        className="text-gray-700 leading-relaxed text-base font-normal whitespace-pre-wrap select-text"
        style={{
          color: '#334155',
          lineHeight: '1.75',
          fontSize: '1rem',
          fontWeight: 400,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          textAlign: 'justify'
        }}
      >
        {displayCaption}
      </div>

      {/* Read More button */}
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 font-bold text-sm self-start transition-colors duration-150 py-1"
          style={{
            color: '#2563eb',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: 'none',
            background: 'none',
            padding: '4px 0',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      )}

      {/* Always-Visible CTA Callout */}
      {hasCta && (
        <div 
          className="bg-[#f8faf6] border border-[#eef2e7] rounded-2xl p-5 mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
          style={{
            backgroundColor: '#f8faf6',
            border: '1px solid #eef2e7',
            borderRadius: '16px',
            padding: '20px',
            marginTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ flex: '1' }}>
            <h4 className="font-bold text-gray-900 mb-1 text-sm md:text-base" style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>Need career guidance in Australia?</h4>
            <p className="text-xs md:text-sm text-gray-600 leading-relaxed" style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: '1.5' }}>Let 9Jobs help strengthen your resume, optimize your profiles, and support your job search.</p>
          </div>
          <Link 
            href="/contact"
            className="bg-black hover:bg-gray-800 text-white text-xs md:text-sm font-extrabold px-5 py-3 rounded-xl transition-all duration-150 shrink-0 text-center shadow-md shadow-black/5"
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 800,
              padding: '10px 20px',
              borderRadius: '12px',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'inline-block',
              transition: 'background-color 150ms ease'
            }}
          >
            Contact 9Jobs
          </Link>
        </div>
      )}
    </div>
  );
}
