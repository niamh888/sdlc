#!/usr/bin/env python3
"""
============================================================
 render_pdf.py — generates a downloadable PDF for each example document
============================================================

WHY THIS EXISTS
The people this course is actually written for — taking it directly, or
being guided through it — work in Word, Excel, PowerPoint and PDF, not
GitHub or markdown. The "Download" button on the Learn page and on each
example document page used to offer the raw .md source: not a document to
that audience, source code. This script produces a real PDF instead.

HOW
Chromium's own print-to-PDF, driven by Playwright — already a project
dependency (see tests/requirements.txt), so this adds nothing new to
install. Each already-rendered page (docs/render.py must be run first) is
loaded over a throwaway local HTTP server — the same pattern
tests/capture_screenshots.py uses, because Chromium's print pipeline needs
a real page load, not a bare file:// path opened cold — switched to print
media so style.css's `@media print` rules apply (the button row hidden, the
colour palette flattened to a print-safe one), and saved. The PDF and the
on-screen preview are guaranteed to agree because nothing is authored
twice: both come from the same HTML.

HOW TO RUN IT
    python docs/render.py        # first — this generates the HTML the PDF is printed from
    python docs/render_pdf.py

Run again whenever a docs/*.md file changes and has been re-rendered; the
PDFs are committed to the repository, like the HTML previews, so they need
regenerating by hand rather than being built on the fly.
============================================================
"""

import functools
import http.server
import os
import socketserver
import sys
import threading

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit('Playwright is not installed. Run:\n'
             '    pip install -r tests/requirements.txt\n'
             '    python -m playwright install chromium')

ROOT = os.path.dirname(os.path.abspath(os.path.join(__file__, '..')))
DOCS = os.path.join(ROOT, 'docs')


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def start_server():
    handler = functools.partial(QuietHandler, directory=ROOT)
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
    httpd.daemon_threads = True
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, 'http://127.0.0.1:%d' % port


def launch_browser(p):
    """Bundled Chromium if available, otherwise system Chrome — same
    fallback tests/test_site.py uses, for the same reason: a fresh machine
    with only `pip install` done should not hit a wall here."""
    try:
        return p.chromium.launch()
    except Exception:
        return p.chromium.launch(channel='chrome')


# Both document sets docs/render.py produces get PDFs, the same way it
# renders both to HTML — see that script's DOC_SETS for what each directory
# is. Kept as plain directories here (not imported from render.py) because
# all this needs is "which folders have rendered HTML in them", not the
# per-set template config render.py itself owns.
PDF_DIRS = [DOCS, os.path.join(DOCS, 'device-example')]


def main():
    jobs = []  # (directory, html_filename) pairs, across both document sets
    for directory in PDF_DIRS:
        for name in sorted(f for f in os.listdir(directory) if f.endswith('.html')):
            jobs.append((directory, name))

    if not jobs:
        sys.exit('No rendered pages found under docs/ — run docs/render.py first.')

    httpd, base = start_server()
    print('Serving %s at %s' % (ROOT, base))

    try:
        with sync_playwright() as p:
            browser = launch_browser(p)
            try:
                for directory, name in jobs:
                    pdf_name = name[:-len('.html')] + '.pdf'
                    rel_dir = os.path.relpath(directory, ROOT).replace(os.sep, '/')
                    page = browser.new_page()
                    page.goto('%s/%s/%s' % (base, rel_dir, name))
                    page.wait_for_timeout(150)
                    # Applies style.css's @media print rules — hides the
                    # Back/All documents/Download button row and flattens
                    # the colour palette to a print-safe one, whichever
                    # theme the page happened to load in.
                    page.emulate_media(media='print')
                    page.pdf(
                        path=os.path.join(directory, pdf_name),
                        format='A4',
                        print_background=True,
                        margin={'top': '18mm', 'bottom': '18mm', 'left': '16mm', 'right': '16mm'},
                    )
                    page.close()
                    print('  wrote %s/%s' % (rel_dir, pdf_name))
            finally:
                browser.close()
    finally:
        httpd.shutdown()

    print('Done — %d PDFs.' % len(jobs))


if __name__ == '__main__':
    main()
