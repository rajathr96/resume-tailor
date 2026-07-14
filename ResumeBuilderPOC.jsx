'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, Check, AlertCircle, Loader2, Briefcase, Target, Wand2, TrendingUp, CheckCircle2, XCircle, Lightbulb, Zap, RotateCcw, ArrowRight, FileText, ChevronLeft, Pencil, X, Upload, FileUp, Download } from 'lucide-react';

export default function ResumeBuilderPOC() {
  const [mode, setMode] = useState('input'); // 'input' | 'output'

  // Master builder state
  const [rawNotes, setRawNotes] = useState('');
  const [isBuildingMaster, setIsBuildingMaster] = useState(false);
  const [masterResult, setMasterResult] = useState(null);
  const [masterError, setMasterError] = useState(null);
  const [inputMode, setInputMode] = useState('story'); // 'story' | 'upload'
  const [personalInfo, setPersonalInfo] = useState({ name: '', title: '', email: '', phone: '', location: '', linkedin: '' });
  const [newSkill, setNewSkill] = useState('');
  const [tailoredNewSkill, setTailoredNewSkill] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('template1');
  const [selectedTailoredTemplate, setSelectedTailoredTemplate] = useState('template1');
  const [layoutMode, setLayoutMode] = useState('split'); // 'split' | 'stack'
  const [hoveredKeyword, setHoveredKeyword] = useState(null);
  const [hoveredType, setHoveredType] = useState(null); // 'match' | 'gap'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  // Inline edit + per-bullet refine state
  const [editingKey, setEditingKey] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [refineKey, setRefineKey] = useState(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const textareaRef = useRef(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [addSectionForm, setAddSectionForm] = useState({ name: '', from: '', to: '', details: '', position: '' });
  const [extraSections, setExtraSections] = useState([]);
  const [customIdCounter, setCustomIdCounter] = useState(0);
  const [t1SectionOrder, setT1SectionOrder] = useState(null);
  const [t2SectionOrder, setT2SectionOrder] = useState(null);

  // Document-level rewrite state
  const [docRefinePrompt, setDocRefinePrompt] = useState('');
  const [isDocRefining, setIsDocRefining] = useState(false);

  // Tailor state
  const [masterResume, setMasterResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jdInputMode, setJdInputMode] = useState('text'); // 'text' | 'url'
  const [jdUrl, setJdUrl] = useState('');
  const [isFetchingJd, setIsFetchingJd] = useState(false);
  const [jdFetchError, setJdFetchError] = useState(null);
  const [archetype, setArchetype] = useState('Fintech PM');
  const [seniority, setSeniority] = useState('APM / Associate PM');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generateAllStage, setGenerateAllStage] = useState('');
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

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('resume-tailor-state');
      if (!saved) return;
      const s = JSON.parse(saved);
      if (s.mode === 'input' || s.mode === 'output') setMode(s.mode);
      if (s.rawNotes) setRawNotes(s.rawNotes);
      if (s.masterResult) setMasterResult(s.masterResult);
      if (s.archetype) setArchetype(s.archetype);
      if (s.seniority) setSeniority(s.seniority);
      if (s.masterResume) setMasterResume(s.masterResume);
      if (s.jobDescription) setJobDescription(s.jobDescription);
      if (s.result) setResult(s.result);
      if (s.originalResult) setOriginalResult(s.originalResult);
      if (s.activeTab) setActiveTab(s.activeTab);
      if (s.personalInfo) setPersonalInfo(s.personalInfo);
    } catch (_) {}
  }, []);

  // Persist state on every relevant change
  useEffect(() => {
    try {
      localStorage.setItem('resume-tailor-state', JSON.stringify({
        mode, rawNotes, masterResult, archetype, seniority,
        masterResume, jobDescription, result, originalResult, activeTab, personalInfo,
      }));
    } catch (_) {}
  }, [mode, rawNotes, masterResult, archetype, seniority, masterResume, jobDescription, result, originalResult, activeTab, personalInfo]);

  // Highlight a keyword in a text string — returns a React node array with <mark> spans
  const highlightText = (text, keyword) => {
    if (!keyword || !text) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase()
        ? <mark key={i} style={{ backgroundColor: '#fef08a', borderRadius: '2px', padding: '0 2px', color: 'inherit' }}>{part}</mark>
        : part
    );
  };

  const renderBullet = (text, keyword) => {
    if (!text) return text;
    if (!text.includes('**')) return highlightText(text, keyword);
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        const inner = part.slice(2, -2);
        return <strong key={i}>{highlightText(inner, keyword) || inner}</strong>;
      }
      return <React.Fragment key={i}>{highlightText(part, keyword)}</React.Fragment>;
    });
  };

  const applyBold = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      const newText = editingText.slice(0, start) + '****' + editingText.slice(end);
      setEditingText(newText);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 2); }, 0);
    } else {
      const selected = editingText.slice(start, end);
      const newText = editingText.slice(0, start) + `**${selected}**` + editingText.slice(end);
      setEditingText(newText);
    }
  };

  const archetypes = ['Fintech PM', 'Growth PM', 'Platform/Technical PM', 'Consumer PM', 'B2B/Enterprise PM', '0→1 / Product Strategy'];
  const seniorities = ['APM / Associate PM', 'PM (IC)', 'Senior PM', 'Group PM / Lead PM'];

  const exportToPDF = (mr, pi) => {
    const info = pi || personalInfo;
    const contactParts = [info.email, info.phone, info.location, info.linkedin].filter(Boolean);
    const boldToHtml = t => t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

    const expHtml = mr.master_experiences.map(e => `
      <div class="exp-block">
        <div class="exp-row">
          <span class="exp-title">${e.role} | ${e.company}</span>
          <span class="exp-dates">${e.dates}</span>
        </div>
        <ul>${e.bullets.map(b => `<li>${boldToHtml(b)}</li>`).join('')}</ul>
      </div>`).join('');

    const eduHtml = mr.education?.length ? mr.education.map(e => `
      <div class="exp-block">
        <div class="exp-row">
          <span class="exp-title">${e.degree}${e.field ? `, ${e.field}` : ''}</span>
          <span class="exp-dates">${e.dates ?? ''}</span>
        </div>
        <div class="edu-institution">${e.institution}</div>
      </div>`).join('') : '';

    const skillsChunks = [];
    const skills = mr.skills ?? [];
    for (let i = 0; i < skills.length; i += 6) skillsChunks.push(skills.slice(i, i + 6));
    const skillsHtml = skillsChunks.map(row => `<div class="skills-line">${row.join(' • ')}</div>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${info.name || 'Resume'}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Calibri, Arial, sans-serif; font-size:10.5pt; color:#1a1a1a; padding:32px 48px; line-height:1.45; }
  .name { font-size:26pt; font-weight:bold; color:#1a1a1a; }
  .prof-title { font-size:11pt; color:#555; margin:2px 0 5px; }
  .contact { text-align:center; font-size:9.5pt; color:#333; margin:4px 0 8px; }
  .top-rule { border:none; border-top:1.5px solid #1F4E79; margin:6px 0 14px; }
  .section-header { color:#1F4E79; font-weight:bold; font-size:10pt; text-transform:uppercase; letter-spacing:0.08em; margin:14px 0 2px; }
  .section-rule { border:none; border-top:1px solid #1F4E79; margin:2px 0 10px; }
  .summary { font-size:10.5pt; line-height:1.5; margin-bottom:4px; }
  .exp-block { margin-bottom:11px; }
  .exp-row { display:flex; justify-content:space-between; align-items:baseline; }
  .exp-title { font-weight:bold; font-size:10.5pt; }
  .exp-dates { font-size:9.5pt; color:#444; }
  ul { padding-left:16px; margin-top:3px; }
  li { font-size:10pt; margin-bottom:3px; }
  .edu-institution { font-size:10pt; color:#555; margin-top:1px; }
  .skills-line { font-size:10pt; margin-bottom:3px; }
  @media print { body { padding:20px 36px; } @page { margin:0.5in; } }
</style></head>
<body>
  <div class="name">${info.name || 'Your Name'}</div>
  <div class="prof-title">${info.title || 'Your Title / Profession'}</div>
  <div class="contact">${contactParts.length ? contactParts.join(' | ') : 'email@example.com | (123) 456-7890 | City, Country | linkedin.com/in/yourname'}</div>
  <hr class="top-rule"/>

  ${mr.summary ? `
  <div class="section-header">Professional Summary</div>
  <hr class="section-rule"/>
  <div class="summary">${mr.summary}</div>` : ''}

  <div class="section-header">Work Experience</div>
  <hr class="section-rule"/>
  ${expHtml}

  ${eduHtml ? `
  <div class="section-header">Education</div>
  <hr class="section-rule"/>
  ${eduHtml}` : ''}

  ${skillsHtml ? `
  <div class="section-header">Skills</div>
  <hr class="section-rule"/>
  ${skillsHtml}` : ''}

  ${extraSections.length ? extraSections.map(sec => `
  <div class="section-header">${sec.name}</div>
  <hr class="section-rule"/>
  <div class="exp-block">
    <div class="exp-row">
      <ul style="padding-left:16px;margin:0;">${sec.bullets.map(b => `<li style="font-size:10pt;margin-bottom:2px;">${b}</li>`).join('')}</ul>
      ${(sec.from || sec.to) ? `<span class="exp-dates">${[sec.from, sec.to].filter(Boolean).join(' – ')}</span>` : ''}
    </div>
  </div>`).join('') : ''}
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  };

  const exportToPDFTemplate2 = (mr, pi) => {
    const info = pi || personalInfo;
    const contactParts = [
      info.phone ?? null,
      info.email ?? null,
      info.linkedin ?? null,
      info.location ?? null,
    ].filter(Boolean);
    const boldToHtml = t => t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

    const expHtml = mr.master_experiences.map(e => `
      <div class="exp-block">
        <div class="exp-title">${e.role}</div>
        <div class="exp-company">${e.company}</div>
        <div class="exp-dates">${e.dates}</div>
        <ul>${e.bullets.map(b => `<li>${boldToHtml(b)}</li>`).join('')}</ul>
      </div>`).join('');

    const eduHtml = mr.education?.length ? mr.education.map(e => `
      <div class="edu-block">
        <div class="edu-degree">${e.degree}${e.field ? `, ${e.field}` : ''}</div>
        <div class="edu-institution">${e.institution}</div>
        <div class="edu-dates">${e.dates ?? ''}</div>
      </div>`).join('') : '';

    const topRoles = mr.master_experiences.slice(0, 2);
    const achievementsHtml = topRoles.map(e => e.bullets?.[0] ? `
      <div class="achievement-block">
        <div class="achievement-title">${e.company}</div>
        <div class="achievement-desc">${e.bullets[0]}</div>
      </div>` : '').join('');

    const skillsHtml = (mr.skills ?? []).join(', ');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${info.name || 'Resume'}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { height:100%; }
  body { font-family: Calibri, Arial, sans-serif; font-size:9pt; color:#1a1a1a; padding:14px 22px; line-height:1.3; }
  .header { margin-bottom:8px; padding-bottom:7px; border-bottom:1px solid #bbb; }
  .name { font-size:20pt; font-weight:900; color:#1a1a1a; text-transform:uppercase; letter-spacing:0.02em; line-height:1.05; }
  .prof-title { font-size:9.5pt; font-weight:600; color:#1F4E79; margin:2px 0 3px; }
  .contact-row { font-size:8pt; color:#444; display:flex; gap:12px; flex-wrap:wrap; }
  .two-col { display:flex; gap:18px; }
  .left-col { flex:0 0 54%; }
  .right-col { flex:1; min-width:0; }
  .section-header { font-weight:bold; font-size:8.5pt; text-transform:uppercase; letter-spacing:0.07em; color:#1a1a1a; margin-top:9px; margin-bottom:1px; }
  .section-rule { border:none; border-top:1px solid #1a1a1a; margin:1px 0 5px; }
  .exp-block { margin-bottom:7px; }
  .exp-title { font-weight:bold; font-size:9pt; }
  .exp-company { font-size:8pt; color:#1F4E79; font-weight:600; }
  .exp-dates { font-size:7.5pt; color:#666; margin:1px 0 2px; }
  ul { padding-left:12px; margin-top:2px; }
  li { font-size:8.5pt; margin-bottom:1px; line-height:1.3; }
  .summary-text { font-size:8.5pt; line-height:1.4; }
  .edu-block { margin-bottom:6px; }
  .edu-degree { font-weight:bold; font-size:8.5pt; }
  .edu-institution { color:#1F4E79; font-weight:600; font-size:8pt; }
  .edu-dates { font-size:7.5pt; color:#666; margin-top:1px; }
  .achievement-block { margin-bottom:5px; }
  .achievement-title { font-weight:bold; font-size:8.5pt; }
  .achievement-desc { font-size:8pt; color:#444; margin-top:1px; line-height:1.3; }
  .skills-text { font-size:8.5pt; line-height:1.5; }
  @media print { body { padding:10px 18px; } @page { size:letter; margin:0.3in; } }
</style></head>
<body>
  <div class="header">
    <div class="name">${info.name || 'YOUR NAME'}</div>
    <div class="prof-title">${info.title || 'Your Professional Title'}</div>
    <div class="contact-row">${contactParts.join(' &nbsp;·&nbsp; ') || '000-000-0000 &nbsp;·&nbsp; you@email.com &nbsp;·&nbsp; LinkedIn &nbsp;·&nbsp; City, State'}</div>
  </div>
  <div class="two-col">
    <div class="left-col">
      <div class="section-header">Experience</div>
      <hr class="section-rule"/>
      ${expHtml}
    </div>
    <div class="right-col">
      ${mr.summary ? `<div class="section-header">Summary</div><hr class="section-rule"/><div class="summary-text">${mr.summary}</div>` : ''}
      ${eduHtml ? `<div class="section-header">Education</div><hr class="section-rule"/>${eduHtml}` : ''}
      ${achievementsHtml ? `<div class="section-header">Key Achievements</div><hr class="section-rule"/>${achievementsHtml}` : ''}
      ${skillsHtml ? `<div class="section-header">Skills</div><hr class="section-rule"/><div class="skills-text">${skillsHtml}</div>` : ''}
      ${extraSections.length ? extraSections.map(sec => `<div class="section-header">${sec.name}</div><hr class="section-rule"/><div style="margin-bottom:5px;"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;"><ul style="padding-left:12px;margin:0;">${sec.bullets.map(b => `<li style="font-size:8.5pt;margin-bottom:1px;">${b}</li>`).join('')}</ul>${(sec.from || sec.to) ? `<span style="font-size:7.5pt;color:#666;white-space:nowrap;">${[sec.from, sec.to].filter(Boolean).join(' – ')}</span>` : ''}</div></div>`).join('') : ''}
    </div>
  </div>
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  };

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

  const fetchJd = async () => {
    if (!jdUrl.trim()) return;
    setIsFetchingJd(true);
    setJdFetchError(null);
    try {
      const res = await fetch('/api/fetch-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jdUrl.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setJobDescription(data.jd_text);
      setJdInputMode('text');
      setJdUrl('');
    } catch (err) {
      setJdFetchError(err.message);
    } finally {
      setIsFetchingJd(false);
    }
  };

  const generateAll = async () => {
    const hasResume = inputMode === 'upload' ? !!uploadedFile : rawNotes.trim().length > 0;
    if (!hasResume || !jobDescription.trim()) return;
    setIsGeneratingAll(true);
    setError(null);
    setResult(null);
    setOriginalResult(null);
    setPreviousScore(null);
    setSelectedWins(new Set());
    try {
      let parsedMaster = null;

      // ── Step 1: Build/parse master resume ─────────────────────────────────
      if (inputMode === 'upload' && uploadedFile) {
        setGenerateAllStage('Extracting resume…');
        const formData = new FormData();
        formData.append('pdf', uploadedFile);
        const extractRes = await fetch('/api/extract-pdf', { method: 'POST', body: formData });
        const extractData = await extractRes.json();
        if (extractData.error) throw new Error(extractData.error);

        setGenerateAllStage('Structuring resume…');
        const sysP = `You are a senior resume strategist. Restructure and strengthen this resume for a ${archetype} PM at ${seniority} level.

TASKS:
1. Parse all work experiences (company, role, dates, bullets). Handle PDF extraction noise gracefully.
2. Rewrite every bullet into XYZ format: "[Strong verb] + [what you did with scope/context] + [quantified impact]". ~15-22 words.
3. Preserve all original facts, metrics, company names, and dates. Do not invent anything.
4. Extract education — institution, degree, field, dates.
5. Extract personal contact info where present in the text (name, title, email, phone, location, LinkedIn URL/handle).
6. Apply ${archetype} archetype lens — prioritise the most relevant bullets.

OUTPUT (return ONLY this JSON, no markdown):
{
  "personal_info": { "name": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "" },
  "summary": "2-3 sentence professional summary.",
  "master_experiences": [{"company":"","role":"","dates":"","bullets":[]}],
  "education": [{"institution":"","degree":"","field":"","dates":""}],
  "skills": []
}`;
        const text = await callClaude(sysP, `EXTRACTED RESUME TEXT:\n${extractData.text}\n\nReturn ONLY the JSON.`, 4000);
        parsedMaster = JSON.parse(text);
      } else {
        setGenerateAllStage('Structuring resume…');
        const sysP = `You are a senior career coach and resume strategist. Transform the provided text into a structured master resume for a ${archetype} PM at ${seniority} level.

The input may be a formatted resume, raw career notes, or a conversational career narrative — handle all gracefully.
Extract personal contact info if present (name, title, email, phone, location, LinkedIn). If not present, leave fields blank.
Rewrite experience bullets in XYZ format: "[Strong verb] + [scope/context] + [quantified impact]". ~15-22 words.
Do not invent facts, metrics, or claims not in the source.

OUTPUT (return ONLY this JSON, no markdown):
{
  "personal_info": { "name": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "" },
  "summary": "2-3 sentence professional summary.",
  "master_experiences": [{"company":"","role":"","dates":"","bullets":[]}],
  "education": [{"institution":"","degree":"","field":"","dates":""}],
  "skills": []
}`;
        const text = await callClaude(sysP, `INPUT:\n${rawNotes}\n\nReturn ONLY the JSON.`, 4000);
        parsedMaster = JSON.parse(text);
      }

      setMasterResult(parsedMaster);
      if (parsedMaster.personal_info) {
        const pi = parsedMaster.personal_info;
        setPersonalInfo(prev => ({
          name: pi.name || prev.name,
          title: pi.title || prev.title,
          email: pi.email || prev.email,
          phone: pi.phone || prev.phone,
          location: pi.location || prev.location,
          linkedin: pi.linkedin || prev.linkedin,
        }));
      }
      const masterText = masterResultToPlainText(parsedMaster);
      setMasterResume(masterText);

      // ── Step 2: Tailor ────────────────────────────────────────────────────
      setGenerateAllStage('Tailoring for the role…');
      const tailored = await tailorBullets(masterText, jobDescription);

      // ── Step 3: Score ─────────────────────────────────────────────────────
      setGenerateAllStage('Running ATS analysis…');
      const ats = await scoreResume(tailored, jobDescription);

      const finalResult = {
        ...tailored, ats,
        summary: parsedMaster.summary || '',
        skills: parsedMaster.skills || [],
        education: parsedMaster.education || [],
      };
      setResult(finalResult);
      setOriginalResult(finalResult);
      setActiveTab('addressable');
      setMode('output');
    } catch (err) {
      setError(`Generation failed: ${err.message}. Try again.`);
    } finally {
      setIsGeneratingAll(false);
      setGenerateAllStage('');
    }
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
      const finalResult = { ...tailored, ats, summary: masterResult?.summary || '', skills: masterResult?.skills || [], education: masterResult?.education || [] };
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
      setResult({ ...tailored, ats, summary: result.summary, skills: result.skills, education: result.education });
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

  const loadSampleMaster = () => {
    setRawNotes(`I'm currently at American Express as a Senior Analyst in Product & Analytics — started May 2025. My main thing has been owning a couple of high-impact features to improve retention for high-value customers. We were losing some of our best cardmembers and I helped build the journeys that brought retention up by about 15%. I also led an AI-driven strategy to cut down abuse in new customer acquisition — basically we were getting too many low-quality signups and I worked with data science to build something that improved customer quality and lifted gross credit margin by around 15%. On top of that I ran A/B tests on the Amex platform to figure out the best placement for offers — I defined the success metrics, worked with engineering on the experiments, and ended up improving recommendation click-through by 25%. I also drove prioritization for our customer decisioning platform, which was this really tricky balancing act between growth, profitability risk, and user experience. And I led a big migration project — moving anti-gaming control tables to new GCP-backed tables — which meant coordinating across engineering, marketing, tech, and channel teams.

Before that I did a short internship at FinIQ from April to May 2024. It was a fintech startup building an AI-native stock market platform. I wrote the PRDs, defined user stories, and built out the roadmap. Worked closely with engineering, design, and sales to ship over 7 features. I also did market research to identify target segments and where we could expand our SaaS licensing.

Before MBA I spent about 4 years at VMware (which got acquired by Broadcom) as a software engineer — went from MTS1 to MTS3. The highlight was something called Dr.WCP, a Kubernetes diagnostic tool I essentially incubated. The problem was that RCA on Kubernetes clusters was taking forever — I built a SaaS tool that cut that time by 60%, pitched it internally, and got $1M in VMware funding to develop it further. I also engaged directly with enterprise customers to understand their pain points and translate them into product requirements. I built automation for lift-and-shift migrations from on-prem to hyperscalers. Led 4+ multi-cloud features for VMware on AWS. I built a REST API abstraction for identity services across data centers and public clouds. And I built a SQL-based schema mismatch detection tool that ended up standardizing API versioning across 90+ products.

I have an MBA from IMI B (2023-25) and a BTech in IT from Manipal.`);
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

ARCHETYPE & SENIORITY CONTEXT:
This person is targeting ${archetype} roles at ${seniority} level. Use this to:
- Prioritise and surface the bullets most relevant to this archetype (e.g. for Growth PM: activation, retention, experimentation, funnel metrics; for Platform/Technical PM: APIs, infra, developer experience, system design; for Fintech PM: compliance, payments, risk, financial products; for 0→1: ambiguity, discovery, GTM, founding moments)
- Calibrate ownership language and scope to match the seniority level (APM → learning and contributing; Senior PM → owning outcomes and leading teams; Group PM → org-wide strategy and influence)
- Lead with the signals that matter most to a hiring manager for this specific archetype

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

EDUCATION EXTRACTION RULES:
- Scan the narrative for any mention of degrees, universities, colleges, institutes, graduation years, or academic qualifications.
- Extract each one with: institution name (clean, full name), degree, field of study if mentioned, and dates/years if mentioned.
- If dates are approximate or only a year range is given, use it as-is.
- If nothing is mentioned, return an empty array.

OUTPUT (return ONLY this JSON, no markdown):
{
  "summary": "2-3 sentence professional summary synthesized from the narrative. Mention total years of experience, key domains, and strongest value proposition.",
  "master_experiences": [
    {"company": "...", "role": "...", "dates": "...", "bullets": ["...", "..."]}
  ],
  "education": [
    {"institution": "...", "degree": "...", "field": "...", "dates": "..."}
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"]
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

  const transformResume = async () => {
    if (!uploadedFile) return;
    setIsTransforming(true);
    setMasterError(null);
    setMasterResult(null);
    try {
      // Step 1: extract text from PDF
      const formData = new FormData();
      formData.append('pdf', uploadedFile);
      const extractRes = await fetch('/api/extract-pdf', { method: 'POST', body: formData });
      const extractData = await extractRes.json();
      if (extractData.error) throw new Error(extractData.error);

      // Step 2: transform extracted text into master resume JSON
      const systemPrompt = `You are a senior resume strategist with 20+ years of experience. You are given raw text extracted from someone's existing resume PDF (may have formatting artifacts from extraction). Your job is to restructure and strengthen it for a ${archetype} PM at ${seniority} level.

YOUR TASKS:
1. Parse all work experiences — identify company, role, dates, and bullets. Handle PDF extraction noise gracefully (broken lines, extra spaces, garbled formatting).
2. Rewrite every bullet into sharp XYZ format: "[Strong verb] + [what you did with scope/context] + [quantified impact]". ~15-22 words, single line.
3. Strengthen weak bullets — if a bullet is vague, elevate the language based on what's implied. NEVER invent facts or metrics not present in the original.
4. Apply ${archetype} lens — reframe and prioritise bullets that matter most for this archetype (e.g. Growth PM: funnel, retention, experimentation; Fintech PM: payments, risk, compliance; Platform/Technical PM: APIs, infra, developer tools; 0→1: discovery, ambiguity, GTM).
5. Calibrate seniority language to ${seniority} level.
6. Extract education — institution, degree, field, dates.

RULES:
- Preserve all original facts, metrics, company names, and dates exactly.
- Do not drop any role or experience.
- Do not invent anything not in the source.

OUTPUT (return ONLY this JSON, no markdown):
{
  "summary": "2-3 sentence professional summary synthesized from the resume. Mention total years of experience, key domains, and strongest value proposition.",
  "master_experiences": [
    {"company": "...", "role": "...", "dates": "...", "bullets": ["...", "..."]}
  ],
  "education": [
    {"institution": "...", "degree": "...", "field": "...", "dates": "..."}
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"]
}`;
      const userPrompt = `EXTRACTED RESUME TEXT:\n${extractData.text}\n\nTransform this into a master resume. Return ONLY the JSON.`;
      const text = await callClaude(systemPrompt, userPrompt, 4000);
      const parsed = JSON.parse(text);
      setMasterResult(parsed);
    } catch (err) {
      setMasterError(`Transform failed: ${err.message}. Try again.`);
    } finally {
      setIsTransforming(false);
    }
  };

  const updateBullet = (expIdx, bIdx, newText) => {
    setMasterResult(prev => ({
      ...prev,
      master_experiences: prev.master_experiences.map((exp, ei) =>
        ei !== expIdx ? exp : {
          ...exp,
          bullets: exp.bullets.map((b, bi) => bi === bIdx ? newText : b)
        }
      )
    }));
  };

  const refineBullet = async (expIdx, bIdx, bullet) => {
    if (!refinePrompt.trim()) return;
    setIsRefining(true);
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'You are a resume bullet rewriter. Rewrite the given bullet per the user\'s instruction. Keep it truthful — do not invent new facts, metrics, or tools not present in the original. Return ONLY the rewritten bullet text, single line, no markdown, no preamble.',
          userPrompt: `Original bullet: "${bullet}"\n\nInstruction: ${refinePrompt}\n\nRewrite it.`,
          maxTokens: 200,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const rewritten = data.text.replace(/^["•\-\s]+/, '').replace(/["]+$/, '').trim();
      updateBullet(expIdx, bIdx, rewritten);
      setRefineKey(null);
      setRefinePrompt('');
    } catch (err) {
      // silently fail — user can retry
    } finally {
      setIsRefining(false);
    }
  };

  const updateTailoredBullet = (expIdx, bIdx, newText) => {
    setResult(prev => ({
      ...prev,
      tailored_experiences: prev.tailored_experiences.map((exp, ei) =>
        ei !== expIdx ? exp : {
          ...exp,
          bullets: exp.bullets.map((b, bi) => bi === bIdx ? newText : b)
        }
      )
    }));
  };

  const deleteCustomSection = (id) => {
    setExtraSections(prev => prev.filter(s => s.id !== id));
    const T1D = ['summary', 'experience', 'education', 'skills'];
    const T2D = ['experience', 'summary', 'education', 'achievements', 'skills'];
    setT1SectionOrder(prev => (prev || T1D).filter(x => x !== id));
    setT2SectionOrder(prev => (prev || T2D).filter(x => x !== id));
  };

  const updateTailoredRole = (expIdx, newRole) => {
    setResult(prev => ({
      ...prev,
      tailored_experiences: prev.tailored_experiences.map((exp, ei) =>
        ei !== expIdx ? exp : { ...exp, role: newRole }
      )
    }));
  };

  const refineTailoredBullet = async (expIdx, bIdx, bullet) => {
    if (!refinePrompt.trim()) return;
    setIsRefining(true);
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'You are a resume bullet rewriter. Rewrite the given bullet per the user\'s instruction. Keep it truthful — do not invent new facts, metrics, or tools not present in the original. Return ONLY the rewritten bullet text, single line, no markdown, no preamble.',
          userPrompt: `Original bullet: "${bullet}"\n\nInstruction: ${refinePrompt}\n\nRewrite it.`,
          maxTokens: 200,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const rewritten = data.text.replace(/^["•\-\s]+/, '').replace(/["]+$/, '').trim();
      updateTailoredBullet(expIdx, bIdx, rewritten);
      setRefineKey(null);
      setRefinePrompt('');
    } catch (err) {
      // silently fail — user can retry
    } finally {
      setIsRefining(false);
    }
  };

  const refineDocument = async () => {
    if (!docRefinePrompt.trim() || !masterResult) return;
    setIsDocRefining(true);
    try {
      const systemPrompt = `You are a senior resume strategist. You are given an already-built master resume in JSON and a user instruction. Apply the instruction across the whole document — rewrite, reorder, or reframe bullets as needed — while preserving all original facts, metrics, company names, and dates. Do not invent anything new.

OUTPUT (return ONLY this JSON, no markdown):
{
  "master_experiences": [
    {"company": "...", "role": "...", "dates": "...", "bullets": ["...", "..."]}
  ],
  "education": [
    {"institution": "...", "degree": "...", "field": "...", "dates": "..."}
  ]
}`;
      const userPrompt = `CURRENT MASTER RESUME:\n${JSON.stringify(masterResult, null, 2)}\n\nINSTRUCTION: ${docRefinePrompt}\n\nApply the instruction and return the updated resume JSON.`;
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userPrompt, maxTokens: 4000 }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const raw = data.text;
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      const parsed = JSON.parse(raw.slice(start, end + 1));
      setMasterResult(parsed);
      setDocRefinePrompt('');
    } catch (err) {
      // silently fail — user can retry
    } finally {
      setIsDocRefining(false);
    }
  };

  const masterResultToPlainText = (result) => {
    const exp = result.master_experiences.map(e =>
      `${e.company} | ${e.role} | ${e.dates}\n${e.bullets.map(b => `• ${b}`).join('\n')}`
    ).join('\n\n');
    const edu = result.education?.length
      ? '\n\nEDUCATION\n' + result.education.map(e =>
          `${e.institution} | ${e.degree}${e.field ? ', ' + e.field : ''}${e.dates ? ' | ' + e.dates : ''}`
        ).join('\n')
      : '';
    return exp + edu;
  };

  const useForTailoring = () => {
    if (!masterResult) return;
    setMasterResume(masterResultToPlainText(masterResult));
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

  const tailoredDisplay = result ? {
    master_experiences: result.tailored_experiences,
    summary: result.summary ?? '',
    education: result.education ?? [],
    skills: result.skills ?? [],
  } : null;


  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        .display-font { font-family: 'Fraunces', Georgia, serif; }
        .bullet-card:hover .copy-btn { opacity: 1; }
      ` }} />

      {/* ═══════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════ */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-stone-50" />
            </div>
            <h1 className="display-font text-lg font-semibold text-stone-900">Resume Tailor</h1>
          </div>

          {/* Step indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className={`flex items-center gap-1.5 ${mode === 'input' ? 'text-stone-900 font-semibold' : 'text-stone-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${mode === 'input' ? 'bg-stone-900 text-white' : 'bg-emerald-500 text-white'}`}>
                {mode === 'output' ? <Check className="w-3 h-3" /> : '1'}
              </div>
              Your Details
            </div>
            <div className="w-8 h-px bg-stone-300" />
            <div className={`flex items-center gap-1.5 ${mode === 'output' ? 'text-stone-900 font-semibold' : 'text-stone-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${mode === 'output' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-500'}`}>2</div>
              Review &amp; Edit
            </div>
            <div className="w-8 h-px bg-stone-300" />
            <div className="flex items-center gap-1.5 text-stone-400">
              <div className="w-5 h-5 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center text-xs font-bold">3</div>
              Download
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mode === 'output' && (
              <button
                onClick={() => { setMode('input'); setResult(null); setError(null); }}
                className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Start over
              </button>
            )}
            {mode === 'input' && (
              <button onClick={loadSample} className="text-sm text-stone-500 hover:text-stone-900 transition-colors underline underline-offset-4">
                Load sample
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* ═══════════════════════════════════════════════════════════
            STEP 1 — INPUT
        ═══════════════════════════════════════════════════════════ */}
        {mode === 'input' && (
          <div>
            <div className="mb-8">
              <h2 className="display-font text-4xl font-semibold text-stone-900 leading-tight mb-2">
                Build your tailored resume.
              </h2>
              <p className="text-stone-500 leading-relaxed">
                Paste or upload your resume, add the job description — we'll structure, tailor, and score it for you.
              </p>
            </div>

            {/* Two-panel input */}
            <div className="grid md:grid-cols-2 gap-5 mb-5">

              {/* Left: Your Resume */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-stone-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-stone-500" />
                  <h3 className="text-sm font-semibold text-stone-900">Your Resume</h3>
                  <div className="ml-auto flex items-center gap-0.5 p-0.5 bg-stone-100 rounded-lg">
                    <button
                      onClick={() => setInputMode('upload')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${inputMode === 'upload' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      Upload
                    </button>
                    <button
                      onClick={() => setInputMode('story')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${inputMode === 'story' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      Paste text
                    </button>
                  </div>
                </div>

                {inputMode === 'upload' ? (
                  <div className="p-5">
                    <label
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setUploadedFile(f); }}
                      className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragging ? 'border-stone-500 bg-stone-100' : uploadedFile ? 'border-emerald-300 bg-emerald-50' : 'border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100'}`}
                    >
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) setUploadedFile(f); }} />
                      {uploadedFile ? (
                        <>
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" />
                          <p className="text-sm font-medium text-stone-900">{uploadedFile.name}</p>
                          <p className="text-xs text-stone-500 mt-1">{(uploadedFile.size / 1024).toFixed(0)} KB · Click to change</p>
                        </>
                      ) : (
                        <>
                          <FileUp className="w-8 h-8 text-stone-400 mb-3" />
                          <p className="text-sm font-medium text-stone-700">Drop your resume here</p>
                          <p className="text-xs text-stone-400 mt-1">PDF, DOC, DOCX · or click to browse</p>
                        </>
                      )}
                    </label>
                  </div>
                ) : (
                  <textarea
                    value={rawNotes}
                    onChange={e => setRawNotes(e.target.value)}
                    placeholder={`Paste your resume text here, or just tell your story:\n\n"At Stripe I owned fraud prevention. Our review queue was taking 3 days — I mapped the workflow, found a broken triage rule, rewrote the logic, and queue time dropped to 4 hours, saving ~$2M in chargeback exposure..."\n\nNo structure needed. I'll extract the bullets.`}
                    className="w-full h-72 p-5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none resize-none"
                    style={{ fontFamily: '"JetBrains Mono", "SF Mono", Consolas, monospace', fontSize: '13px', lineHeight: '1.6' }}
                  />
                )}
              </div>

              {/* Right: Job Description */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-stone-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-stone-500" />
                  <h3 className="text-sm font-semibold text-stone-900">Job Description</h3>
                  <div className="ml-auto flex items-center gap-0.5 p-0.5 bg-stone-100 rounded-lg">
                    <button
                      onClick={() => { setJdInputMode('text'); setJdFetchError(null); }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${jdInputMode === 'text' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      Paste text
                    </button>
                    <button
                      onClick={() => { setJdInputMode('url'); setJdFetchError(null); }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${jdInputMode === 'url' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      Paste URL
                    </button>
                  </div>
                </div>

                {jdInputMode === 'text' ? (
                  <textarea
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description…"
                    className="w-full h-72 p-5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none resize-none"
                    style={{ fontFamily: '"JetBrains Mono", "SF Mono", Consolas, monospace', fontSize: '13px', lineHeight: '1.6' }}
                  />
                ) : (
                  <div className="p-5">
                    <p className="text-xs text-stone-500 mb-3">Paste a link to the job posting — LinkedIn, Greenhouse, Lever, company careers page, etc.</p>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={jdUrl}
                        onChange={e => { setJdUrl(e.target.value); setJdFetchError(null); }}
                        onKeyDown={e => e.key === 'Enter' && fetchJd()}
                        placeholder="https://jobs.lever.co/company/role-id"
                        className="flex-1 text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-stone-400"
                      />
                      <button
                        onClick={fetchJd}
                        disabled={isFetchingJd || !jdUrl.trim()}
                        className="px-4 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors whitespace-nowrap"
                      >
                        {isFetchingJd ? <><Loader2 className="w-4 h-4 animate-spin" />Fetching…</> : 'Fetch JD'}
                      </button>
                    </div>
                    {jdFetchError && (
                      <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">{jdFetchError}</p>
                      </div>
                    )}
                    {jobDescription && jdInputMode === 'url' && (
                      <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <p className="text-xs text-emerald-700">JD fetched — switching to text view.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Archetype + Seniority */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Shape the framing</p>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-2">PM Archetype — <span className="font-normal text-stone-400">what kind of PM are you targeting?</span></label>
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
                  <label className="block text-xs font-medium text-stone-500 mb-2">Seniority — <span className="font-normal text-stone-400">what level are you at?</span></label>
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

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">{error}</div>
              </div>
            )}

            <button
              onClick={generateAll}
              disabled={isGeneratingAll || (inputMode === 'upload' ? !uploadedFile : !rawNotes.trim()) || !jobDescription.trim()}
              className="w-full md:w-auto px-10 py-4 bg-stone-900 text-stone-50 rounded-xl font-semibold text-sm hover:bg-stone-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm"
            >
              {isGeneratingAll ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{generateAllStage || 'Working…'}</>
              ) : (
                <><Sparkles className="w-4 h-4" />Generate Tailored Resume</>
              )}
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STEP 2 — OUTPUT (Review & Edit)
        ═══════════════════════════════════════════════════════════ */}
        {mode === 'output' && result && (
          <div>

            {/* Personal Details */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Your Details</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'name', label: 'Full Name', placeholder: 'Jane Smith' },
                  { key: 'title', label: 'Title / Profession', placeholder: 'Senior Product Manager' },
                  { key: 'email', label: 'Email', placeholder: 'jane@example.com' },
                  { key: 'phone', label: 'Phone', placeholder: '(123) 456-7890' },
                  { key: 'location', label: 'Location', placeholder: 'San Francisco, CA' },
                  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/jane' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-stone-500 mb-1">{label}</label>
                    <input
                      type="text"
                      value={personalInfo[key]}
                      onChange={e => setPersonalInfo(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder-stone-300"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Layout Toggle ── */}
            <div className="flex justify-end mb-4">
              <div className="flex gap-0.5 p-1 bg-stone-100 rounded-lg">
                <button
                  onClick={() => setLayoutMode('split')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${layoutMode === 'split' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="12" rx="1" fill="currentColor"/><rect x="8" y="1" width="5" height="12" rx="1" fill="currentColor"/></svg>
                  Side by side
                </button>
                <button
                  onClick={() => setLayoutMode('stack')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${layoutMode === 'stack' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="5" rx="1" fill="currentColor"/><rect x="1" y="8" width="12" height="5" rx="1" fill="currentColor"/></svg>
                  Stacked
                </button>
              </div>
            </div>

            {/* ── Two-column: Resume (left) + Feedback (right) ── */}
            <div className={`flex gap-5 items-start ${layoutMode === 'split' ? 'flex-col lg:flex-row' : 'flex-col'}`}>

            {/* LEFT: Resume Preview */}
            <div className="flex-1 min-w-0">
            <div className={`bg-white rounded-xl overflow-hidden transition-all duration-300 ${hoveredType === 'gap' ? 'border-2 border-red-300 shadow-[0_0_0_3px_rgba(252,165,165,0.35)]' : 'border border-stone-200'}`}>
              {/* Action bar */}
              <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-stone-900">Tailored Resume</span>
                  <span className="text-xs text-stone-400">· {result.tailored_experiences?.length} roles</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Template switcher */}
                  <div className="flex gap-0.5 p-1 bg-stone-100 rounded-lg">
                    <button onClick={() => setSelectedTailoredTemplate('template1')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${selectedTailoredTemplate === 'template1' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                      Template 1
                    </button>
                    <button onClick={() => setSelectedTailoredTemplate('template2')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${selectedTailoredTemplate === 'template2' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                      Template 2
                    </button>
                  </div>
                  {/* Download — Step 3 */}
                  <button
                    onClick={() => selectedTailoredTemplate === 'template1' ? exportToPDF(tailoredDisplay, personalInfo) : exportToPDFTemplate2(tailoredDisplay, personalInfo)}
                    className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-800 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </button>
                  <button onClick={copyAll} className="px-3 py-2 text-xs font-medium text-stone-700 border border-stone-200 hover:bg-stone-50 rounded-lg flex items-center gap-1.5 transition-colors">
                    {copiedIdx === 'all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedIdx === 'all' ? 'Copied' : 'Copy all'}
                  </button>
                </div>
              </div>

              {result.tailoring_notes && (
                <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 leading-relaxed">{result.tailoring_notes}</p>
                  </div>
                </div>
              )}

              {/* Template preview */}
              <div style={{ fontFamily: 'Calibri, Arial, sans-serif' }}>

              {selectedTailoredTemplate === 'template1' && (
              <div className="px-10 py-8">
                {/* T1 Header */}
                <div className="mb-1">
                  <div className="font-bold text-stone-900" style={{ fontSize: '1.35rem' }}>
                    {personalInfo.name || 'YOUR NAME'}
                  </div>
                  {personalInfo.title && <div className="text-sm" style={{ color: '#1F4E79' }}>{personalInfo.title}</div>}
                </div>
                <div className="text-xs text-stone-500 mb-1 flex flex-wrap gap-3">
                  {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin].filter(Boolean).map((c, i) => (
                    <span key={i}>{c}</span>
                  ))}
                  {!personalInfo.email && !personalInfo.phone && !personalInfo.location && !personalInfo.linkedin && (
                    <span className="text-stone-400">email · phone · location</span>
                  )}
                </div>
                <div className="border-t-2 border-stone-900 mb-4" />

                {/* Sections rendered in dynamic order */}
                {(t1SectionOrder || ['summary', 'experience', 'education', 'skills', ...extraSections.map(s => s.id)]).map(sectionId => {
                  if (sectionId === 'summary') return (
                    <div key="summary" className="mb-4">
                      <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#1F4E79' }}>Professional Summary</div>
                      <div className="border-t mb-2" style={{ borderColor: '#1F4E79' }} />
                      {editingKey === 't-summary' ? (
                        <textarea autoFocus defaultValue={tailoredDisplay.summary}
                          onBlur={e => { const v = e.target.value.trim(); if (v) setResult(prev => ({ ...prev, summary: v })); setEditingKey(null); }}
                          onKeyDown={e => { if (e.key === 'Escape') setEditingKey(null); }}
                          rows={4} className="w-full text-xs border border-stone-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none leading-relaxed text-stone-700"
                        />
                      ) : (
                        <div className="flex items-start gap-1.5">
                          <p className="flex-1 text-xs text-stone-700 leading-relaxed cursor-text rounded px-0.5 -mx-0.5 hover:bg-stone-100 transition-colors" onClick={() => setEditingKey('t-summary')} title="Click to edit">{tailoredDisplay.summary ? highlightText(tailoredDisplay.summary, hoveredKeyword) : <span className="text-stone-400 italic">No summary</span>}</p>
                          <button onClick={() => setEditingKey('t-summary')} className="flex-shrink-0 p-0.5 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-600 transition-colors" title="Edit"><Pencil className="w-2.5 h-2.5" /></button>
                        </div>
                      )}
                    </div>
                  );
                  if (sectionId === 'experience') return (
                    <div key="experience" className="mb-4">
                      <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#1F4E79' }}>Work Experience</div>
                      <div className="border-t mb-3" style={{ borderColor: '#1F4E79' }} />
                      {tailoredDisplay.master_experiences.map((exp, expIdx) => (
                        <div key={expIdx} className="mb-4">
                          <div className="flex items-baseline justify-between">
                            <div className="text-sm font-bold text-stone-900">
                              {editingKey === `t-role-${expIdx}` ? (
                                <span className="flex items-baseline gap-1.5">
                                  <input autoFocus type="text" value={editingText} onChange={e => setEditingText(e.target.value)}
                                    onBlur={() => { if (editingText.trim()) updateTailoredRole(expIdx, editingText.trim()); setEditingKey(null); }}
                                    onKeyDown={e => { if (e.key === 'Enter') { if (editingText.trim()) updateTailoredRole(expIdx, editingText.trim()); setEditingKey(null); } if (e.key === 'Escape') setEditingKey(null); }}
                                    className="font-bold text-stone-900 border-b border-stone-400 focus:outline-none bg-transparent text-sm min-w-0 w-44"
                                  />
                                  <span className="text-stone-500">| {exp.company}</span>
                                </span>
                              ) : (
                                <span className="flex items-baseline gap-1 group">
                                  <span>{exp.role || <span className="font-normal italic text-stone-400 text-xs">Add role</span>}</span>
                                  <button onClick={() => { setEditingKey(`t-role-${expIdx}`); setEditingText(exp.role || ''); setRefineKey(null); }} className="p-0.5 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-600 transition-colors opacity-0 group-hover:opacity-100" title="Edit role"><Pencil className="w-2.5 h-2.5" /></button>
                                  <span>| {exp.company}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-500 ml-2 whitespace-nowrap">{exp.dates}</div>
                          </div>
                          <ul className="mt-1.5 space-y-1">
                            {exp.bullets.map((b, bIdx) => {
                              const key = `t-${expIdx}-${bIdx}`;
                              const isEditing = editingKey === key;
                              const isRefineOpen = refineKey === key;
                              return (
                                <li key={bIdx}>
                                  <div className="flex items-start gap-2 text-sm text-stone-800 leading-relaxed">
                                    <span className="text-stone-400 flex-shrink-0 mt-0.5">•</span>
                                    {isEditing ? (
                                      <div className="flex-1 flex flex-col gap-1">
                                        <div>
                                          <button onMouseDown={e => { e.preventDefault(); applyBold(); }} className="px-2 py-0.5 text-xs font-bold border border-stone-300 rounded hover:bg-stone-100 text-stone-700 leading-none" title="Bold — select text then click, or click to insert **">B</button>
                                        </div>
                                        <textarea autoFocus ref={textareaRef} value={editingText} onChange={e => setEditingText(e.target.value)}
                                          onBlur={() => { if (editingText.trim()) updateTailoredBullet(expIdx, bIdx, editingText.trim()); setEditingKey(null); }}
                                          onKeyDown={e => { if (e.key === 'Escape') setEditingKey(null); }}
                                          rows={2} className="text-sm border border-stone-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                                        />
                                      </div>
                                    ) : (
                                      <span className="flex-1 cursor-text rounded px-0.5 -mx-0.5 hover:bg-stone-100 transition-colors" onClick={() => { setEditingKey(key); setEditingText(b); setRefineKey(null); }} title="Click to edit">{renderBullet(b, hoveredKeyword)}</span>
                                    )}
                                    {!isEditing && (
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => { setEditingKey(key); setEditingText(b); setRefineKey(null); }} className="p-1 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-700 transition-colors" title="Edit manually"><Pencil className="w-3 h-3" /></button>
                                        <button onClick={() => { setRefineKey(isRefineOpen ? null : key); setRefinePrompt(''); setEditingKey(null); }} className={`p-1 rounded transition-colors ${isRefineOpen ? 'bg-amber-100 text-amber-600' : 'text-stone-300 hover:bg-stone-100 hover:text-stone-600'}`} title="Refine with AI"><Sparkles className="w-3 h-3" /></button>
                                      </div>
                                    )}
                                  </div>
                                  {isRefineOpen && (
                                    <div className="mt-2 ml-5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                      <p className="text-xs text-amber-700 font-medium mb-2">What should change about this bullet?</p>
                                      <div className="flex gap-2 items-center">
                                        <input autoFocus type="text" value={refinePrompt} onChange={e => setRefinePrompt(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') refineTailoredBullet(expIdx, bIdx, b); if (e.key === 'Escape') { setRefineKey(null); setRefinePrompt(''); } }}
                                          placeholder="e.g. emphasize leadership, add more scope…"
                                          className="flex-1 text-sm border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white placeholder-amber-300"
                                        />
                                        <button onClick={() => refineTailoredBullet(expIdx, bIdx, b)} disabled={isRefining || !refinePrompt.trim()} className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors whitespace-nowrap">
                                          {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Rewrite
                                        </button>
                                        <button onClick={() => { setRefineKey(null); setRefinePrompt(''); }} className="p-2 rounded-lg hover:bg-amber-100 text-amber-400 hover:text-amber-700 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  );
                  if (sectionId === 'education') {
                    if (!tailoredDisplay.education?.length) return null;
                    return (
                      <div key="education" className="mb-4">
                        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#1F4E79' }}>Education</div>
                        <div className="border-t mb-3" style={{ borderColor: '#1F4E79' }} />
                        {tailoredDisplay.education.map((edu, i) => (
                          <div key={i} className="mb-2">
                            <div className="flex items-baseline justify-between">
                              <div className="text-sm font-bold text-stone-900">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</div>
                              <div className="text-xs text-stone-500">{edu.dates}</div>
                            </div>
                            <div className="text-xs" style={{ color: '#1F4E79' }}>{edu.institution}</div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  if (sectionId === 'skills') return (
                    <div key="skills">
                      <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#1F4E79' }}>Skills</div>
                      <div className="border-t mb-2" style={{ borderColor: '#1F4E79' }} />
                      <div className="flex flex-wrap gap-1 items-center">
                        {(tailoredDisplay.skills ?? []).map((skill, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5 text-xs text-stone-700 group mr-1.5">
                            {highlightText(skill, hoveredKeyword)}
                            <button onClick={() => setResult(prev => ({ ...prev, skills: prev.skills.filter((_, si) => si !== i) }))} className="text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X className="w-2 h-2" /></button>
                          </span>
                        ))}
                        <input value={tailoredNewSkill} onChange={e => setTailoredNewSkill(e.target.value)}
                          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && tailoredNewSkill.trim()) { e.preventDefault(); setResult(prev => ({ ...prev, skills: [...(prev.skills ?? []), tailoredNewSkill.trim()] })); setTailoredNewSkill(''); } if (e.key === 'Escape') setTailoredNewSkill(''); }}
                          placeholder="+ Add skill" className="text-xs border border-dashed border-stone-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-stone-500 w-20 text-stone-500 placeholder-stone-300"
                        />
                      </div>
                    </div>
                  );
                  const sec = extraSections.find(s => s.id === sectionId);
                  if (!sec) return null;
                  return (
                    <div key={sectionId} className="mt-4 group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1F4E79' }}>{sec.name}</div>
                        <button onClick={() => deleteCustomSection(sectionId)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-all"><X className="w-3 h-3" /></button>
                      </div>
                      <div className="border-t mb-2" style={{ borderColor: '#1F4E79' }} />
                      <div className="flex items-start justify-between gap-3">
                        <ul className="list-disc pl-4 flex-1 space-y-0.5">
                          {sec.bullets.map((b, bi) => <li key={bi} className="text-xs text-stone-700 leading-relaxed">{b}</li>)}
                        </ul>
                        {(sec.from || sec.to) && <span className="text-xs text-stone-500 whitespace-nowrap ml-2">{[sec.from, sec.to].filter(Boolean).join(' – ')}</span>}
                      </div>
                    </div>
                  );
                })}

                <div className="mt-5 pt-3 border-t border-dashed border-stone-200">
                  <button onClick={() => setShowAddSection(true)}
                    className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
                    <span className="w-4 h-4 rounded border border-dashed border-stone-300 flex items-center justify-center font-bold leading-none">+</span>
                    Add section
                  </button>
                </div>
              </div>
              )}{/* end tailored t1 */}

              {selectedTailoredTemplate === 'template2' && (
              <div className="px-8 py-7">
                {/* T2 Header */}
                <div className="mb-4">
                  <div className="font-black text-stone-900 uppercase tracking-tight" style={{ fontSize: '1.9rem', lineHeight: 1.1 }}>
                    {personalInfo.name || 'YOUR NAME'}
                  </div>
                  <div className="text-sm font-semibold mt-1 mb-2" style={{ color: '#1F4E79' }}>
                    {personalInfo.title || 'Your Professional Title'}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-stone-600">
                    {personalInfo.phone ? <span>{personalInfo.phone}</span> : null}
                    {personalInfo.email ? <span>{personalInfo.email}</span> : null}
                    {personalInfo.linkedin ? <span>{personalInfo.linkedin}</span> : null}
                    {personalInfo.location ? <span>{personalInfo.location}</span> : null}
                    {!personalInfo.phone && !personalInfo.email && !personalInfo.linkedin && !personalInfo.location && (
                      <span className="text-stone-400">000-000-0000 · you@email.com · LinkedIn · City, State</span>
                    )}
                  </div>
                </div>
                <div className="border-b border-stone-300 mb-4" />

                {/* T2 Two-column body */}
                <div className="flex gap-7">
                  {/* LEFT: Experience */}
                  <div style={{ flex: '0 0 54%' }}>
                    <div className="text-xs font-bold uppercase tracking-widest mb-1 text-stone-900">Experience</div>
                    <div className="border-t mb-3 border-stone-800" />
                    {tailoredDisplay.master_experiences.map((exp, expIdx) => (
                      <div key={expIdx} className="mb-4">
                        <div className="text-sm font-bold text-stone-900">
                          {editingKey === `t-role-${expIdx}` ? (
                            <input autoFocus type="text" value={editingText} onChange={e => setEditingText(e.target.value)}
                              onBlur={() => { if (editingText.trim()) updateTailoredRole(expIdx, editingText.trim()); setEditingKey(null); }}
                              onKeyDown={e => { if (e.key === 'Enter') { if (editingText.trim()) updateTailoredRole(expIdx, editingText.trim()); setEditingKey(null); } if (e.key === 'Escape') setEditingKey(null); }}
                              className="font-bold text-stone-900 border-b border-stone-400 focus:outline-none bg-transparent text-sm w-full"
                            />
                          ) : (
                            <span className="flex items-baseline gap-1 group">
                              <span>{exp.role || <span className="font-normal italic text-stone-400 text-xs">Add role</span>}</span>
                              <button onClick={() => { setEditingKey(`t-role-${expIdx}`); setEditingText(exp.role || ''); setRefineKey(null); }} className="p-0.5 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-600 transition-colors opacity-0 group-hover:opacity-100" title="Edit role"><Pencil className="w-2.5 h-2.5" /></button>
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold" style={{ color: '#1F4E79' }}>{exp.company}</div>
                        <div className="text-xs text-stone-500 mb-1.5">{exp.dates}</div>
                        <ul className="space-y-1">
                          {exp.bullets.map((b, bIdx) => {
                            const key = `t-${expIdx}-${bIdx}`;
                            const isEditing = editingKey === key;
                            const isRefineOpen = refineKey === key;
                            return (
                              <li key={bIdx}>
                                <div className="flex items-start gap-1.5 text-xs text-stone-800 leading-relaxed">
                                  <span className="text-stone-400 flex-shrink-0 mt-0.5">•</span>
                                  {isEditing ? (
                                    <div className="flex-1 flex flex-col gap-0.5">
                                      <div>
                                        <button onMouseDown={e => { e.preventDefault(); applyBold(); }} className="px-1.5 py-0.5 text-xs font-bold border border-stone-300 rounded hover:bg-stone-100 text-stone-700 leading-none" title="Bold — select text then click, or click to insert **">B</button>
                                      </div>
                                      <textarea autoFocus ref={textareaRef} value={editingText} onChange={e => setEditingText(e.target.value)}
                                        onBlur={() => { if (editingText.trim()) updateTailoredBullet(expIdx, bIdx, editingText.trim()); setEditingKey(null); }}
                                        onKeyDown={e => { if (e.key === 'Escape') setEditingKey(null); }}
                                        rows={2} className="text-xs border border-stone-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                                      />
                                    </div>
                                  ) : (
                                    <span className="flex-1 cursor-text rounded px-0.5 -mx-0.5 hover:bg-stone-100 transition-colors" onClick={() => { setEditingKey(key); setEditingText(b); setRefineKey(null); }} title="Click to edit">{renderBullet(b, hoveredKeyword)}</span>
                                  )}
                                  {!isEditing && (
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      <button onClick={() => { setEditingKey(key); setEditingText(b); setRefineKey(null); }} className="p-0.5 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-700 transition-colors" title="Edit manually"><Pencil className="w-2.5 h-2.5" /></button>
                                      <button onClick={() => { setRefineKey(isRefineOpen ? null : key); setRefinePrompt(''); setEditingKey(null); }} className={`p-0.5 rounded transition-colors ${isRefineOpen ? 'bg-amber-100 text-amber-600' : 'text-stone-300 hover:bg-stone-100 hover:text-stone-600'}`} title="Refine with AI"><Sparkles className="w-2.5 h-2.5" /></button>
                                    </div>
                                  )}
                                </div>
                                {isRefineOpen && (
                                  <div className="mt-1.5 ml-4 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                                    <p className="text-xs text-amber-700 font-medium mb-1.5">What should change?</p>
                                    <div className="flex gap-1.5 items-center">
                                      <input autoFocus type="text" value={refinePrompt} onChange={e => setRefinePrompt(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') refineTailoredBullet(expIdx, bIdx, b); if (e.key === 'Escape') { setRefineKey(null); setRefinePrompt(''); } }}
                                        placeholder="e.g. more impact, stronger verb…"
                                        className="flex-1 text-xs border border-amber-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white placeholder-amber-300"
                                      />
                                      <button onClick={() => refineTailoredBullet(expIdx, bIdx, b)} disabled={isRefining || !refinePrompt.trim()} className="px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors whitespace-nowrap">
                                        {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Rewrite
                                      </button>
                                      <button onClick={() => { setRefineKey(null); setRefinePrompt(''); }} className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-400 hover:text-amber-700 transition-colors"><X className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* RIGHT: sections in dynamic order */}
                  <div style={{ flex: 1 }}>
                    {(t2SectionOrder || ['experience', 'summary', 'education', 'achievements', 'skills', ...extraSections.map(s => s.id)])
                      .filter(id => id !== 'experience')
                      .map(sectionId => {
                        if (sectionId === 'summary') return (
                          <div key="summary" className="mb-4">
                            <div className="text-xs font-bold uppercase tracking-widest mb-1 text-stone-900">Summary</div>
                            <div className="border-t mb-2 border-stone-800" />
                            {editingKey === 't-summary' ? (
                              <textarea autoFocus defaultValue={tailoredDisplay.summary}
                                onBlur={e => { const v = e.target.value.trim(); if (v) setResult(prev => ({ ...prev, summary: v })); setEditingKey(null); }}
                                onKeyDown={e => { if (e.key === 'Escape') setEditingKey(null); }}
                                rows={4} className="w-full text-xs border border-stone-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none leading-relaxed text-stone-700"
                              />
                            ) : (
                              <div className="flex items-start gap-1.5">
                                <p className="flex-1 text-xs text-stone-700 leading-relaxed">{tailoredDisplay.summary ? highlightText(tailoredDisplay.summary, hoveredKeyword) : <span className="text-stone-400 italic">No summary</span>}</p>
                                <button onClick={() => setEditingKey('t-summary')} className="flex-shrink-0 p-0.5 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-600 transition-colors" title="Edit"><Pencil className="w-2.5 h-2.5" /></button>
                              </div>
                            )}
                          </div>
                        );
                        if (sectionId === 'education') {
                          if (!tailoredDisplay.education?.length) return null;
                          return (
                            <div key="education" className="mb-4">
                              <div className="text-xs font-bold uppercase tracking-widest mb-1 text-stone-900">Education</div>
                              <div className="border-t mb-2 border-stone-800" />
                              {tailoredDisplay.education.map((edu, i) => (
                                <div key={i} className="mb-2">
                                  <div className="text-xs font-bold text-stone-900">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</div>
                                  <div className="text-xs font-semibold" style={{ color: '#1F4E79' }}>{edu.institution}</div>
                                  <div className="text-xs text-stone-500 mt-0.5">{edu.dates}</div>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        if (sectionId === 'achievements') {
                          if (!tailoredDisplay.master_experiences?.length || !tailoredDisplay.master_experiences[0]?.bullets?.length) return null;
                          return (
                            <div key="achievements" className="mb-4">
                              <div className="text-xs font-bold uppercase tracking-widest mb-1 text-stone-900">Key Achievements</div>
                              <div className="border-t mb-2 border-stone-800" />
                              {tailoredDisplay.master_experiences.slice(0, 2).map((exp, i) => {
                                if (!exp.bullets[0]) return null;
                                const key = `t-${i}-0`;
                                const isEditing = editingKey === key;
                                const isRefineOpen = refineKey === key;
                                return (
                                  <div key={i} className="mb-2">
                                    <div className="text-xs font-bold text-stone-900">{exp.company}</div>
                                    <div className="flex items-start gap-1.5 mt-0.5">
                                      {isEditing ? (
                                        <div className="flex-1 flex flex-col gap-0.5">
                                          <div><button onMouseDown={e => { e.preventDefault(); applyBold(); }} className="px-1.5 py-0.5 text-xs font-bold border border-stone-300 rounded hover:bg-stone-100 text-stone-700 leading-none" title="Bold">B</button></div>
                                          <textarea autoFocus ref={textareaRef} value={editingText} onChange={e => setEditingText(e.target.value)}
                                            onBlur={() => { if (editingText.trim()) updateTailoredBullet(i, 0, editingText.trim()); setEditingKey(null); }}
                                            onKeyDown={e => { if (e.key === 'Escape') setEditingKey(null); }}
                                            rows={2} className="text-xs border border-stone-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                                          />
                                        </div>
                                      ) : (
                                        <span className="flex-1 text-xs text-stone-600 leading-relaxed">{renderBullet(exp.bullets[0], hoveredKeyword)}</span>
                                      )}
                                      {!isEditing && (
                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                          <button onClick={() => { setEditingKey(key); setEditingText(exp.bullets[0]); setRefineKey(null); }} className="p-0.5 rounded hover:bg-stone-100 text-stone-300 hover:text-stone-700 transition-colors" title="Edit manually"><Pencil className="w-2.5 h-2.5" /></button>
                                          <button onClick={() => { setRefineKey(isRefineOpen ? null : key); setRefinePrompt(''); setEditingKey(null); }} className={`p-0.5 rounded transition-colors ${isRefineOpen ? 'bg-amber-100 text-amber-600' : 'text-stone-300 hover:bg-stone-100 hover:text-stone-600'}`} title="Refine with AI"><Sparkles className="w-2.5 h-2.5" /></button>
                                        </div>
                                      )}
                                    </div>
                                    {isRefineOpen && (
                                      <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                                        <p className="text-xs text-amber-700 font-medium mb-1.5">What should change?</p>
                                        <div className="flex gap-1.5 items-center">
                                          <input autoFocus type="text" value={refinePrompt} onChange={e => setRefinePrompt(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') refineTailoredBullet(i, 0, exp.bullets[0]); if (e.key === 'Escape') { setRefineKey(null); setRefinePrompt(''); } }}
                                            placeholder="e.g. more impact, stronger verb…"
                                            className="flex-1 text-xs border border-amber-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white placeholder-amber-300"
                                          />
                                          <button onClick={() => refineTailoredBullet(i, 0, exp.bullets[0])} disabled={isRefining || !refinePrompt.trim()} className="px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors whitespace-nowrap">
                                            {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Rewrite
                                          </button>
                                          <button onClick={() => { setRefineKey(null); setRefinePrompt(''); }} className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-400 hover:text-amber-700 transition-colors"><X className="w-3 h-3" /></button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        if (sectionId === 'skills') return (
                          <div key="skills" className="mb-2">
                            <div className="text-xs font-bold uppercase tracking-widest mb-1 text-stone-900">Skills</div>
                            <div className="border-t mb-2 border-stone-800" />
                            <div className="flex flex-wrap gap-1 items-center">
                              {(tailoredDisplay.skills ?? []).map((skill, i) => (
                                <span key={i} className="inline-flex items-center gap-0.5 text-xs text-stone-700 group mr-1.5">
                                  {highlightText(skill, hoveredKeyword)}
                                  <button onClick={() => setResult(prev => ({ ...prev, skills: prev.skills.filter((_, si) => si !== i) }))} className="text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X className="w-2 h-2" /></button>
                                </span>
                              ))}
                              <input value={tailoredNewSkill} onChange={e => setTailoredNewSkill(e.target.value)}
                                onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && tailoredNewSkill.trim()) { e.preventDefault(); setResult(prev => ({ ...prev, skills: [...(prev.skills ?? []), tailoredNewSkill.trim()] })); setTailoredNewSkill(''); } if (e.key === 'Escape') setTailoredNewSkill(''); }}
                                placeholder="+ Add skill" className="text-xs border border-dashed border-stone-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-stone-500 w-20 text-stone-500 placeholder-stone-300"
                              />
                            </div>
                          </div>
                        );
                        const sec = extraSections.find(s => s.id === sectionId);
                        if (!sec) return null;
                        return (
                          <div key={sectionId} className="mb-4 group">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-bold uppercase tracking-widest text-stone-900">{sec.name}</div>
                              <button onClick={() => deleteCustomSection(sectionId)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-all"><X className="w-3 h-3" /></button>
                            </div>
                            <div className="border-t mb-2 border-stone-800" />
                            <div className="flex items-start justify-between gap-2">
                              <ul className="list-disc pl-4 flex-1 space-y-0.5">
                                {sec.bullets.map((b, bi) => <li key={bi} className="text-xs text-stone-600 leading-relaxed">{b}</li>)}
                              </ul>
                              {(sec.from || sec.to) && <span className="text-xs text-stone-500 whitespace-nowrap ml-2">{[sec.from, sec.to].filter(Boolean).join(' – ')}</span>}
                            </div>
                          </div>
                        );
                      })}

                    <div className="mt-2 pt-3 border-t border-dashed border-stone-200">
                      <button onClick={() => setShowAddSection(true)}
                        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
                        <span className="w-4 h-4 rounded border border-dashed border-stone-300 flex items-center justify-center font-bold leading-none">+</span>
                        Add section
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )}{/* end tailored t2 */}

              </div>{/* end template preview */}
            </div>{/* end resume preview card */}
            </div>{/* end left col */}

            {/* RIGHT: ATS + Feedback */}
            <div
              className={`space-y-4 ${layoutMode === 'split' ? 'lg:w-[420px] lg:flex-shrink-0 lg:sticky lg:top-[65px]' : 'w-full'}`}
              style={layoutMode === 'split' ? { overflowY: 'auto', maxHeight: 'calc(100vh - 75px)' } : {}}
            >

            {/* ── ATS Score Card ── */}
            {result.ats && (() => {
              const colors = scoreColor(result.ats.match_score);
              const circumference = 2 * Math.PI * 56;
              const offset = circumference - (result.ats.match_score / 100) * circumference;
              const delta = previousScore !== null ? result.ats.match_score - previousScore : null;
              return (
                <div className={`${colors.bg} ${colors.border} border rounded-xl p-6 mb-6`}>
                  <div className="flex items-start gap-6 flex-wrap">
                    <div className="relative flex-shrink-0">
                      <svg width="140" height="140" className="-rotate-90">
                        <circle cx="70" cy="70" r="56" stroke="currentColor" strokeWidth="10" fill="none" className="text-stone-200" />
                        <circle cx="70" cy="70" r="56" strokeWidth="10" fill="none" className={colors.ring} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
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
                            <span className="font-bold text-sm">{s}</span><span className="opacity-70">/100</span>
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
                  {previousScore !== null && result !== originalResult && (
                    <div className="mt-4 pt-4 border-t border-stone-200/50">
                      <button onClick={resetToOriginal} disabled={busy} className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors disabled:opacity-50">
                        <RotateCcw className="w-3.5 h-3.5" /> Reset to original tailored version
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Analysis Tabs ── */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-6">
              <div className="border-b border-stone-200 flex overflow-x-auto">
                {[
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

              {/* What Matched */}
              {activeTab === 'satisfied' && (
                <div className="p-6">
                  <p className="text-xs text-stone-500 mb-4">JD requirements your resume already covers, with evidence.</p>
                  <div className="space-y-2">
                    {result.ats?.satisfied_keywords?.map((k, i) => (
                      <div key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-default transition-all duration-150 ${hoveredKeyword === k.keyword ? 'bg-yellow-100 ring-1 ring-yellow-300' : 'bg-emerald-50'}`}
                        onMouseEnter={() => { setHoveredKeyword(k.keyword); setHoveredType('match'); }}
                        onMouseLeave={() => { setHoveredKeyword(null); setHoveredType(null); }}
                      >
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

              {/* Quick Wins */}
              {activeTab === 'addressable' && (
                <div>
                  {result.ats?.missing_addressable?.length > 0 && (
                    <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 z-10">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-stone-900">{selectedWins.size} of {result.ats.missing_addressable.length} selected</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <button onClick={selectAllWins} className="text-stone-600 hover:text-stone-900 underline underline-offset-2">Select all</button>
                            <span className="text-stone-300">·</span>
                            <button onClick={clearAllWins} className="text-stone-600 hover:text-stone-900 underline underline-offset-2">Clear</button>
                          </div>
                        </div>
                        <button
                          onClick={applyQuickWins}
                          disabled={busy || selectedWins.size === 0}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          {isApplying ? <><Loader2 className="w-4 h-4 animate-spin" />{stage || 'Applying…'}</> : <><Zap className="w-4 h-4" />Apply {selectedWins.size > 0 ? selectedWins.size : ''} Win{selectedWins.size !== 1 ? 's' : ''}</>}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="p-6 space-y-3">
                    <p className="text-xs text-stone-500 mb-2">These JD signals are reachable — your experience covers them but the language doesn't surface it yet. Select the ones you want and click Apply.</p>
                    {result.ats?.missing_addressable?.map((k, i) => (
                      <div key={i} onClick={() => toggleWin(i)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedWins.has(i) ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${selectedWins.has(i) ? 'bg-amber-500 border-amber-500' : 'border-stone-300'}`}>
                            {selectedWins.has(i) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm text-stone-900">{k.keyword}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">{categoryLabels[k.category] || k.category}</span>
                              {k.weight === 'must_have' && <span className="text-xs px-1.5 py-0.5 bg-stone-900 text-white rounded">must-have</span>}
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed">{k.fix_suggestion}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!result.ats?.missing_addressable || result.ats.missing_addressable.length === 0) && (
                      <div className="text-center py-8 text-stone-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                        <p className="text-sm">No addressable gaps — you're well covered!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Real Gaps */}
              {activeTab === 'gaps' && (
                <div className="p-6">
                  <p className="text-xs text-stone-500 mb-4">These are genuine gaps — no amount of rewording covers them. Be aware of these before applying.</p>
                  {result.ats?.missing_real_gaps?.length > 0 ? (
                    <div className="space-y-3">
                      {result.ats.missing_real_gaps.map((k, i) => (
                        <div key={i}
                          className={`flex items-start gap-3 p-4 rounded-xl border cursor-default transition-all duration-150 ${hoveredKeyword === k.keyword ? 'bg-red-100 border-red-400 shadow-sm' : 'bg-red-50 border-red-200'}`}
                          onMouseEnter={() => { setHoveredKeyword(k.keyword); setHoveredType('gap'); }}
                          onMouseLeave={() => { setHoveredKeyword(null); setHoveredType(null); }}
                        >
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm text-stone-900">{k.keyword}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-white text-stone-600 rounded">{categoryLabels[k.category] || k.category}</span>
                              {k.weight === 'must_have' && <span className="text-xs px-1.5 py-0.5 bg-red-700 text-white rounded">must-have</span>}
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed">{k.why_it_matters}</p>
                            {hoveredKeyword === k.keyword && (
                              <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Not found in your resume — consider adding this skill or experience
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-stone-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                      <p className="text-sm">No real gaps detected — strong fit!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>{/* end right col */}
            </div>{/* end two-column */}

            {/* Regenerate from scratch */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={generateAll}
                disabled={busy || isGeneratingAll}
                className="text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4" /> Regenerate from scratch
              </button>
            </div>

          </div>
        )}

      </main>

      {/* ── Add Section Modal ── */}
      {showAddSection && (() => {
        const isT1 = selectedTailoredTemplate === 'template1';
        const T1_DEFAULT = ['summary', 'experience', 'education', 'skills'];
        const T2_DEFAULT = ['experience', 'summary', 'education', 'achievements', 'skills'];
        const T1_LABELS = { summary: 'Professional Summary', experience: 'Work Experience', education: 'Education', skills: 'Skills' };
        const T2_LABELS = { experience: 'Experience', summary: 'Summary', education: 'Education', achievements: 'Key Achievements', skills: 'Skills' };
        const currentOrder = isT1
          ? (t1SectionOrder || [...T1_DEFAULT, ...extraSections.map(s => s.id)])
          : (t2SectionOrder || [...T2_DEFAULT, ...extraSections.map(s => s.id)]);
        const labelMap = isT1 ? T1_LABELS : T2_LABELS;
        const sectionLabels = currentOrder.map(id => labelMap[id] || (extraSections.find(s => s.id === id)?.name ?? null)).filter(Boolean);

        const handleSubmit = () => {
          if (!addSectionForm.name.trim() || !addSectionForm.details.trim()) return;
          const bullets = addSectionForm.details.split('\n').map(l => l.replace(/^[\s•\-*]+/, '').trim()).filter(Boolean);
          const id = `custom-${customIdCounter}`;
          const newSec = { id, name: addSectionForm.name.trim(), from: addSectionForm.from.trim(), to: addSectionForm.to.trim(), bullets };
          setExtraSections(prev => [...prev, newSec]);
          setCustomIdCounter(prev => prev + 1);
          const parsedPos = parseInt(addSectionForm.position, 10);
          const curT1 = t1SectionOrder || [...T1_DEFAULT, ...extraSections.map(s => s.id)];
          const curT2 = t2SectionOrder || [...T2_DEFAULT, ...extraSections.map(s => s.id)];
          if (isT1) {
            const idx = !isNaN(parsedPos) && parsedPos >= 1 ? Math.min(parsedPos - 1, curT1.length) : curT1.length;
            setT1SectionOrder([...curT1.slice(0, idx), id, ...curT1.slice(idx)]);
            setT2SectionOrder([...curT2, id]);
          } else {
            const idx = !isNaN(parsedPos) && parsedPos >= 1 ? Math.min(parsedPos - 1, curT2.length) : curT2.length;
            setT2SectionOrder([...curT2.slice(0, idx), id, ...curT2.slice(idx)]);
            setT1SectionOrder([...curT1, id]);
          }
          setAddSectionForm({ name: '', from: '', to: '', details: '', position: '' });
          setShowAddSection(false);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={() => setShowAddSection(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-stone-900">Add Section</h2>
                <button onClick={() => setShowAddSection(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Section name */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Section Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={addSectionForm.name}
                    onChange={e => setAddSectionForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Certifications, Publications, Volunteering…"
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder-stone-300"
                  />
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">From</label>
                    <input type="text" value={addSectionForm.from} onChange={e => setAddSectionForm(p => ({ ...p, from: e.target.value }))}
                      placeholder="e.g. Jan 2023"
                      className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">To</label>
                    <input type="text" value={addSectionForm.to} onChange={e => setAddSectionForm(p => ({ ...p, to: e.target.value }))}
                      placeholder="e.g. Present"
                      className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder-stone-300"
                    />
                  </div>
                </div>

                {/* Details → bullets */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Details <span className="font-normal text-stone-400">— each line becomes a bullet point</span></label>
                  <textarea
                    value={addSectionForm.details}
                    onChange={e => setAddSectionForm(p => ({ ...p, details: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Escape') setShowAddSection(false); }}
                    placeholder={"AWS Certified Solutions Architect (2024)\nGoogle Analytics Certified\nCertified Scrum Master"}
                    rows={4}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder-stone-300 resize-none"
                  />
                </div>

                {/* Existing sections reference + position */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-2">Current section order</label>
                  <div className="bg-stone-50 rounded-lg px-3 py-2.5 space-y-1.5 mb-3">
                    {sectionLabels.map((label, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-stone-600">
                        <span className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-xs font-semibold flex-shrink-0">{idx + 1}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-xs text-stone-400 pt-0.5 border-t border-stone-200 mt-1">
                      <span className="w-5 h-5 rounded-full border border-dashed border-stone-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">{sectionLabels.length + 1}</span>
                      <span className="italic">New section (default position)</span>
                    </div>
                  </div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">
                    Position <span className="font-normal text-stone-400">— enter a number from the list above (leave blank to add at end)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={sectionLabels.length + 1}
                    value={addSectionForm.position}
                    onChange={e => setAddSectionForm(p => ({ ...p, position: e.target.value }))}
                    placeholder={`${sectionLabels.length + 1} (end)`}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-stone-400 text-stone-800 placeholder-stone-300"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddSection(false)}
                  className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!addSectionForm.name.trim() || !addSectionForm.details.trim()}
                  className="flex-1 px-4 py-2.5 bg-stone-900 text-stone-50 rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Add to Resume
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
