---
slug: sop-first-draft
kind: prompt
title: Draft a standard operating procedure from your description
summary: Turn a spoken-style description of how you do a task into a
  structured SOP draft with steps, roles, and exception handling.
tags: [operations, documentation, process]
related_slugs: [policy-plain-language-summary]
attributes:
  audience: Operations staff
  tool: Microsoft 365 Copilot
  prompt: |
    I'm going to describe, informally, how my team performs a task. Turn it
    into a structured SOP draft with these sections:
    - Purpose (one sentence)
    - Roles involved
    - Prerequisites
    - Numbered steps (one action per step; note who performs it)
    - Exceptions and escalation (what to do when the normal path fails)
    - Open questions — anything I described vaguely that needs a decision

    Keep my terminology. Do not invent steps I didn't describe; put gaps in
    "Open questions" instead.

    Here's how it works today:
    [DESCRIBE THE PROCESS IN YOUR OWN WORDS]
---

## When to use this

Capturing undocumented processes — especially before a team member retires
or changes roles. Talking through the process takes 10 minutes; formatting
it used to take an hour.

## How to adapt it

- Dictate your description if that's easier; rambling input is fine, that's
  the point.
- Run it once per process variant rather than describing three variants at
  once.

## What to check

- The "Open questions" section is the real output — route those to whoever
  owns the process.
- Have someone who performs the task walk through the numbered steps before
  you publish it.
