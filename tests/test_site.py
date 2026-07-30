#!/usr/bin/env python3
"""
============================================================
 test_site.py  —  Automated test suite for the IEC 62304 training site
============================================================

WHAT THIS IS
This script opens the site in a real browser (Chrome, controlled by Playwright)
and checks that it works: that content loads, that the quiz scores correctly,
that the contact form handles failure, that pages are accessible, and that
nothing overflows on a phone.

It is a black-box test suite. It does not import or inspect the site's
JavaScript; it drives the pages the way a person would — clicking, typing,
reading what appears — and asserts on the result. That means it keeps working
when the internals are refactored, and it fails when a user-visible thing
breaks, which is the behaviour you want from a test.

HOW TO RUN IT
    pip install playwright
    python -m playwright install chromium
    python tests/test_site.py

The script starts its own web server on a free port, so you do NOT need to run
`python -m http.server` yourself first. It shuts the server down when finished.
Exit code is 0 if everything passed and 1 if anything failed, so it can be
wired into CI later.

    python tests/test_site.py --headed     watch it run in a visible browser
    python tests/test_site.py --group quiz run one group only (see GROUPS below)

SAFETY: THE CONTACT FORM IS NEVER REALLY SUBMITTED
contact.js posts to a live Formspree endpoint. Every test below intercepts
requests to formspree.io and answers them locally, so no test message is ever
transmitted and none of the monthly submission quota is consumed. There is an
explicit guard (assert_no_live_requests) that fails the run if a request ever
escapes to the real endpoint.

WHY THE THREE LAYERS
    Data      — the JSON content files are valid and internally consistent
    Behaviour — features do what a user expects, including when things fail
    Quality   — accessibility and responsive layout

Testing only the happy path is the usual mistake. Roughly half the checks here
deliberately break something (a 404, malformed JSON, a timeout, a rejected
submission) because error handling that has never been executed is not error
handling, it is decoration.
============================================================
"""

import argparse
import csv
import functools
import http.server
import io
import json
import os
import re
import socket
import socketserver
import sys
import threading
import urllib.request

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit('Playwright is not installed. Run:\n'
             '    pip install playwright\n'
             '    python -m playwright install chromium')

ROOT = os.path.dirname(os.path.abspath(os.path.join(__file__, '..')))
AXE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js'
FORMSPREE_GLOB = 'https://formspree.io/**'

PAGES = ['index.html', 'learn.html', 'quiz.html', 'contact.html', 'privacy.html']
VIEWPORTS = [('desktop', 1280, 900), ('tablet', 768, 900), ('mobile', 480, 800), ('small', 360, 740)]

GROUPS = ['data', 'applicability', 'deliverables', 'learn', 'quiz', 'contact',
          'privacy', 'version', 'a11y', 'responsive']


# ============================================================
# TEST HARNESS
# Small hand-rolled runner rather than pytest, to keep the project's
# dependency list to the single entry it already needs (Playwright).
# ============================================================

class Results:
    def __init__(self):
        self.rows = []          # (group, label, passed, detail)
        self.current_group = ''

    def group(self, name):
        self.current_group = name
        print('\n' + '-' * 72)
        print(name.upper())
        print('-' * 72)

    def check(self, label, passed, detail=''):
        self.rows.append((self.current_group, label, bool(passed), str(detail)))
        mark = 'PASS' if passed else 'FAIL'
        line = '  [%s] %s' % (mark, label)
        if detail and not passed:
            line += '\n         got: %s' % str(detail)[:200]
        elif detail:
            line += '  (%s)' % str(detail)[:60]
        print(line)

    def failures(self):
        return [r for r in self.rows if not r[2]]

    def report(self):
        print('\n' + '=' * 72)
        passed = sum(1 for r in self.rows if r[2])
        fails = self.failures()
        print('%d passed, %d failed, %d total' % (passed, len(fails), len(self.rows)))
        if fails:
            print('\nFAILURES')
            for group, label, _, detail in fails:
                print('  %-11s %s' % (group + ':', label))
                if detail:
                    print('              got: %s' % detail[:200])
        print('=' * 72)
        return 1 if fails else 0


R = Results()


# ============================================================
# LOCAL WEB SERVER
# The site fetches JSON, which browsers forbid over file://, so the tests must
# be served over HTTP. Binding to port 0 lets the OS pick any free port, so
# concurrent runs and already-occupied ports are not a problem.
# ============================================================

def start_server():
    handler = functools.partial(QuietHandler, directory=ROOT)
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
    httpd.daemon_threads = True
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, 'http://127.0.0.1:%d' % port


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    """Same as the normal file server but silent, so request logs do not drown
    out the test output."""
    def log_message(self, *args):
        pass


def launch_browser(p, headed=False):
    """Use Playwright's own bundled Chromium if it has been downloaded,
    otherwise fall back to the Google Chrome already installed on the machine.

    Supporting both means `pip install playwright` is enough to get started if
    you have Chrome, while `playwright install chromium` gives you a pinned
    browser version for more reproducible results. Without this fallback the
    suite fails on a fresh machine with a message about a missing executable,
    which looks like a broken test rather than a missing setup step."""
    try:
        browser = p.chromium.launch(headless=not headed)
        print('Browser      : bundled Chromium')
        return browser
    except Exception:
        try:
            browser = p.chromium.launch(channel='chrome', headless=not headed)
            print('Browser      : system Google Chrome')
            print('               (run "python -m playwright install chromium" for a pinned version)')
            return browser
        except Exception as e:
            sys.exit('\nCould not start a browser.\n'
                     'Install one of the following:\n'
                     '    python -m playwright install chromium   (recommended)\n'
                     'or make sure Google Chrome is installed.\n\n'
                     'Original error: %s' % e)


def fetch_axe():
    """Download axe-core, the accessibility engine. Returns None if offline, in
    which case the accessibility group is skipped rather than failing — being
    unable to reach a CDN is not a defect in the site."""
    try:
        return urllib.request.urlopen(AXE_CDN, timeout=25).read().decode('utf-8')
    except Exception as e:
        print('  ! Could not download axe-core (%s) — accessibility group will be skipped.' % e)
        return None


# ============================================================
# PAGE HELPERS
# ============================================================

def applicability():
    """The per-sub-clause safety class mapping, read from the data file."""
    with open(os.path.join(ROOT, 'data', 'applicability.json'), encoding='utf-8') as f:
        return json.load(f)['clauses']


def live_subclauses(subs):
    """Sub-clauses that still carry a requirement. An empty classes list means the
    sub-clause was removed by Amendment 1, so it must not count towards any
    roll-up — otherwise Clause 7 would look partially applicable at every class
    purely because 7.1.5 and 7.3.2 were deleted."""
    return [sc for sc in subs if sc.get('classes')]


def classify(topics, app, cls):
    """Split the process areas into fully-applies / applies-in-part / does-not-apply
    at one safety class, computed from the sub-clause data.

    Every expected value in the applicability tests is derived here rather than
    written out, for the same reason the counts are: a test that restates a value
    from the data cannot detect an error in the data."""
    out = {'full': [], 'partial': [], 'omitted': []}
    for p in topics:
        live = live_subclauses(app[p['id']])
        applying = [sc for sc in live if cls in sc['classes']]
        if not applying:
            out['omitted'].append(p)
        elif len(applying) == len(live):
            out['full'].append(p)
        else:
            out['partial'].append(p)
    return out


def norm(text):
    """Normalise rendered text before asserting on it.

    Two things bite here, and both did while this suite was being written:

      * CSS text-transform. The version chip is styled uppercase, so
        inner_text() returns "EDITION 1 · 2006+A1:2015" even though the HTML
        says "Edition 1". Comparisons must be case-insensitive.
      * Non-breaking spaces. The markup uses &nbsp; to stop "Edition 1" and
        "IEC 62304" splitting across lines, and those arrive as \\xa0, which does
        NOT equal a normal space. `'Edition 1' in text` fails silently.

    Normalising once here is far safer than remembering to handle it at every
    assertion, and stops tests failing for reasons that have nothing to do with
    whether the site is correct."""
    return ' '.join(text.replace('\xa0', ' ').split()).lower()


def new_page(browser, width=1280, height=900, **kw):
    """A fresh browser context per test, which means empty localStorage every
    time. Without this, a training level saved by one test would leak into the
    next and cause failures that vanish when tests are run individually — the
    worst kind of test bug to debug."""
    ctx = browser.new_context(viewport={'width': width, 'height': height}, **kw)
    pg = ctx.new_page()
    pg.js_errors = []
    pg.live_requests = []
    pg.on('pageerror', lambda e: pg.js_errors.append(str(e)))
    # Catch any attempt to reach the real Formspree endpoint that a test forgot
    # to stub. Recording it here means the guard below can fail loudly.
    pg.on('request', lambda r: pg.live_requests.append(r.url) if 'formspree.io' in r.url else None)
    return ctx, pg


def stub_formspree(pg, status=200, body='{"ok":true}', content_type='application/json'):
    """Answer Formspree locally so nothing is ever really sent."""
    pg.route(FORMSPREE_GLOB, lambda route: route.fulfill(
        status=status, content_type=content_type, body=body))


def assert_no_live_requests(pg, label):
    """Every Formspree request in these tests should have been intercepted. A
    route handler answers the request without it leaving the machine, but the
    request event still fires — so this checks the count is what we expect
    rather than zero, and exists mainly to catch a *new* endpoint being added
    later without a matching stub."""
    stray = [u for u in pg.live_requests if 'formspree.io' not in u]
    R.check(label, not stray, stray)


def axe_violations(pg, axe_src):
    pg.add_script_tag(content=axe_src)
    return pg.evaluate("""async () => {
        const r = await axe.run(document, {
          runOnly: { type: 'tag',
                     values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice'] }
        });
        return r.violations.map(v => ({
            id: v.id, impact: v.impact,
            targets: v.nodes.slice(0, 3).map(n => n.target.join(' '))
        }));
    }""")


def answer_all_questions(pg, pick=0):
    """Walk the whole quiz, choosing option `pick` each time. Returns the number
    of questions answered."""
    count = 0
    while True:
        pg.wait_for_selector('.option-btn:not([disabled])', timeout=8000)
        buttons = pg.locator('.option-btn')
        idx = min(pick, buttons.count() - 1)
        buttons.nth(idx).click()
        pg.wait_for_selector('#question-feedback.visible', timeout=8000)
        count += 1
        last = pg.locator('#next-question').inner_text().strip() == 'See Results'
        pg.locator('#next-question').click()
        if last:
            break
    pg.wait_for_selector('#quiz-results.active', timeout=8000)
    return count


# ============================================================
# GROUP 1 — DATA INTEGRITY
# Pure file checks, no browser needed. These run first because if the content
# files are broken, every behavioural test downstream fails in a confusing way
# and you waste time looking in the wrong place.
# ============================================================

