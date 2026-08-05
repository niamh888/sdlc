#!/usr/bin/env python3
"""
============================================================
 render.py — turns docs/*.md into styled, browsable HTML pages
============================================================

WHAT THIS IS
A build-time tool. It converts each markdown document in this folder into a
standalone HTML page that looks like the rest of the site — same header,
navigation, theme toggle and footer — so a visitor can read one of these
example lifecycle documents without leaving the site's look and feel or
needing to know what markdown is.

WHY A HAND-ROLLED CONVERTER RATHER THAN A LIBRARY
[04 — Architecture](04-software-architecture.md) documents, as a genuine
property of this project, that nothing third-party ships to a visitor's
browser. Pulling in a markdown-rendering library (even a small one) to run
in the browser would ship exactly that. The alternative used here is the
same one tests/capture_screenshots.py already established as a precedent:
run a small Python tool ONCE, at development time, and commit its output —
14 static HTML files, no library, nothing for a visitor's browser to fetch
or execute beyond ordinary HTML and the site's existing CSS/JS.

It is also, deliberately, in the same spirit as tests/test_site.py's own
hand-rolled test runner: this project's markdown is a small, known, fixed
subset (headings, paragraphs, bold/italic/code/links, block quotes, lists,
GFM tables) rather than the full CommonMark specification, so a parser
scoped to exactly that subset is simpler to read, verify and trust than
pulling in a general-purpose one.

HOW TO RUN IT
    python docs/render.py

Regenerate after editing any docs/*.md file. The test suite's `docs` group
checks the HTML is present and current in outline — it does not re-implement
this parser, so a change to a .md file that isn't followed by a re-run will
be caught as a page whose content looks stale, not silently ignored.
============================================================
"""

import html
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(os.path.join(__file__, '..')))
DOCS = os.path.join(ROOT, 'docs')


# ============================================================
# HEADING ANCHORS
# Matches GitHub's own algorithm closely enough for these documents: lowercase,
# strip everything that isn't a letter, digit, space or hyphen, turn spaces into
# hyphens. This has to match exactly, because every cross-document link in this
# folder (e.g. "02-software-development-plan.md#gaps") depends on the anchor
# landing in the same place a human reading the raw markdown on GitHub would
# expect.
# ============================================================

def slugify(heading_text, seen):
    slug = heading_text.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = slug.replace(' ', '-')
    if slug in seen:
        seen[slug] += 1
        slug = '%s-%d' % (slug, seen[slug])
    else:
        seen[slug] = 0
    return slug


# ============================================================
# INLINE FORMATTING
# Applied to the text inside a block (a paragraph, a heading, a table cell, a
# list item). Order matters: code spans are pulled out to placeholders FIRST,
# so a stray `*` or `_` inside a code span (e.g. `learn_pseudocode.md`) is
# never mistaken for emphasis; they are put back last, after everything else
# has been turned into real HTML.
# ============================================================

def rewrite_md_link(url):
    """A link to another document in this folder should open the rendered
    page, not the raw source — but only for OUR .md files. A link to
    ../tests/test_site.py or an external https:// URL is left exactly as
    written; only a relative link ending in .md (optionally with a #anchor)
    is rewritten, and docs/README.md specifically becomes index.html, since
    that is what this script names the register's own rendered page."""
    if url.startswith(('http://', 'https://', 'mailto:')):
        return url
    path, _, anchor = url.partition('#')
    if not path.endswith('.md'):
        return url
    base = os.path.basename(path)[:-3]
    html_name = 'index.html' if base == 'README' else base + '.html'
    new_path = (os.path.dirname(path) + '/' + html_name) if os.path.dirname(path) else html_name
    return new_path + ('#' + anchor if anchor else '')


