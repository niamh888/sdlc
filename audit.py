"""Temporary responsive + accessibility audit."""
import json
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8767'
AXE = open('/tmp/axe.min.js', encoding='utf-8').read()
PAGES = ['index.html', 'learn.html', 'quiz.html', 'contact.html', 'privacy.html']
VIEWPORTS = [('desktop', 1280, 900), ('tablet', 768, 900), ('mobile', 480, 800), ('small', 360, 740)]

overflow_problems = []
axe_violations = []
misc = []


def run_axe(pg, label):
    pg.add_script_tag(content=AXE)
    result = pg.evaluate("""async () => {
        const r = await axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice'] }
        });
        return r.violations.map(v => ({
          id: v.id, impact: v.impact, help: v.help,
          nodes: v.nodes.slice(0,4).map(n => ({ target: n.target.join(' '), summary: (n.failureSummary||'').slice(0,220) }))
        }));
    }""")
    for v in result:
        axe_violations.append((label, v))
    return result


with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')

    # ---------- 1. RESPONSIVE: horizontal overflow ----------
    print('=' * 70)
    print('RESPONSIVE — checking for horizontal overflow at four widths')
    print('=' * 70)
    for page in PAGES:
        for vname, w, h in VIEWPORTS:
            ctx = b.new_context(viewport={'width': w, 'height': h})
            pg = ctx.new_page()
            pg.goto(BASE + '/' + page)
            if page == 'learn.html':
                pg.wait_for_selector('.phase-card', timeout=8000)
            pg.wait_for_timeout(300)
            data = pg.evaluate("""() => ({
                scrollW: document.documentElement.scrollWidth,
                clientW: document.documentElement.clientWidth,
                offenders: [...document.querySelectorAll('*')]
                    .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
                    .slice(0, 5)
                    .map(el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : ''))
            })""")
            over = data['scrollW'] > data['clientW'] + 1
            status = 'OVERFLOW' if over else 'ok'
            if over:
                overflow_problems.append((page, vname, data))
                print('  %-14s %-8s %s  scrollW=%d clientW=%d  %s'
                      % (page, vname, status, data['scrollW'], data['clientW'], data['offenders']))
            ctx.close()
    if not overflow_problems:
        print('  No horizontal overflow on any page at 1280 / 768 / 480 / 360px.')

    # ---------- 2. AXE ON EACH PAGE (default state) ----------
    print()
    print('=' * 70)
    print('ACCESSIBILITY — axe-core, WCAG 2.1 A/AA + best practice')
    print('=' * 70)
    for page in PAGES:
        ctx = b.new_context(viewport={'width': 1280, 'height': 900})
        pg = ctx.new_page()
        pg.goto(BASE + '/' + page)
        if page == 'learn.html':
            pg.wait_for_selector('.phase-card', timeout=8000)
        pg.wait_for_timeout(400)
        v = run_axe(pg, page)
        print('  %-14s %d violation(s)' % (page, len(v)))
        for item in v:
            print('     [%s] %s — %s' % (item['impact'], item['id'], item['help']))
            for n in item['nodes']:
                print('        %s' % n['target'])
        ctx.close()

    # ---------- 3. AXE ON THE NEW ASYNC STATES ----------
    print()
    print('=' * 70)
    print('ACCESSIBILITY — the new async states (loading / error / mid-quiz)')
    print('=' * 70)

    # learn: loading spinner
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    pg.route('**/data/phases.json', lambda r: r.abort())
    pg.goto(BASE + '/learn.html'); pg.wait_for_timeout(600)
    pg.evaluate("""() => { document.getElementById('phases-error').classList.add('hidden');
                           document.getElementById('phases-status').classList.remove('hidden'); }""")
    v = run_axe(pg, 'learn loading state')
    print('  learn loading spinner   %d violation(s)' % len(v))
    for i in v: print('     [%s] %s — %s' % (i['impact'], i['id'], i['help']))
    ctx.close()

    # learn: error panel
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    pg.route('**/data/phases.json', lambda r: r.fulfill(status=503, body='x'))
    pg.goto(BASE + '/learn.html'); pg.wait_for_selector('#phases-error:not(.hidden)', timeout=8000)
    v = run_axe(pg, 'learn error state')
    print('  learn error panel       %d violation(s)' % len(v))
    for i in v: print('     [%s] %s — %s' % (i['impact'], i['id'], i['help']))
    ctx.close()

    # learn: expanded card
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    pg.goto(BASE + '/learn.html'); pg.wait_for_selector('.phase-card', timeout=8000)
    pg.locator('.phase-header').first.click(); pg.wait_for_timeout(300)
    v = run_axe(pg, 'learn expanded card')
    print('  learn expanded card     %d violation(s)' % len(v))
    for i in v: print('     [%s] %s — %s' % (i['impact'], i['id'], i['help']))
    ctx.close()

    # quiz: mid question + feedback
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    pg.goto(BASE + '/quiz.html')
    pg.fill('#participant-name', 'Audit'); pg.locator('#begin-quiz').click()
    pg.wait_for_selector('#quiz-active.active', timeout=8000)
    v = run_axe(pg, 'quiz question')
    print('  quiz active question    %d violation(s)' % len(v))
    for i in v: print('     [%s] %s — %s' % (i['impact'], i['id'], i['help']))
    pg.locator('.option-btn').first.click()
    pg.wait_for_selector('#question-feedback.visible', timeout=5000)
    v = run_axe(pg, 'quiz feedback')
    print('  quiz answer feedback    %d violation(s)' % len(v))
    for i in v: print('     [%s] %s — %s' % (i['impact'], i['id'], i['help']))
    ctx.close()

    # quiz: results screen
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    pg.goto(BASE + '/quiz.html')
    pg.fill('#participant-name', 'Audit'); pg.locator('#begin-quiz').click()
    pg.wait_for_selector('#quiz-active.active', timeout=8000)
    for i in range(15):
        pg.wait_for_selector('.option-btn:not([disabled])', timeout=5000)
        pg.locator('.option-btn').first.click()
        pg.wait_for_selector('#question-feedback.visible', timeout=5000)
        pg.locator('#next-question').click()
    pg.wait_for_selector('#quiz-results.active', timeout=5000)
    v = run_axe(pg, 'quiz results')
    print('  quiz results screen     %d violation(s)' % len(v))
    for i in v: print('     [%s] %s — %s' % (i['impact'], i['id'], i['help']))
    ctx.close()

    # contact: error state + inline field errors
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    pg.route('https://formspree.io/f/mpqgydrv', lambda r: r.fulfill(
        status=422, content_type='application/json',
        body='{"errors":[{"field":"email","message":"is not a valid email"}]}'))
    pg.goto(BASE + '/contact.html')
    pg.fill('#name', 'Audit Tester'); pg.fill('#email', 'a@b.com')
    pg.locator('#message').fill('Accessibility audit of the error state path.')
    pg.locator('#submit-message').click()
    pg.wait_for_selector('#form-error:not(.hidden)', timeout=8000)
    v = run_axe(pg, 'contact error state')
    print('  contact error state     %d violation(s)' % len(v))
    for i in v: print('     [%s] %s — %s' % (i['impact'], i['id'], i['help']))
    ctx.close()

    # ---------- 4. KEYBOARD + FOCUS ----------
    print()
    print('=' * 70)
    print('KEYBOARD & FOCUS')
    print('=' * 70)
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    pg.goto(BASE + '/learn.html'); pg.wait_for_selector('.phase-card', timeout=8000)
    pg.keyboard.press('Tab')
    first = pg.evaluate("() => document.activeElement.className + '|' + document.activeElement.textContent.trim().slice(0,30)")
    misc.append(('first Tab stop is the skip link', 'skip-link' in first, first))
    # visible focus ring?
    ring = pg.evaluate("""() => { const s = getComputedStyle(document.activeElement);
        return s.outlineStyle + ' ' + s.outlineWidth + ' / boxShadow:' + s.boxShadow.slice(0,40); }""")
    misc.append(('focused element has a visible indicator',
                 'none' not in ring.split(' /')[0] or 'rgb' in ring, ring))
    # keyboard expand of a card
    pg.evaluate("() => document.querySelector('.phase-header').focus()")
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(200)
    exp = pg.evaluate("() => document.querySelector('.phase-header').getAttribute('aria-expanded')")
    misc.append(('Enter expands a topic card and updates aria-expanded', exp == 'true', exp))
    pg.keyboard.press('Space'); pg.wait_for_timeout(200)
    exp2 = pg.evaluate("() => document.querySelector('.phase-header').getAttribute('aria-expanded')")
    misc.append(('Space collapses it again', exp2 == 'false', exp2))
    ctx.close()

    # honeypot must be unreachable by keyboard
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    pg.goto(BASE + '/contact.html')
    reachable = pg.evaluate("""() => {
        const h = document.querySelector('input[name=\\"_gotcha\\"]');
        return { tabindex: h.getAttribute('tabindex'), ariaHidden: h.getAttribute('aria-hidden'),
                 display: getComputedStyle(h).display };
    }""")
    misc.append(('honeypot is tabindex=-1', reachable['tabindex'] == '-1', reachable))
    misc.append(('honeypot is aria-hidden', reachable['ariaHidden'] == 'true', reachable))
    misc.append(('honeypot is display:none', reachable['display'] == 'none', reachable))
    ctx.close()

    # reduced motion
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce'); pg = ctx.new_page()
    pg.route('**/data/phases.json', lambda r: r.abort())
    pg.goto(BASE + '/learn.html'); pg.wait_for_timeout(500)
    pg.evaluate("() => { document.getElementById('phases-error').classList.add('hidden'); document.getElementById('phases-status').classList.remove('hidden'); }")
    anim = pg.evaluate("() => getComputedStyle(document.querySelector('.spinner')).animationName")
    misc.append(('spinner respects prefers-reduced-motion (pulse, not rotate)',
                 anim == 'spinner-pulse', anim))
    ctx.close()

    # zoom to 200% (WCAG 1.4.4) — emulate by halving the viewport
    ctx = b.new_context(viewport={'width': 640, 'height': 480}, device_scale_factor=2); pg = ctx.new_page()
    pg.goto(BASE + '/contact.html'); pg.wait_for_timeout(300)
    z = pg.evaluate("() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
    misc.append(('no horizontal scroll at 200% zoom equivalent', z, z))
    ctx.close()

    for label, ok, detail in misc:
        print(('  PASS  ' if ok else '  FAIL  ') + label + ' :: ' + str(detail)[:90])

    b.close()

print()
print('=' * 70)
print('SUMMARY')
print('=' * 70)
print('Horizontal overflow problems : %d' % len(overflow_problems))
print('axe-core violations (total)  : %d' % len(axe_violations))
uniq = {}
for label, v in axe_violations:
    uniq.setdefault(v['id'], []).append(label)
for vid, labels in uniq.items():
    print('   %-32s on: %s' % (vid, ', '.join(sorted(set(labels)))))
print('Keyboard/focus checks failed : %d of %d' % (sum(1 for _, ok, _ in misc if not ok), len(misc)))