def test_data():
    R.group('data — content files')

    files = {
        'phases': os.path.join(ROOT, 'data', 'phases.json'),
        'intro': os.path.join(ROOT, 'data', 'questions-intro.json'),
        'advanced': os.path.join(ROOT, 'data', 'questions-advanced.json'),
    }
    loaded = {}

    for name, path in files.items():
        try:
            with open(path, encoding='utf-8') as f:
                loaded[name] = json.load(f)
            R.check('%s is valid JSON' % name, True)
        except Exception as e:
            R.check('%s is valid JSON' % name, False, e)
            return  # nothing else is meaningful if the files will not parse

    R.check('phases.json has 13 topics', len(loaded['phases']) == 13, len(loaded['phases']))
    R.check('intro set has 15 questions', len(loaded['intro']) == 15, len(loaded['intro']))
    R.check('advanced set has 15 questions', len(loaded['advanced']) == 15, len(loaded['advanced']))

    # Every topic needs the fields learn.js reads, or a card renders as "undefined".
    required = ['id', 'clause', 'title', 'icon', 'summary', 'introDetails', 'advancedDetails', 'classes']
    missing = [(p.get('id', '?'), k) for p in loaded['phases'] for k in required if k not in p]
    R.check('every topic has all required fields', not missing, missing)

    ids = [p['id'] for p in loaded['phases']]
    R.check('topic ids are unique', len(ids) == len(set(ids)),
            [i for i in ids if ids.count(i) > 1])

    bad_classes = [p['id'] for p in loaded['phases']
                   if not p['classes'] or any(c not in ('A', 'B', 'C') for c in p['classes'])]
    R.check('safety classes are only A, B or C', not bad_classes, bad_classes)

    empty = [p['id'] for p in loaded['phases']
             if not p['introDetails'] or not p['advancedDetails']]
    R.check('every topic has bullets at both levels', not empty, empty)

    # A `correct` index outside the options array is the nastiest possible
    # content bug: the quiz would silently mark every answer wrong with no
    # error anywhere. quiz.js validates this at runtime; this catches it sooner.
    for setname in ('intro', 'advanced'):
        problems = []
        for i, q in enumerate(loaded[setname], 1):
            if not q.get('q'):
                problems.append('Q%d missing question text' % i)
            elif len(q.get('options', [])) != 4:
                problems.append('Q%d has %d options, expected 4' % (i, len(q.get('options', []))))
            elif not isinstance(q.get('correct'), int) or not 0 <= q['correct'] < len(q['options']):
                problems.append('Q%d correct=%r out of range' % (i, q.get('correct')))
            elif not q.get('explanation'):
                problems.append('Q%d missing explanation' % i)
        R.check('%s questions are well formed' % setname, not problems, problems)

        dupes = [q['q'] for q in loaded[setname] if [x['q'] for x in loaded[setname]].count(q['q']) > 1]
        R.check('%s questions are not duplicated' % setname, not dupes, set(dupes))


# ============================================================
# GROUP 2 — SAFETY CLASS APPLICABILITY
#
# This group exists because of a real defect with real consequences. Clause 7
# (Software Risk Management) was recorded as applying only to Class B and C, so
# filtering to Class A hid the entire clause and implied that Class A software
# needs no risk management. The truth is the reverse: §7.4.1 applies to every
# class, and you cannot even arrive at Class A without a risk analysis. Two more
# errors surfaced when the mapping was checked against the standard — Clause 5.3
# was marked as reaching Class A when it has no Class A requirement at all, and
# Clause 5.4 was marked Class C only when §5.4.1 reaches Class B.
#
# None of the three could be caught by the old model, because a single
# hand-maintained list of classes per clause had nothing to disagree with. The
# checks below therefore do two things: assert the mapping matches the standard at
# sub-clause level, and assert that the SITE REFUSES TO RENDER if the two data
# files ever contradict each other again.
# ============================================================

def test_applicability(browser, base):
    R.group('applicability — the mapping itself')

    path = os.path.join(ROOT, 'data', 'applicability.json')
    try:
        with open(path, encoding='utf-8') as f:
            raw = json.load(f)
        R.check('applicability.json is valid JSON', True)
    except Exception as e:
        R.check('applicability.json is valid JSON', False, e)
        return

    app = raw.get('clauses', {})
    with open(os.path.join(ROOT, 'data', 'phases.json'), encoding='utf-8') as f:
        topics = json.load(f)

    R.check('provenance recorded in the file',
            bool(raw.get('_source')) and 'Table A.1' in raw['_source'])
    R.check('cross-check date recorded', bool(raw.get('_crossCheckedOn')))
    # An empty _openItems is a meaningful state, not a missing key: it says the
    # cross-check finished with nothing unresolved. The key must therefore exist.
    R.check('no unresolved items in the mapping',
            isinstance(raw.get('_openItems'), list) and not raw['_openItems'],
            raw.get('_openItems'))

    missing = [p['id'] for p in topics if p['id'] not in app]
    R.check('every process area has a sub-clause mapping', not missing, missing)

    orphans = [k for k in app if k not in [p['id'] for p in topics]]
    R.check('no mapping entries without a matching process area', not orphans, orphans)

    bad_classes = []
    for cid, subs in app.items():
        for sc in subs:
            for c in sc.get('classes', []):
                if c not in ('A', 'B', 'C'):
                    bad_classes.append((cid, sc.get('ref'), c))
    R.check('all class letters are A, B or C', not bad_classes, bad_classes)

    dupes = []
    for cid, subs in app.items():
        refs = [sc['ref'] for sc in subs]
        dupes += [(cid, r) for r in refs if refs.count(r) > 1]
    R.check('sub-clause references are unique within a clause', not dupes, set(dupes))

    # THE CENTRAL INVARIANT. The clause-level list in phases.json must equal the
    # union of that clause's sub-clause classes. This is the check that would have
    # caught the Clause 7 error on day one.
    mismatches = []
    for p in topics:
        live = live_subclauses(app[p['id']])
        union = [c for c in ('A', 'B', 'C') if any(c in sc['classes'] for sc in live)]
        if union != sorted(p['classes']):
            mismatches.append('%s: phases.json=%s mapping=%s'
                              % (p['clause'], '/'.join(p['classes']), '/'.join(union)))
    R.check('clause-level classes match the sub-clause union', not mismatches, mismatches)

    R.group('applicability — spot checks against the standard')

    def sub(cid, ref):
        for sc in app[cid]:
            if sc['ref'] == ref:
                return sc
        return None

    # Each of these was wrong before the cross-check, or is a trap for anyone
    # working from a 2006 copy rather than the amended text.
    for cid, ref, expect, why in [
        ('risk-management', '7.4.1', ['A', 'B', 'C'],
         'the one Clause 7 requirement that reaches Class A'),
        ('risk-management', '7.1.1', ['B', 'C'], 'Clause 7 analysis is B/C only'),
        ('risk-management', '7.4.3', ['B', 'C'], 'B/C only'),
        ('detailed-design', '5.4.1', ['B', 'C'],
         'subdividing into units reaches Class B'),
        ('detailed-design', '5.4.2', ['C'], 'detailed design itself is C only'),
        ('architecture', '5.3.5', ['C'], 'segregation is C only'),
        ('system-testing', '5.7.1', ['A', 'B', 'C'],
         'Amendment 1 moved 5.7 to all classes'),
        ('maintenance', '6.2.3', ['A', 'B', 'C'],
         'Amendment 1 moved 6.2.3 to all classes'),
        ('release', '5.8.3', ['B', 'C'], 'still B/C after Amendment 1'),
        ('release', '5.8.7', ['A', 'B', 'C'],
         'Amendment 1 moved archiving to all classes'),
        ('planning', '5.1.4', ['C'], 'standards/methods/tools planning is C only'),
        ('planning', '5.1.12', ['B', 'C'], 'new in Amendment 1, B/C'),
        ('system-testing', '5.7.5', ['A', 'B', 'C'],
         'no normative tag; all classes per Table A.1 and the rest of 5.7'),
    ]:
        sc = sub(cid, ref)
        R.check('%s is %s — %s' % (ref, '/'.join(expect), why),
                sc is not None and sc['classes'] == expect,
                sc['classes'] if sc else 'missing')

    # Clause 5.3 must contain no Class A requirement whatsoever.
    a_in_53 = [sc['ref'] for sc in app['architecture'] if 'A' in sc.get('classes', [])]
    R.check('Clause 5.3 has no Class A requirement at all', not a_in_53, a_in_53)

    # In Clause 7, exactly one requirement reaches Class A.
    a_in_7 = [sc['ref'] for sc in app['risk-management'] if 'A' in sc.get('classes', [])]
    R.check('exactly one Clause 7 requirement reaches Class A',
            a_in_7 == ['7.4.1'], a_in_7)

    # Deleted sub-clauses are recorded rather than dropped.
    voids = [sc['ref'] for sc in app['risk-management'] if not sc.get('classes')]
    R.check('7.1.5 and 7.3.2 recorded as removed by Amendment 1',
            voids == ['7.1.5', '7.3.2'], voids)

    R.group('applicability — rendered on the page')

    ctx, pg = new_page(browser)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)

    R.check('a sub-clause table per process area',
            pg.locator('.sc-table').count() == len(topics),
            pg.locator('.sc-table').count())
    expected_rows = sum(len(app[p['id']]) for p in topics)
    R.check('every sub-clause has a row (%d total)' % expected_rows,
            pg.locator('.sc-table tbody tr').count() == expected_rows,
            pg.locator('.sc-table tbody tr').count())

    for cls in ['A', 'B', 'C']:
        buckets = classify(topics, app, cls)
        pg.locator('.filter-btn[data-filter="%s"]' % cls).click()
        pg.wait_for_timeout(250)
        R.check('Class %s: %d cards visible' % (cls, len(buckets['full']) + len(buckets['partial'])),
                pg.locator('.phase-card:not(.hidden)').count()
                == len(buckets['full']) + len(buckets['partial']),
                pg.locator('.phase-card:not(.hidden)').count())
        R.check('Class %s: %d cards marked as applying in part' % (cls, len(buckets['partial'])),
                pg.locator('.phase-card:not(.hidden).partial-applicability').count()
                == len(buckets['partial']),
                pg.locator('.phase-card:not(.hidden).partial-applicability').count())

    # The specific case that started all this: at Class A, Clause 7 must be
    # VISIBLE, flagged as partial, with 7.4.1 highlighted and the rest dimmed.
    pg.locator('.filter-btn[data-filter="A"]').click()
    pg.wait_for_timeout(250)
    card = pg.locator('#phase-risk-management')
    R.check('Clause 7 is visible at Class A', card.is_visible())
    R.check('Clause 7 is flagged as applying in part at Class A',
            'partial-applicability' in (card.get_attribute('class') or ''))
    rows = pg.evaluate("""() => [...document.querySelectorAll('#phase-risk-management .sc-table tbody tr')]
        .map(tr => ({ ref: tr.querySelector('.sc-ref').textContent.trim(),
                      dimmed: tr.classList.contains('sc-row-filtered') }))""")
    by_ref = {r['ref']: r['dimmed'] for r in rows}
    R.check('7.4.1 is NOT dimmed at Class A', by_ref.get('7.4.1') is False, by_ref.get('7.4.1'))
    R.check('7.1.1 IS dimmed at Class A', by_ref.get('7.1.1') is True, by_ref.get('7.1.1'))
    R.check('deleted 7.1.5 is not treated as filtered out',
            by_ref.get('7.1.5') is False, by_ref.get('7.1.5'))
    R.check('no JavaScript errors', not pg.js_errors, pg.js_errors)
    ctx.close()

    R.group('applicability — the site refuses to render on contradictory data')

    # REGRESSION TEST for the original defect. Put the old, wrong value back and
    # the page must fail loudly rather than quietly teaching something incorrect.
    broken = json.loads(json.dumps(raw))
    for sc in broken['clauses']['risk-management']:
        if sc['ref'] == '7.4.1':
            sc['classes'] = ['B', 'C']
    ctx, pg = new_page(browser)
    pg.route('**/applicability.json', lambda route: route.fulfill(
        status=200, content_type='application/json', body=json.dumps(broken)))
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('#phases-error:not(.hidden)', timeout=10000)
    msg = pg.locator('#phases-error-message').inner_text()
    R.check('reintroducing the Clause 7 error is caught', 'Clause 7' in msg, msg[:150])
    R.check('the error names both files', 'phases.json' in msg and 'applicability.json' in msg,
            msg[:200])
    R.check('no cards render on contradictory data',
            pg.locator('.phase-card').count() == 0)
    ctx.close()

    # A clause missing from the mapping must also be fatal, not silently skipped.
    missing_map = json.loads(json.dumps(raw))
    del missing_map['clauses']['architecture']
    ctx, pg = new_page(browser)
    pg.route('**/applicability.json', lambda route: route.fulfill(
        status=200, content_type='application/json', body=json.dumps(missing_map)))
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('#phases-error:not(.hidden)', timeout=10000)
    R.check('a clause missing from the mapping is fatal',
            'Clause 5.3' in pg.locator('#phases-error-message').inner_text(),
            pg.locator('#phases-error-message').inner_text()[:150])
    ctx.close()

    # And a missing mapping file must not fall back to rendering unchecked content.
    ctx, pg = new_page(browser)
    pg.route('**/applicability.json', lambda route: route.fulfill(status=404, body='x'))
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('#phases-error:not(.hidden)', timeout=10000)
    R.check('a missing mapping file is fatal',
            'applicability.json' in pg.locator('#phases-error-message').inner_text(),
            pg.locator('#phases-error-message').inner_text()[:150])
    R.check('no cards render without the mapping', pg.locator('.phase-card').count() == 0)
    ctx.close()