def render_inline(text):
    text = html.escape(text, quote=False)

    code_spans = []

    def stash_code(m):
        code_spans.append(m.group(1))
        return '\x00CODE%d\x00' % (len(code_spans) - 1)

    text = re.sub(r'`([^`]+)`', stash_code, text)

    def link_sub(m):
        label, url = m.group(1), m.group(2)
        return '<a href="%s">%s</a>' % (rewrite_md_link(url), label)

    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link_sub, text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', text)

    def restore_code(m):
        return '<code>%s</code>' % code_spans[int(m.group(1))]

    text = re.sub(r'\x00CODE(\d+)\x00', restore_code, text)
    return text


# ============================================================
# BLOCK-LEVEL PARSING
# Line by line, grouping into the handful of block types these documents
# actually use: headings, block quotes, GFM tables, unordered/ordered lists,
# and paragraphs. Nothing here handles fenced code blocks, nested lists, or
# nested block quotes, because none of docs/*.md use them — see the module
# docstring for why that is a deliberate scope, not an oversight.
# ============================================================

def is_table_separator(line):
    return bool(re.match(r'^\|?[\s:|-]+\|?$', line)) and '-' in line


def split_row(line):
    line = line.strip()
    if line.startswith('|'):
        line = line[1:]
    if line.endswith('|'):
        line = line[:-1]
    return [cell.strip() for cell in line.split('|')]


def is_new_block_start(line):
    """True if `line` opens a new block, so a paragraph or list item being
    collected must stop BEFORE consuming it rather than swallowing it as a
    continuation line."""
    stripped = line.strip()
    if not stripped:
        return True
    return bool(re.match(r'^(#{1,6}\s|>|\d+\.\s|-\s)', line)) or stripped.startswith('|')


def render_blocks(lines, seen_slugs):
    html_parts = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]

        if not line.strip():
            i += 1
            continue

        heading_match = re.match(r'^(#{1,6})\s+(.*)', line)
        if heading_match:
            level = len(heading_match.group(1))
            text = heading_match.group(2)
            slug = slugify(text, seen_slugs)
            html_parts.append('<h%d id="%s">%s</h%d>' %
                               (level, slug, render_inline(text), level))
            i += 1
            continue

        if line.startswith('>'):
            quote_lines = []
            while i < n and lines[i].startswith('>'):
                quote_lines.append(lines[i][1:].lstrip(' '))
                i += 1
            # A bare `>` line is a paragraph break WITHIN the same block quote,
            # not the end of it — so this collects one blockquote that may
            # contain more than one <p>, matching how doc 11 and 04 use it.
            paragraphs, current = [], []
            for ql in quote_lines:
                if ql == '':
                    if current:
                        paragraphs.append(' '.join(current))
                        current = []
                else:
                    current.append(ql)
            if current:
                paragraphs.append(' '.join(current))
            inner = ''.join('<p>%s</p>' % render_inline(p) for p in paragraphs)
            html_parts.append('<blockquote>%s</blockquote>' % inner)
            continue

        if line.strip().startswith('|') and i + 1 < n and is_table_separator(lines[i + 1].strip()):
            header_cells = split_row(line)
            i += 2  # skip header + separator
            body_rows = []
            while i < n and lines[i].strip().startswith('|'):
                body_rows.append(split_row(lines[i]))
                i += 1
            thead = '<tr>' + ''.join(
                '<th scope="col">%s</th>' % render_inline(c) for c in header_cells) + '</tr>'
            tbody = ''.join(
                '<tr>' + ''.join('<td>%s</td>' % render_inline(c) for c in row) + '</tr>'
                for row in body_rows)
            # tabindex + role/aria-label on the scrolling wrapper, not the
            # <table>: a region a mouse user can drag-scroll must also be one
            # a keyboard user can Tab to and scroll with arrow keys, or it
            # fails WCAG 2.1.1 — axe's scrollable-region-focusable rule caught
            # this missing on the first real run (see 04-software-architecture,
            # whose SOUP table is the first one wide enough to actually
            # overflow).
            #
            # role="group", not role="region": region is a LANDMARK role, and
            # a document with several tables sharing the same header row (see
            # 03-software-requirements-specification, which repeats "ID,
            # Requirement, Verified by" six times for its six page-by-page
            # tables) would then register several same-named landmarks —
            # axe's landmark-unique rule caught exactly that on the second
            # real run. group gets the same focusable, named-for-a-screen-
            # reader behaviour without being announced as a page landmark.
            wrap_label = html.escape('Table: ' + ', '.join(header_cells), quote=True)
            html_parts.append(
                '<div class="doc-table-wrap" tabindex="0" role="group" aria-label="%s">'
                '<table class="legal-table">'
                '<thead>%s</thead><tbody>%s</tbody></table></div>' % (wrap_label, thead, tbody))
            continue

        if re.match(r'^-\s+', line) or re.match(r'^\d+\.\s+', line):
            ordered = bool(re.match(r'^\d+\.\s+', line))
            marker_re = re.compile(r'^\d+\.\s+') if ordered else re.compile(r'^-\s+')
            items = []
            while i < n and marker_re.match(lines[i]):
                item_lines = [marker_re.sub('', lines[i], count=1)]
                i += 1
                # A list item's own text commonly wraps onto following lines,
                # indented under the marker (see e.g. the numbered steps in
                # 10-software-maintenance-plan.md). Without this, a wrapped
                # item is cut at the first line break — cosmetically it drops
                # the rest of the sentence into a stray paragraph after the
                # list, and functionally it can strand an unclosed **bold**
                # or *italic* marker opened before the wrap.
                while i < n and lines[i].strip() and not is_new_block_start(lines[i]):
                    item_lines.append(lines[i].strip())
                    i += 1
                items.append(' '.join(item_lines))
            tag = 'ol' if ordered else 'ul'
            html_parts.append('<%s>' % tag + ''.join(
                '<li>%s</li>' % render_inline(it) for it in items) + '</%s>' % tag)
            continue

        # Paragraph: consecutive plain lines up to the next blank line or block
        # start, joined with a space — markdown source wraps at ~78 columns for
        # readability but is meant to render as one flowing paragraph.
        para_lines = []
        while i < n and lines[i].strip() and not is_new_block_start(lines[i]):
            para_lines.append(lines[i])
            i += 1
        html_parts.append('<p>%s</p>' % render_inline(' '.join(para_lines)))

    return '\n'.join(html_parts)


