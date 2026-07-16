---
slug: policy-plain-language-summary
kind: prompt
title: Summarize a policy in plain language
summary: Produce a short, plain-language summary of a policy or procedure
  document, with the "what changed" and "what you must do" pulled out.
tags: [policy, operations, writing]
related_slugs: [sensitive-data]
attributes:
  audience: Operations staff
  department: Operations
  tool: Microsoft 365 Copilot
  prompt: |
    Summarize the policy text below for staff who need to follow it but
    won't read the full document. Produce:
    - A two-sentence plain-language summary
    - "What you must do": bullet list of concrete obligations
    - "What changed": if the text mentions revisions, list them; otherwise
      write "No changes described."
    - Any deadlines or effective dates, quoted exactly

    Policy text:
    [PASTE THE POLICY TEXT HERE]
  example_input: The full text of a revised travel reimbursement policy,
    including a new receipt threshold and an effective date.
  example_output: A two-sentence summary, a "what you must do" bullet list
    (e.g. "keep receipts for purchases over $25"), a "what changed" note
    about the new threshold, and the effective date quoted exactly.
---

## When to use this

When announcing a new or revised policy and you need the staff-facing
summary for an email, intranet page, or team meeting.

## What to check

- Quoted deadlines and effective dates against the original — these must be
  exact.
- The obligations list with the policy owner before publishing; a summary
  that omits an obligation is worse than no summary.

Only paste policies that are already internal-public. For drafts under
review, check with the policy owner first.