# ============================================================
# GROUP 3 — DELIVERABLES LIST
#
# "What do I have to produce for Class B?" answered from the applicability data.
#
# The checks below police two boundaries as much as they check the mechanics:
#   * no invented document names — the list is organised by requirement, and the
#     output wording is the standard's own, because IEC 62304 explicitly does not
#     prescribe document names;
#   * requirements with no documented artefact are still listed and labelled as
#     such, rather than dropped, because dropping them would imply the requirement
#     does not exist.
# ============================================================

def test_deliverables(browser, base):
    R.group('deliverables — the data behind the list')

    app = applicability()
    with open(os.path.join(ROOT, 'data', 'applicability.json'), encoding='utf-8') as f:
        raw = json.load(f)
    with open(os.path.join(ROOT, 'data', 'phases.json'), encoding='utf-8') as f:
        topics = json.load(f)

    all_subs = [sc for subs in app.values() for sc in subs]
    with_output = [sc for sc in all_subs if sc.get('output')]
    R.check('some sub-clauses carry a documented output', len(with_output) > 0,
            len(with_output))
    R.check('removed sub-clauses carry no output',
            all(not sc.get('output') for sc in all_subs if not sc.get('classes')),
            [sc['ref'] for sc in all_subs if not sc.get('classes') and sc.get('output')])

    # The file must state, in itself, that document names are not invented — the
    # single most important caveat about this feature.
    notes = ' '.join(raw.get('_notes', []))
    R.check('the data file records that document names are NOT prescribed',
            'does not prescribe' in notes and 'convention' in notes, notes[-200:])

    R.group('deliverables — rendered panel')

    ctx, pg = new_page(browser, 1180, 900)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)

    panel = pg.locator('#deliverables')
    R.check('panel hidden until a class is chosen', panel.is_hidden())

    for cls in ['A', 'B', 'C']:
        expected = [sc for subs in app.values() for sc in subs
                    if sc.get('classes') and cls in sc['classes']]
        expected_out = [sc for sc in expected if sc.get('output')]

        pg.locator('.filter-btn[data-filter="%s"]' % cls).click()
        pg.wait_for_timeout(250)
        R.check('Class %s: panel shown' % cls, panel.is_visible())
        R.check('Class %s: heading names the class' % cls,
                ('class ' + cls.lower()) in norm(pg.locator('#deliverables-heading').inner_text()),
                pg.locator('#deliverables-heading').inner_text())
        cnt = pg.locator('#deliverables-count').inner_text()
        R.check('Class %s: count reads %d outputs across %d requirements'
                % (cls, len(expected_out), len(expected)),
                str(len(expected_out)) in cnt and str(len(expected)) in cnt, cnt)

    # Expand and check the table contents against the data.
    pg.locator('.filter-btn[data-filter="C"]').click()
    pg.wait_for_timeout(200)
    toggle = pg.locator('#deliverables-toggle')
    body = pg.locator('#deliverables-body')
    R.check('list starts collapsed', body.is_hidden())
    R.check('collapsed toggle reports aria-expanded=false',
            toggle.get_attribute('aria-expanded') == 'false')
    toggle.click()
    pg.wait_for_timeout(300)
    R.check('list expands on click', not body.is_hidden())
    R.check('expanded toggle reports aria-expanded=true',
            toggle.get_attribute('aria-expanded') == 'true')
    R.check('toggle label flips to Hide', 'hide' in norm(toggle.inner_text()),
            toggle.inner_text())

    expected_c = [sc for subs in app.values() for sc in subs
                  if sc.get('classes') and 'C' in sc['classes']]
    R.check('one row per applicable requirement (%d)' % len(expected_c),
            pg.locator('#deliverables-body .dl-table tbody tr').count() == len(expected_c),
            pg.locator('#deliverables-body .dl-table tbody tr').count())
    R.check('one group per process area (%d)' % len(topics),
            pg.locator('.dl-clause').count() == len(topics),
            pg.locator('.dl-clause').count())

    no_output_c = [sc for sc in expected_c if not sc.get('output')]
    R.check('requirements with no artefact are listed and marked (%d)' % len(no_output_c),
            pg.locator('tr.dl-row-activity').count() == len(no_output_c),
            pg.locator('tr.dl-row-activity').count())

    # Two DIFFERENT reasons a row can name no artefact, and the page must not
    # conflate them. A row with a cross-reference (4.1, 4.2) is satisfied in
    # another standard; a row without one leaves the evidence to the manufacturer.
    # Telling a reader to "decide for yourself" about ISO 14971 compliance would
    # be worse than saying nothing, so pick a row that genuinely has neither.
    plain_ref = [sc['ref'] for sc in expected_c
                 if not sc.get('output') and not sc.get('seeAlso')][0]
    plain_row = pg.locator('tr.dl-row-activity', has=pg.locator(
        'th.dl-ref:text-is("%s")' % plain_ref)).first
    R.check('a row with neither artefact nor cross-reference explains the absence (%s)'
            % plain_ref,
            'decide for yourself what evidence to keep' in norm(plain_row.inner_text()),
            plain_row.inner_text()[:120])

    # ---- The standard's own cross-references (4.1 QMS, 4.2 risk management) ----
    cross = [sc for sc in expected_c if sc.get('seeAlso')]
    R.check('the data carries cross-references for 4.1 and 4.2',
            sorted(sc['ref'] for sc in cross) == ['4.1', '4.2'],
            [sc['ref'] for sc in cross])
    R.check('every cross-reference is rendered (%d)' % len(cross),
            pg.locator('.dl-seealso').count() == len(cross),
            pg.locator('.dl-seealso').count())

    qms = norm(pg.locator('tr', has=pg.locator('th.dl-ref:text-is("4.1")'))
               .first.inner_text())
    R.check('4.1 points to ISO 13485 as a route to the QMS requirement',
            'iso 13485' in qms, qms[:200])
    R.check('4.1 also gives the national-standard and national-regulation routes',
            'national quality management system standard' in qms
            and 'required by national regulation' in qms, qms[:400])
    # ISO 9001 is NOT a route offered by 4.1 — it appears only as the parent of
    # ISO/IEC 90003, which NOTE 2 gives as guidance. Presenting it as an
    # alternative to ISO 13485 would state something the standard does not.
    R.check('4.1 does NOT present ISO 9001 as an alternative route',
            'iso 9001' not in qms, qms[:400])
    R.check('4.1 cites ISO/IEC 90003 as guidance rather than a requirement',
            'iso/iec 90003' in qms and 'not required' in qms, qms[:400])

    rm = norm(pg.locator('tr', has=pg.locator('th.dl-ref:text-is("4.2")'))
              .first.inner_text())
    R.check('4.2 points to ISO 14971', 'iso 14971' in rm, rm[:200])
    # 4.2 differs from 4.1 in kind: the normative text names one standard with no
    # alternative. The row has to say so, or a reader will assume an equivalent
    # is acceptable the way it is under 4.1.
    R.check('4.2 states ISO 14971 is the single route, with no equivalent offered',
            'no alternative' in rm and 'no equivalent' in rm, rm[:400])
    R.check('the data file records why no non-medical alternative is offered',
            'medical device software only' in ' '.join(raw.get('_notes', [])),
            [n for n in raw.get('_notes', []) if 'seeAlso' in n][:1])

    # The footnote carries the caveat that matters most.
    foot = norm(pg.locator('.dl-footnote').inner_text())
    R.check('footnote says the list is by requirement, not by document',
            'not by document' in foot, foot[:110])
    R.check('footnote states the standard does not prescribe document names',
            'does not prescribe document names' in foot, foot[:200])
    R.check('no JavaScript errors', not pg.js_errors, pg.js_errors)
    ctx.close()

    R.group('deliverables — CSV export')

    ctx = browser.new_context(viewport={'width': 1180, 'height': 900}, accept_downloads=True)
    pg = ctx.new_page()
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)
    pg.locator('.filter-btn[data-filter="B"]').click()
    pg.wait_for_timeout(250)

    with pg.expect_download() as info:
        pg.locator('#deliverables-download').click()
    dl = info.value

    R.check('filename names the class',
            dl.suggested_filename == 'iec62304-deliverables-class-b.csv',
            dl.suggested_filename)

    with open(dl.path(), 'rb') as f:
        blob = f.read()

    # Excel reads a UTF-8 CSV as the ANSI codepage unless it starts with a BOM, so
    # the section signs in this content would arrive as mojibake without it.
    R.check('starts with a UTF-8 BOM so Excel reads it correctly',
            blob[:3] == b'\xef\xbb\xbf', blob[:6])

    text = blob.decode('utf-8-sig')
    R.check('uses CRLF line endings per the CSV convention', '\r\n' in text)

    rows = list(csv.reader(io.StringIO(text)))
    rows = [r for r in rows if r]
    expected_b = [sc for subs in app.values() for sc in subs
                  if sc.get('classes') and 'B' in sc['classes']]
    R.check('one CSV row per applicable requirement plus a header (%d)'
            % (len(expected_b) + 1),
            len(rows) == len(expected_b) + 1, len(rows))
    R.check('header names all eight columns', len(rows[0]) == 8, rows[0])
    R.check('every row has eight fields',
            all(len(r) == 8 for r in rows),
            [len(r) for r in rows if len(r) != 8])

    # The cross-reference column: exported too, since the CSV is what someone
    # actually works from when building a gap analysis.
    by_ref = {r[2]: r for r in rows[1:]}
    R.check('CSV carries a "where this is satisfied" column',
            'satisfied' in rows[0][5].lower(), rows[0][5])
    R.check('CSV 4.1 row cites ISO 13485 and not ISO 9001',
            'ISO 13485' in by_ref['4.1'][5] and 'ISO 9001' not in by_ref['4.1'][5],
            by_ref['4.1'][5][:160])
    R.check('CSV 4.2 row cites ISO 14971', 'ISO 14971' in by_ref['4.2'][5],
            by_ref['4.2'][5][:160])
    R.check('cross-referenced rows are not labelled "decide for yourself"',
            all('decide for yourself' not in by_ref[r][4] for r in ('4.1', '4.2')),
            by_ref['4.1'][4][:120])

    # ESCAPING. Plenty of the output descriptions contain commas; if quoting were
    # wrong the parse above would have produced ragged rows, so this asserts the
    # case actually occurs rather than passing vacuously.
    commas = [r for r in rows[1:] if ',' in r[4]]
    R.check('output text containing commas is present and parsed intact',
            len(commas) > 0, len(commas))

    refs_in_csv = [r[2] for r in rows[1:]]
    R.check('no removed sub-clause appears in the export',
            '7.1.5' not in refs_in_csv and '7.3.2' not in refs_in_csv,
            [r for r in refs_in_csv if r in ('7.1.5', '7.3.2')])
    R.check('Class C only requirements are excluded from the Class B export',
            '5.1.4' not in refs_in_csv, '5.1.4 present' if '5.1.4' in refs_in_csv else 'absent')
    R.check('5.4.1 IS in the Class B export (it reaches Class B)',
            '5.4.1' in refs_in_csv)
    R.check('7.4.1 is in the Class B export', '7.4.1' in refs_in_csv)
    ctx.close()

    R.group('deliverables — print output')

    ctx, pg = new_page(browser, 794, 1000)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)
    pg.locator('.filter-btn[data-filter="A"]').click()
    pg.wait_for_timeout(200)
    pg.locator('#deliverables-toggle').click()
    pg.wait_for_timeout(250)
    pg.emulate_media(media='print')
    pg.wait_for_timeout(250)
    shown = pg.evaluate("""() => {
        const d = s => { const el = document.querySelector(s);
                         return el ? getComputedStyle(el).display : 'absent'; };
        return { header: d('.site-header'), grid: d('.phases-grid'),
                 notice: d('.filter-notice'), footer: d('.site-footer'),
                 panel: d('.deliverables'), btn: d('.deliverables-btn') };
    }""")
    R.check('print hides the page furniture',
            shown['header'] == 'none' and shown['grid'] == 'none'
            and shown['notice'] == 'none' and shown['footer'] == 'none', shown)
    R.check('print keeps the deliverables panel', shown['panel'] == 'block', shown)
    R.check('print hides the buttons', shown['btn'] == 'none', shown)

    # REGRESSION: the certificate print rules used to hide <main> on every page, so
    # printing anything other than the quiz produced a blank sheet.
    R.check('main is not hidden when printing the Learn page',
            pg.evaluate("() => getComputedStyle(document.querySelector('main')).display") != 'none',
            pg.evaluate("() => getComputedStyle(document.querySelector('main')).display"))
    pg.emulate_media(media='screen')
    ctx.close()

    # ...and the quiz page must still print only the certificate.
    ctx, pg = new_page(browser, 794, 1000)
    pg.add_init_script('window.print = () => {};')
    pg.goto(base + '/quiz.html')
    pg.wait_for_timeout(400)
    R.check('quiz page carries the page-quiz scope class',
            'page-quiz' in (pg.locator('body').get_attribute('class') or ''),
            pg.locator('body').get_attribute('class'))
    pg.emulate_media(media='print')
    pg.wait_for_timeout(250)
    q = pg.evaluate("""() => ({
        main: getComputedStyle(document.querySelector('main')).display,
        cert: getComputedStyle(document.querySelector('#certificate')).display
    })""")
    R.check('quiz print still hides main and shows the certificate',
            q['main'] == 'none' and q['cert'] == 'block', q)
    pg.emulate_media(media='screen')
    ctx.close()


