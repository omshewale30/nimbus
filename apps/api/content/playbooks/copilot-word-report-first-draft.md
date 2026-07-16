---
slug: copilot-word-report-first-draft
kind: playbook
title: Draft a recurring report with Copilot in Word
summary: Use Copilot in Word to produce the first draft of a recurring
  narrative report (quarterly updates, program summaries) from your bullet
  points and last period's version.
tags: [word, copilot, writing, reporting]
related_slugs: [microsoft-365-copilot, sensitive-data, budget-variance-narrative]
published: true
---

## What you'll do

Cut the blank-page phase out of a recurring report: you provide this
period's facts as bullets, Copilot provides a structured draft that matches
last period's format.

## Prerequisites

- A Microsoft 365 Copilot license.
- Last period's report saved in OneDrive or SharePoint (Copilot can only
  reference files it can access).
- Your bullet points for this period — the facts, figures, and changes.
  Garbage in, garbage out applies double here.

## Steps

1. Open a new Word document and start Copilot with **Draft with Copilot**.
2. Reference the previous report and provide your bullets:
   > Draft this quarter's operations update following the structure of
   > [/previous-report.docx]. Here are this quarter's facts: [YOUR BULLETS].
   > Keep each section under 150 words. Where I haven't provided a fact for
   > a section, insert "[NEEDS INPUT]" rather than inventing content.
3. Review the draft section by section. Search for `[NEEDS INPUT]` markers
   and fill them from real sources.
4. Ask Copilot to tighten specific sections rather than regenerating the
   whole draft:
   > Rewrite the staffing section to lead with the vacancy numbers.
5. Fact-check every figure against your bullets — numbers are where drafts
   silently drift.

## Common problems

- **Copilot can't find the previous report** — the file must be in
  OneDrive/SharePoint and recently opened, or referenced with the file
  picker; local-drive files won't resolve.
- **Invented content in gaps** — if you skipped the `[NEEDS INPUT]`
  instruction, Copilot fills gaps plausibly. Always include it.
- **Wrong structure** — if the previous report is heavily formatted with
  tables, Copilot may flatten them; paste the section headings into the
  prompt instead.
