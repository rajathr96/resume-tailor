# Resume Tailor

AI-powered resume tailoring tool for Product Managers. Takes a master resume + JD, returns tailored bullets in XYZ format calibrated for archetype and seniority, plus an ATS keyword match score.

## Status: POC

This repo currently contains a working **React component POC** (`ResumeBuilderPOC.jsx`) built and validated inside Claude's artifact sandbox. It calls the Anthropic API directly from the browser, which is fine for prototyping but NOT for production (API key would be exposed).

### What's working
- Bullet tailoring in XYZ format (action verb + scope + quantified impact)
- Archetype-aware tailoring (Fintech / Growth / Platform / Consumer / B2B / 0→1)
- Seniority calibration (APM / PM / Senior / Group-Lead)
- "Infer, don't invent" truthfulness guardrail
- Two-pass pipeline: tailor bullets → score against JD
- ATS match score (0-100) with category breakdown
- Three insight tabs: What Matched, Quick Wins (addressable gaps), Real Gaps
- Sample data preloaded for quick testing

### Next steps (roadmap)
- [ ] Wrap in a proper Next.js project so API key lives server-side
- [ ] Deploy to Vercel
- [ ] PDF export in template style
- [ ] PDF upload for master resume
- [ ] Skills section synthesis
- [ ] Before/after score comparison
- [ ] Save & compare multiple JD targets

## Files

| File | Purpose |
|------|---------|
| `ResumeBuilderPOC.jsx` | The full React component — the POC itself |
| `PRODUCT_SPEC.md` | Key product decisions, system prompts, design principles |
| `README.md` | This file |

## How to run the POC

The JSX file is currently designed to run inside Claude's artifact sandbox. To run it locally, you'll need to wrap it in a Next.js or Vite project and move the Anthropic API call to a server-side route. See `PRODUCT_SPEC.md` for the planned architecture.

For now, the easiest way to use it is to paste it back into a Claude conversation as an artifact, or convert to Next.js (next step in the roadmap).
