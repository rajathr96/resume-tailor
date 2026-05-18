import React, { useState } from 'react';
import { Sparkles, Copy, Check, AlertCircle, Loader2, Briefcase, Target, Wand2, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';

export default function ResumeBuilderPOC() {
  const [masterResume, setMasterResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [archetype, setArchetype] = useState('Fintech PM');
  const [seniority, setSeniority] = useState('APM / Associate PM');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('bullets');

  const archetypes = ['Fintech PM', 'Growth PM', 'Platform/Technical PM', 'Consumer PM', 'B2B/Enterprise PM', '0→1 / Product Strategy'];
  const seniorities = ['APM / Associate PM', 'PM (IC)', 'Senior PM', 'Group PM / Lead PM'];

  const callClaude = async (systemPrompt, userPrompt, maxTokens = 4000) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });
    const data = await response.json();
    const text = data.content.map(c => c.text || '').join('').trim();
    return text.replace(/```json\s*|\s*```/g, '').trim();
  };

  const generateResume = async () => {
    if (!masterResume.trim() || !jobDescription.trim()) {
      setError('Please provide both your master resume and the job description.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      setStage('Tailoring bullets for the role...');
      const tailorSystem = `You are an expert PM resume tailoring engine for ${archetype} roles at ${seniority} level.

CORE RULES (NON-NEGOTIABLE):
1. INFER, DON'T INVENT: You may reframe, re-emphasize, and surface implicit work from the master resume. You MUST NOT invent specific facts, numbers, company names, tools, frameworks, or claims not present in the source.
2. XYZ FORMAT (not STAR): Each bullet should follow "[Strong action verb] + [what you did with context/scope] + [quantified impact]". Bullets should be ~15-22 words, single line, punchy.
3. PRESERVE TRUTH: Never fabricate metrics. If the master resume says "improved CTR by 25%", keep 25%. Never round up, embellish, or invent numbers.
4. ARCHETYPE LENS: Tailor for ${archetype}. Surface bullets and angles most relevant to this archetype. Reframe technical work through this lens where defensible.
5. SENIORITY CALIBRATION: For ${seniority}, emphasize the appropriate signals (APM: execution, learning, structured thinking | PM: ownership, cross-functional delivery | Senior: influence, strategy | Group/Lead: org-level impact, mentoring).
6. KEYWORD INTEGRATION: Weave JD keywords into bullets naturally, never stuff.

OUTPUT FORMAT (return ONLY this JSON, no markdown):
{
  "tailored_experiences": [
    {"company": "...", "role": "...", "dates": "...", "bullets": ["...", "..."]}
  ],
  "tailoring_notes": "2-3 sentences explaining tailoring decisions.",
  "gaps": ["gap 1", "gap 2"]
}`;

      const tailorUser = `MASTER RESUME:\n${masterResume}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription}\n\n---\n\nGenerate the tailored resume. Return ONLY the JSON.`;
      const tailoredText = await callClaude(tailorSystem, tailorUser, 4000);
      const tailored = JSON.parse(tailoredText);

      setStage('Running ATS keyword analysis...');
      const tailoredResumeText = tailored.tailored_experiences.map(e =>
        `${e.company} | ${e.role} | ${e.dates}\n${e.bullets.map(b => '• ' + b).join('\n')}`
      ).join('\n\n');

      const atsSystem = `You are an ATS (Applicant Tracking System) and recruiter analysis engine. You analyze how well a tailored resume matches a job description, with the rigor of a real recruiter — not a naive keyword counter.

ANALYSIS METHODOLOGY:
1. Extract keywords/requirements from the JD and categorize each as:
   - "hard_skill" (e.g., SQL, Python, A/B testing)
   - "domain" (e.g., fintech, wealth management, payments)
   - "soft_signal" (e.g., ownership, ambiguity, cross-functional)
   - "tool" (e.g., Jira, Figma, GCP)
   - "experience" (e.g., 2-3 years PM, MBA, fintech background)
2. Weight each as "must_have" (explicitly required, repeated, or central to the role) or "nice_to_have"
3. For each keyword, check if it's satisfied in the tailored resume — using SEMANTIC matching, not literal. "A/B testing" matches "experimentation". "Led" matches "owned". Be generous but accurate.
4. For satisfied keywords, identify WHICH bullet/section covers it
5. For unsatisfied keywords, classify as:
   - "addressable" — could be added truthfully via rephrasing existing content
   - "real_gap" — genuinely missing experience that requires new content

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

      const atsUser = `JOB DESCRIPTION:\n${jobDescription}\n\n---\n\nTAILORED RESUME:\n${tailoredResumeText}\n\n---\n\nAnalyze the match. Return ONLY the JSON.`;
      const atsText = await callClaude(atsSystem, atsUser, 4000);
      const ats = JSON.parse(atsText);

      setStage('');
      setResult({ ...tailored, ats });
      setActiveTab('bullets');
    } catch (err) {
      setError(`Generation failed: ${err.message}. Try again or simplify your input.`);
      setStage('');
    } finally {
      setIsGenerating(false);
    }
  };

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
    setMasterResume(`RAJATH R | IIM Bangalore MBA 2023-25 | BTech IT Manipal 2015-19

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
              <p className="text-xs text-stone-500">POC v2 · with ATS scoring</p>
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
            Tailor your resume.<br />
            <span className="text-stone-400">Know your ATS match score.</span>
          </h2>
          <p className="text-stone-600 leading-relaxed">
            Rewrites bullets in XYZ format for your target archetype, then scores how well the result matches the JD — with actionable, category-level gap analysis.
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
              placeholder="Paste the full JD — responsibilities, requirements, qualifications."
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
            disabled={isGenerating || !masterResume.trim() || !jobDescription.trim()}
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
                Tailor & Score My Resume
              </>
            )}
          </button>
          {isGenerating && (
            <p className="mt-2 text-xs text-stone-500">Two-pass generation: tailoring bullets, then scoring against ATS. Takes ~25s.</p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">{error}</div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {result.ats && (() => {
              const colors = scoreColor(result.ats.match_score);
              const circumference = 2 * Math.PI * 56;
              const offset = circumference - (result.ats.match_score / 100) * circumference;
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
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className={`w-5 h-5 ${colors.text}`} />
                        <h3 className={`display-font text-2xl font-semibold ${colors.text}`}>{result.ats.score_label}</h3>
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
                </div>
              );
            })()}

            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="border-b border-stone-200 flex overflow-x-auto">
                {[
                  { id: 'bullets', label: 'Tailored Bullets' },
                  { id: 'satisfied', label: 'What Matched', count: result.ats?.satisfied_keywords?.length },
                  { id: 'addressable', label: 'Quick Wins', count: result.ats?.missing_addressable?.length },
                  { id: 'gaps', label: 'Real Gaps', count: result.ats?.missing_real_gaps?.length },
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === t.id ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-900'}`}>
                    {t.label}
                    {t.count !== undefined && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-stone-100 text-stone-700 rounded-full">{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

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

              {activeTab === 'addressable' && (
                <div className="p-6">
                  <p className="text-xs text-stone-500 mb-4">Missing keywords that you CAN add truthfully by rephrasing existing content. Highest-leverage fixes.</p>
                  {result.ats?.missing_addressable?.length === 0 ? (
                    <div className="text-center py-8 text-sm text-stone-500">No quick wins — every addressable keyword is already covered.</div>
                  ) : (
                    <div className="space-y-3">
                      {result.ats?.missing_addressable?.map((k, i) => (
                        <div key={i} className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span className="font-medium text-sm text-stone-900">{k.keyword}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-white text-stone-600 rounded">{categoryLabels[k.category] || k.category}</span>
                            {k.weight === 'must_have' && <span className="text-xs px-1.5 py-0.5 bg-stone-900 text-white rounded">must-have</span>}
                          </div>
                          <div className="ml-6 text-sm text-stone-700 leading-relaxed">
                            <span className="font-medium text-stone-900">Fix: </span>{k.fix_suggestion}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
          <strong className="text-stone-700">POC v2:</strong> Two-pass pipeline — bullet tailoring + ATS scoring. The score weights must-haves 2× and uses semantic matching, not literal keyword stuffing. Quick Wins are the highest-leverage tab — fix those first.
        </div>
      </main>
    </div>
  );
}