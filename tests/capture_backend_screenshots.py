#!/usr/bin/env python3
"""
============================================================
 capture_backend_screenshots.py — README screenshots for the
 database-backed features (accounts, quiz saving, certificates, reviews)
============================================================

WHY THIS IS SEPARATE FROM capture_screenshots.py
That script photographs the static content (Learn, the quiz UI itself,
Contact, Privacy) using nothing but a plain file server — no account, no
database, nothing to set up first. Everything this script photographs only
exists once a real signed-in account, a real saved quiz attempt, and a real
backend are involved, which means this script has a genuinely different job:
before it can take a single picture, it has to stand up a whole disposable
backend of its own.

WHY A DISPOSABLE DATABASE, NOT THE REAL ONE
This script signs up test accounts, sits the quiz, leaves a review, and
approves it — real writes, every run. Pointing that at the real Neon
database would leave a trail of "Ada Lovelace"-style fake accounts and
reviews in the actual production data every time someone regenerates the
README's screenshots. Instead it creates a throwaway SQLite file in a temp
directory, runs the real migration and seed script against THAT, and deletes
it afterwards — same backend code, same schema, zero footprint on the real
database.

HOW TO RUN IT
    python tests/capture_backend_screenshots.py

Needs the backend's own virtual environment already set up once (see
backend/README.md) — this script runs alembic/seed.py/uvicorn using that
venv's Python, not the one it's invoked with itself.
============================================================
"""

import functools
import http.server
import os
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit('Playwright is not installed. Run:\n'
             '    pip install -r tests/requirements.txt\n'
             '    python -m playwright install chromium')

ROOT = os.path.dirname(os.path.abspath(os.path.join(__file__, '..')))
BACKEND_DIR = os.path.join(ROOT, 'backend')
VENV_PYTHON = os.path.join(BACKEND_DIR, 'venv', 'Scripts', 'python.exe')
OUT = os.path.join(ROOT, 'docs', 'assets', 'screenshots')
VIEWPORT = {'width': 1280, 'height': 900}

# Fixed, not ephemeral, ports — CORS_ORIGINS has to name the frontend's exact
# origin (see backend/app/config.py), which is only possible to pin down
# ahead of time if the frontend's port is itself fixed for this run.
# BACKEND_PORT is not just "a" fixed port — it MUST be 8001, because
# api-config.js hardcodes that exact port for local traffic (see its own
# comment); any other port here means every API call silently fails.
FRONTEND_PORT = 8175
BACKEND_PORT = 8001
FRONTEND_BASE = 'http://127.0.0.1:%d' % FRONTEND_PORT
BACKEND_BASE = 'http://127.0.0.1:%d' % BACKEND_PORT


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def start_frontend_server():
    handler = functools.partial(QuietHandler, directory=ROOT)
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', FRONTEND_PORT), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def start_backend(tmp_dir):
    """Runs the real migration + seed script against a fresh SQLite file in
    tmp_dir, then starts uvicorn pointed at it. Returns (process, admin_password)
    so the caller can log into /admin with it."""
    db_path = os.path.join(tmp_dir, 'screenshot.db').replace('\\', '/')
    admin_password = 'screenshot-run-admin-password'

    env = dict(os.environ)
    env.update({
        'DATABASE_URL': 'sqlite:///%s' % db_path,
        'JWT_SECRET': 'screenshot-run-jwt-secret-not-used-anywhere-real',
        'ADMIN_USERNAME': 'admin',
        'ADMIN_PASSWORD': admin_password,
        'SESSION_SECRET': 'screenshot-run-session-secret-not-used-anywhere-real',
        'CORS_ORIGINS': FRONTEND_BASE,
    })

    print('Setting up a throwaway database for this run...')
    subprocess.run([VENV_PYTHON, '-m', 'alembic', 'upgrade', 'head'],
                    cwd=BACKEND_DIR, env=env, check=True)
    subprocess.run([VENV_PYTHON, 'seed.py'], cwd=BACKEND_DIR, env=env, check=True)

    print('Starting the backend on %s ...' % BACKEND_BASE)
    process = subprocess.Popen(
        [VENV_PYTHON, '-m', 'uvicorn', 'app.main:app', '--port', str(BACKEND_PORT)],
        cwd=BACKEND_DIR, env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )

    for _ in range(60):
        try:
            urllib.request.urlopen(BACKEND_BASE + '/health', timeout=1)
            break
        except (urllib.error.URLError, ConnectionError):
            time.sleep(0.5)
    else:
        process.terminate()
        sys.exit('Backend never came up on %s' % BACKEND_BASE)

    return process, admin_password


