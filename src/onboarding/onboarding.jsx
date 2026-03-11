import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { getKeySymbols } from '../utils/shortcutFormatter';

const STORAGE_KEY = 'CopyTitleAndUrlConfigs';

// ── i18n ─────────────────────────────────────────────────────────────────────
// Dev override: ?lang=zh_CN loads _locales/zh_CN/messages.json at runtime.
// In production chrome.i18n picks the right locale automatically.

let devMessages = null;

function t(key, subs) {
  if (devMessages?.[key]) {
    let msg = devMessages[key].message;
    const phs = devMessages[key].placeholders;
    if (phs && subs) {
      Object.entries(phs).forEach(([name, ph]) => {
        const idx = parseInt(ph.content.slice(1)) - 1;
        if (subs[idx] != null) msg = msg.replace(new RegExp(`\\$${name}\\$`, 'gi'), subs[idx]);
      });
    }
    return msg;
  }
  return chrome.i18n.getMessage(key, subs) || key;
}

// ── OS Detection ─────────────────────────────────────────────────────────────

function detectOS() {
  const p = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
  if (p.includes('mac')) return 'mac';
  if (p.includes('linux')) return 'linux';
  return 'windows';
}

// ── Helpers ───────────────────────────────────────────────────────────────────


function buildPressedShortcut(e, isMac) {
  const mods = [];
  if (e.ctrlKey)  mods.push('Ctrl');
  if (e.metaKey)  mods.push(isMac ? 'Command' : 'Win');
  if (e.altKey)   mods.push(isMac ? 'Option' : 'Alt');
  if (e.shiftKey) mods.push('Shift');
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return null;
  const main = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  return [...mods, main].join('+');
}

// ── Reusable components ───────────────────────────────────────────────────────

function KeyCap({ k, variant = 'default', os = 'windows' }) {
  const styles = {
    default: 'bg-slate-800 border-slate-700 text-slate-200',
    active:  'bg-blue-700 border-blue-900 text-white shadow-lg shadow-blue-500/20 key-active',
    success: 'bg-green-600 border-green-800 text-white shadow-lg shadow-green-500/20',
  };
  const sym = getKeySymbols(os);
  return (
    <kbd className={`inline-flex items-center justify-center px-3 py-2 min-w-[48px] h-11 rounded-lg border-b-[3px] text-sm font-mono font-bold select-none transition-all duration-300 ${styles[variant]}`}>
      {sym[k] ?? k}
    </kbd>
  );
}

