/**
 * FeedbackSection.jsx
 * Premium feedback section matching the Coral Reef Dashboard design system.
 * Sits immediately before the Footer.
 *
 * Features:
 *  - 5-emoji sentiment selector (animated, single-select)
 *  - Name / Email / Message fields with live validation
 *  - 0/500 live character counter with textarea autoresize
 *  - Submit locked until: emoji + name + valid email + message
 *  - Background IP + city-level location fetch (non-blocking)
 *  - Supabase INSERT to `feedback` table
 *  - Success animation replacing the form
 *  - Error state with recovery
 *  - Full loading / duplicate-submit guard
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ── Sentiment config ─────────────────────────────────────────────────────────
const SENTIMENTS = [
  { rating: 5, label: 'Excellent', color: '#2ecc71' },
  { rating: 4, label: 'Good',      color: '#00b4d8' },
  { rating: 3, label: 'Neutral',   color: '#f39c12' },
  { rating: 2, label: 'Poor',      color: '#e67e22' },
  { rating: 1, label: 'Bad',       color: '#e74c3c' },
];

// ── B&W SVG face icons (currentColor = inherits from button's color prop) ────
const FaceSVG = {
  5: ( // Excellent — wide beam smile, squint-happy eyes
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="14" />
      <path d="M9 12 Q11 10 13 12" />
      <path d="M19 12 Q21 10 23 12" />
      <path d="M8 18 Q16 27 24 18" />
    </svg>
  ),
  4: ( // Good — smile, open eyes
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="14" />
      <circle cx="11" cy="13" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="21" cy="13" r="1.8" fill="currentColor" stroke="none" />
      <path d="M10 19.5 Q16 25 22 19.5" />
    </svg>
  ),
  3: ( // Neutral — flat mouth, open eyes
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="14" />
      <circle cx="11" cy="13" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="21" cy="13" r="1.8" fill="currentColor" stroke="none" />
      <line x1="11" y1="21" x2="21" y2="21" />
    </svg>
  ),
  2: ( // Poor — slight frown
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="14" />
      <circle cx="11" cy="13" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="21" cy="13" r="1.8" fill="currentColor" stroke="none" />
      <path d="M10 22 Q16 17.5 22 22" />
    </svg>
  ),
  1: ( // Bad — strong frown, sad brows
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="14" />
      <path d="M9 11 Q11 9.5 13 11.5" />
      <path d="M19 11.5 Q21 9.5 23 11" />
      <circle cx="11" cy="14" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="21" cy="14" r="1.8" fill="currentColor" stroke="none" />
      <path d="M10 23 Q16 18 22 23" />
    </svg>
  ),
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MSG  = 500;

// ── Fetch IP + location (background, non-blocking) ──────────────────────────
async function fetchMeta() {
  // Step 1 — ipapi.co (IP + location in one free call)
  try {
    const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const d = await r.json();
      if (d.ip) {
        return {
          ip:       d.ip,
          location: [d.city, d.region, d.country_name].filter(Boolean).join(', ') || 'Unknown',
        };
      }
    }
  } catch { /* silent */ }

  // Step 2 — ipgeolocation.io (uses existing VITE_IPGEO_KEY if configured)
  const geoKey = import.meta.env.VITE_IPGEO_KEY;
  if (geoKey) {
    try {
      const r = await fetch(
        `https://api.ipgeolocation.io/v3/ipgeo?apiKey=${geoKey}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (r.ok) {
        const d = await r.json();
        return {
          ip:       d.ip       || 'unknown',
          location: [d.city, d.state_prov, d.country_name].filter(Boolean).join(', ') || 'Unknown',
        };
      }
    } catch { /* silent */ }
  }

  return { ip: 'unknown', location: 'Unknown' };
}

// ── Shared input style builder ───────────────────────────────────────────────
const inputBase = {
  width:       '100%',
  boxSizing:   'border-box',
  padding:     '11px 14px',
  borderRadius: 10,
  background:  'var(--d3)',
  border:      '1px solid var(--bd)',
  color:       'var(--tx1)',
  fontSize:    15,
  fontFamily:  'var(--font-body)',
  outline:     'none',
  transition:  'border-color 0.18s ease, box-shadow 0.18s ease',
};

function Field({ id, label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={id}
        style={{
          display:    'block',
          fontSize:   12,
          fontWeight: 600,
          color:      'var(--tx2)',
          marginBottom: 6,
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.3px',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function FeedbackSection() {
  const [rating,     setRating]     = useState(null);
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [message,    setMessage]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const textareaRef = useRef(null);
  const metaRef     = useRef(null);   // { ip, location } prefetched silently

  // Prefetch location in background so it's ready by submit time
  useEffect(() => {
    fetchMeta().then(m => { metaRef.current = m; });
  }, []);

  // Textarea autoresize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [message]);

  const isValid =
    rating !== null &&
    name.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    message.trim().length > 0;

  // ── Focus/blur handlers for field glow ──────────────────────────────────
  const onFocus = e => {
    e.target.style.borderColor = '#00b4d8';
    e.target.style.boxShadow   = '0 0 0 3px rgba(0,180,216,0.12)';
  };
  const onBlur = e => {
    e.target.style.borderColor = 'var(--bd)';
    e.target.style.boxShadow   = 'none';
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async e => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      if (!supabase) throw new Error('Supabase client not configured — check env vars.');

      const meta = metaRef.current || { ip: 'unknown', location: 'Unknown' };

      const { error: sbErr } = await supabase.from('feedback').insert([{
        ip:       meta.ip,
        location: meta.location,
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        rating,
        message:  message.trim(),
      }]);

      if (sbErr) throw sbErr;
      setDone(true);
    } catch (err) {
      console.error('[Feedback]', err);
      const detail = err?.message || err?.error_description || JSON.stringify(err);
      setError(`Submission failed: ${detail}`);
    } finally {
      setSubmitting(false);
    }
  }, [isValid, submitting, rating, name, email, message]);

  // ── Success state ────────────────────────────────────────────────────────
  if (done) {
    return (
      <section style={{ padding: '0 0 32px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           14,
          padding:       '36px 48px',
          background:    'var(--d2)',
          borderRadius:  16,
          border:        '1px solid rgba(0,180,216,0.3)',
          boxShadow:     '0 0 40px rgba(0,180,216,0.10)',
          animation:     'chart-fade-in 0.55s cubic-bezier(0.16,1,0.3,1) forwards',
          fontFamily:    'var(--font-body)',
          textAlign:     'center',
        }}>
          <span style={{ fontSize: 40 }}>🪸</span>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700,
                      color: 'var(--tx1)', fontFamily: 'var(--font-heading)' }}>
            Thank you for helping protect our reefs.
          </p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--tx2)' }}>
            Your feedback has been recorded and will shape future updates.
          </p>
        </div>
      </section>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <section style={{ padding: '0 0 32px' }}>

      {/* ── Section header ── */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>

        {/* Badge */}
        <div style={{ marginBottom: 14 }}>
          <span style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           6,
            padding:       '4px 14px',
            borderRadius:  999,
            background:    'rgba(0,180,216,0.08)',
            border:        '1px solid rgba(0,180,216,0.22)',
            fontSize:      11,
            fontWeight:    600,
            color:         '#00b4d8',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            fontFamily:    'var(--font-body)',
          }}>
            🌊 Community Feedback
          </span>
        </div>

        <h2 style={{
          margin:        '0 0 10px',
          fontFamily:    'var(--font-heading)',
          fontSize:      24,
          fontWeight:    700,
          color:         'var(--tx1)',
          letterSpacing: '-0.3px',
        }}>
          Help Improve Coral Reef
        </h2>

        <p style={{
          margin:       '0 auto',
          maxWidth:     500,
          fontFamily:   'var(--font-body)',
          fontSize:     14,
          color:        'var(--tx2)',
          lineHeight:   1.65,
        }}>
          Every report, suggestion and observation helps improve reef intelligence
          and conservation. Your feedback directly shapes future updates.
        </p>
      </div>

      {/* ── Card ── */}
      <div style={{
        maxWidth:    600,
        margin:      '0 auto',
        background:  'var(--d2)',
        borderRadius: 16,
        border:      '1px solid var(--bd)',
        padding:     '28px 32px 32px',
        boxShadow:   '0 4px 32px rgba(0,0,0,0.06)',
        fontFamily:  'var(--font-body)',
      }}>
        <form onSubmit={handleSubmit} noValidate>

          {/* ── Emoji sentiment selector ── */}
          <div style={{ marginBottom: 12 }}>
            <p style={{
              margin:     '0 0 14px',
              fontSize:   13,
              fontWeight: 500,
              color:      'var(--tx2)',
              textAlign:  'center',
              letterSpacing: '0.1px',
            }}>
              How would you rate your experience?
            </p>

            <div style={{
              display:        'flex',
              gap:            12,
              justifyContent: 'center',
              flexWrap:       'wrap',
            }}>
              {SENTIMENTS.map(s => {
                const active = rating === s.rating;
                return (
                  <button
                    key={s.rating}
                    type="button"
                    title={s.label}
                    aria-label={s.label}
                    aria-pressed={active}
                    onClick={() => setRating(s.rating)}
                    style={{
                      width:          54,
                      height:         54,
                      borderRadius:   '50%',
                      border:         active
                        ? `2.5px solid ${s.color}`
                        : '2px solid var(--bd)',
                      background:     active
                        ? `${s.color}18`
                        : 'var(--d3)',
                      cursor:         'pointer',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      color:          'var(--tx1)',   /* SVG inherits via currentColor */
                      transform:      active ? 'scale(1.2)' : 'scale(1)',
                      boxShadow:      active ? `0 0 20px ${s.color}55` : 'none',
                      transition:     'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                      outline:        'none',
                      flexShrink:     0,
                    }}
                  >
                    {FaceSVG[s.rating]}
                  </button>
                );
              })}
            </div>

            {/* Rating label */}
            <div style={{
              textAlign:  'center',
              marginTop:  8,
              fontSize:   12,
              color:      rating !== null
                ? SENTIMENTS.find(s => s.rating === rating)?.color
                : 'var(--tx2)',
              fontWeight: rating !== null ? 600 : 400,
              fontStyle:  rating !== null ? 'normal' : 'normal',
              transition: 'color 0.2s ease',
              minHeight:  16,
            }}>
              {rating !== null
                ? SENTIMENTS.find(s => s.rating === rating)?.label
                : 'Select a rating'}
            </div>
          </div>

          {/* Divider */}
          <div style={{
            height:       1,
            background:   'var(--bd)',
            marginBottom: 16,
            opacity:      0.6,
          }} />

          {/* Name */}
          <Field id="fb-name" label="Name">
            <input
              id="fb-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              maxLength={120}
              disabled={submitting}
              style={inputBase}
              onFocus={onFocus}
              onBlur={onBlur}
              autoComplete="name"
            />
          </Field>

          {/* Email */}
          <Field id="fb-email" label="Email">
            <input
              id="fb-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              maxLength={255}
              disabled={submitting}
              style={inputBase}
              onFocus={onFocus}
              onBlur={onBlur}
              autoComplete="email"
            />
          </Field>

          {/* Message */}
          <Field id="fb-message" label="Message">
            <textarea
              id="fb-message"
              ref={textareaRef}
              value={message}
              onChange={e => {
                if (e.target.value.length <= MAX_MSG) setMessage(e.target.value);
              }}
              placeholder="Share your observations, suggestions, or report an issue with the dashboard..."
              disabled={submitting}
              rows={4}
              style={{
                ...inputBase,
                resize:    'none',
                minHeight: 100,
                overflow:  'hidden',
                lineHeight: 1.6,
              }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            {/* Live counter */}
            <div style={{
              display:        'flex',
              justifyContent: 'flex-end',
              marginTop:      5,
              fontSize:       11,
              color:          message.length >= MAX_MSG - 50
                ? (message.length >= MAX_MSG ? '#e74c3c' : '#f39c12')
                : 'var(--tx2)',
              fontWeight:     message.length >= MAX_MSG - 50 ? 600 : 400,
              transition:     'color 0.2s ease',
            }}>
              {message.length} / {MAX_MSG}
            </div>
          </Field>

          {/* Error message */}
          {error && (
            <div style={{
              marginBottom: 16,
              padding:      '11px 14px',
              borderRadius: 10,
              background:   'rgba(231,76,60,0.07)',
              border:       '1px solid rgba(231,76,60,0.28)',
              color:        '#e74c3c',
              fontSize:     13,
              lineHeight:   1.5,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!isValid || submitting}
            style={{
              width:         '100%',
              padding:       '13px 24px',
              borderRadius:  10,
              border:        'none',
              background:    isValid && !submitting
                ? 'linear-gradient(135deg, #00b4d8 0%, #0077a8 100%)'
                : 'var(--d3)',
              color:         isValid && !submitting ? '#fff' : 'var(--tx2)',
              fontSize:      15,
              fontWeight:    600,
              fontFamily:    'var(--font-body)',
              cursor:        isValid && !submitting ? 'pointer' : 'not-allowed',
              letterSpacing: '0.2px',
              transition:    'all 0.25s ease',
              opacity:       submitting ? 0.72 : 1,
              boxShadow:     isValid && !submitting
                ? '0 4px 20px rgba(0,180,216,0.35)'
                : 'none',
              transform:     isValid && !submitting ? 'translateY(0)' : 'none',
            }}
            onMouseEnter={e => {
              if (isValid && !submitting) e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {submitting ? '⏳ Sending…' : 'Send Feedback →'}
          </button>

        </form>
      </div>
    </section>
  );
}