def launch_browser(p):
    try:
        return p.chromium.launch()
    except Exception:
        return p.chromium.launch(channel='chrome')


def new_page(browser, scheme=None, viewport=None):
    ctx = browser.new_context(viewport=viewport or VIEWPORT, color_scheme=scheme)
    return ctx, ctx.new_page()


def shoot(pg, name):
    path = os.path.join(OUT, name + '.png')
    pg.screenshot(path=path)
    print('  wrote %s' % os.path.relpath(path, ROOT))


def sign_up(pg, email, name):
    pg.goto(FRONTEND_BASE + '/login.html')
    pg.click('#tab-signup')
    pg.fill('#signup-name', name)
    pg.fill('#signup-email', email)
    pg.fill('#signup-password', 'password123')
    pg.fill('#signup-password-confirm', 'password123')
    pg.click('#signup-submit')
    pg.wait_for_url(FRONTEND_BASE + '/index.html', timeout=15000)
    pg.wait_for_timeout(300)


def sit_quiz(pg, all_correct=True):
    pg.goto(FRONTEND_BASE + '/quiz.html')
    pg.wait_for_timeout(600)  # let quiz.js's own DOMContentLoaded settle first
    pg.click('#begin-quiz')
    pg.wait_for_selector('#quiz-active.active', timeout=15000)
    for _ in range(15):
        pg.wait_for_selector('.option-btn', timeout=15000)
        if all_correct:
            idx = pg.evaluate("quizState.shuffled[quizState.currentIndex].correct_index")
        else:
            correct = pg.evaluate("quizState.shuffled[quizState.currentIndex].correct_index")
            idx = (correct + 1) % 4
        pg.query_selector_all('.option-btn')[idx].click()
        pg.wait_for_selector('#next-question:not([disabled])', timeout=15000)
        pg.click('#next-question')
        pg.wait_for_timeout(100)
    pg.wait_for_selector('#quiz-results.active', timeout=15000)
    pg.wait_for_timeout(1200)  # let the background save to the API finish


def admin_login(pg, password):
    pg.goto(BACKEND_BASE + '/admin/login')
    pg.fill('input[name="username"]', 'admin')
    pg.fill('input[name="password"]', password)
    pg.click('button[type="submit"]')
    pg.wait_for_load_state('networkidle')


