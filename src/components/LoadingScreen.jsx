import React, { useState, useEffect, useRef } from 'react';

const TOTAL_MS = 2400;

const MESSAGES = [
  { at: 0,  text: 'Initializing reef monitoring systems...' },
  { at: 20, text: 'Loading 40 years of survey data...' },
  { at: 40, text: 'Calibrating bleaching prediction model...' },
  { at: 60, text: 'Rendering reef zone visualizations...' },
  { at: 80, text: 'Connecting AI reef assistant...' },
  { at: 96, text: 'Dive in! 🌊' },
];

function msgForPct(p) {
  let out = MESSAGES[0].text;
  for (const m of MESSAGES) if (p >= m.at) out = m.text;
  return out;
}

// 18 ambient bubbles spread across full viewport
const AMBIENT = [
  {x:'4%',  y:'72%', s:3,  op:0.22, d:'9s',  dl:'0s'   },
  {x:'12%', y:'85%', s:2,  op:0.14, d:'11s', dl:'2.1s' },
  {x:'19%', y:'60%', s:5,  op:0.18, d:'8s',  dl:'0.7s' },
  {x:'26%', y:'90%', s:2,  op:0.10, d:'13s', dl:'3.4s' },
  {x:'33%', y:'68%', s:7,  op:0.12, d:'10s', dl:'1.5s' },
  {x:'41%', y:'80%', s:3,  op:0.20, d:'7s',  dl:'4.2s' },
  {x:'48%', y:'95%', s:2,  op:0.08, d:'12s', dl:'0.3s' },
  {x:'54%', y:'75%', s:10, op:0.09, d:'14s', dl:'2.8s' },
  {x:'62%', y:'88%', s:4,  op:0.16, d:'9s',  dl:'1.1s' },
  {x:'69%', y:'65%', s:2,  op:0.12, d:'11s', dl:'3.9s' },
  {x:'75%', y:'92%', s:5,  op:0.18, d:'8s',  dl:'0.5s' },
  {x:'82%', y:'78%', s:3,  op:0.14, d:'10s', dl:'2.4s' },
  {x:'88%', y:'62%', s:7,  op:0.20, d:'13s', dl:'1.7s' },
  {x:'93%', y:'85%', s:2,  op:0.10, d:'7s',  dl:'3.1s' },
  {x:'8%',  y:'55%', s:4,  op:0.15, d:'9s',  dl:'4.8s' },
  {x:'57%', y:'58%', s:3,  op:0.22, d:'11s', dl:'0.9s' },
  {x:'37%', y:'100%',s:5,  op:0.12, d:'8s',  dl:'2.2s' },
  {x:'78%', y:'105%',s:3,  op:0.18, d:'10s', dl:'1.3s' },
];

