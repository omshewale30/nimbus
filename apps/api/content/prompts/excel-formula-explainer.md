---
slug: excel-formula-explainer
kind: prompt
title: Explain or debug an Excel formula
summary: Get a plain-English explanation of what an inherited spreadsheet
  formula does, why it might be failing, and a safer rewrite.
tags: [excel, finance, spreadsheets]
attributes:
  audience: Finance staff
  department: Finance
  tool: Microsoft 365 Copilot
  prompt: |
    Explain this Excel formula step by step in plain English:

    [PASTE THE FORMULA HERE]

    Then:
    1. Describe what the overall result represents
    2. List the ways it could break or give a wrong answer (hidden
       assumptions, error values, edge cases)
    3. Suggest a clearer rewrite using modern functions (XLOOKUP, LET,
       IFERROR) and explain what the rewrite changes
  example_input: "=VLOOKUP(A2,Budget!$A:$D,4,FALSE)"
  example_output: A plain-English walkthrough of the lookup, a note that
    VLOOKUP breaks if columns are inserted before column D, and a suggested
    rewrite using XLOOKUP with IFNA for a friendlier error.
---

## When to use this

Inherited workbooks — the monthly report someone built years ago with a
nested formula nobody dares touch.

## How to adapt it

- Include what the columns contain ("column C is fund codes, column F is
  amounts") for a much better explanation.
- If the formula returns an error, paste the error value too.

## What to check

- Test any suggested rewrite on a **copy** of the workbook, side by side
  with the original, across a full month of real data before replacing
  anything.