def main():
    os.makedirs(OUT, exist_ok=True)
    tmp_dir = tempfile.mkdtemp(prefix='sdlc_screenshot_db_')
    httpd = start_frontend_server()
    print('Serving frontend at %s' % FRONTEND_BASE)

    backend_process, admin_password = start_backend(tmp_dir)

    try:
        with sync_playwright() as p:
            browser = launch_browser(p)
            try:
                # ---- Log in / Sign up ----
                for scheme, suffix in [('light', 'light'), ('dark', 'dark')]:
                    ctx, pg = new_page(browser, scheme)
                    pg.goto(FRONTEND_BASE + '/login.html')
                    pg.wait_for_timeout(200)
                    shoot(pg, 'login-light' if suffix == 'light' else 'login-dark')
                    ctx.close()

                ctx, pg = new_page(browser, 'light')
                pg.goto(FRONTEND_BASE + '/login.html')
                pg.click('#tab-signup')
                pg.wait_for_timeout(200)
                shoot(pg, 'login-signup-light')
                ctx.close()

                # ---- Quiz: signed-out gate ----
                ctx, pg = new_page(browser, 'light')
                pg.goto(FRONTEND_BASE + '/quiz.html')
                pg.wait_for_timeout(300)
                shoot(pg, 'quiz-auth-required-light')
                ctx.close()

                # ---- Main walkthrough account: sign up, pass, certificate ----
                ctx, pg = new_page(browser, 'light')
                sign_up(pg, 'demo-learner@example.com', 'Ada Lovelace')

                # Nav showing the signed-in state + "My Results" link.
                pg.wait_for_timeout(300)
                shoot(pg, 'nav-signed-in-light')

                sit_quiz(pg, all_correct=True)
                shoot(pg, 'quiz-results-pass-light')

                # The certificate itself — print-media emulation, same
                # technique used to preview it earlier in this project.
                pg.emulate_media(media='print')
                pg.wait_for_timeout(200)
                pg.locator('#certificate').screenshot(path=os.path.join(OUT, 'certificate-light.png'))
                print('  wrote docs/assets/screenshots/certificate-light.png')
                pg.emulate_media(media='screen')  # media=None leaves 'print' in effect in this Playwright version

                cert_id = pg.evaluate("document.getElementById('cert-id').textContent")

                # ---- My Results ----
                pg.goto(FRONTEND_BASE + '/my-results.html')
                pg.wait_for_timeout(1000)
                shoot(pg, 'my-results-light')

                # ---- Verify a Certificate ----
                pg.click('#nav-logout-btn')
                pg.wait_for_timeout(300)
                pg.goto(FRONTEND_BASE + '/verify.html')
                pg.fill('#verify-id', cert_id)
                pg.click('#verify-submit')
                pg.wait_for_timeout(1000)
                shoot(pg, 'verify-found-light')

                pg.fill('#verify-id', '00000000-0000-0000-0000-000000000000')
                pg.click('#verify-submit')
                pg.wait_for_timeout(1000)
                shoot(pg, 'verify-not-found-light')
                ctx.close()

                # ---- Reviews: signed-out prompt ----
                ctx, pg = new_page(browser, 'light')
                pg.goto(FRONTEND_BASE + '/index.html')
                pg.wait_for_timeout(600)
                pg.evaluate("() => document.querySelector('.reviews-section').scrollIntoView({block: 'start'})")
                pg.wait_for_timeout(150)
                shoot(pg, 'reviews-signed-out-light')
                ctx.close()

                # ---- Reviews: submit, approve via admin, see it approved ----
                ctx, pg = new_page(browser, 'light')
                sign_up(pg, 'demo-reviewer@example.com', 'Grace Hopper')
                pg.goto(FRONTEND_BASE + '/index.html')
                pg.wait_for_timeout(600)
                pg.click("label[for='review-star5']")
                pg.fill('#review-comment', 'Clear, practical, and genuinely useful for real audits.')
                pg.click('#review-submit')
                pg.wait_for_timeout(800)
                pg.evaluate("() => document.querySelector('.reviews-section').scrollIntoView({block: 'start'})")
                pg.wait_for_timeout(150)
                shoot(pg, 'reviews-pending-light')
                ctx.close()

                # ---- Admin: log in, approve that review, list + dropdown ----
                ctx, pg = new_page(browser, 'light')
                admin_login(pg, admin_password)
                pg.goto(BACKEND_BASE + '/admin/course-review/list')
                pg.wait_for_timeout(300)
                shoot(pg, 'admin-reviews-list-light')

                pg.locator('a[href*="/course-review/edit/"]').first.click()
                pg.wait_for_timeout(300)
                shoot(pg, 'admin-review-edit-light')

                pg.select_option('#status', 'approved')
                # Not `pg.click('button:has-text("Save")')` — that also
                # matches "Save and continue editing" (a substring match),
                # so Playwright's strict mode has two candidates and never
                # resolves. Submitting the form directly sidesteps the
                # ambiguity entirely.
                pg.locator('form').first.evaluate('form => form.submit()')
                pg.wait_for_load_state('networkidle')
                pg.wait_for_timeout(500)
                ctx.close()

                # ---- Reviews: now shows approved, on the home page ----
                ctx, pg = new_page(browser, 'light')
                pg.goto(FRONTEND_BASE + '/index.html')
                pg.wait_for_timeout(600)
                pg.evaluate("() => document.querySelector('.reviews-section').scrollIntoView({block: 'start'})")
                pg.wait_for_timeout(150)
                shoot(pg, 'reviews-approved-light')
                ctx.close()

            finally:
                browser.close()
    finally:
        httpd.shutdown()
        backend_process.terminate()
        backend_process.wait(timeout=10)
        shutil.rmtree(tmp_dir, ignore_errors=True)

    print('Done.')


if __name__ == '__main__':
    main()