# ============================================================
# GROUP 4 — LEARN PAGE
# ============================================================

def test_learn(browser, base):
    R.group('learn — features')
    ctx, pg = new_page(browser)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)

    R.check('13 cards render from the JSON', pg.locator('.phase-card').count() == 13,
            pg.locator('.phase-card').count())
    R.check('spinner hidden once loaded', pg.locator('#phases-status').is_hidden())
    R.check('controls revealed once loaded', pg.locator('#learn-controls').is_visible())
    R.check('progress total reads 13', pg.locator('#progress-total').inner_text() == '13',
            pg.locator('#progress-total').inner_text())

    # expand / collapse
    header = pg.locator('.phase-header').first
    header.click()
    R.check('click expands a card',
            'expanded' in (pg.locator('.phase-card').first.get_attribute('class') or ''))
    R.check('aria-expanded becomes true', header.get_attribute('aria-expanded') == 'true')
    header.click()
    R.check('click collapses it again',
            'expanded' not in (pg.locator('.phase-card').first.get_attribute('class') or ''))

    # keyboard operation
    pg.evaluate("() => document.querySelector('.phase-header').focus()")
    pg.keyboard.press('Enter')
    R.check('Enter expands via keyboard', header.get_attribute('aria-expanded') == 'true')
    pg.keyboard.press('Space')
    R.check('Space collapses via keyboard', header.get_attribute('aria-expanded') == 'false')

    # level toggle swaps content in place
    pg.locator('.phase-header').first.click()
    intro_first = pg.locator('#phase-details-general-requirements li').first.inner_text()
    pg.locator('.level-btn[data-level="advanced"]').click()
    adv_first = pg.locator('#phase-details-general-requirements li').first.inner_text()
    R.check('level toggle changes the bullets', intro_first != adv_first)
    R.check('advanced bullets are clause referenced', '§' in adv_first, adv_first[:50])
    R.check('card stays expanded across a level change',
            'expanded' in (pg.locator('.phase-card').first.get_attribute('class') or ''))
    R.check('level choice persisted to localStorage',
            pg.evaluate("() => localStorage.getItem('62304_trainingLevel')") == 'advanced')
    pg.locator('.level-btn[data-level="intro"]').click()
    R.check('switching back restores intro bullets',
            pg.locator('#phase-details-general-requirements li').first.inner_text() == intro_first)

    # SAFETY CLASS FILTER
    # Expected counts are read from data/phases.json rather than written in here.
    # An earlier version of this test hardcoded "Class A shows 10 of 13", which
    # meant the suite asserted a count that was itself wrong — Clause 7 was
    # incorrectly marked as not applying to Class A, and the test locked that
    # error in and would have failed when it was corrected. A test that repeats
    # a value from the data cannot detect an error in the data; deriving it means
    # the test checks the FILTER logic, which is all it should be checking.
    with open(os.path.join(ROOT, 'data', 'phases.json'), encoding='utf-8') as f:
        all_topics = json.load(f)

    for cls in ['A', 'B', 'C']:
        expected = len([p for p in all_topics if cls in p['classes']])
        pg.locator('.filter-btn[data-filter="%s"]' % cls).click()
        pg.wait_for_timeout(150)
        R.check('Class %s filter shows %d of %d cards' % (cls, expected, len(all_topics)),
                pg.locator('.phase-card:not(.hidden)').count() == expected,
                pg.locator('.phase-card:not(.hidden)').count())

    pg.locator('.filter-btn[data-filter="all"]').click()
    R.check('All filter restores every card',
            pg.locator('.phase-card:not(.hidden)').count() == len(all_topics),
            pg.locator('.phase-card:not(.hidden)').count())

    # ---- FILTER NOTICE ----
    # Expected counts are derived from the JSON rather than hardcoded, so the
    # test stays correct if a topic is added or its safety classes change.
    with open(os.path.join(ROOT, 'data', 'phases.json'), encoding='utf-8') as f:
        topics = json.load(f)

    app = applicability()
    notice = pg.locator('#filter-notice')
    pg.locator('.filter-btn[data-filter="all"]').click()
    R.check('filter notice hidden when showing all', notice.is_hidden())

    for cls in ['A', 'B', 'C']:
        buckets = classify(topics, app, cls)
        pg.locator('.filter-btn[data-filter="%s"]' % cls).click()
        pg.wait_for_timeout(250)
        R.check('Class %s shows the filter notice' % cls, notice.is_visible())
        text = norm(notice.inner_text())
        R.check('Class %s notice names the class' % cls,
                'class ' + cls.lower() in text, text[:60])

        shown = buckets['full'] + buckets['partial']
        if buckets['omitted'] or buckets['partial']:
            R.check('Class %s notice states the shown/total count' % cls,
                    '%d of %d' % (len(shown), len(topics)) in text, text[:130])
        else:
            R.check('Class %s notice says nothing omitted or reduced' % cls,
                    'nothing is omitted' in text, text[:130])

        if buckets['partial']:
            R.check('Class %s notice states how many apply only in part' % cls,
                    '%d' % len(buckets['partial']) in text and 'in part' in text, text[:140])
            for p in buckets['partial']:
                R.check('Class %s notice lists %s as applying in part' % (cls, p['clause']),
                        norm(p['clause']) in text and norm(p['title']) in text, p['clause'])

        for p in buckets['omitted']:
            R.check('Class %s notice lists %s as not applying' % (cls, p['clause']),
                    norm(p['clause']) in text and norm(p['title']) in text, p['clause'])

        # A clause that applies in full must never be described as omitted.
        # There are now up to TWO of these lists (applies-in-part, and
        # does-not-apply), so all matches are joined rather than assuming one.
        if buckets['omitted'] or buckets['partial']:
            listed = norm(' '.join(pg.locator('.filter-notice-list').all_inner_texts()))
            wrongly = [p['title'] for p in buckets['full'] if norm(p['title']) in listed]
            R.check('Class %s notice does not list fully-applicable areas' % cls,
                    not wrongly, wrongly)

        # The regulatory caution must appear for every class, including C.
        R.check('Class %s notice carries the ISO 14971 caution' % cls,
                'iso 14971' in text and 're-check' in text, text[-160:])
        R.check('Class %s caution mentions re-validating after changes' % cls,
                'soup' in text and 'architecture' in text, text[-200:])

    # Class A is the dangerous case: Clause 7 is hidden, so the notice must say
    # explicitly that this does not mean risk management is out of scope.
    pg.locator('.filter-btn[data-filter="A"]').click()
    pg.wait_for_timeout(200)
    atext = norm(notice.inner_text())
    R.check('Class A notice rebuts "no risk management"',
            'does not mean risk management is out of scope' in atext, atext[:200])
    R.check('Class A notice cites 4.3 for the classification basis',
            '4.3' in atext, atext[:250])
    R.check('Class A notice says the class is an output of risk analysis',
            'output' in atext and 'risk analysis' in atext, atext[:250])

    R.check('filter notice is a polite live region',
            notice.get_attribute('role') == 'status'
            and notice.get_attribute('aria-live') == 'polite',
            '%s / %s' % (notice.get_attribute('role'), notice.get_attribute('aria-live')))

    pg.locator('.filter-btn[data-filter="all"]').click()
    pg.wait_for_timeout(200)
    R.check('returning to All hides the notice again', notice.is_hidden())

    # progress tracker
    pg.locator('.mark-studied-btn').first.click()
    R.check('marking studied increments the count',
            pg.locator('#progress-count').inner_text() == '1',
            pg.locator('#progress-count').inner_text())
    R.check('studied button becomes disabled',
            pg.locator('.mark-studied-btn').first.is_disabled())
    width = pg.evaluate("() => document.getElementById('progress-bar').style.width")
    R.check('progress bar width updates', width and width != '0%', width)
    R.check('progressbar exposes aria-valuenow',
            pg.locator('.progress-bar-container').get_attribute('aria-valuenow') is not None)

    R.check('no JavaScript errors', not pg.js_errors, pg.js_errors)
    ctx.close()

    # update banner dismissal persists
    ctx, pg = new_page(browser)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)
    R.check('update banner shown on first visit', pg.locator('#update-banner').is_visible())
    pg.locator('#update-banner-close').click()
    R.check('banner hides when dismissed', pg.locator('#update-banner').is_hidden())
    pg.reload()
    pg.wait_for_selector('.phase-card', timeout=10000)
    R.check('banner stays dismissed after reload', pg.locator('#update-banner').is_hidden())
    ctx.close()

    # ---- async failure paths ----
    R.group('learn — async loading and failure')

    ctx, pg = new_page(browser)
    pg.route('**/data/phases.json', lambda r: r.fulfill(status=404, body='nope'))
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('#phases-error:not(.hidden)', timeout=10000)
    msg = pg.locator('#phases-error-message').inner_text()
    R.check('404 shows the error panel', pg.locator('#phases-error').is_visible())
    R.check('error message names the status code', '404' in msg, msg)
    R.check('spinner hidden on failure', pg.locator('#phases-status').is_hidden())
    R.check('no cards rendered on failure', pg.locator('.phase-card').count() == 0)
    R.check('controls stay hidden on failure', pg.locator('#learn-controls').is_hidden())
    pg.unroute('**/data/phases.json')
    pg.locator('#phases-retry').click()
    pg.wait_for_selector('.phase-card', timeout=10000)
    R.check('retry recovers and renders the cards', pg.locator('.phase-card').count() == 13)
    R.check('error panel cleared after retry', pg.locator('#phases-error').is_hidden())
    ctx.close()

    ctx, pg = new_page(browser)
    pg.route('**/data/phases.json', lambda r: r.fulfill(
        status=200, content_type='application/json', body='[{"id":"broken",'))
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('#phases-error:not(.hidden)', timeout=10000)
    R.check('malformed JSON reported as invalid JSON',
            'not valid JSON' in pg.locator('#phases-error-message').inner_text(),
            pg.locator('#phases-error-message').inner_text())
    ctx.close()

    ctx, pg = new_page(browser)
    pg.route('**/data/phases.json', lambda r: r.fulfill(
        status=200, content_type='application/json', body='[]'))
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('#phases-error:not(.hidden)', timeout=10000)
    R.check('empty topic list rejected',
            'did not contain' in pg.locator('#phases-error-message').inner_text(),
            pg.locator('#phases-error-message').inner_text())
    ctx.close()


