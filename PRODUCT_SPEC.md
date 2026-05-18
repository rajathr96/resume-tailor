# Resume Tailor — Product Spec

This document captures the key product decisions, system prompts, and design principles agreed during the POC phase. Read this before extending the product, and reference it in future Claude sessions to maintain continuity.

**Last updated:** POC v3 (Apply Quick Wins shipped)

---

## Product hypothesis

PM resumes are uniquely hard to tailor because the same underlying experience reads very differently across archetypes (Growth vs Platform vs Consumer vs Fintech). Most AI resume tools produce generic output. This tool wins by combining:

1. **Archetype-aware tailoring** (not just title-based)
2. **Truthfulness guardrails** ("infer, don't invent")
3. **ATS scoring with explainability** (not just a number — actionable Quick Wins)
4. **Closed-loop workflow** — see gap, click button, get fixed resume with measurable score improvement
5. **Format that matches what recruiters actually read** (XYZ bullets, ~15-22 words)

---

## Format decisions

### Bullet format: XYZ, not STAR

- **XYZ** = `[Strong action verb] + [what you did with scope/context] + [quantified impact]`
- STAR is too verbose for resume bullets; works for interview prep instead
- Target length: 15-22 words per bullet, single line
- Always lead with strong action verbs (Owned, Built, Led, Drove, Incubated, Designed)
- Quantify everything — %, $, multipliers, counts

### Page length

- Default to 1 page (hard constraint for <5 years experience, strongly preferred for 5-10 years)
- Warn user before allowing 2 pages
- Trim priority (when overflowing):
  1. Drop oldest role's least-relevant bullet
  2. Collapse multi-level same-company roles (e.g. MTS-1/2/3 → one block)
  3. Tighten skills section
  4. Reduce font size 10 → 9.5pt (never below 9pt)
  5. Last resort: drop achievements section

### Template style (visual)

Single-column, ATS-friendly:
- Name in large bold caps, centered
- Contact line with active hyperlinks (tel:, mailto:, LinkedIn URL)
- Section headers in bold caps with horizontal rule underneath
- Company name in bold blue (`#1F4E79`), role in italic, dates right-aligned
- Round bullets, no nested levels
- Helvetica/Calibri, 10pt body (9.5pt if tight)

---

## Archetype taxonomy

Don't split by title (PM, Sr PM, GPM) — split by **archetype**:

- **Growth PM** — experimentation, funnel, conversion, A/B testing
- **Platform/Technical PM** — APIs, infra, developer experience, system design
- **Consumer PM** — UX, user research, retention, engagement
- **B2B/Enterprise PM** — sales motion, integration, enterprise contracts
- **Fintech PM** — domain-specific (payments, wealth, lending, compliance)
- **0→1 / Product Strategy** — ambiguity, scoping, MVP definition

Seniority is a separate axis:
- APM/Associate — execution, learning, structured thinking
- PM (IC) — ownership, cross-functional delivery
- Senior PM — influence, strategy, mentoring
- Group/Lead PM — org-level impact, scope across teams

---

## Core guardrails (NON-NEGOTIABLE)

### 1. Infer, don't invent

The hardest rule to enforce, the most important for trust.

- **Inferring** = reframing, surfacing implicit work, adjusting emphasis. Example: master says "Defined PRDs, shipped 7+ features" → tailored can say "Translated complex workflows into intuitive product flows" because that's what shipping product features inherently involves.
- **Inventing** = adding specific facts not in the source. Example: master says "Defined PRDs" → tailored CANNOT say "Conducted 30 user interviews with HNI investors" — those specifics weren't there.

### 2. Never fabricate metrics

- If master says "improved CTR by 25%", keep 25%.
- Never round up, embellish, or invent numbers.

### 3. Skills are user-verified, not LLM-generated

- The LLM should never auto-add tools or skills not in the master resume.
- For now, the user provides them. Eventually, the UI should have a verification step where the user confirms each suggested skill.

### 4. Quick Wins are opt-in, not auto-applied

- User must explicitly select which Quick Wins to incorporate before regeneration
- "Apply all" is a shortcut, not a default
- Original tailored version is always recoverable via Reset
- This preserves user control over truthfulness — they can reject any suggestion that feels like a stretch

---

## System prompt architecture (current POC)

Three-pass pipeline depending on user action:

### Pass 1: Tailor bullets (initial generation)

System prompt enforces:
- Archetype + seniority lens
- XYZ format
- 15-22 word bullets
- Truthfulness rules
- Outputs structured JSON with `tailored_experiences`, `tailoring_notes`, `gaps`

### Pass 2: ATS scoring

System prompt enforces:
- Categorize JD requirements into 5 buckets: hard_skill, domain, soft_signal, tool, experience
- Weight must-haves 2× over nice-to-haves
- Semantic matching (not literal) — "led" ≈ "owned", "A/B testing" ≈ "experimentation"
- Classify gaps as "addressable" (fixable from existing content) vs "real_gap" (not fakeable)
- Outputs: match_score (0-100), score_label, category breakdown, satisfied_keywords (with evidence), missing_addressable (with fix suggestions), missing_real_gaps

