---
slug: budget-variance-narrative
kind: prompt
title: Draft a budget variance narrative
summary: Turn a list of variances into a clear, review-ready explanation
  paragraph for your budget officer or monthly close package.
tags: [budget, finance, writing]
related_slugs: [copilot-excel-budget-variance, sensitive-data]
featured: true
attributes:
  audience: Finance staff
  tool: Microsoft 365 Copilot
  prompt: |
    I'm preparing the monthly budget-to-actuals review for [DEPARTMENT].
    Below are the accounts with variances over 10% and a one-line reason
    for each. Draft a concise narrative (under 200 words) suitable for a
    budget officer: lead with the overall picture, group related drivers,
    and flag anything that will persist in future months. Use plain,
    non-defensive language.

    Variances:
    [PASTE YOUR VARIANCE LIST HERE]
  example_input: "Travel +18% (conference season), Supplies -12% (delayed PO),
    Salaries +4% (retro pay adjustment)"
  example_output: A single paragraph summarizing the net position, the three
    drivers grouped by one-time vs. recurring, and a closing sentence on
    expected normalization.
---

## When to use this

After you've identified variances (see the
[Copilot in Excel variance playbook](/g/copilot-excel-budget-variance)) and
need the written explanation that goes into the close package.

## How to adapt it

- Replace `[DEPARTMENT]` and paste your variance list with one short reason
  per line — the reasons drive the quality of the narrative.
- Add "keep a formal tone" or "write for a non-finance audience" depending
  on who reads your close package.

## What to check

- Verify every number it repeats back — never trust restated figures.
- Make sure one-time vs. recurring classifications match your intent.
