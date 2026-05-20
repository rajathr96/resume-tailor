'use client';
import React, { useState } from 'react';
import { Sparkles, Copy, Check, AlertCircle, Loader2, Briefcase, Target, Wand2, TrendingUp, CheckCircle2, XCircle, Lightbulb, Zap, RotateCcw, ArrowRight, FileText, ChevronLeft } from 'lucide-react';

export default function ResumeBuilderPOC() {
  const [mode, setMode] = useState('select'); // 'select' | 'master' | 'tailor'

  // Master builder state
  const [rawNotes, setRawNotes] = useState('');
  const [isBuildingMaster, setIsBuildingMaster] = useState(false);
  const [masterResult, setMasterResult] = useState(null);
  const [masterError, setMasterError] = useState(null);

  // Tailor state
  const [masterResume, setMasterResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [archetype, setArchetype] = useState('Fintech PM');
  const [seniority, setSeniority] = useState('APM / Associate PM');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);
  const [originalResult, setOriginalResult] = useState(null);
  const [previousScore, setPreviousScore] = useState(null);
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

    const systemPrompt = `You are a senior ATS architect and talent acquisition specialist with 15+ years of experience building ATS platforms, calibrating resume parsers, and advising hiring teams at high-growth tech companies and Fortune 500s. You have personally reviewed hundreds of thousands of resumes and know exactly how modern ATS systems (Workday, Greenhouse, Lever, iCIMS, Taleo) score, rank, and filter candidates before a human ever sees the resume.

You think in three layers simultaneously:
1. MACHINE LAYER — how the ATS parser tokenizes and scores the resume against the JD
2. RECRUITER LAYER — what a 30-second human scan picks up after the ATS passes it through
3. HIRING MANAGER LAYER — what signals actually matter for the role and seniority level

EXTRACTION RULES:
- Read the JD for both explicit requirements (stated) and implicit ones (implied by role level, company type, industry)
- Distinguish between HARD requirements (dealbreakers — often in "You must have" / "Required" sections) and PREFERRED ones ("Nice to have" / "Preferred")
- Extract keywords at multiple granularities: exact phrases, concept-level signals, and industry jargon variants
- Categorize each as: hard_skill | domain | soft_signal | tool | experience
- Assign weight: "must_have" (dealbreaker if missing) or "nice_to_have"

MATCHING RULES — think like a semantic ATS, not a grep:
- Exact match scores highest: "A/B testing" in JD and "A/B testing" in resume
- Synonym match scores next: "experimentation" ≈ "A/B testing", "owned" ≈ "led" ≈ "drove", "cross-functional" ≈ "worked across teams"
- Concept match scores lowest but still counts: a bullet about "reducing churn by 15%" satisfies "retention" even without the word
- Recent experience (last 1-2 roles) carries 2× the weight of older experience for the same keyword
- A keyword buried in a weak context ("familiar with") counts less than one in an achievement bullet
- DO NOT match on generic filler words ("results-driven", "passionate", "team player") — these are noise

SCORING — compute TWO independent scores:

1. STANDARD ATS SCORE (ats_standard_score):
   Simulate how a real ATS parser scores — pure lexical/surface matching, no inference.
   - Extract every distinct keyword, phrase, and requirement token from the JD
   - Count only exact matches or near-exact matches (plural/singular, tense variants: "led"/"leads", acronym expansions: "ML"/"machine learning")
   - NO semantic inference, NO synonym substitution — if the word isn't present, it doesn't count
   - score = (matched tokens / total JD tokens) × 100, rounded to integer
   - ats_standard_label: "ATS Pass" (≥60) | "ATS Borderline" (40–59) | "ATS Fail" (<40)
   This is what Workday, Taleo, and Greenhouse actually compute before a human sees the resume.

2. SMART MATCH SCORE (match_score):
   Your expert semantic score — the one that matters for the candidate's actual fit.
   - score = (Σ weight of satisfied keywords) / (Σ weight of all keywords) × 100
   - must_have weight = 3, nice_to_have weight = 1
   - Penalise 5 points if any single must_have keyword is completely absent
   - Round to nearest integer
   - score_label: "Strong fit" (≥75) | "Moderate fit" (55–74) | "Weak fit" (<55)

GAP CLASSIFICATION:
- "addressable" = the underlying experience exists in the resume but the language doesn't surface it. A reframe or added keyword would truthfully cover it.
- "real_gap" = the candidate genuinely hasn't done this. No amount of rewording fixes it. Flag these honestly — a recruiter will catch fabrications in the interview.

fix_suggestion for addressable gaps must be concrete and reframeable from existing content, not a suggestion to invent new facts.

OUTPUT (return ONLY this JSON, no markdown):
{
  "ats_standard_score": 54,
  "ats_standard_label": "ATS Borderline",
  "match_score": 73,
  "score_label": "Strong fit",
  "summary": "2-3 sentence recruiter-level honest assessment covering overall fit, strongest signal, and the single biggest risk.",
  "categories": {
    "hard_skill": {"satisfied": 4, "total": 5},
    "domain": {"satisfied": 2, "total": 3},
    "soft_signal": {"satisfied": 5, "total": 5},
    "tool": {"satisfied": 1, "total": 2},
    "experience": {"satisfied": 2, "total": 2}
  },
  "satisfied_keywords": [
    {"keyword": "...", "category": "hard_skill", "weight": "must_have", "evidence": "exact bullet or phrase that covers this"}
  ],
  "missing_addressable": [
    {"keyword": "...", "category": "...", "weight": "must_have", "fix_suggestion": "specific reframe of existing content — do not invent facts"}
  ],
  "missing_real_gaps": [
    {"keyword": "...", "category": "...", "weight": "must_have", "why_it_matters": "why this matters for the role and what it signals to a hiring manager"}
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

  const buildMasterResume = async () => {
    if (!rawNotes.trim()) return;
    setIsBuildingMaster(true);
    setMasterError(null);
    setMasterResult(null);
    try {
      const systemPrompt = `You are a senior career coach and resume strategist with 20+ years of experience helping professionals land roles at top-tier companies. You specialise in listening to someone's career story — the way they'd tell it to a friend — and translating it into sharp, credible resume bullets that capture the real impact behind the narrative.

YOUR JOB:
The user will narrate their work experiences in plain, conversational language — stories, not structured notes. Your job is to put on two hats simultaneously:

HAT 1 — CAREER COACH: Listen holistically. Identify what the person actually accomplished, what skills they demonstrated, what problems they solved, what decisions they owned, and what impact they drove — even if they didn't frame it that way themselves. Surface the signal hidden in the story.

HAT 2 — RESUME STRATEGIST: Convert those insights into tight, credible resume bullets that a hiring manager would find compelling and an ATS would rank highly.

EXTRACTION RULES — read the story, then ask yourself:
- What did this person OWN vs just contribute to?
- What CHANGED because of their work? (metric, speed, revenue, quality, scale)
- What was the SCOPE? (team size, user base, revenue, number of systems/products)
- What DECISIONS did they make under ambiguity?
- What CROSS-FUNCTIONAL work happened that shows influence beyond their role?
- What SKILLS are implied but not stated? (e.g. "got all teams aligned" implies stakeholder management)

BULLET WRITING RULES:
1. XYZ FORMAT: "[Strong action verb] + [what you did with scope/context] + [quantified impact]". ~15-22 words, single line.
2. STRONG OPENING VERBS: Owned, Led, Built, Drove, Launched, Designed, Incubated, Scaled, Reduced, Negotiated, Spearheaded, Synthesised, Streamlined.
3. QUANTIFY EVERYTHING POSSIBLE: Use numbers from the story exactly. If no number is given but scope is inferable (e.g. "our whole team" → infer team size if mentioned), surface it. Never fabricate specific numbers.
4. INFER, DON'T INVENT: You may reframe, elevate language, and surface implicit impact. You must NOT add facts, metrics, tools, or claims not grounded in the story.
5. ONE BULLET PER DISTINCT ACHIEVEMENT: Don't bundle unrelated wins into one bullet. Split them.
6. INCLUDE EVERYTHING: This is a master resume — capture all roles and all meaningful stories. Nothing gets left out.

OUTPUT (return ONLY this JSON, no markdown):
{
  "master_experiences": [
    {"company": "...", "role": "...", "dates": "...", "bullets": ["...", "..."]}
  ]
}`;
      const userPrompt = `RAW EXPERIENCE NOTES:\n${rawNotes}\n\nBuild the master resume. Return ONLY the JSON.`;
      const text = await callClaude(systemPrompt, userPrompt, 4000);
      const parsed = JSON.parse(text);
      setMasterResult(parsed);
    } catch (err) {
      setMasterError(`Build failed: ${err.message}. Try again.`);
    } finally {
      setIsBuildingMaster(false);
    }
  };

  const masterResultToPlainText = (experiences) =>
    experiences.map(e =>
      `${e.company} | ${e.role} | ${e.dates}\n${e.bullets.map(b => `• ${b}`).join('\n')}`
    ).join('\n\n');

  const useForTailoring = () => {
    if (!masterResult) return;
    setMasterResume(masterResultToPlainText(masterResult.master_experiences));
    setMode('tailor');
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
            {mode !== 'select' && (
              <button onClick={() => setMode('select')} className="mr-1 p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-stone-600" />
              </button>
            )}
            <div className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-stone-50" />
            </div>
            <div>
              <h1 className="display-font text-xl font-semibold text-stone-900 leading-tight">Resume Tailor</h1>
              <p className="text-xs text-stone-500">
                {mode === 'select' ? 'What would you like to do?' : mode === 'master' ? 'Build Master Resume' : 'Tailor for a Role'}
              </p>
            </div>
          </div>
          {mode === 'tailor' && (
            <button onClick={loadSample} className="text-sm text-stone-600 hover:text-stone-900 transition-colors underline underline-offset-4">
              Load sample data
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* ── MODE SELECTION ── */}
        {mode === 'select' && (
          <div>
            <div className="mb-10 max-w-2xl">
              <h2 className="display-font text-4xl font-semibold text-stone-900 leading-tight mb-3">
                Where do you want to start?
              </h2>
              <p className="text-stone-600 leading-relaxed">
                Build a polished master resume from scratch, or jump straight to tailoring an existing one for a specific role.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-5 max-w-3xl">
              <button
                onClick={() => setMode('master')}
                className="group text-left bg-white border-2 border-stone-200 hover:border-stone-900 rounded-2xl p-7 transition-all duration-200 hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-stone-100 group-hover:bg-stone-900 flex items-center justify-center mb-5 transition-colors">
                  <FileText className="w-6 h-6 text-stone-600 group-hover:text-stone-50 transition-colors" />
                </div>
                <h3 className="display-font text-xl font-semibold text-stone-900 mb-2">Build Master Resume</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Narrate your work stories the way you'd tell them to a friend. A career coach extracts the strongest resume bullets from your narrative.
                </p>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-stone-400 group-hover:text-stone-900 transition-colors">
                  Tell your story <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <button
                onClick={() => setMode('tailor')}
                className="group text-left bg-white border-2 border-stone-200 hover:border-stone-900 rounded-2xl p-7 transition-all duration-200 hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-stone-100 group-hover:bg-stone-900 flex items-center justify-center mb-5 transition-colors">
                  <Target className="w-6 h-6 text-stone-600 group-hover:text-stone-50 transition-colors" />
                </div>
                <h3 className="display-font text-xl font-semibold text-stone-900 mb-2">Tailor for a Role</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Have a master resume already? Paste it alongside a job description and get tailored bullets, ATS scoring, and actionable Quick Wins.
                </p>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-stone-400 group-hover:text-stone-900 transition-colors">
                  I have a master resume <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── MASTER RESUME BUILDER ── */}
        {mode === 'master' && (
          <div>
            <div className="mb-8 max-w-3xl">
              <h2 className="display-font text-4xl font-semibold text-stone-900 leading-tight mb-3">
                Build your <span className="text-stone-400">master resume.</span>
              </h2>
              <p className="text-stone-600 leading-relaxed">
                Just tell your story the way you'd explain it to a friend. No structure, no bullet points needed — narrate what you worked on, what problems you solved, what changed because of you. The AI will act as your career coach and extract the strongest resume bullets from your narrative.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-5">
              <div className="px-5 py-3 border-b border-stone-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-stone-500" />
                <h3 className="text-sm font-semibold text-stone-900">Raw Experience Notes</h3>
                <span className="text-xs text-stone-400 ml-auto">{rawNotes.length} chars</span>
              </div>
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder={`Just tell your story — no structure needed. For example:\n\n"At Stripe I was on the fraud team. We had this big problem where our manual review queue was taking 3 days to clear and merchants were losing money. I basically took it on myself to figure out why. I ran a bunch of interviews with the ops team, mapped out the whole workflow, and realised 60% of cases were getting rerouted because of a broken triage rule. I rewrote the logic, got eng to ship it in a sprint, and the queue time dropped to under 4 hours. My manager said it saved us around $2M in chargeback exposure that quarter."\n\nTell me about your roles, what you worked on, problems you solved, decisions you made, outcomes you drove. I'll extract the resume bullets.`}
                className="w-full h-80 p-5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none resize-none"
                style={{ fontFamily: '"JetBrains Mono", "SF Mono", Consolas, monospace', fontSize: '13px', lineHeight: '1.6' }}
              />
            </div>

            <button
              onClick={buildMasterResume}
              disabled={isBuildingMaster || !rawNotes.trim()}
              className="px-8 py-4 bg-stone-900 text-stone-50 rounded-xl font-medium text-sm hover:bg-stone-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm mb-6"
            >
              {isBuildingMaster ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Building master resume...</>
              ) : (
                <><Sparkles className="w-4 h-4" />{masterResult ? 'Rebuild' : 'Build Master Resume'}</>
              )}
            </button>

            {masterError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">{masterError}</div>
              </div>
            )}

            {masterResult && (
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-stone-900">Master Resume Built</span>
                    <span className="text-xs text-stone-400">· {masterResult.master_experiences.length} roles</span>
                  </div>
                  <button
                    onClick={useForTailoring}
                    className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-xs font-medium hover:bg-stone-800 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    Use for Role Tailoring <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-stone-100">
                  {masterResult.master_experiences.map((exp, expIdx) => (
                    <div key={expIdx} className="p-6">
                      <div className="flex items-baseline justify-between mb-1">
                        <h4 className="font-semibold" style={{ color: '#1F4E79' }}>{exp.company}</h4>
                        <span className="text-xs text-stone-500 italic">{exp.dates}</span>
                      </div>
                      <p className="text-sm italic mb-4" style={{ color: '#1F4E79' }}>{exp.role}</p>
                      <ul className="space-y-2.5">
                        {exp.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-3 text-sm text-stone-800 leading-relaxed">
                            <span className="text-stone-400 mt-0.5">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAILOR FOR A ROLE ── */}
        {mode === 'tailor' && (
        <div>
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
                      {result.ats.ats_standard_score !== undefined && (() => {
                        const s = result.ats.ats_standard_score;
                        const stdColor = s >= 60 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : s >= 40 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800';
                        return (
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium mb-3 ${stdColor}`}>
                            <span className="font-bold text-sm">{s}</span>
                            <span className="opacity-70">/100</span>
                            <span className="mx-1 opacity-30">·</span>
                            <span>{result.ats.ats_standard_label}</span>
                            <span className="opacity-50 ml-1">(Standard ATS)</span>
                          </div>
                        );
                      })()}
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
        </div>
        )}

      </main>
    </div>
  );
}