def convert(md_text):
    """Returns (title, body_html). The document's first line must be a level-1
    heading — that becomes the page title and is rendered into .page-header,
    the same slot every other page on the site uses for its <h1>, rather than
    inside the body twice."""
    lines = md_text.splitlines()
    assert lines[0].startswith('# '), 'every doc must open with a level-1 heading'
    title = lines[0][2:].strip()
    body_html = render_blocks(lines[1:], {})
    return title, body_html


# ============================================================
# PAGE TEMPLATE
# Deliberately the same header/nav/footer markup as every other page (see
# privacy.html), so a rendered document feels like part of the site rather
# than a different thing bolted on — just with ../ in front of every asset
# path, since these pages live one directory down from the site root.
# ============================================================

PAGE_TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} (example) | IEC 62304 Training</title>
  <link rel="stylesheet" href="../style.css">
  <script>
    (function () {{
      try {{
        var saved = localStorage.getItem('62304_theme');
        var dark = saved
          ? saved === 'dark'
          : window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      }} catch (e) {{ /* falls through to the CSS default */ }}
    }})();
  </script>
</head>
<body class="page-doc-preview">
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <header class="site-header">
    <div class="container header-inner">
      <div class="logo">
        <span class="logo-icon" aria-hidden="true">&#9877;</span>
        <div class="logo-text">
          <span class="logo-title">IEC 62304 Training</span>
          <span class="logo-sub">Medical Device Software Lifecycle</span>
          <span class="version-chip">Edition&nbsp;1 &middot; 2006+A1:2015</span>
        </div>
      </div>
      <nav class="site-nav" role="navigation" aria-label="Main navigation">
        <a class="nav-link" href="../index.html">Home</a>
        <a class="nav-link" href="../learn.html">Learn</a>
        <a class="nav-link" href="../quiz.html">Quiz</a>
        <a class="nav-link" href="../contact.html">Contact</a>
        <button class="theme-toggle" id="theme-toggle" type="button" aria-pressed="false">
          <span class="theme-toggle-icon" aria-hidden="true">&#9789;</span>
          <span class="theme-toggle-label sr-only">Switch to dark theme</span>
        </button>
      </nav>
    </div>
  </header>

  <main id="main-content">
    <div class="container">

      <div class="page-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div class="doc-preview-actions">
        <a class="btn btn-secondary" href="{back_href}">&larr; Back to Learn</a>
        <a class="btn btn-secondary" href="index.html">All example documents</a>
        <a class="btn btn-primary" href="{source_name}" download>&#8681; Download source (.md)</a>
      </div>

      <div class="example-banner-card">
        <div class="example-banner-bar">
          <span class="example-banner-icon" aria-hidden="true">&#9888;&#65039;</span>
          <span class="example-banner-label">Training example &mdash; not a real IEC 62304 deliverable</span>
        </div>
        <div class="example-banner-content">
          <p>This project is a <strong>training site, not a real medical device</strong> under any regulatory definition &mdash; it is not Software as a Medical Device (SaMD) or Software in a Medical Device (SiMD). This page is not a genuine IEC 62304 deliverable: it illustrates the <em>kind</em> of document a real SaMD/SiMD project would produce. See the <a href="index.html">document register</a> for the full explanation.</p>
        </div>
      </div>

      <div class="legal-page doc-body">
{body}
      </div>

    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>IEC 62304 Training &mdash; Based on IEC 62304:2006+AMD1:2015 &mdash; For educational purposes only &mdash; Developed by <a href="https://stjohnlynch.com" target="_blank" rel="noopener noreferrer">St John Lynch &amp; Co Ltd</a></p>
      <p class="footer-links"><a href="../privacy.html">Privacy &amp; Data Protection</a></p>
    </div>
  </footer>

  <script src="../nav.js" defer></script>
  <script src="../theme.js" defer></script>
