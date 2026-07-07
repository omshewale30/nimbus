---
slug: copilot-excel-budget-variance
kind: playbook
title: Analyze a budget variance report with Copilot in Excel
summary: Use Microsoft 365 Copilot in Excel to summarize month-over-month
  variances in a departmental budget report and draft an explanation for your
  budget officer.
tags: [budget, finance, excel, copilot]
related_slugs: [microsoft-365-copilot, sensitive-data]
featured: true
published: true
---

> **Before you start:** this playbook assumes your workbook contains no
> student records or other sensitive data. If you're not sure, read
> [What data can I put into Copilot?](/g/sensitive-data) first.

## What you'll do

Turn a raw budget-to-actuals export into a variance summary with a drafted
narrative, in about 10 minutes.

## Prerequisites

- A Microsoft 365 Copilot license (check with your IT contact if the Copilot
  icon doesn't appear in the Excel ribbon).
- Your budget export formatted as an Excel **table** (select the data, then
  **Insert → Table**). Copilot in Excel only works with tables.

## Steps

1. Open the workbook in Excel (desktop or web) and click inside your table.
2. Open **Copilot** from the ribbon.
3. Ask Copilot to add a variance column:
   > Add a column that calculates the difference between Budget and Actuals,
   > and a column showing that difference as a percentage of Budget.
4. Ask for the outliers:
   > Highlight rows where the variance is more than 10% of budget.
5. Ask for a summary you can adapt:
   > Summarize the three largest variances and suggest one sentence of
   > explanation for each based on the account names.
6. **Review every number before you send anything.** Copilot's arithmetic is
   applied via formulas you can inspect — click the new columns and check the
   formula bar.

## Example prompt that works well

> This table shows budgeted vs. actual spending by account for FY26 Q3.
> Which accounts drove the overall variance, and what share of the total
> variance does each represent?

## Common problems

- **"Copilot can't work with this data"** — your data isn't a table yet, or
  the table has merged cells. Unmerge and re-create the table.
- **Wrong column picked up** — rename ambiguous headers (e.g. two columns
  both called "Total") before prompting.