# ============================================================
# GROUP 3 — QUIZ
# ============================================================

def test_quiz(browser, base):
    R.group('quiz — features and scoring')

    ctx, pg = new_page(browser)
    pg.goto(base + '/quiz.html')

    pg.locator('#begin-quiz').click()
    R.check('empty name blocks the start',
            'Please enter your name' in pg.locator('#participant-name-error').inner_text())
    R.check('still on the start screen', pg.locator('#quiz-start').is_visible())

    pg.fill('#participant-name', 'Test Learner')
    pg.locator('#begin-quiz').click()
    pg.wait_for_selector('#quiz-active.active', timeout=10000)
    R.check('quiz starts once a name is given', pg.locator('#quiz-active').is_visible())
    R.check('name error cleared', pg.locator('#participant-name-error').inner_text() == '')
    R.check('question text populated', len(pg.locator('#question-text').inner_text()) > 20)
    R.check('four options rendered', pg.locator('.option-btn').count() == 4,
            pg.locator('.option-btn').count())
    R.check('counter reads "of 15"',
            'of 15' in pg.locator('#question-counter').inner_text().lower(),
            pg.locator('#question-counter').inner_text())
    R.check('begin button label restored by finally',
            pg.locator('#begin-quiz').inner_text().strip() == 'Begin Assessment')

    # timer counts down
    start_t = int(pg.locator('#timer-display').inner_text())
    pg.wait_for_timeout(2200)
    later_t = int(pg.locator('#timer-display').inner_text())
    R.check('timer counts down', later_t < start_t, '%d then %d' % (start_t, later_t))

    # answering marks correct / incorrect and locks the options
    correct_idx = pg.evaluate("() => quizState.shuffled[quizState.currentIndex].correct")
    pg.locator('.option-btn').nth(correct_idx).click()
    pg.wait_for_selector('#question-feedback.visible', timeout=8000)
    R.check('correct answer highlighted',
            'correct' in (pg.locator('.option-btn').nth(correct_idx).get_attribute('class') or ''))
    R.check('feedback text shows a tick',
            pg.locator('#feedback-text').inner_text().startswith('✓'),
            pg.locator('#feedback-text').inner_text()[:30])
    R.check('score incremented', pg.evaluate('() => quizState.score') == 1)
    disabled = pg.evaluate("() => [...document.querySelectorAll('.option-btn')].every(b => b.disabled)")
    R.check('all options locked after answering', disabled)
    R.check('feedback mirrored into the live region',
            len(pg.locator('#quiz-feedback-live').inner_text()) > 10)

    # a wrong answer
    pg.locator('#next-question').click()
    pg.wait_for_selector('.option-btn:not([disabled])', timeout=8000)
    correct_idx = pg.evaluate("() => quizState.shuffled[quizState.currentIndex].correct")
    wrong_idx = (correct_idx + 1) % 4
    pg.locator('.option-btn').nth(wrong_idx).click()
    pg.wait_for_selector('#question-feedback.visible', timeout=8000)
    R.check('wrong answer marked incorrect',
            'incorrect' in (pg.locator('.option-btn').nth(wrong_idx).get_attribute('class') or ''))
    R.check('correct answer still revealed',
            'correct' in (pg.locator('.option-btn').nth(correct_idx).get_attribute('class') or ''))
    R.check('score not incremented for a wrong answer',
            pg.evaluate('() => quizState.score') == 1)
    R.check('no JavaScript errors', not pg.js_errors, pg.js_errors)
    ctx.close()

    # timeout behaviour. Rather than wait a real 30 seconds, push the countdown
    # near zero and let the existing interval expire naturally — the production
    # code path is unchanged, only the starting value differs.
    ctx, pg = new_page(browser)
    pg.goto(base + '/quiz.html')
    pg.fill('#participant-name', 'Timeout Test')
    pg.locator('#begin-quiz').click()
    pg.wait_for_selector('#quiz-active.active', timeout=10000)
    pg.evaluate('() => { quizState.timeLeft = 2; }')
    pg.wait_for_selector('#question-feedback.visible', timeout=8000)
    R.check("timeout reveals feedback without an answer",
            '⏱' in pg.locator('#feedback-text').inner_text(),
            pg.locator('#feedback-text').inner_text()[:40])
    R.check('timeout locks the options',
            pg.evaluate("() => [...document.querySelectorAll('.option-btn')].every(b => b.disabled)"))
    R.check('timeout does not award a point', pg.evaluate('() => quizState.score') == 0)
    ctx.close()

    # full run, all correct → pass + certificate
    ctx, pg = new_page(browser)
    # Stub window.print BEFORE navigating. add_init_script only affects documents
    # loaded after it is registered, so calling it after goto() silently does
    # nothing — and the real print dialog is a modal that would hang the run.
    pg.add_init_script('window.print = () => { window.__printed = true; };')
    pg.goto(base + '/quiz.html')
    pg.fill('#participant-name', 'Ada Lovelace')
    pg.locator('#begin-quiz').click()
    pg.wait_for_selector('#quiz-active.active', timeout=10000)
    for _ in range(15):
        pg.wait_for_selector('.option-btn:not([disabled])', timeout=8000)
        ci = pg.evaluate("() => quizState.shuffled[quizState.currentIndex].correct")
        pg.locator('.option-btn').nth(ci).click()
        pg.wait_for_selector('#question-feedback.visible', timeout=8000)
        pg.locator('#next-question').click()
    pg.wait_for_selector('#quiz-results.active', timeout=8000)
    R.check('15/15 shows the results screen', pg.locator('#quiz-results').is_visible())
    R.check('score displays 15', pg.locator('#score-display').inner_text() == '15',
            pg.locator('#score-display').inner_text())
    R.check('heading reads Assessment Passed',
            pg.locator('#results-heading').inner_text() == 'Assessment Passed',
            pg.locator('#results-heading').inner_text())
    R.check('results heading is an h1 (each screen needs one)',
            pg.evaluate("() => document.getElementById('results-heading').tagName") == 'H1')
    R.check('"out of 15" matches the question count',
            pg.locator('#score-total').inner_text() == 'out of 15',
            pg.locator('#score-total').inner_text())
    R.check('breakdown shows three cells', pg.locator('.breakdown-item').count() == 3)
    R.check('certificate button revealed on a pass',
            pg.locator('#download-cert').is_visible())
    R.check('certificate carries the participant name',
            pg.locator('#cert-name').inner_text() == 'Ada Lovelace',
            pg.locator('#cert-name').inner_text())
    R.check('certificate shows the score',
            '15 / 15' in pg.locator('#cert-score').inner_text(),
            pg.locator('#cert-score').inner_text())
    R.check('certificate dated', len(pg.locator('#cert-date').inner_text()) > 5)
    pg.locator('#download-cert').click()
    pg.wait_for_timeout(400)
    R.check('download triggers print()', pg.evaluate('() => window.__printed === true'))
    R.check('download button restored by finally',
            pg.locator('#download-cert').inner_text().strip() == 'Download Certificate'
            and not pg.locator('#download-cert').is_disabled())
    R.check('no JavaScript errors', not pg.js_errors, pg.js_errors)
    ctx.close()

    # all wrong → fail, no certificate
    ctx, pg = new_page(browser)
    pg.goto(base + '/quiz.html')
    pg.fill('#participant-name', 'Failing Learner')
    pg.locator('#begin-quiz').click()
    pg.wait_for_selector('#quiz-active.active', timeout=10000)
    for _ in range(15):
        pg.wait_for_selector('.option-btn:not([disabled])', timeout=8000)
        ci = pg.evaluate("() => quizState.shuffled[quizState.currentIndex].correct")
        pg.locator('.option-btn').nth((ci + 1) % 4).click()
        pg.wait_for_selector('#question-feedback.visible', timeout=8000)
        pg.locator('#next-question').click()
    pg.wait_for_selector('#quiz-results.active', timeout=8000)
    R.check('0/15 scores zero', pg.locator('#score-display').inner_text() == '0')
    R.check('heading reads Keep Studying',
            pg.locator('#results-heading').inner_text() == 'Keep Studying',
            pg.locator('#results-heading').inner_text())
    R.check('no certificate offered on a fail', pg.locator('#download-cert').is_hidden())
    pg.locator('#retry-quiz').click()
    R.check('Try Again returns to the start screen', pg.locator('#quiz-start').is_visible())
    ctx.close()

    # questions are shuffled between attempts
    ctx, pg = new_page(browser)
    firsts = set()
    for _ in range(4):
        pg.goto(base + '/quiz.html')
        pg.fill('#participant-name', 'Shuffle Test')
        pg.locator('#begin-quiz').click()
        pg.wait_for_selector('#quiz-active.active', timeout=10000)
        firsts.add(pg.locator('#question-text').inner_text())
    R.check('question order is randomised between attempts', len(firsts) > 1,
            '%d distinct opening questions in 4 attempts' % len(firsts))
    ctx.close()

    # ---- async: level selection, prefetch, failure ----
    R.group('quiz — async loading and failure')

    ctx, pg = new_page(browser)
    requested = []
    pg.on('request', lambda r: requested.append(r.url) if '/data/' in r.url else None)
    pg.goto(base + '/quiz.html')
    pg.wait_for_timeout(1500)
    R.check('question file prefetched before any click',
            any('questions-intro.json' in u for u in requested), requested)
    R.check('only ONE question file downloaded', len(requested) == 1, requested)
    before = len(requested)
    pg.fill('#participant-name', 'Prefetch Test')
    pg.locator('#begin-quiz').click()
    pg.wait_for_selector('#quiz-active.active', timeout=10000)
    R.check('no second request on click (stored Promise reused)',
            len(requested) == before, requested)
    ctx.close()

    ctx, pg = new_page(browser)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)
    pg.locator('.level-btn[data-level="advanced"]').click()
    requested = []
    pg.on('request', lambda r: requested.append(r.url) if '/data/' in r.url else None)
    pg.goto(base + '/quiz.html')
    pg.wait_for_timeout(1500)
    R.check('advanced level fetches the advanced set',
            any('questions-advanced.json' in u for u in requested), requested)
    R.check('intro set not downloaded when advanced is chosen',
            not any('questions-intro.json' in u for u in requested), requested)
    R.check('advanced badge shown on the start screen',
            'Advanced assessment' in pg.locator('#quiz-level-notice').inner_text())
    ctx.close()

    ctx, pg = new_page(browser)
    pg.route('**/questions-intro.json', lambda r: r.fulfill(status=500, body='boom'))
    pg.goto(base + '/quiz.html')
    pg.fill('#participant-name', 'Error Test')
    pg.locator('#begin-quiz').click()
    pg.wait_for_selector('#questions-error:not(.hidden)', timeout=10000)
    R.check('500 shows the error panel', pg.locator('#questions-error').is_visible())
    R.check('error names the status code',
            '500' in pg.locator('#questions-error-message').inner_text(),
            pg.locator('#questions-error-message').inner_text())
    R.check('quiz not entered on failure', pg.locator('#quiz-start').is_visible())
    R.check('begin button re-enabled by finally', not pg.locator('#begin-quiz').is_disabled())
    R.check('begin button label restored',
            pg.locator('#begin-quiz').inner_text().strip() == 'Begin Assessment')
    pg.unroute('**/questions-intro.json')
    pg.locator('#questions-retry').click()
    pg.wait_for_selector('#quiz-active.active', timeout=10000)
    R.check('retry recovers and starts the quiz', pg.locator('#quiz-active').is_visible())
    ctx.close()

    ctx, pg = new_page(browser)
    pg.route('**/questions-intro.json', lambda r: r.fulfill(
        status=200, content_type='application/json',
        body='[{"q":"Bad question","options":["a","b"],"correct":9}]'))
    pg.goto(base + '/quiz.html')
    pg.fill('#participant-name', 'Schema Test')
    pg.locator('#begin-quiz').click()
    pg.wait_for_selector('#questions-error:not(.hidden)', timeout=10000)
    R.check('out-of-range correct index rejected',
            'incomplete or malformed' in pg.locator('#questions-error-message').inner_text(),
            pg.locator('#questions-error-message').inner_text())
    ctx.close()