</body>
</html>
'''


def load_back_links():
    """Maps a doc's basename to the Learn page card it illustrates, by reading
    the same exampleDoc field learn.js uses — read once here rather than
    hand-duplicated, so the two stay in agreement by construction."""
    with open(os.path.join(ROOT, 'data', 'phases.json'), encoding='utf-8') as f:
        phases = json.load(f)
    return {p['exampleDoc']: p['id'] for p in phases if p.get('exampleDoc')}


def main():
    back_links = load_back_links()
    md_files = sorted(f for f in os.listdir(DOCS) if f.endswith('.md'))

    for name in md_files:
        with open(os.path.join(DOCS, name), encoding='utf-8') as f:
            md_text = f.read()

        title, body = convert(md_text)
        base = name[:-3]
        is_register = base == 'README'
        out_name = 'index.html' if is_register else base + '.html'
        phase_id = back_links.get(base)
        back_href = '../learn.html#phase-' + phase_id if phase_id else '../learn.html'
        subtitle = (
            "The index of this project's own IEC 62304-style document set — "
            "13 example lifecycle documents, one per process area."
            if is_register else
            'Example artefact from this project\'s own IEC 62304-style '
            'document set — one of 13, listed in full on the '
            '<a href="index.html">document register</a>.'
        )

        page = PAGE_TEMPLATE.format(
            title=title, body=body, back_href=back_href, source_name=name,
            subtitle=subtitle)

        out_path = os.path.join(DOCS, out_name)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(page)
        print('  wrote docs/%s' % out_name)

    print('Done — %d pages.' % len(md_files))


if __name__ == '__main__':
    main()
