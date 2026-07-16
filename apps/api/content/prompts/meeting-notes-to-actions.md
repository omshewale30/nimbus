---
slug: meeting-notes-to-actions
kind: prompt
title: Turn meeting notes into an action-item list
summary: Convert raw meeting notes or a transcript into a clean list of
  decisions, owners, and deadlines you can paste into a follow-up email.
tags: [meetings, operations, productivity]
related_slugs: [sensitive-data]
featured: true
attributes:
  audience: All staff
  department: All
  tool: Microsoft 365 Copilot
  prompt: |
    Below are my raw notes from a meeting. Extract:
    1. Decisions made (one line each)
    2. Action items as a table: task, owner, due date (mark "not stated"
       if missing rather than guessing)
    3. Open questions that were raised but not resolved

    Do not invent owners or dates that aren't in the notes.

    Notes:
    [PASTE YOUR NOTES HERE]
  example_input: "Discussed Q3 close timeline. Sarah will send the revised
    checklist by Friday. Still need to decide who owns the vendor
    reconciliation step."
  example_output: A decisions line noting the Q3 close timeline was
    discussed, an action-item table row (task, owner Sarah, due Friday),
    and an open question flagging the unassigned vendor reconciliation owner.
---

## When to use this

Right after a meeting, while your notes are still fresh — the output drops
straight into a follow-up email or Teams post.

## How to adapt it

- If you have a Teams transcript instead of notes, paste that — it works
  the same but check speaker attribution.
- Add "group action items by owner" for larger meetings.

## What to check

- The "not stated" markers — those are your cue to confirm owners and dates
  before sending the follow-up.
- Anything attributed to a specific person; misattribution is the most
  common failure with transcripts.