# ============================================================
# GROUP 4 — CONTACT FORM
# Every test here stubs Formspree. Nothing is ever really sent.
# ============================================================

def test_contact(browser, base):
    R.group('contact — validation')

    ctx, pg = new_page(browser)
    stub_formspree(pg)
    pg.goto(base + '/contact.html')

    pg.locator('#submit-message').click()
    for field, expect in [('name', 'name'), ('email', 'email'), ('message', 'message')]:
        R.check('empty %s rejected' % field,
                bool(pg.locator('#%s-error' % field).inner_text()),
                pg.locator('#%s-error' % field).inner_text())
    R.check('no success panel on an invalid submit', pg.locator('#form-success').is_hidden())
    R.check('nothing sent when validation fails', not pg.live_requests, pg.live_requests)

    # blur validation
    pg.fill('#name', 'A')
    pg.locator('#email').click()
    R.check('short name flagged on blur',
            'at least 2' in pg.locator('#name-error').inner_text(),
            pg.locator('#name-error').inner_text())
    pg.fill('#name', 'Valid Name')
    pg.locator('#email').click()
    R.check('valid name clears its error', pg.locator('#name-error').inner_text() == '')

    for bad in ['notanemail', 'missing@tld', 'a b@c.com']:
        pg.fill('#email', bad)
        pg.locator('#message').click()
        R.check('email "%s" rejected' % bad, bool(pg.locator('#email-error').inner_text()))
    pg.fill('#email', 'valid@example.com')
    pg.locator('#message').click()
    R.check('valid email accepted', pg.locator('#email-error').inner_text() == '')

    pg.locator('#message').fill('too short')
    pg.locator('#name').click()
    R.check('short message rejected',
            'at least 10' in pg.locator('#message-error').inner_text(),
            pg.locator('#message-error').inner_text())
    ctx.close()

    R.group('contact — async submission')

    # success
    ctx, pg = new_page(browser)
    captured = {}

    def ok(route):
        captured['method'] = route.request.method
        captured['accept'] = route.request.headers.get('accept')
        captured['body'] = route.request.post_data or ''
        route.fulfill(status=200, content_type='application/json', body='{"ok":true}')

    pg.route(FORMSPREE_GLOB, ok)
    pg.goto(base + '/contact.html')
    pg.fill('#name', 'Grace Hopper')
    pg.fill('#email', 'grace@example.com')
    pg.select_option('#role', 'developer')
    pg.locator('#message').fill('This is a sufficiently long test message body.')

    # RECORDING A TRANSIENT STATE
    # The "Sending…" state is real but very short-lived here, because the mocked
    # response returns instantly — so polling for it after the click is a race
    # the test usually loses. Instead, attach a MutationObserver BEFORE clicking
    # to record every state the button passes through. Then assert against the
    # recording afterwards. This is deterministic: it does not matter how fast
    # the response is, because we are reading history rather than trying to
    # observe a moment.
    pg.evaluate("""() => {
        window.__btnStates = [];
        const btn = document.getElementById('submit-message');
        const snap = () => window.__btnStates.push({
            disabled: btn.disabled,
            text: btn.textContent,
            busy: btn.getAttribute('aria-busy')
        });
        snap();
        new MutationObserver(snap).observe(btn, {
            attributes: true, childList: true, subtree: true, characterData: true
        });
    }""")

    pg.locator('#submit-message').click()
    pg.wait_for_selector('#form-success:not(.hidden)', timeout=10000)

    states = pg.evaluate('() => window.__btnStates')
    R.check('button was disabled while sending',
            any(s['disabled'] for s in states),
            [s['text'].strip() for s in states])
    R.check('button read "Sending" while in flight',
            any('Sending' in (s['text'] or '') for s in states),
            [s['text'].strip() for s in states])
    R.check('aria-busy was set while sending',
            any(s['busy'] == 'true' for s in states),
            [s['busy'] for s in states])
    R.check('POST used', captured.get('method') == 'POST', captured.get('method'))
    R.check('Accept: application/json sent', captured.get('accept') == 'application/json')
    for field, value in [('name', 'Grace Hopper'), ('email', 'grace@example.com'),
                         ('role', 'developer'), ('message', 'sufficiently long')]:
        R.check('%s reaches the request body' % field, value in captured.get('body', ''))
    R.check('_subject sent for the email subject line', '_subject' in captured.get('body', ''))
    R.check('success heading shown',
            pg.locator('#form-success-heading').inner_text() in ('Message Sent!', 'Message Validated'),
            pg.locator('#form-success-heading').inner_text())
    R.check('form hidden on success', pg.locator('#contact-form').is_hidden())
    R.check('button restored by finally',
            pg.locator('#submit-message').inner_text().strip() == 'Send Message')
    R.check('aria-busy removed', pg.locator('#submit-message').get_attribute('aria-busy') is None)
    pg.locator('#send-another').click()
    R.check('Send another restores the form', pg.locator('#contact-form').is_visible())
    R.check('fields cleared', pg.locator('#name').input_value() == '')
    R.check('no JavaScript errors', not pg.js_errors, pg.js_errors)
    ctx.close()

    # server-side field validation errors routed back to the inputs
    ctx, pg = new_page(browser)
    stub_formspree(pg, status=422,
                   body='{"errors":[{"field":"email","message":"is not a valid email"}]}')
    pg.goto(base + '/contact.html')
    pg.fill('#name', 'Field Error Test')
    pg.fill('#email', 'blocked@example.com')
    pg.locator('#message').fill('Testing server-side field error handling here.')
    pg.locator('#submit-message').click()
    pg.wait_for_selector('#form-error:not(.hidden)', timeout=10000)
    R.check('422 shows the error banner', pg.locator('#form-error').is_visible())
    R.check('banner names the field and reason',
            'email is not a valid email' in pg.locator('#form-error-message').inner_text(),
            pg.locator('#form-error-message').inner_text())
    R.check('server message shown beside the field',
            pg.locator('#email-error').inner_text() == 'is not a valid email',
            pg.locator('#email-error').inner_text())
    R.check('focus moved to the rejected field',
            pg.evaluate('() => document.activeElement.id') == 'email')
    R.check('form still visible for a retry', pg.locator('#contact-form').is_visible())
    R.check('typed message preserved',
            'Testing server-side' in pg.locator('#message').input_value())
    ctx.close()

    # status-code fallbacks when there is no usable JSON body
    for status, needle, label in [(429, 'Too many messages', 'rate limit'),
                                  (404, 'not configured correctly', 'misconfigured'),
                                  (503, 'temporarily unavailable', 'service down')]:
        ctx, pg = new_page(browser)
        stub_formspree(pg, status=status, body='<html>error</html>', content_type='text/html')
        pg.goto(base + '/contact.html')
        pg.fill('#name', 'Status Test')
        pg.fill('#email', 'a@example.com')
        pg.locator('#message').fill('Checking the status code fallback messages.')
        pg.locator('#submit-message').click()
        pg.wait_for_selector('#form-error:not(.hidden)', timeout=10000)
        R.check('%d gives the %s message' % (status, label),
                needle in pg.locator('#form-error-message').inner_text(),
                pg.locator('#form-error-message').inner_text())
        R.check('%d: no crash parsing an HTML body' % status, not pg.js_errors, pg.js_errors)
        ctx.close()

    # network failure
    ctx, pg = new_page(browser)
    pg.route(FORMSPREE_GLOB, lambda r: r.abort('connectionrefused'))
    pg.goto(base + '/contact.html')
    pg.fill('#name', 'Offline Test')
    pg.fill('#email', 'a@example.com')
    pg.locator('#message').fill('Checking behaviour when the network is unavailable.')
    pg.locator('#submit-message').click()
    pg.wait_for_selector('#form-error:not(.hidden)', timeout=10000)
    R.check('network failure explained in plain language',
            'Could not reach the server' in pg.locator('#form-error-message').inner_text(),
            pg.locator('#form-error-message').inner_text())
    R.check('button restored after a network failure',
            not pg.locator('#submit-message').is_disabled())
    ctx.close()

    # double-submit guard
    ctx, pg = new_page(browser)
    calls = []

    def counting(route):
        calls.append(1)
        route.fulfill(status=200, content_type='application/json', body='{"ok":true}')

    pg.route(FORMSPREE_GLOB, counting)
    pg.goto(base + '/contact.html')
    pg.fill('#name', 'Double Click')
    pg.fill('#email', 'a@example.com')
    pg.locator('#message').fill('Checking that a double click cannot submit twice.')
    btn = pg.locator('#submit-message')
    btn.click()
    try:
        btn.click(timeout=800)
    except Exception:
        pass
    pg.wait_for_selector('#form-success:not(.hidden)', timeout=10000)
    R.check('double click sends exactly one request', len(calls) == 1, len(calls))
    ctx.close()

    # anti-spam honeypot
    ctx, pg = new_page(browser)
    pg.goto(base + '/contact.html')
    hp = pg.evaluate("""() => {
        const h = document.querySelector('input[name="_gotcha"]');
        if (!h) return null;
        return { tabindex: h.getAttribute('tabindex'),
                 ariaHidden: h.getAttribute('aria-hidden'),
                 display: getComputedStyle(h).display };
    }""")
    R.check('honeypot field present', hp is not None)
    if hp:
        R.check('honeypot not reachable by keyboard', hp['tabindex'] == '-1', hp)
        R.check('honeypot hidden from screen readers', hp['ariaHidden'] == 'true', hp)
        R.check('honeypot not rendered', hp['display'] == 'none', hp)
    ctx.close()