export function LoadingScreen({ onDone, dataReady = true }) {
  const [pct,        setPct]        = useState(0);
  const [exiting,    setExiting]    = useState(false);
  const [displayMsg, setDisplayMsg] = useState(MESSAGES[0].text);
  const [msgOpacity, setMsgOpacity] = useState(1);

  // Stable refs so RAF/timeout closures always read the latest values
  const onDoneRef     = useRef(onDone);
  const dataReadyRef  = useRef(dataReady);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  // When dataReady flips true, update the ref — the poll will pick it up
  useEffect(() => { dataReadyRef.current = dataReady; }, [dataReady]);

  // While bar is full but CSV still loading, show a waiting message
  useEffect(() => {
    if (!dataReady && pct >= 100) {
      setDisplayMsg('Preparing dashboard data…');
      setMsgOpacity(1);
    }
  }, [dataReady, pct]);

  const msgRef     = useRef(MESSAGES[0].text);
  const msgTimRef  = useRef(null);

  const updateMsg = (p) => {
    const next = msgForPct(p);
    if (next === msgRef.current) return;
    msgRef.current = next;
    clearTimeout(msgTimRef.current);
    setMsgOpacity(0);
    msgTimRef.current = setTimeout(() => {
      setDisplayMsg(next);
      setMsgOpacity(1);
    }, 160);
  };

  useEffect(() => {
    let cancelled    = false;
    let raf          = null;
    let poll         = null;          // hoisted — cleaned up in return
    let dataFallback = null;          // hoisted — cleaned up in return

    // ── Real tasks (parallel, non-blocking) ───────────────────────────────────────────
    let tasksDone = false;
    (async () => {
      try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 1200);
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/health`, { signal: ctrl.signal });
        clearTimeout(tid);
      } catch (_) {}
      tasksDone = true;
    })();

    // ── Guard: if tasks never resolve, force-complete after 2 s ───────────────
    const taskFallback = setTimeout(() => { tasksDone = true; }, 2000);

    // ── Three-gate exit ───────────────────────────────────────────────────────
    let barDone     = false;
    let diveStarted = false;

    const tryFinish = () => {
      // bar animation ✅ + health check ✅ + CSV data ready ✅
      if (barDone && tasksDone && dataReadyRef.current && !diveStarted && !cancelled) {
        diveStarted = true;
        setTimeout(() => {
          if (cancelled) return;
          setExiting(true);
          setTimeout(() => { if (!cancelled) onDoneRef.current(); }, 420);
        }, 450);
      }
    };

    // ── RAF progress loop ────────────────────────────────────────────────────────
    const startTime = performance.now();

    const tick = (now) => {
      if (cancelled) return;
      const elapsed = now - startTime;
      const raw     = Math.min((elapsed / TOTAL_MS) * 100, 100);
      const rounded = Math.round(raw);

      setPct(rounded);
      updateMsg(rounded);

      if (raw >= 100) {
        setPct(100);
        barDone = true;
        tryFinish();

        // Poll until ALL three gates pass (every 80 ms)
        poll = setInterval(() => {
          if (cancelled) { clearInterval(poll); return; }
          if (tasksDone && dataReadyRef.current) {
            clearInterval(poll);
            tryFinish();
          }
        }, 80);

        // Hard cap: don't wait more than 7 s for dataReady
        dataFallback = setTimeout(() => {
          dataReadyRef.current = true;
          tryFinish();
        }, 7000);

        return;   // stop RAF
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(msgTimRef.current);
      clearTimeout(taskFallback);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes sway1{0%,100%{transform:translateX(-3px) rotate(-2deg)}50%{transform:translateX(3px) rotate(2deg)}}
        @keyframes sway2{0%,100%{transform:translateX(3px) rotate(2deg)}50%{transform:translateX(-3px) rotate(-2deg)}}
        @keyframes swayWeed{0%,100%{transform-origin:bottom center;transform:rotate(-8deg)}50%{transform-origin:bottom center;transform:rotate(8deg)}}
        @keyframes turtleSwim{
          0%  {transform:translate(-90px,32px)}
          48% {transform:translate(250px,18px)}
          52% {transform:translate(270px,18px)}
          100%{transform:translate(480px,36px)}
        }
        @keyframes fish1{
          0%  {transform:translateX(460px) translateY(0px)}
          47% {transform:translateX(200px) translateY(-12px)}
          53% {transform:translateX(180px) translateY(-12px)}
          100%{transform:translateX(-50px) translateY(0px)}
        }
        @keyframes fish2{
          0%  {transform:translateX(-40px) translateY(0px)}
          47% {transform:translateX(200px) translateY(-10px)}
          53% {transform:translateX(220px) translateY(-10px)}
          100%{transform:translateX(460px) translateY(0px)}
        }
        @keyframes bubble{
          0%  {transform:translateY(0) translateX(0);opacity:0}
          12% {opacity:0.55}
          50% {transform:translateY(-90px) translateX(12px)}
          88% {opacity:0.3}
          100%{transform:translateY(-185px) translateX(-8px);opacity:0}
        }
        @keyframes ambientRise{
          0%  {transform:translateY(0) translateX(0);opacity:0}
          10% {opacity:1}
          50% {transform:translateY(-55px) translateX(15px)}
          90% {opacity:0.4}
          100%{transform:translateY(-110px) translateX(-10px);opacity:0}
        }
        @keyframes shimmer{
          0%  {background-position:200% center}
          100%{background-position:-200% center}
        }
        @keyframes pulse92{0%,100%{opacity:1}50%{opacity:0.72}}
        @keyframes screenIn{from{opacity:0}to{opacity:1}}
      `}</style>

      {/* ── Root overlay — true fullscreen, fully opaque ───────────────────── */}
      <div style={{
        position:      'fixed',
        top:0, left:0, right:0, bottom:0,
        width:         '100vw',
        height:        '100vh',
        zIndex:        99999,
        // Fully opaque radial gradient — no backdrop-filter during loading
        background:    'radial-gradient(circle at 50% 45%, #0a1f33 0%, #061320 45%, #02080f 100%)',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        justifyContent:'center',
        overflow:      'hidden',
        // Exit animation (only active when exiting=true)
        opacity:       exiting ? 0 : 1,
        transform:     exiting ? 'scale(1.03)' : 'scale(1)',
        filter:        exiting ? 'blur(4px)' : 'none',
        transition:    exiting
          ? 'opacity 400ms cubic-bezier(0.4,0,0.2,1), transform 400ms cubic-bezier(0.4,0,0.2,1), filter 400ms cubic-bezier(0.4,0,0.2,1)'
          : 'none',
        // Disable pointer events during exit so dashboard becomes interactive
        pointerEvents: exiting ? 'none' : 'all',
        animation:     'screenIn 0.3s ease-out',
      }}>

        {/* Corner vignette */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', zIndex:1,
          background:'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.28) 100%)',
        }}/>

        {/* Ambient background particles — 18 bubbles across full viewport */}
        {AMBIENT.map((p,i) => (
          <div key={i} style={{
            position:'absolute', left:p.x, top:p.y,
            width:p.s, height:p.s, borderRadius:'50%',
            background:`rgba(0,180,216,${p.op})`,
            animation:`ambientRise ${p.d} ease-in-out infinite`,
            animationDelay:p.dl,
            pointerEvents:'none', zIndex:1, willChange:'transform,opacity',
          }}/>
        ))}

        {/* ── Content — no bg/border, floats in space ── */}
        <div className="-translate-y-[8vh] md:translate-y-0 transition-transform" 
             style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',alignItems:'center',gap:28,width:'100%',maxWidth:420,padding:'0 16px'}}>

          {/* SVG Reef Scene */}
          <div style={{width:'100%',aspectRatio:'420/220',position:'relative',overflow:'hidden'}}>
            <svg width="100%" height="100%" viewBox="0 0 420 220" style={{position:'absolute',inset:0}}>
              <defs>
                <linearGradient id="lsFloor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a3a4a"/><stop offset="100%" stopColor="#0d2535"/>
                </linearGradient>
                <radialGradient id="lsGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.08"/>
                  <stop offset="100%" stopColor="#00b4d8" stopOpacity="0"/>
                </radialGradient>
              </defs>
              <rect x="0" y="185" width="420" height="35" fill="url(#lsFloor)"/>
              <ellipse cx="210" cy="140" rx="200" ry="90" fill="url(#lsGlow)"/>
              {/* Orange coral */}
              <g style={{animation:'sway1 3.8s ease-in-out infinite',transformOrigin:'50px 185px'}}>
                <rect x="48" y="150" width="5" height="35" fill="#e07b54" rx="2"/>
                <rect x="43" y="158" width="4" height="22" fill="#e07b54" rx="2" transform="rotate(-25,43,180)"/>
                <rect x="53" y="155" width="4" height="24" fill="#e07b54" rx="2" transform="rotate(22,55,179)"/>
                <ellipse cx="50" cy="148" rx="7" ry="5" fill="#f4a261"/>
              </g>
              {/* Pink coral */}
              <g style={{animation:'sway2 4.2s ease-in-out infinite',animationDelay:'0.5s',transformOrigin:'130px 185px'}}>
                <rect x="128" y="148" width="4" height="37" fill="#c45c8a" rx="2"/>
                <rect x="120" y="155" width="4" height="28" fill="#c45c8a" rx="2" transform="rotate(-30,122,183)"/>
                <rect x="132" y="152" width="4" height="30" fill="#c45c8a" rx="2" transform="rotate(28,134,182)"/>
                <ellipse cx="130" cy="146" rx="9" ry="6" fill="#e887b5"/>
              </g>
              {/* Purple coral */}
              <g style={{animation:'sway1 5s ease-in-out infinite',animationDelay:'1s',transformOrigin:'200px 185px'}}>
                <rect x="197" y="155" width="6" height="30" fill="#7b4fa6" rx="3"/>
                <rect x="187" y="165" width="5" height="20" fill="#7b4fa6" rx="2" transform="rotate(-20,190,185)"/>
                <rect x="203" y="160" width="5" height="22" fill="#7b4fa6" rx="2" transform="rotate(20,206,182)"/>
                <ellipse cx="200" cy="153" rx="10" ry="7" fill="#9b72c0"/>
              </g>
              {/* Teal seaweed */}
              <g style={{animation:'sway2 3.5s ease-in-out infinite',animationDelay:'1.5s',transformOrigin:'270px 185px'}}>
                <ellipse cx="270" cy="165" rx="12" ry="25" fill="#2a9d8f" opacity="0.9"/>
                <ellipse cx="265" cy="152" rx="9" ry="16" fill="#2a9d8f"/>
                <ellipse cx="275" cy="148" rx="8" ry="14" fill="#3bbcad"/>
              </g>
              {/* Yellow coral */}
              <g style={{animation:'sway1 4.5s ease-in-out infinite',animationDelay:'2s',transformOrigin:'340px 185px'}}>
                <rect x="338" y="153" width="5" height="32" fill="#e9c46a" rx="2"/>
                <rect x="330" y="160" width="4" height="22" fill="#e9c46a" rx="2" transform="rotate(-28,332,182)"/>
                <rect x="343" y="157" width="4" height="24" fill="#e9c46a" rx="2" transform="rotate(25,345,181)"/>
                <ellipse cx="340" cy="151" rx="8" ry="5" fill="#f4d483"/>
              </g>
              {/* Red coral */}
              <g style={{animation:'sway2 3.2s ease-in-out infinite',animationDelay:'2.5s',transformOrigin:'390px 185px'}}>
                <rect x="388" y="160" width="5" height="25" fill="#e76f51" rx="2"/>
                <rect x="380" y="167" width="4" height="18" fill="#e76f51" rx="2" transform="rotate(-22,382,185)"/>
                <ellipse cx="390" cy="158" rx="7" ry="5" fill="#f4956a"/>
              </g>
              {/* Seaweeds */}
              <g style={{animation:'swayWeed 4s ease-in-out infinite',animationDelay:'0.3s',transformOrigin:'80px 185px'}}>
                <rect x="77" y="150" width="6" height="35" fill="#1a5c3a" rx="3"/>
                <rect x="74" y="138" width="5" height="20" fill="#22753f" rx="2" transform="rotate(-15,76,158)"/>
              </g>
              <g style={{animation:'swayWeed 3.7s ease-in-out infinite',animationDelay:'1.2s',transformOrigin:'165px 185px'}}>
                <rect x="162" y="148" width="5" height="37" fill="#1a5c3a" rx="2"/>
                <rect x="158" y="135" width="4" height="22" fill="#237048" rx="2" transform="rotate(-10,160,157)"/>
              </g>
              <g style={{animation:'swayWeed 4.4s ease-in-out infinite',animationDelay:'2.1s',transformOrigin:'310px 185px'}}>
                <rect x="308" y="152" width="6" height="33" fill="#1a5c3a" rx="3"/>
                <rect x="304" y="140" width="5" height="20" fill="#22753f" rx="2" transform="rotate(-18,306,160)"/>
              </g>
            </svg>

            {/* Turtle */}
            <div style={{position:'absolute',top:0,left:0,animation:'turtleSwim 9s linear infinite',willChange:'transform'}}>
              <svg width="70" height="48" viewBox="0 0 70 48">
                <ellipse cx="35" cy="26" rx="22" ry="16" fill="#5a7a3a"/>
                <ellipse cx="35" cy="26" rx="13" ry="9" fill="none" stroke="#3d5428" strokeWidth="1.5"/>
                <line x1="35" y1="17" x2="35" y2="35" stroke="#3d5428" strokeWidth="1"/>
                <line x1="22" y1="26" x2="48" y2="26" stroke="#3d5428" strokeWidth="1"/>
                <ellipse cx="55" cy="24" rx="9" ry="7" fill="#6b8c4a"/>
                <circle cx="58" cy="22" r="1.5" fill="#1a2a10"/>
                <ellipse cx="20" cy="16" rx="12" ry="5" fill="#6b8c4a" transform="rotate(-25,20,16)"/>
                <ellipse cx="20" cy="36" rx="12" ry="5" fill="#6b8c4a" transform="rotate(25,20,36)"/>
                <ellipse cx="50" cy="14" rx="8"  ry="4" fill="#6b8c4a" transform="rotate(-15,50,14)"/>
                <ellipse cx="50" cy="38" rx="8"  ry="4" fill="#6b8c4a" transform="rotate(15,50,38)"/>
                <ellipse cx="14" cy="26" rx="5"  ry="3" fill="#6b8c4a"/>
              </svg>
            </div>

            {/* Clownfish */}
            <div style={{position:'absolute',top:90,left:0,animation:'fish1 7s linear infinite',willChange:'transform'}}>
              <svg width="34" height="22" viewBox="0 0 34 22" style={{transform:'scaleX(-1)'}}>
                <ellipse cx="17" cy="11" rx="13" ry="9" fill="#f4a261"/>
                <rect x="14" y="2" width="5" height="18" fill="white" opacity="0.85" rx="2"/>
                <circle cx="26" cy="9" r="2.5" fill="white"/><circle cx="26.5" cy="9" r="1.2" fill="#111"/>
                <polygon points="4,3 0,11 4,19" fill="#f4a261"/>
              </svg>
            </div>

            {/* Yellow fish */}
            <div style={{position:'absolute',top:130,left:0,animation:'fish2 10s linear infinite',willChange:'transform'}}>
              <svg width="28" height="18" viewBox="0 0 28 18">
                <ellipse cx="14" cy="9" rx="10" ry="7" fill="#e9c46a"/>
                <circle cx="20" cy="7" r="2" fill="white"/><circle cx="20.5" cy="7" r="1" fill="#222"/>
                <polygon points="4,2 0,9 4,16" fill="#d4a820"/>
              </svg>
            </div>

            {/* Scene bubbles */}
            {[{x:55,s:5,d:'3.8s',dl:'0s'},{x:100,s:7,d:'4.5s',dl:'0.7s'},
              {x:155,s:4,d:'3.2s',dl:'1.3s'},{x:210,s:8,d:'5.1s',dl:'0.4s'},
              {x:255,s:5,d:'3.6s',dl:'1.8s'},{x:300,s:6,d:'4.2s',dl:'0.9s'},
              {x:350,s:4,d:'3.9s',dl:'2.1s'},{x:395,s:7,d:'4.7s',dl:'0.2s'},
            ].map((b,i)=>(
              <div key={i} style={{
                position:'absolute',left:b.x,bottom:30,width:b.s,height:b.s,
                borderRadius:'50%',background:'rgba(0,180,216,0.45)',
                animation:`bubble ${b.d} ease-in infinite`,animationDelay:b.dl,
                willChange:'transform,opacity',
              }}/>
            ))}
          </div>

          {/* Title + status */}
          <div style={{textAlign:'center',width:'100%'}}>
            <div style={{fontSize:22,fontWeight:400,color:'#fff',letterSpacing:'2px',
              textTransform:'uppercase',fontFamily:"'SD Glitch Demo','Rubik Glitch',system-ui,sans-serif",marginBottom:8}}>
              🪸 Coral Reef Dashboard
            </div>
            <div style={{fontSize:13,color:'#00b4d8',fontWeight:500,height:20,
              opacity:msgOpacity,transition:'opacity 0.16s ease'}}>
              {displayMsg}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{width:'100%'}}>
            <div style={{height:12,background:'rgba(255,255,255,0.07)',borderRadius:999,
              border:'1px solid rgba(0,180,216,0.2)',overflow:'hidden'}}>
              <div style={{
                height:'100%',width:`${pct}%`,borderRadius:999,
                background:'linear-gradient(90deg,#00b4d8,#0077a8,#00b4d8)',
                backgroundSize:'200% 100%',
                transition:'width 0.1s linear',
                willChange:'width',
                animation:'shimmer 1.5s linear infinite',
              }}/>
            </div>
            <div style={{textAlign:'right',fontSize:11,color:'#475569',marginTop:4,fontFamily:'monospace'}}>
              {pct}%
            </div>
          </div>

        </div>{/* end content */}
      </div>{/* end overlay */}
    </>
  );
}
