"""Tests for the git-to-DB content sync (services/content_sync.py)."""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import select

from app.models.content_item import ContentItem
from app.services.content_sync import sync_content

PLAYBOOK = """---
slug: test-playbook
kind: playbook
title: A test playbook
summary: How to test things.
tags: [testing, excel]
related_slugs: [test-guidance]
featured: true
---

Step one, step two.
"""

GUIDANCE = """---
slug: test-guidance
kind: guidance
title: A test guidance page
summary: What not to paste.
---

Never paste secrets.
"""

TOOL = """---
slug: test-tool
kind: tool
title: A test tool
summary: An approved tool.
attributes:
  status: approved
  owner_dept: ITS
---

Tool details.
"""


def write(content_dir: Path, name: str, text: str) -> Path:
    path = content_dir / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def rows(db) -> dict[str, ContentItem]:
    return {r.slug: r for r in db.execute(select(ContentItem)).scalars()}


def test_sync_creates_items(tmp_path, db_session):
    write(tmp_path, "playbooks/a.md", PLAYBOOK)
    write(tmp_path, "guidance/b.md", GUIDANCE)
    write(tmp_path, "tools/c.md", TOOL)
    write(tmp_path, "README.md", "# not content")

    result = sync_content(db_session, tmp_path)

    assert result.errors == []
    assert result.created == 3
    by_slug = rows(db_session)
    assert set(by_slug) == {"test-playbook", "test-guidance", "test-tool"}
    playbook = by_slug["test-playbook"]
    assert playbook.kind == "playbook"
    assert playbook.tags == ["testing", "excel"]
    assert playbook.related_slugs == ["test-guidance"]
    assert playbook.featured is True
    assert playbook.published is True
    assert playbook.body_md == "Step one, step two."
    assert by_slug["test-tool"].attributes["status"] == "approved"


def test_sync_is_idempotent(tmp_path, db_session):
    write(tmp_path, "a.md", PLAYBOOK)
    sync_content(db_session, tmp_path)

    result = sync_content(db_session, tmp_path)

    assert (result.created, result.updated, result.unchanged) == (0, 0, 1)


def test_sync_updates_changed_file(tmp_path, db_session):
    write(tmp_path, "a.md", PLAYBOOK)
    sync_content(db_session, tmp_path)
    write(tmp_path, "a.md", PLAYBOOK.replace("A test playbook", "A renamed playbook"))

    result = sync_content(db_session, tmp_path)

    assert (result.created, result.updated) == (0, 1)
    assert rows(db_session)["test-playbook"].title == "A renamed playbook"


def test_sync_deletes_removed_files(tmp_path, db_session):
    a = write(tmp_path, "a.md", PLAYBOOK)
    write(tmp_path, "b.md", GUIDANCE)
    sync_content(db_session, tmp_path)
    a.unlink()

    result = sync_content(db_session, tmp_path)

    assert result.deleted == 1
    assert set(rows(db_session)) == {"test-guidance"}


def test_invalid_file_is_reported_and_blocks_deletion(tmp_path, db_session):
    write(tmp_path, "a.md", PLAYBOOK)
    write(tmp_path, "b.md", GUIDANCE)
    sync_content(db_session, tmp_path)

    # The playbook file breaks (bad kind); the sync must keep serving its row.
    write(tmp_path, "a.md", PLAYBOOK.replace("kind: playbook", "kind: bogus"))
    result = sync_content(db_session, tmp_path)

    assert len(result.errors) == 1
    assert "a.md" in result.errors[0]
    assert result.deleted == 0
    assert set(rows(db_session)) == {"test-playbook", "test-guidance"}


def test_duplicate_slug_is_an_error(tmp_path, db_session):
    write(tmp_path, "a.md", PLAYBOOK)
    write(tmp_path, "b.md", PLAYBOOK)

    result = sync_content(db_session, tmp_path)

    assert result.created == 1
    assert any("duplicate slug" in e for e in result.errors)


def test_missing_required_field_and_frontmatter(tmp_path, db_session):
    write(tmp_path, "a.md", "---\nslug: x\nkind: playbook\ntitle: X\n---\nbody")
    write(tmp_path, "b.md", "no frontmatter at all")

    result = sync_content(db_session, tmp_path)

    assert result.created == 0
    assert len(result.errors) == 2


def test_empty_scan_never_wipes_the_table(tmp_path, db_session):
    write(tmp_path, "a.md", PLAYBOOK)
    sync_content(db_session, tmp_path)
    (tmp_path / "a.md").unlink()

    result = sync_content(db_session, tmp_path)

    assert result.deleted == 0
    assert set(rows(db_session)) == {"test-playbook"}


def test_missing_directory_is_an_error(tmp_path, db_session):
    result = sync_content(db_session, tmp_path / "nope")

    assert result.errors
    assert result.created == 0