# ============================================================
# GROUP 5 — PRIVACY NOTICE
# ============================================================

def test_privacy(browser, base):
    R.group('privacy — notice and footer links')

    ctx, pg = new_page(browser)
    pg.goto(base + '/privacy.html')
    R.check('privacy page loads',
            pg.locator('h1').first.inner_text() == 'Privacy & Data Protection',
            pg.locator('h1').first.inner_text())
    text = pg.inner_text('.legal-page')
    for needle, label in [
        ('United States', 'discloses the transfer outside the EEA'),
        ('Formspree', 'names the processor'),
        ('St John Lynch', 'names the data controller'),
        ('48 hours', 'states the retention period'),
        ('no cookies', 'states that no cookies are set'),
        ('Data Protection Commission', 'names the supervisory authority'),
    ]:
        R.check('notice %s' % label, needle in text, needle)
    R.check('controller email is a working mailto link',
            pg.locator('a[href="mailto:niamh@stjohnlynch.com"]').count() >= 1)
    R.check('localStorage keys documented', pg.locator('.legal-table tbody tr').count() == 2)

    # ---- Content provenance ----
    # Not a data protection matter, but it lives here, and it is the statement a
    # reader needs before carrying anything from this course into a submission.
    R.check('notice has a content-sources section with a linkable id',
            pg.locator('#content-sources').count() == 1)
    src = norm(text)
    for needle, label in [
        ('iec 62304:2006+amd1:2015', 'names the edition the content is based on'),
        ('is not reproduced here', 'states the standard\'s text is not reproduced'),
        ('table a.1 as amended', 'names the source of the safety class mapping'),
        ('iec tc 62 work programme', 'names the source of the Edition 2 status'),
        ('not affiliated with, authorised by, or endorsed by the iec',
         'disclaims affiliation with IEC'),
        ('the standard governs', 'says the standard governs over this site'),
    ]:
        R.check('provenance %s' % label, needle in src, needle)
    R.check('provenance section links to the IEC TC 62 work programme',
            pg.locator('#content-sources ~ ul a[href*="iec.ch"]').count() >= 1)

    # The claim on line "every file the page loads comes from this site" and this
    # one have to stay true together. If the site is ever changed to call IEC from
    # the browser, BOTH become false — which is exactly why the fetch happens away
    # from the visitor's request.
    R.check('provenance states no visitor request reaches IEC',
            'your browser never contacts the iec' in src, src[-400:])
    R.check('no JavaScript errors', not pg.js_errors, pg.js_errors)
    ctx.close()

    for page in PAGES:
        ctx, pg = new_page(browser)
        pg.goto(base + '/' + page)
        R.check('%s has the footer privacy link' % page,
                pg.locator('.footer-links a[href="privacy.html"]').count() == 1)
        ctx.close()

    ctx, pg = new_page(browser)
    pg.goto(base + '/index.html')
    pg.locator('.footer-links a').click()
    pg.wait_for_load_state()
    R.check('footer link navigates to the notice', pg.url.endswith('privacy.html'), pg.url)
    ctx.close()

    ctx, pg = new_page(browser)
    stub_formspree(pg)
    pg.goto(base + '/contact.html')
    note = pg.locator('.form-privacy-note')
    R.check('notice shown at the point of collection', note.is_visible())
    R.check('point-of-collection notice names Formspree and the US',
            'Formspree' in note.inner_text() and 'United States' in note.inner_text())
    R.check('point-of-collection notice links to the full notice',
            note.locator('a[href="privacy.html"]').count() == 1)
    ctx.close()

    # The home page figure is hardcoded, so it can drift from the data.
    with open(os.path.join(ROOT, 'data', 'phases.json'), encoding='utf-8') as f:
        topic_count = len(json.load(f))
    ctx, pg = new_page(browser)
    pg.goto(base + '/index.html')
    shown = pg.locator('.stat-card .stat-number').first.inner_text()
    R.check('home page topic count matches the data',
            shown == str(topic_count), '%s shown, %d in phases.json' % (shown, topic_count))
    ctx.close()


# ============================================================
# GROUP 6 — VERSION DISCLOSURE
# The course teaches Edition 1 (IEC 62304:2006+AMD1:2015) while Edition 2 is in
# development, so a learner who cannot tell which version they are studying could
# revise the wrong standard. These checks treat that disclosure as a
# CORRECTNESS requirement, not decoration — if a future redesign drops the chip
# from a page, the suite says so.
# ============================================================

def test_version(browser, base):
    R.group('version — which edition the course covers')

    for page in PAGES:
        ctx, pg = new_page(browser)
        stub_formspree(pg)
        pg.goto(base + '/' + page)
        chip = pg.locator('.version-chip')
        R.check('%s shows the version chip' % page, chip.count() == 1, chip.count())
        if chip.count():
            text = norm(chip.first.inner_text())
            R.check('%s chip names Edition 1' % page, 'edition 1' in text, text)
            R.check('%s chip names the amendment year' % page, '2015' in text, text)
            R.check('%s chip is visible, not hidden' % page, chip.first.is_visible())
        ctx.close()

    # The home page is where a first-time visitor forms their understanding.
    ctx, pg = new_page(browser)
    pg.goto(base + '/index.html')
    hero = norm(pg.inner_text('.hero-content'))
    R.check('home hero states the edition covered', 'edition 1' in hero, hero[:90])
    R.check('home hero gives the full designation',
            '62304:2006' in hero and '2015' in hero, hero[:120])
    R.check('home hero says Edition 2 is NOT covered',
            'edition 2' in hero and 'not covered' in hero, hero[:160])
    ctx.close()

    # The Edition 2 notice must read as a notice and must say which edition the
    # course itself covers — that is the point most likely to be misread.
    ctx, pg = new_page(browser)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)
    banner = pg.locator('#update-banner')
    R.check('Edition 2 notice shown on first visit', banner.is_visible())
    R.check('notice carries a labelled header strip',
            'notice' in norm(pg.locator('.update-banner-label').inner_text()),
            pg.locator('.update-banner-label').inner_text())
    R.check('notice is a bounded card, not a full-width band',
            pg.evaluate("""() => {
                const card = document.querySelector('.update-banner-card');
                return card.getBoundingClientRect().width < document.documentElement.clientWidth - 40;
            }"""))
    btext = norm(banner.inner_text())
    R.check('notice states the course covers Edition 1',
            'covers edition 1' in btext, btext[:120])
    R.check('notice marks the Edition 2 changes as proposed', 'proposed' in btext)
    R.check('notice is announced as a note, not an urgent alert',
            banner.get_attribute('role') == 'note', banner.get_attribute('role'))
    R.check('notice has an accessible name',
            bool(banner.get_attribute('aria-label')), banner.get_attribute('aria-label'))
    R.check('close button lives in the header strip',
            pg.evaluate("() => !!document.querySelector('.update-banner-bar #update-banner-close')"))

    # ---- Provenance, at the point the claim is made ----
    # A claim about a standard still under development has to be dated, or it
    # cannot be judged stale — it just silently becomes wrong. The date is
    # machine-readable so it is unambiguous and can be checked here rather than
    # parsed out of prose.
    source = pg.locator('.update-banner-source')
    R.check('notice carries a source line', source.count() == 1)
    stext = norm(source.inner_text())
    R.check('source line names IEC TC 62', 'iec tc 62' in stext, stext[:120])
    R.check('source line gives a review date', 'reviewed' in stext, stext[:160])
    R.check('review date is machine-readable',
            bool(source.locator('time[datetime]').count()),
            source.locator('time').count())
    R.check('review date is a valid ISO date',
            re.match(r'^\d{4}-\d{2}-\d{2}$',
                     source.locator('time').first.get_attribute('datetime') or '') is not None,
            source.locator('time').first.get_attribute('datetime'))
    R.check('source line tells the reader to confirm the current stage with IEC',
            'confirm the current stage' in stext, stext[:220])
    R.check('source line links to the provenance section of the notice',
            source.locator('a[href="privacy.html#content-sources"]').count() == 1)
    ctx.close()

    # The footer already cites the standard; keep that in step with the chip.
    ctx, pg = new_page(browser)
    pg.goto(base + '/index.html')
    R.check('footer cites the same version',
            '2006+AMD1:2015' in pg.inner_text('.site-footer'),
            pg.inner_text('.site-footer')[:80])
    ctx.close()


# ============================================================
# GROUP 7 — ACCESSIBILITY
# axe-core covers the mechanical WCAG checks: contrast, names, roles, landmarks,
# heading structure. It is NOT a clean bill of health — automated tools catch
# roughly a third to a half of real accessibility problems, and cannot judge
# whether wording makes sense or whether a screen reader journey is coherent.
# Treat zero violations as a floor, not a ceiling.
# ============================================================

