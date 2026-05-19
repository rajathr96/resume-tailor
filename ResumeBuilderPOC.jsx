'use client';
import React, { useState } from 'react';
import { Sparkles, Copy, Check, AlertCircle, Loader2, Briefcase, Target, Wand2, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Lightbulb, Zap, RotateCcw, ArrowRight } from 'lucide-react';

export default function ResumeBuilderPOC() {
  const [masterResume, setMasterResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [archetype, setArchetype] = useState('Fintech PM');
  const [seniority, setSeniority] = useState('APM / Associate PM');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);
  const [originalResult, setOriginalResult] = useState(null); // for reset
  const [previousScore, setPreviousScore] = useState(null); // for delta display
  const [selectedWins, setSelectedWins] = useState(new Set());
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('bullets');

  const archetypes = ['Fintech PM', 'Growth PM', 'Platform/Technical PM', 'Consumer PM', 'B2B/Enterprise PM', '0→1 / Product Strategy'];
  const seniorities = ['APM / Associate PM', 'PM (IC)', 'Senior PM', 'Group PM / Lead PM'];

  const callClaude = async (systemPrompt, userPrompt, maxTokens = 4000) => {
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt, maxTokens }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    // Extract the JSON object/array even if the model adds preamble or markdown
    const raw = data.text;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in model response');
    return raw.slice(start, end + 1);
  };

  const tailorBullets = async (masterResumeInput, jobDescInput, additionalGuidance = '') => {
    const systemPrompt = `You are an expert PM resume tailoring engine for ${archetype} roles at ${seniority} level.

CORE RULES (NON-NEGOTIABLE):
1. INFER, DON'T INVENT: You may reframe, re-emphasize, and surface implicit work from the master resume. You MUST NOT invent specific facts, numbers, company names, tools, frameworks, or claims not present in the source.
2. XYZ FORMAT (not STAR): Each bullet should follow "[Strong action verb] + [what you did with context/scope] + [quantified impact]". Bullets should be ~15-22 words, single line, punchy.
3. PRESERVE TRUTH: Never fabricate metrics. If the master resume says "improved CTR by 25%", keep 25%. Never round up, embellish, or invent numbers.
4. ARCHETYPE LENS: Tailor for ${archetype}. Surface bullets and angles most relevant to this archetype.
5. SENIORITY CALIBRATION: For ${seniority}, emphasize the appropriate signals.
6. KEYWORD INTEGRATION: Weave JD keywords into bullets naturally, never stuff.
${additionalGuidance ? `\nADDITIONAL GUIDANCE FOR THIS GENERATION:\n${additionalGuidance}` : ''}

OUTPUT FORMAT (return ONLY this JSON, no markdown):
{
  "tailored_experiences": [
    {"company": "...", "role": "...", "dates": "...", "bullets": ["...", "..."]}
  ],
  "tailoring_notes": "2-3 sentences explaining tailoring decisions.",
  "gaps": ["gap 1", "gap 2"]
}`;

    const userPrompt = `MASTER RESUME:\n${masterResumeInput}\n\n---\n\nJOB DESCRIPTION:\n${jobDescInput}\n\n---\n\nGenerate the tailored resume. Return ONLY the JSON.`;
    const text = await callClaude(systemPrompt, userPrompt, 4000);
    return JSON.parse(text);
  };

  const scoreResume = async (tailored, jobDescInput) => {
    const tailoredResumeText = tailored.tailored_experiences.map(e =>
      `${e.company} | ${e.role} | ${e.dates}\n${e.bullets.map(b => '• ' + b).join('\n')}`
    ).join('\n\n');

    const systemPrompt = `You are an ATS analysis engine analyzing how well a tailored resume matches a job description, with the rigor of a real recruiter — not a naive keyword counter.

ANALYSIS METHODOLOGY:
1. Extract keywords/requirements from the JD and categorize each as: hard_skill, domain, soft_signal, tool, experience
2. Weight each as "must_have" or "nice_to_have"
3. Semantic matching — "A/B testing" matches "experimentation". "Led" matches "owned". Be generous but accurate.
4. For unsatisfied keywords, classify as "addressable" (could be added truthfully) or "real_gap" (genuinely missing)

SCORING:
- Match score = (weighted satisfied / weighted total) × 100
- must_have weight = 2, nice_to_have weight = 1
- Round to integer
- score_label: "Strong fit" (>=75), "Moderate fit" (55-74), "Weak fit" (<55)

OUTPUT (return ONLY this JSON, no markdown):
{
  "match_score": 73,
  "score_label": "Strong fit",
  "summary": "1-2 sentence honest assessment.",
  "categories": {
    "hard_skill": {"satisfied": 4, "total": 5},
    "domain": {"satisfied": 2, "total": 3},
    "soft_signal": {"satisfied": 5, "total": 5},
    "tool": {"satisfied": 1, "total": 2},
    "experience": {"satisfied": 2, "total": 2}
  },
  "satisfied_keywords": [
    {"keyword": "...", "category": "hard_skill", "weight": "must_have", "evidence": "which bullet covers it"}
  ],
  "missing_addressable": [
    {"keyword": "...", "category": "...", "weight": "must_have", "fix_suggestion": "concrete suggestion"}
  ],
  "missing_real_gaps": [
    {"keyword": "...", "category": "...", "weight": "must_have", "why_it_matters": "..."}
  ]
}`;

    const userPrompt = `JOB DESCRIPTION:\n${jobDescInput}\n\n---\n\nTAILORED RESUME:\n${tailoredResumeText}\n\n---\n\nAnalyze the match. Return ONLY the JSON.`;
    const text = await callClaude(systemPrompt, userPrompt, 4000);
    return JSON.parse(text);
  };

  const generateResume = async () => {
    if (!masterResume.trim() || !jobDescription.trim()) {
      setError('Please provide both your master resume and the job description.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setOriginalResult(null);
    setPreviousScore(null);
    setSelectedWins(new Set());

    try {
      setStage('Tailoring bullets...');
      const tailored = await tailorBullets(masterResume, jobDescription);

      setStage('Running ATS analysis...');
      const ats = await scoreResume(tailored, jobDescription);

      setStage('');
      const finalResult = { ...tailored, ats };
      setResult(finalResult);
      setOriginalResult(finalResult);
      setActiveTab('bullets');
    } catch (err) {
      setError(`Generation failed: ${err.message}. Try again or simplify your input.`);
      setStage('');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyQuickWins = async () => {
    if (!result || selectedWins.size === 0) return;
    setIsApplying(true);
    setError(null);
    setPreviousScore(result.ats.match_score);

    try {
      // Build guidance from selected quick wins
      const winsToApply = Array.from(selectedWins).map(idx => result.ats.missing_addressable[idx]);
      const guidanceText = winsToApply.map((w, i) =>
        `${i + 1}. Incorporate "${w.keyword}" (${w.category}, ${w.weight}): ${w.fix_suggestion}`
      ).join('\n');

      const additionalGuidance = `The previous tailored version was missing these JD keywords/requirements. Incorporate them into the bullets WITHOUT inventing new facts — use the suggestions below, which describe how to reframe existing master-resume content. Keep all original metrics and facts intact:\n\n${guidanceText}\n\nRewrite the affected bullets to naturally include these signals while preserving truthfulness.`;

      setStage('Applying quick wins...');
      const tailored = await tailorBullets(masterResume, jobDescription, additionalGuidance);

      setStage('Re-scoring...');
      const ats = await scoreResume(tailored, jobDescription);

      setStage('');
      setResult({ ...tailored, ats });
      setSelectedWins(new Set());
      setActiveTab('bullets');
    } catch (err) {
      setError(`Failed to apply: ${err.message}`);
      setStage('');
    } finally {
      setIsApplying(false);
    }
  };

  const resetToOriginal = () => {
    if (!originalResult) return;
    setResult(originalResult);
    setPreviousScore(null);
    setSelectedWins(new Set());
  };

  const toggleWin = (idx) => {
    const next = new Set(selectedWins);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedWins(next);
  };

  const selectAllWins = () => {
    if (!result?.ats?.missing_addressable) return;
    setSelectedWins(new Set(result.ats.missing_addressable.map((_, i) => i)));
  };

  const clearAllWins = () => setSelectedWins(new Set());

  const copyBullet = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = () => {
    if (!result) return;
    const allText = result.tailored_experiences.map(exp =>
      `${exp.company} | ${exp.role} | ${exp.dates}\n${exp.bullets.map(b => `• ${b}`).join('\n')}`
    ).join('\n\n');
    navigator.clipboard.writeText(allText);
    setCopiedIdx('all');
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const loadSample = () => {
    setMasterResume(`Benjamin Franking | IMI B MBA 2023-25 | BTech IT Manipal

AMERICAN EXPRESS (May 25 - Present) - Senior Analyst, Product & Analytics
• Owned 2+ high-impact features and user journeys to improve retention and loyalty of high-CMV customers, driving ~15% uplift in retention.
• Developed AI-driven acquisition strategy to curb abuse and improve customer quality, driving ~15% GCM uplift
• Led A/B experiments on the American Express platform to optimize offer placement, defined success metrics and KPIs, and improved recommendation CTR by ~25%.
• Drove roadmap prioritization for customer decisioning platform for balancing growth, profitability risk, and user experience trade-offs.
• Led end-to-end migration of anti-gaming control tables to new GCP-backed POA tables, coordinating across engineering, marketing, tech, and channel teams.
• Leveraged primary and secondary research to identify customer needs, benchmark competitors, and shape GTM and product strategies.

FINIQ (Apr 24 - May 24) - Product Manager Intern
• Defined product requirements (PRDs), user stories, and roadmap for AI native stock market platform, collaborating with engineering, design, and sales to deliver 7+ features.
• Conducted market research to identify target segments and expansion opportunities for SaaS licensing.

VMWARE/BROADCOM (Jul 19 - Jun 23) - Member of Technical Staff 1/2/3
• Incubated Dr.WCP, a Kubernetes diagnostic SaaS tool, cutting RCA time by ~60%, secured $1M VMware funding.
• Engaged enterprise customers to identify use cases, pain points and define product requirements.
• Designed lift-and-shift automation for migrating workloads from on-prem to hyperscalers.
• Led 4+ multi-cloud features for VMware on AWS.
• Built REST API abstraction for identity services across data centres and public clouds.
• Developed SQL-based schema mismatch detection tool, standardised API versioning across 90+ products.`);

    setJobDescription(`Product Manager at Dezerv - Wealth Management Fintech

At Dezerv, you'll help build a wealth management experience that thoughtfully combines technology with human expertise for affluent Indians.

As a Product Manager you will:
• Own and build intuitive, high-quality digital experiences across app and web that help clients manage their wealth with confidence at scale.
• Own end-to-end product flows for investment execution (SIPs, payments, settlements and reconciliations) ensuring high reliability and accuracy.
• Take end-to-end ownership of key client journeys - from problem discovery to shipped outcomes - driving clarity, prioritisation, and measurable impact.
• Work closely with design, engineering, platform, and business teams to translate complex financial concepts into simple, delightful user experiences.
• Operate with high autonomy, making product decisions that directly influence customer engagement, retention, and long-term business outcomes.

You'll be a great fit if you:
• Are confident yet humble, comfortable challenging ideas while staying open to feedback.
• Take strong ownership and aren't afraid to dive into details.
• Communicate clearly and structure problems to align cross-functional teams.
• Prefer outcomes over process, use frameworks as tools not rules.
• Are comfortable working with data to form opinions and make decisions.
• Have 2-3 years of experience in analytics, consulting, or product management.`);
  };

  const scoreColor = (score) => {
    if (score >= 75) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', ring: 'stroke-emerald-500' };
    if (score >= 55) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', ring: 'stroke-amber-500' };
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', ring: 'stroke-red-500' };
  };

  const categoryLabels = {
    hard_skill: 'Hard skills',
    domain: 'Domain',
    soft_signal: 'Soft signals',
    tool: 'Tools',
    experience: 'Experience'
  };

  const busy = isGenerating || isApplying;

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        .display-font { font-family: 'Fraunces', Georgia, serif; }
        .bullet-card:hover .copy-btn { opacity: 1; }
      `}</style>

      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-stone-50" />
            </div>
            <div>
              <h1 className="display-font text-xl font-semibold text-stone-900 leading-tight">Resume Tailor</h1>
              <p className="text-xs text-stone-500">POC v3 · with Apply Quick Wins</p>
            </div>
          </div>
          <button onClick={loadSample} className="text-sm text-stone-600 hover:text-stone-900 transition-colors underline underline-offset-4">
            Load sample data
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10 max-w-3xl">
          <h2 className="display-font text-4xl font-semibold text-stone-900 leading-tight mb-3">
            Tailor. Score. <span className="text-stone-400">Apply.</span>
          </h2>
          <p className="text-stone-600 leading-relaxed">
            Generate tailored bullets, see your ATS match score, then close the loop with one click — pick the Quick Wins you want and regenerate.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-200 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-stone-500" />
              <h3 className="text-sm font-semibold text-stone-900">Master Resume</h3>
              <span className="text-xs text-stone-400 ml-auto">{masterResume.length} chars</span>
            </div>
            <textarea
              value={masterResume}
              onChange={(e) => setMasterResume(e.target.value)}
              placeholder="Paste your complete master resume here."
              className="w-full h-72 p-5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none resize-none"
              style={{ fontFamily: '"JetBrains Mono", "SF Mono", Consolas, monospace', fontSize: '13px', lineHeight: '1.6' }}
            />
          </div>

          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-stone-500" />
              <h3 className="text-sm font-semibold text-stone-900">Job Description</h3>
              <span className="text-xs text-stone-400 ml-auto">{jobDescription.length} chars</span>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full JD."
              className="w-full h-72 p-5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none resize-none"
              style={{ fontFamily: '"JetBrains Mono", "SF Mono", Consolas, monospace', fontSize: '13px', lineHeight: '1.6' }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">PM Archetype</label>
              <div className="flex flex-wrap gap-2">
                {archetypes.map(a => (
                  <button key={a} onClick={() => setArchetype(a)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${archetype === a ? 'bg-stone-900 text-stone-50' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Seniority</label>
              <div className="flex flex-wrap gap-2">
                {seniorities.map(s => (
                  <button key={s} onClick={() => setSeniority(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${seniority === s ? 'bg-stone-900 text-stone-50' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <button
            onClick={generateResume}
            disabled={busy || !masterResume.trim() || !jobDescription.trim()}
            className="w-full md:w-auto px-8 py-4 bg-stone-900 text-stone-50 rounded-xl font-medium text-sm hover:bg-stone-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {stage || 'Working...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {result ? 'Regenerate from scratch' : 'Tailor & Score My Resume'}
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">{error}</div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* ATS Score Card */}
            {result.ats && (() => {
              const colors = scoreColor(result.ats.match_score);
              const circumference = 2 * Math.PI * 56;
              const offset = circumference - (result.ats.match_score / 100) * circumference;
              const delta = previousScore !== null ? result.ats.match_score - previousScore : null;
              return (
                <div className={`${colors.bg} ${colors.border} border rounded-xl p-6`}>
                  <div className="flex items-start gap-6 flex-wrap">
                    <div className="relative flex-shrink-0">
                      <svg width="140" height="140" className="-rotate-90">
                        <circle cx="70" cy="70" r="56" stroke="currentColor" strokeWidth="10" fill="none" className="text-stone-200" />
                        <circle cx="70" cy="70" r="56" strokeWidth="10" fill="none"
                          className={colors.ring}
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`display-font text-4xl font-semibold ${colors.text}`}>{result.ats.match_score}</span>
                        <span className="text-xs text-stone-500 -mt-1">/ 100</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <TrendingUp className={`w-5 h-5 ${colors.text}`} />
                        <h3 className={`display-font text-2xl font-semibold ${colors.text}`}>{result.ats.score_label}</h3>
                        {delta !== null && (
                          <span className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${delta > 0 ? 'bg-emerald-100 text-emerald-800' : delta < 0 ? 'bg-red-100 text-red-800' : 'bg-stone-100 text-stone-700'}`}>
                            {delta > 0 ? '+' : ''}{delta} from {previousScore}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${colors.text} leading-relaxed mb-4`}>{result.ats.summary}</p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {result.ats.categories && Object.entries(result.ats.categories).map(([cat, vals]) => (
                          <div key={cat} className="bg-white/60 rounded-lg px-3 py-2">
                            <div className="text-xs text-stone-500 mb-0.5">{categoryLabels[cat] || cat}</div>
                            <div className={`text-sm font-semibold ${colors.text}`}>{vals.satisfied}<span className="text-stone-400">/{vals.total}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Reset if there's a prior state */}
                  {previousScore !== null && result !== originalResult && (
                    <div className="mt-4 pt-4 border-t border-stone-200/50">
                      <button
                        onClick={resetToOriginal}
                        disabled={busy}
                        className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset to original tailored version
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="border-b border-stone-200 flex overflow-x-auto">
                {[
                  { id: 'bullets', label: 'Tailored Bullets' },
                  { id: 'satisfied', label: 'What Matched', count: result.ats?.satisfied_keywords?.length },
                  { id: 'addressable', label: 'Quick Wins', count: result.ats?.missing_addressable?.length, highlight: result.ats?.missing_addressable?.length > 0 },
                  { id: 'gaps', label: 'Real Gaps', count: result.ats?.missing_real_gaps?.length },
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === t.id ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-900'}`}>
                    {t.label}
                    {t.count !== undefined && (
                      <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${t.highlight && activeTab !== t.id ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'}`}>{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tailored Bullets tab */}
              {activeTab === 'bullets' && (
                <div>
                  {result.tailoring_notes && (
                    <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-900 leading-relaxed">{result.tailoring_notes}</p>
                      </div>
                    </div>
                  )}
                  <div className="px-6 py-3 border-b border-stone-100 flex items-center justify-end">
                    <button onClick={copyAll} className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md flex items-center gap-1.5 transition-colors">
                      {copiedIdx === 'all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedIdx === 'all' ? 'Copied' : 'Copy all'}
                    </button>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {result.tailored_experiences?.map((exp, expIdx) => (
                      <div key={expIdx} className="p-6">
                        <div className="flex items-baseline justify-between mb-1">
                          <h4 className="font-semibold" style={{ color: '#1F4E79' }}>{exp.company}</h4>
                          <span className="text-xs text-stone-500 italic">{exp.dates}</span>
                        </div>
                        <p className="text-sm italic mb-4" style={{ color: '#1F4E79' }}>{exp.role}</p>
                        <ul className="space-y-2.5">
                          {exp.bullets?.map((b, bIdx) => {
                            const key = `${expIdx}-${bIdx}`;
                            return (
                              <li key={bIdx} className="bullet-card group flex items-start gap-3 text-sm text-stone-800 leading-relaxed">
                                <span className="text-stone-400 mt-0.5">•</span>
                                <span className="flex-1">{b}</span>
                                <button onClick={() => copyBullet(b, key)} className="copy-btn opacity-0 transition-opacity flex-shrink-0 p-1 hover:bg-stone-100 rounded">
                                  {copiedIdx === key ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What Matched tab */}
              {activeTab === 'satisfied' && (
                <div className="p-6">
                  <p className="text-xs text-stone-500 mb-4">JD requirements your tailored resume already covers, with evidence.</p>
                  <div className="space-y-2">
                    {result.ats?.satisfied_keywords?.map((k, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-medium text-sm text-stone-900">{k.keyword}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-white text-stone-600 rounded">{categoryLabels[k.category] || k.category}</span>
                            {k.weight === 'must_have' && <span className="text-xs px-1.5 py-0.5 bg-stone-900 text-white rounded">must-have</span>}
                          </div>
                          <p className="text-xs text-stone-600">{k.evidence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Wins tab - the new interactive one */}
              {activeTab === 'addressable' && (
                <div>
                  {/* Sticky action bar */}
                  {result.ats?.missing_addressable?.length > 0 && (
                    <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 z-10">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-stone-900">
                              {selectedWins.size} of {result.ats.missing_addressable.length} selected
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <button onClick={selectAllWins} className="text-stone-600 hover:text-stone-900 underline underline-offset-2">
                              Select all
                            </button>
                            <span className="text-stone-300">·</span>
                            <button onClick={clearAllWins} className="text-stone-600 hover:text-stone-900 underline underline-offset-2">
                              Clear
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={applyQuickWins}
                          disabled={selectedWins.size === 0 || busy}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                        >
                          {isApplying ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {stage || 'Applying...'}
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              Apply {selectedWins.size > 0 ? `${selectedWins.size} ` : ''}Quick Win{selectedWins.size !== 1 ? 's' : ''}
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    <p className="text-xs text-stone-500 mb-4">
                      Missing keywords that you CAN add truthfully by rephrasing existing content. <strong className="text-stone-700">Select the ones you want to incorporate</strong> — Claude will regenerate the bullets and recompute the score.
                    </p>
                    {result.ats?.missing_addressable?.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-stone-900 mb-1">All addressable keywords covered</p>
                        <p className="text-xs text-stone-500">No quick wins left to apply.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {result.ats?.missing_addressable?.map((k, i) => {
                          const isSelected = selectedWins.has(i);
                          return (
                            <label
                              key={i}
                              className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected ? 'bg-amber-50 border-amber-400' : 'bg-white border-stone-200 hover:border-stone-300'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleWin(i)}
                                  className="mt-1 w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <span className="font-medium text-sm text-stone-900">{k.keyword}</span>
                                    <span className="text-xs px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">{categoryLabels[k.category] || k.category}</span>
                                    {k.weight === 'must_have' && <span className="text-xs px-1.5 py-0.5 bg-stone-900 text-white rounded">must-have</span>}
                                  </div>
                                  <div className="text-sm text-stone-700 leading-relaxed">
                                    <span className="font-medium text-stone-900">Suggested fix: </span>{k.fix_suggestion}
                                  </div>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Real Gaps tab */}
              {activeTab === 'gaps' && (
                <div className="p-6">
                  <p className="text-xs text-stone-500 mb-4">Things the JD asks for that you genuinely don't have. Address in cover letter or interview — don't fake it on the resume.</p>
                  {result.ats?.missing_real_gaps?.length === 0 ? (
                    <div className="text-center py-8 text-sm text-stone-500">No real gaps — strong match across the board.</div>
                  ) : (
                    <div className="space-y-3">
                      {result.ats?.missing_real_gaps?.map((k, i) => (
                        <div key={i} className="p-4 bg-red-50 border border-red-100 rounded-lg">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span className="font-medium text-sm text-stone-900">{k.keyword}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-white text-stone-600 rounded">{categoryLabels[k.category] || k.category}</span>
                            {k.weight === 'must_have' && <span className="text-xs px-1.5 py-0.5 bg-stone-900 text-white rounded">must-have</span>}
                          </div>
                          <div className="ml-6 text-sm text-stone-700 leading-relaxed">{k.why_it_matters}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-stone-200 text-xs text-stone-500 leading-relaxed">
          <strong className="text-stone-700">POC v3 — what's new:</strong> Quick Wins are now actionable. Select the ones you want, click "Apply", and Claude regenerates the bullets with those keywords incorporated (truthfully — no inventing). The score recomputes and shows the delta. Reset anytime to return to the original tailored version.
        </div>
      </main>
    </div>
  );
}