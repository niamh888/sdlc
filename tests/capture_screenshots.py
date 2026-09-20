#!/usr/bin/env python3
"""
============================================================
 capture_screenshots.py — README screenshot generator
============================================================

WHAT THIS IS
A small utility, separate from test_site.py, that drives the site with the
same Playwright machinery the test suite already uses and saves PNGs of each
page to docs/assets/screenshots/. Those PNGs are what README.md embeds.

WHY IT IS NOT PART OF test_site.py
test_site.py answers "does the site work?" and exits 1 if not — it is meant
to run in CI. This script answers "what does the site look like right now?"
and its output is a set of image files to look at, not a pass/fail result.
Mixing the two would mean either the test suite starts writing files as a
side effect of testing (surprising) or this script starts asserting
(pointless — a screenshot's job is to be looked at, not compared to itself).

WHY SCREENSHOTS RATHER THAN HAND-DRAWN WIREFRAMES
A wireframe is a second artifact that can silently drift from the real site.
A screenshot captured by the same automation that verifies the site works
cannot show a page in a state the site cannot actually reach — regenerating
it after a visual change is one command, not a redraw.

HOW TO RUN IT
    python tests/capture_screenshots.py

It starts its own server (like test_site.py), so nothing else needs to be
running first.
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
OUT = os.path.join(ROOT, 'docs', 'assets', 'screenshots')
VIEWPORT = {'width': 1280, 'height': 900}


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
    try:
        return p.chromium.launch()
    except Exception:
        return p.chromium.launch(channel='chrome')


def stub_formspree(pg):
    """The contact page posts to a live endpoint; answer it locally so a
    screenshot run never spends the real quota, exactly as test_site.py does."""
    pg.route('https://formspree.io/**', lambda route: route.fulfill(
        status=200, content_type='application/json', body='{"ok":true}'))


def new_page(browser, scheme=None, viewport=None):
    ctx = browser.new_context(viewport=viewport or VIEWPORT, color_scheme=scheme)
    return ctx, ctx.new_page()


def shoot(pg, name):
    path = os.path.join(OUT, name + '.png')
    pg.screenshot(path=path)
    print('  wrote %s' % os.path.relpath(path, ROOT))


def main():
    os.makedirs(OUT, exist_ok=True)
    httpd, base = start_server()
    print('Serving %s at %s' % (ROOT, base))

    try:
        with sync_playwright() as p:
            browser = launch_browser(p)
            try:
                # ---- Home ----
                for scheme, suffix in [('light', 'light'), ('dark', 'dark')]:
                    ctx, pg = new_page(browser, scheme)
                    pg.goto(base + '/index.html')
                    pg.wait_for_timeout(200)
                    shoot(pg, 'index-%s' % suffix)
                    ctx.close()

                # ---- Home: promotional strip ----
                # Lives on the home page, not Learn — see test_home() in
                # tests/test_site.py for why. Scroll it into view rather than
                # needing an ultra-wide window to see it at all.
                ctx, pg = new_page(browser, 'light')
                pg.goto(base + '/index.html')
                pg.wait_for_timeout(200)
                pg.evaluate("() => document.querySelector('.promo-strip').scrollIntoView({block: 'center'})")
                pg.wait_for_timeout(150)
                shoot(pg, 'index-promo-strip-light')
                ctx.close()

                # ---- Learn: default view ----
                ctx, pg = new_page(browser, 'light')
                pg.goto(base + '/learn.html')
                pg.wait_for_selector('.phase-card', timeout=10000)
                pg.locator('#update-banner-close').click()
                pg.wait_for_timeout(150)
                shoot(pg, 'learn-light')
                ctx.close()

                ctx, pg = new_page(browser, 'dark')
                pg.goto(base + '/learn.html')
                pg.wait_for_selector('.phase-card', timeout=10000)
                pg.locator('#update-banner-close').click()
                pg.wait_for_timeout(150)
                shoot(pg, 'learn-dark')
                ctx.close()

                # ---- Learn: the flagship feature — class filter, an expanded
                # card, and the deliverables panel open ----
                ctx, pg = new_page(browser, 'light')
                pg.goto(base + '/learn.html')
                pg.wait_for_selector('.phase-card', timeout=10000)
                pg.locator('#update-banner-close').click()
                pg.locator('.filter-btn[data-filter="A"]').click()
                pg.wait_for_timeout(250)
                pg.locator('#phase-risk-management .phase-header').click()
                pg.wait_for_timeout(150)
                pg.locator('#deliverables-toggle').click()
                pg.wait_for_timeout(250)
                pg.evaluate("() => document.querySelector('#phase-risk-management').scrollIntoView()")
                pg.wait_for_timeout(150)
                shoot(pg, 'learn-classA-deliverables-light')
                ctx.close()

                # ---- Learn: the "preview it first" requirement, blocked ----
                # A blank card, an attempt to mark it studied without opening
                # its example document, and the result: an inline message,
                # the card auto-expanded, and focus on the Preview link.
                ctx, pg = new_page(browser, 'light')
                pg.goto(base + '/learn.html')
                pg.wait_for_selector('.phase-card', timeout=10000)
                pg.locator('#update-banner-close').click()
                # .mark-studied-btn lives inside .phase-details, which is
                # display:none until the card is expanded — the card has to be
                # opened before the button is even visible, let alone clickable.
                pg.locator('#phase-planning .phase-header').click()
                pg.wait_for_timeout(150)
                pg.locator('#phase-planning .mark-studied-btn').click()
                pg.wait_for_timeout(200)
                pg.evaluate(
                    "() => document.querySelector('#phase-planning .example-doc')"
                    ".scrollIntoView({block: 'center'})")
                pg.wait_for_timeout(150)
                shoot(pg, 'learn-studied-blocked-light')
                ctx.close()

                # ---- Quiz ----
                # No longer captured here. quiz.js now requires a signed-in
                # session before the start screen (or any quiz state) will
                # even render — a plain file server with no backend can never
                # reach it, only ever the "Sign In Required" gate. Every quiz
                # screenshot (the gate, the signed-in start/question/feedback
                # screens, a pass, a below-pass-mark result) is captured by
                # capture_backend_screenshots.py instead, which stands up a
                # real disposable backend first. See that script and the
                # "Accounts, quiz saving, certificates..." section of
                # README.md for all of them.

                # ---- Contact ----
                for scheme, suffix in [('light', 'light'), ('dark', 'dark')]:
                    ctx, pg = new_page(browser, scheme)
                    stub_formspree(pg)
                    pg.goto(base + '/contact.html')
                    pg.wait_for_timeout(200)
                    shoot(pg, 'contact-%s' % suffix)
                    ctx.close()

                # ---- Privacy ----
                ctx, pg = new_page(browser, 'light')
                pg.goto(base + '/privacy.html')
                pg.wait_for_timeout(200)
                shoot(pg, 'privacy-light')
                ctx.close()
            finally:
                browser.close()
    finally:
        httpd.shutdown()

    print('Done.')


if __name__ == '__main__':
    main()