def test_a11y(browser, base, axe_src):
    R.group('accessibility — axe-core (WCAG 2.1 A/AA + best practice)')

    if not axe_src:
        R.check('axe-core available', False, 'could not download; group skipped')
        return

    for page in PAGES:
        ctx, pg = new_page(browser)
        stub_formspree(pg)
        pg.goto(base + '/' + page)
        if page == 'learn.html':
            pg.wait_for_selector('.phase-card', timeout=10000)
        pg.wait_for_timeout(400)
        v = axe_violations(pg, axe_src)
        R.check('%s has no violations' % page, not v,
                [x['id'] + ' ' + str(x['targets']) for x in v])
        ctx.close()

    # States that only exist at runtime. These are the ones normally missed,
    # because a spinner or an error panel is invisible when the page is idle.
    ctx, pg = new_page(browser)
    pg.route('**/data/phases.json', lambda r: r.abort())
    pg.goto(base + '/learn.html')
    pg.wait_for_timeout(700)
    pg.evaluate("""() => { document.getElementById('phases-error').classList.add('hidden');
                           document.getElementById('phases-status').classList.remove('hidden'); }""")
    v = axe_violations(pg, axe_src)
    R.check('learn loading state has no violations', not v, [x['id'] for x in v])
    ctx.close()

    ctx, pg = new_page(browser)
    pg.route('**/data/phases.json', lambda r: r.fulfill(status=503, body='x'))
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('#phases-error:not(.hidden)', timeout=10000)
    v = axe_violations(pg, axe_src)
    R.check('learn error state has no violations', not v, [x['id'] for x in v])
    ctx.close()

    ctx, pg = new_page(browser)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)
    pg.locator('.phase-header').first.click()
    pg.wait_for_timeout(300)
    v = axe_violations(pg, axe_src)
    R.check('learn expanded card has no violations', not v, [x['id'] for x in v])
    ctx.close()

    # The safety-class filter notice only exists once a filter is applied, so an
    # audit of the default page state would never see it.
    ctx, pg = new_page(browser)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)
    pg.locator('.filter-btn[data-filter="A"]').click()
    pg.wait_for_timeout(300)
    v = axe_violations(pg, axe_src)
    R.check('learn Class A filter notice has no violations', not v, [x['id'] for x in v])

    # The deliverables list is collapsed by default, so it too would be missed.
    pg.locator('#deliverables-toggle').click()
    pg.wait_for_timeout(350)
    v = axe_violations(pg, axe_src)
    R.check('deliverables list has no violations', not v, [x['id'] for x in v])
    ctx.close()

    ctx, pg = new_page(browser)
    pg.goto(base + '/quiz.html')
    pg.fill('#participant-name', 'A11y Test')
    pg.locator('#begin-quiz').click()
    pg.wait_for_selector('#quiz-active.active', timeout=10000)
    v = axe_violations(pg, axe_src)
    R.check('quiz question screen has no violations', not v, [x['id'] for x in v])
    pg.locator('.option-btn').first.click()
    pg.wait_for_selector('#question-feedback.visible', timeout=8000)
    v = axe_violations(pg, axe_src)
    R.check('quiz feedback state has no violations', not v, [x['id'] for x in v])
    pg.locator('#next-question').click()
    answer_all_questions(pg)
    v = axe_violations(pg, axe_src)
    R.check('quiz results screen has no violations', not v, [x['id'] for x in v])
    ctx.close()

    ctx, pg = new_page(browser)
    stub_formspree(pg, status=422,
                   body='{"errors":[{"field":"email","message":"is not valid"}]}')
    pg.goto(base + '/contact.html')
    pg.fill('#name', 'A11y Error')
    pg.fill('#email', 'a@example.com')
    pg.locator('#message').fill('Auditing the accessibility of the error state.')
    pg.locator('#submit-message').click()
    pg.wait_for_selector('#form-error:not(.hidden)', timeout=10000)
    v = axe_violations(pg, axe_src)
    R.check('contact error state has no violations', not v, [x['id'] for x in v])
    ctx.close()

    R.group('accessibility — keyboard, focus and motion')

    ctx, pg = new_page(browser)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)
    pg.keyboard.press('Tab')
    first = pg.evaluate("() => document.activeElement.className")
    R.check('skip link is the first tab stop', 'skip-link' in first, first)
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(200)
    R.check('skip link jumps to main content',
            pg.evaluate("() => location.hash") == '#main-content',
            pg.evaluate("() => location.hash"))
    ctx.close()

    # Focus indicators, compared before and after rather than inspected once.
    # Asserting only on the focused state is how you get a test that passes
    # because the *default* border happens to look like a ring. Comparing the
    # two states proves the browser actually renders something different, which
    # is what a keyboard user relies on to know where they are.
    #
    # Note the deliberate wait: the inputs transition border-color and background
    # over 200ms, so reading immediately after focusing catches the old values
    # mid-animation and understates the change.
    ctx, pg = new_page(browser)
    stub_formspree(pg)
    pg.goto(base + '/contact.html')
    probe = """(sel) => { const s = getComputedStyle(document.querySelector(sel));
        return [s.outlineStyle, s.outlineWidth, s.outlineColor,
                s.borderColor, s.backgroundColor, s.boxShadow].join(' | '); }"""
    for sel, name in [('#name', 'text input'), ('#message', 'textarea'),
                      ('#submit-message', 'submit button')]:
        before = pg.evaluate(probe, sel)
        pg.locator(sel).focus()
        pg.wait_for_timeout(300)  # let the CSS transition finish
        after = pg.evaluate(probe, sel)
        R.check('%s changes appearance when focused' % name, before != after,
                'before: %s / after: %s' % (before[:45], after[:45]))
        R.check('%s focus indicator is an outline, not just a colour shift' % name,
                after.split(' | ')[0] != 'none', after[:45])
    ctx.close()

    ctx, pg = new_page(browser)
    pg.goto(base + '/learn.html')
    pg.wait_for_selector('.phase-card', timeout=10000)
    before = pg.evaluate(probe, '.phase-header')
    pg.evaluate("() => document.querySelector('.phase-header').focus()")
    pg.wait_for_timeout(300)
    R.check('topic card header shows a focus ring',
            pg.evaluate(probe, '.phase-header') != before,
            pg.evaluate(probe, '.phase-header')[:60])
    ctx.close()

    ctx, pg = new_page(browser)
    pg.goto(base + '/index.html')
    R.check('active nav link marked with aria-current',
            pg.locator('.nav-link[aria-current="page"]').count() == 1)
    ctx.close()

    ctx, pg = new_page(browser, reduced_motion='reduce')
    pg.route('**/data/phases.json', lambda r: r.abort())
    pg.goto(base + '/learn.html')
    pg.wait_for_timeout(600)
    pg.evaluate("""() => { document.getElementById('phases-error').classList.add('hidden');
                           document.getElementById('phases-status').classList.remove('hidden'); }""")
    anim = pg.evaluate("() => getComputedStyle(document.querySelector('.spinner')).animationName")
    R.check('spinner respects prefers-reduced-motion', anim == 'spinner-pulse', anim)
    ctx.close()


# ============================================================
# GROUP 7 — RESPONSIVE LAYOUT
# ============================================================

def test_responsive(browser, base):
    R.group('responsive — layout at four widths')

    for page in PAGES:
        problems = []
        for vname, w, h in VIEWPORTS:
            ctx, pg = new_page(browser, w, h)
            stub_formspree(pg)
            pg.goto(base + '/' + page)
            if page == 'learn.html':
                pg.wait_for_selector('.phase-card', timeout=10000)
            pg.wait_for_timeout(250)
            d = pg.evaluate("""() => ({
                scrollW: document.documentElement.scrollWidth,
                clientW: document.documentElement.clientWidth,
                offenders: [...document.querySelectorAll('*')]
                    .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
                    .slice(0, 3)
                    .map(el => el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.trim().split(/\\s+/)[0] : ''))
            })""")
            if d['scrollW'] > d['clientW'] + 1:
                problems.append('%s(%dpx): %s' % (vname, w, d['offenders']))
            ctx.close()
        R.check('%s has no horizontal overflow at any width' % page, not problems, problems)

    R.group('responsive — mobile input behaviour')

    ctx, pg = new_page(browser, 390, 844, is_mobile=True, has_touch=True)
    stub_formspree(pg)
    pg.goto(base + '/contact.html')
    sizes = pg.evaluate("""() => ['name','email','message','role'].map(id => {
        const el = document.getElementById(id);
        return { id, px: parseFloat(getComputedStyle(el).fontSize) };
    })""")
    too_small = [s for s in sizes if s['px'] < 16]
    # iOS Safari zooms the whole page when a focused field is under 16px, which
    # yanks the layout around on every tap. This is the single most common
    # mobile form defect and is invisible on a desktop browser.
    R.check('all form fields are >= 16px (prevents iOS auto-zoom)',
            not too_small, too_small)

    tap = pg.evaluate("""() => [...document.querySelectorAll('.nav-link, .btn')].map(el => {
        const r = el.getBoundingClientRect();
        return { t: el.textContent.trim().slice(0,18), h: Math.round(r.height) };
    }).filter(x => x.h > 0 && x.h < 24)""")
    R.check('interactive targets are a usable height', not tap, tap)
    ctx.close()

    # 200% zoom equivalent — WCAG 1.4.4 requires content to stay usable.
    ctx, pg = new_page(browser, 640, 480)
    for page in PAGES:
        pg.goto(base + '/' + page)
        if page == 'learn.html':
            pg.wait_for_selector('.phase-card', timeout=10000)
        pg.wait_for_timeout(200)
        ok = pg.evaluate('() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')
        R.check('%s usable at 200%% zoom equivalent' % page, ok)
    ctx.close()


# ============================================================
# ENTRY POINT
# ============================================================

def main():
    # The site's text contains characters outside the Windows default console
    # encoding (cp1252) — the § clause symbol, the ✓ and ✗ in quiz feedback, em
    # dashes. Printing those to an unconfigured Windows console raises
    # UnicodeEncodeError and aborts the run, which looks like a test failure but
    # is really just the terminal. Forcing UTF-8 with errors='replace' means the
    # worst case is a substituted character in a label, never a crash.
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, OSError):
        pass  # older Python, or a stream that cannot be reconfigured

    ap = argparse.ArgumentParser(description='Test suite for the IEC 62304 training site.')
    ap.add_argument('--headed', action='store_true', help='show the browser while testing')
    ap.add_argument('--group', choices=GROUPS, action='append',
                    help='run only these groups (repeatable)')
    args = ap.parse_args()
    groups = args.group or GROUPS

    print('=' * 72)
    print('IEC 62304 TRAINING SITE — TEST SUITE')
    print('=' * 72)
    print('Serving from : %s' % ROOT)

    httpd, base = start_server()
    print('Test server  : %s' % base)
    print('Groups       : %s' % ', '.join(groups))

    axe_src = fetch_axe() if 'a11y' in groups else None

    try:
        with sync_playwright() as p:
            browser = launch_browser(p, headed=args.headed)
            try:
                if 'data' in groups:
                    test_data()
                if 'applicability' in groups:
                    test_applicability(browser, base)
                if 'deliverables' in groups:
                    test_deliverables(browser, base)
                if 'learn' in groups:
                    test_learn(browser, base)
                if 'quiz' in groups:
                    test_quiz(browser, base)
                if 'contact' in groups:
                    test_contact(browser, base)
                if 'privacy' in groups:
                    test_privacy(browser, base)
                if 'version' in groups:
                    test_version(browser, base)
                if 'a11y' in groups:
                    test_a11y(browser, base, axe_src)
                if 'responsive' in groups:
                    test_responsive(browser, base)
            finally:
                browser.close()
    finally:
        httpd.shutdown()

    return R.report()


if __name__ == '__main__':
    sys.exit(main())
