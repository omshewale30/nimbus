# Nimbus content

Git-first content model: every playbook, tool-registry entry, and guidance
page is a markdown file in this directory. **Git is the source of truth** —
the API mirrors these files into the `content_items` table at startup (and via
`make content-sync`). Merging to `main` and deploying *is* publishing.

This directory lives under `apps/api/` (not the repo root) because the API
Docker image is built with `apps/api` as its context; the files are baked into
the image at `/app/content`.

## Layout

```
content/
  playbooks/   kind: playbook  — workflow-specific how-tos for approved tools
  tools/       kind: tool      — the AI tool & pilot registry
  guidance/    kind: guidance  — plain-language acceptable-use guidance
```

The subdirectories are a convention for humans; the sync only reads the
`kind` field in frontmatter.

## File format

YAML frontmatter followed by a markdown body:

```markdown
---
slug: copilot-excel-budget-variance   # required; unique, lowercase kebab-case
kind: playbook                        # required; playbook | tool | guidance
title: Analyze a budget variance report with Copilot in Excel   # required
summary: One or two sentences shown on cards and used by the ask endpoint to
  decide relevance.                   # required
tags: [budget, excel, copilot]        # optional; list of strings
related_slugs: [sensitive-data]       # optional; hand-curated cross-links.
                                      # Playbooks/tools should link the guidance
                                      # that applies to them — this is what
                                      # powers contextual risk callouts.
featured: false                       # optional; featured on the home page
published: true                       # optional; false hides it everywhere
attributes: {}                        # optional; kind-specific fields, see below
---

The markdown body. For playbooks: prerequisites, numbered steps, examples,
links, video embeds. For guidance: plain-language do/don't.
```

### `attributes` for `kind: tool`

```yaml
attributes:
  status: approved        # approved | pilot | under-review | retired
  owner_dept: ITS
  owner_contact: someone@unc.edu
  url: https://example.com
```

## Rules enforced by the sync

- `slug`, `kind`, `title`, `summary` are required; `kind` must be valid;
  slugs must be unique across ALL kinds.
- Invalid files are skipped and reported — they never abort the sync.
- Deleting a file deletes its row on the next sync (unless the scan had
  errors, in which case deletions are held back as a safety measure).
- Renaming a `slug` is a delete + create; avoid it once a slug has been
  linked from other content or shared as a URL.

Run `make content-sync` (or `python -m app.services.content_sync` from
`apps/api`) to sync manually; it exits non-zero if any file is invalid, so it
can gate CI.