### Pass 3: Apply Quick Wins (regeneration with guidance)

Triggered when user selects Quick Wins and clicks Apply. Pipeline:
1. Build an `additionalGuidance` string from the user's selected Quick Wins, listing each keyword + category + weight + fix_suggestion
2. Run Pass 1 again, with this guidance appended to the system prompt under "ADDITIONAL GUIDANCE FOR THIS GENERATION"
3. The guidance explicitly tells Claude: "incorporate these JD keywords using the suggestions, which describe how to reframe existing master-resume content — do NOT invent new facts"
4. Re-run Pass 2 (ATS scoring) on the new output
5. UI shows delta from previous score

This three-pass design is the **closed-loop workflow** — gap → action → measurable improvement.

---

## UX principles (validated through iteration)

### Show, don't tell

- Score delta badge ("+22 from 51") is more compelling than a single-point score
- Evidence-backed satisfied keywords build trust ("we matched 'A/B testing' because of this bullet")
- Reset button signals "you're in control, not the AI"

### Three semantic tabs

- **What Matched** — celebration (builds confidence)
- **Quick Wins** — action (the workflow loop's heart)
- **Real Gaps** — honesty (saves the user from over-claiming)

This separation matters. Mixing them all into one "feedback" tab dilutes each.

### Visual hierarchy

- Big circular score gauge is the hero — first thing the eye lands on
- Color-coded scoring: green ≥75, amber 55-74, red <55
- Quick Wins tab gets an amber badge when unaddressed — visual nudge
- Sticky action bar in Quick Wins keeps "Apply" button always visible

---

## Anti-patterns to avoid

Things that look helpful but degrade the product:

1. **Keyword stuffing** — reads fake to humans even if it boosts ATS
2. **Generic "led initiatives" bullets** — vague, no scope, no impact
3. **Full STAR format in resume** — too verbose; save for cover letters/interviews
4. **Inventing user interviews, customer counts, or metrics** — destroys trust
5. **Auto-suggesting tools the user hasn't used** — biggest fabrication risk
6. **Showing only a score with no explanation** — score without "what to fix" is useless
7. **Auto-applying all Quick Wins** — removes user control, violates trust contract
8. **Hiding what changed after Apply** — user can't tell if regeneration drifted

---

## Known limitations of current POC

These are honest gaps in v3 that the next iterations should address:

1. **No diff view** — user can't see which bullets changed between original and applied versions. They have to eyeball it. A side-by-side or highlight-diff would help.
2. **Apply Quick Wins triggers full regeneration, not surgical edits** — means bullets the user liked might shift slightly. A more targeted approach (only rewrite bullets that gain a new Quick Win keyword) would be ideal but harder.
3. **No persistence** — refresh and you lose everything. Local storage is a trivial fix.
4. **API key exposed in browser** — POC only. Production MUST move to a Next.js server route.
5. **No baseline score** — we score the tailored version, but never the master. Showing "Your master scored 51, your tailored version scores 73" would prove value even before Quick Wins.
6. **No PDF export yet** — the Python reportlab build proved the template works; needs porting to the web version.
7. **Skills section not synthesized** — currently the LLM doesn't propose a skills block. v3 iteration in Python validated this is doable but needs user verification UX.

---

## Next architectural decisions (not yet built)

### Production deployment (required before sharing)
- Next.js wrapper with server-side API routes (hide API key)
- Deploy to Vercel
- Environment variables for ANTHROPIC_API_KEY

### Smart 1-page trim
- Generate ideal bullets first
- Render to PDF, check page count
- If overflow: apply trim priority list above
- Show "trim report" so user sees what was cut

### Output formats
- PDF (matching template style with hyperlinks)
- DOCX (many ATS prefer this)
- Plain text (ultimate ATS fallback)

### Iteration UX (post Quick Wins)
- Bullet-level regenerate ("make this more technical")
- Diff view between versions
- Save & compare multiple JDs
- Baseline (master) score for true before/after

---

## Tech stack (planned)

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 (App Router) | React-based, server routes for API key safety |
| Styling | Tailwind CSS | Already used in POC |
| Hosting | Vercel | Free tier, GitHub auto-deploy |
| API | Anthropic SDK (server-side) | Claude Sonnet 4 for tailoring + scoring |
| PDF generation | reportlab (Python service) or react-pdf | Python validated for template fidelity |

---

## Changelog

- **v1** — Single-pass POC: paste master + JD → tailored bullets on screen
- **v2** — Two-pass pipeline added: tailoring + ATS scoring with category breakdown, Quick Wins / Real Gaps separation
- **v3** — Apply Quick Wins workflow: selectable suggestions, regeneration with guidance, before/after score delta, reset to original