function ShortcutDisplay({ keys, variant = 'default', size = 'md', os = 'windows' }) {
  return (
    <div className={`flex items-center gap-2 justify-center ${size === 'sm' ? 'scale-75 origin-center' : ''}`}>
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          <KeyCap k={k} variant={variant} os={os} />
          {i < keys.length - 1 && (
            <span className="text-slate-600 text-lg select-none font-light">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Confetti canvas ───────────────────────────────────────────────────────────

function Confetti({ active }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];
    const particles = Array.from({ length: 130 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      w: Math.random() * 10 + 4,
      h: Math.random() * 5 + 3,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 10,
      opacity: 1,
    }));
    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particles) {
        p.y += p.vy; p.x += p.vx; p.rot += p.rotV; p.vy += 0.07;
        if (p.y > canvas.height * 0.7) p.opacity = Math.max(0, p.opacity - 0.03);
        if (p.y < canvas.height) alive++;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return active ? <canvas ref={ref} className="fixed inset-0 pointer-events-none z-50" /> : null;
}

// ── Progress stepper (2 steps) ────────────────────────────────────────────────

function ProgressStepper({ step }) {
  const labels = [t('onboardingStepVerify'), t('onboardingStepPreview')];
  return (
    <div className="w-full max-w-[200px] mb-10">
      <div className="flex items-center">
        {labels.map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step > i + 1 ? 'bg-blue-600 text-white'
                : step === i + 1 ? 'bg-blue-600 text-white ring-4 ring-blue-600/20'
                : 'bg-slate-800 text-slate-500'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1.5 transition-colors duration-300 ${
                step === i + 1 ? 'text-blue-400' : step > i + 1 ? 'text-slate-400' : 'text-slate-600'
              }`}>{label}</span>
            </div>
            {i < 1 && (
              <div className={`flex-1 h-px mx-3 mb-4 transition-all duration-500 ${step > i + 1 ? 'bg-blue-600' : 'bg-slate-800'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Step 1: OS Detection + Shortcut Validation (merged) ───────────────────────

function Step1({ os, shortcutKeys, valState, onOpenSettings, onNext }) {
  const isListening = valState === 'listening';
  const isSuccess   = valState === 'success';
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!isListening) return;
    const t = setTimeout(() => setShowHint(true), 8000);
    return () => clearTimeout(t);
  }, [isListening]);

  const OS_ICONS = {
    mac: <svg className="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>,
    linux: <svg className="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="currentColor"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zM10.68 8.945c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065z"/></svg>,
    windows: <svg className="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.851"/></svg>,
  };
  const OS_LABELS = { mac: 'macOS', linux: 'Linux', windows: 'Windows' };
  const osIcon = OS_ICONS[os];
  const label = OS_LABELS[os];
  const keyCap = isSuccess ? 'success' : 'active';

  return (
    <div className="text-center fade-in-up">
      <div className="text-5xl mb-4">👋</div>
      <h1 className="text-2xl font-bold text-white mb-2">{t('onboardingWelcomeTitle')}</h1>
      <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs mx-auto">
        {t('onboardingWelcomeDesc')}
      </p>

      {/* OS badge */}
      <div className="flex justify-center mb-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
          <span>✓</span> {t('onboardingDetected')} {osIcon} {label}
        </span>
      </div>

      {/* Key caps — always shown, animate to success */}
      <div className={`mb-6 transition-transform duration-300 ${isSuccess ? 'scale-110' : 'scale-100'}`}>
        <ShortcutDisplay keys={shortcutKeys} variant={keyCap} os={os} />
      </div>

      {/* Status */}
      <div className="min-h-[96px] flex flex-col items-center justify-center gap-3">
        {isListening && (
          <>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-slate-500 text-sm">{t('onboardingListening')}</p>
            {showHint && (
              <button onClick={onOpenSettings}
                className="text-slate-500 hover:text-blue-400 text-xs underline underline-offset-2 transition-colors fade-in-up">
                {t('onboardingConflictHint')}
              </button>
            )}
          </>
        )}

        {isSuccess && (
          <div className="flex flex-col items-center success-pop">
            <p className="text-green-400 font-semibold text-lg">{t('onboardingItWorks')}</p>
            <p className="text-slate-400 text-sm mt-1">{t('onboardingReadyToUse')}</p>
          </div>
        )}
      </div>

      {/* CTA */}
      {(isSuccess || showHint) && (
        <button onClick={onNext}
          className={`w-full py-3 font-semibold rounded-xl transition-colors duration-200 ${
            isSuccess ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
          }`}>
          {isSuccess ? t('onboardingContinue') : t('onboardingSkipStep')}
        </button>
      )}
    </div>
  );
}

// ── Step 2: Template Preview with per-template shortcuts ──────────────────────

const TEMPLATE_DEFS = [
  { icon: '📄', nameKey: 'onboardingTplPlainName',    descKey: 'onboardingTplPlainDesc',    example: (title, url) => `${title}\n${url}` },
  { icon: '📝', nameKey: 'onboardingTplMarkdownName', descKey: 'onboardingTplMarkdownDesc', example: (title, url) => `[${title}](${url})` },
  { icon: '🎯', nameKey: 'onboardingTplSmartName',    descKey: 'onboardingTplSmartDesc',    example: (title, url) => `"${title}"\n${url}` },
];

const EX_TITLE = 'Link & Title Copy Pro – GitHub';
const EX_URL   = 'https://github.com/Deguang/link-and-title-copy-pro';

function Step2({ os, configs, selectedTpl, onSelect, onFinish }) {
  const sym = getKeySymbols(os);
  const [keyState, setKeyState] = useState('idle'); // 'idle' | 'success'
  const [copied,   setCopied]   = useState(false);
  const timerRef  = useRef(null);
  const copiedRef = useRef(null);

  // Merge stored configs with display defs
  const templates = TEMPLATE_DEFS.map((def, i) => ({
    ...def,
    name: t(def.nameKey),
    desc: t(def.descKey),
    shortcutRaw:  configs[i]?.shortcut ?? '',
    shortcutKeys: configs[i]?.shortcut ? configs[i].shortcut.split('+') : [],
  }));

  const current = templates[selectedTpl];
  const isMac   = os === 'mac';

  // Listen for any template's shortcut → switch tab + copy + flash success
  useEffect(() => {
    const handler = (e) => {
      if (e.repeat) return;
      const pressed = buildPressedShortcut(e, isMac);
      if (!pressed) return;
      const matchIdx = templates.findIndex((t) => t.shortcutRaw === pressed);
      if (matchIdx !== -1) {
        e.preventDefault();
        const tpl = templates[matchIdx];
        onSelect(matchIdx);

        // Copy example output to clipboard
        const text = tpl.example(EX_TITLE, EX_URL);
        navigator.clipboard.writeText(text).catch(() => {
          // fallback: execCommand
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
          document.body.appendChild(ta);
          ta.select(); document.execCommand('copy');
          document.body.removeChild(ta);
        });

        setKeyState('success');
        setCopied(true);
        if (timerRef.current)  clearTimeout(timerRef.current);
        if (copiedRef.current) clearTimeout(copiedRef.current);
        timerRef.current  = setTimeout(() => setKeyState('idle'), 1500);
        copiedRef.current = setTimeout(() => setCopied(false), 2500);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [templates, isMac, onSelect]);

  const keyCap = keyState === 'success' ? 'success' : 'active';

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="text-4xl mb-2">🚀</div>
        <h2 className="text-2xl font-bold text-white mb-1">{t('onboardingAllSet')}</h2>
        <p className="text-slate-400 text-sm mb-4">
          {t('onboardingFormatsReady', [String(configs.length || 3)])}
        </p>

        {/* Shortcut display — updates per selection, flashes on keypress */}
        {current.shortcutKeys.length > 0 && (
          <div className={`transition-transform duration-200 ${keyState === 'success' ? 'scale-110' : 'scale-100'}`}>
            <ShortcutDisplay keys={current.shortcutKeys} variant={keyCap} os={os} />
          </div>
        )}
      </div>

      {/* Template cards */}
      <div className="space-y-2 mb-4">
        {templates.map((tpl, i) => (
          <button key={i} onClick={() => onSelect(i)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
              selectedTpl === i
                ? 'border-blue-500 bg-blue-600/10'
                : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
            }`}>
            <span className="text-xl flex-shrink-0">{tpl.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${selectedTpl === i ? 'text-blue-300' : 'text-slate-200'}`}>
                {tpl.name}
              </p>
              <p className="text-xs text-slate-500">{tpl.desc}</p>
            </div>
            {/* Per-template shortcut badge */}
            {tpl.shortcutKeys.length > 0 && (
              <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md border whitespace-nowrap transition-all duration-300 ${
                selectedTpl === i && keyState === 'success'
                  ? 'bg-green-600/20 border-green-500/40 text-green-400'
                  : selectedTpl === i
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}>
                {tpl.shortcutKeys.map((k, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="opacity-50">+</span>}
                    <kbd className="inline-flex items-center justify-center leading-none">{sym[k] ?? k}</kbd>
                  </React.Fragment>
                ))}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Output preview */}
      <div className={`border rounded-xl p-4 mb-4 transition-colors duration-300 ${
        copied ? 'bg-green-500/10 border-green-500/40' : 'bg-slate-800/60 border-slate-700'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider">{t('onboardingOutputPreview')}</p>
          {copied && (
            <span className="text-xs text-green-400 font-medium fade-in-up">{t('onboardingCopiedBadge')}</span>
          )}
        </div>
        <pre className={`text-xs font-mono whitespace-pre-wrap break-all leading-relaxed transition-colors duration-300 ${
          copied ? 'text-green-300' : 'text-green-400'
        }`}>
          {current.example(EX_TITLE, EX_URL)}
        </pre>
      </div>

      <p className="text-xs text-slate-600 text-center mb-4">
        {t('onboardingCustomize')}
      </p>

      <button onClick={onFinish}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl transition-colors duration-200">
        {t('onboardingStartCopying')}
      </button>
    </div>
  );
}

// ── Root Onboarding ───────────────────────────────────────────────────────────

function Onboarding() {
  const [step,         setStep]         = useState(1);
  const [os,           setOs]           = useState('windows');
  const [shortcutKeys, setShortcutKeys] = useState(['Ctrl', 'Shift', 'P']);
  const [shortcutRaw,  setShortcutRaw]  = useState('Ctrl+Shift+P');
  const [valState,     setValState]     = useState('listening'); // listening | success
  const [confetti,     setConfetti]     = useState(false);
  const [configs,      setConfigs]      = useState([]);
  const [selectedTpl,  setSelectedTpl]  = useState(0);
  const [, setLangLoaded] = useState(false); // triggers re-render after dev lang loads

  // Init: detect OS, load shortcuts, optionally load dev lang override
  useEffect(() => {
    document.documentElement.classList.add('dark');
    const osOverride = new URLSearchParams(location.search).get('os');
    const detectedOs = osOverride || detectOS();
    setOs(detectedOs);

    // Dev: ?lang=zh_CN overrides chrome.i18n at runtime
    const lang = new URLSearchParams(location.search).get('lang');
    if (lang) {
      fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`))
        .then((r) => r.json())
        .then((data) => { devMessages = data; setLangLoaded(true); })
        .catch(() => {}); // fail silently — fall back to chrome.i18n
    }
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const stored = result[STORAGE_KEY];
      if (stored?.length) {
        setConfigs(stored);
        const raw = stored[0]?.shortcut;
        if (raw) { setShortcutRaw(raw); setShortcutKeys(raw.split('+')); }
      } else {
        const def = detectedOs === 'mac' ? 'Command+Shift+P' : 'Ctrl+Shift+P';
        setShortcutRaw(def); setShortcutKeys(def.split('+'));
      }
    });
  }, []);

  // Key listener for Step 1 — validate the first shortcut
  useEffect(() => {
    if (step !== 1 || valState !== 'listening') return;
    const isMac = os === 'mac';
    const handler = (e) => {
      if (e.repeat) return;
      const pressed = buildPressedShortcut(e, isMac);
      if (pressed === shortcutRaw) {
        e.preventDefault();
        setValState('success');
        setConfetti(true);
        setTimeout(() => setConfetti(false), 4000);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [step, valState, shortcutRaw, os]);

  const openSettings = useCallback(() => chrome.runtime.openOptionsPage(), []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 py-12">
      <Confetti active={confetti} />

      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-8">
        <img src="../icons/icon.webp" className="w-7 h-7 rounded-lg" alt="" />
        <span className="text-slate-400 text-sm font-medium tracking-wide">
          {t('name')}
        </span>
      </div>

      <ProgressStepper step={step} />

      {/* Card */}
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-blue-700 via-blue-400 to-blue-700" />
        <div className="p-8">
          {step === 1 && (
            <Step1
              os={os}
              shortcutKeys={shortcutKeys}
              valState={valState}
              onOpenSettings={openSettings}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2
              os={os}
              configs={configs}
              selectedTpl={selectedTpl}
              onSelect={setSelectedTpl}
              onFinish={() => window.close()}
            />
          )}
        </div>
      </div>

      <button onClick={() => window.close()}
        className="mt-6 text-slate-600 hover:text-slate-400 text-sm transition-colors duration-200">
        {t('onboardingSkipSetup')}
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Onboarding /></React.StrictMode>
);
