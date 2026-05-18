# Resume Tailor — Product Spec

This document captures the key product decisions, system prompts, and design principles agreed during the POC phase. Read this before extending the product, and reference it in future Claude sessions to maintain continuity.

---

## Product hypothesis

PM resumes are uniquely hard to tailor because the same underlying experience reads very differently across archetypes (Growth vs Platform vs Consumer vs Fintech). Most AI resume tools produce generic output. This tool wins by combining:

1. **Archetype-aware tailoring** (not just title-based)
2. **Truthfulness guardrails** ("infer, don't invent")
3. **ATS scoring with explainability** (not just a number — actionable Quick Wins)
4. **Format that matches what recruiters actually read** (XYZ bullets, ~15-22 words)

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

---

## System prompt architecture (current POC)

Two-pass pipeline:

### Pass 1: Tailor bullets

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
- Classify gaps as "addressable" (fixable from existing content) vs "real_gap" (genuinely missing)
- Outputs: match_score (0-100), score_label, category breakdown, satisfied_keywords (with evidence), missing_addressable (with fix suggestions), missing_real_gaps

---

## Anti-patterns to avoid

Things that look helpful but degrade the product:

1. **Keyword stuffing** — reads fake to humans even if it boosts ATS
2. **Generic "led initiatives" bullets** — vague, no scope, no impact
3. **Full STAR format in resume** — too verbose; save for cover letters/interviews
4. **Inventing user interviews, customer counts, or metrics** — destroys trust
5. **Auto-suggesting tools the user hasn't used** — biggest fabrication risk
6. **Showing only a score with no explanation** — score without "what to fix" is useless

---

## Next architectural decisions (not yet built)

### Production deployment
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

### Iteration UX
- Bullet-level regeneration ("make this more technical")
- "Apply Quick Wins" auto-regenerate button
- Before/after score comparison

---

## Tech stack (planned)

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 (App Router) | React-based, server routes for API key safety |
| Styling | Tailwind CSS | Already used in POC |
| Hosting | Vercel | Free tier, GitHub auto-deploy |
| API | Anthropic SDK (server-side) | Claude Sonnet 4 for tailoring + scoring |
| PDF generation | reportlab (Python service) or react-pdf | Python validated for template fidelity |
