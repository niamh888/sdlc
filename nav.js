document.addEventListener('DOMContentLoaded', function () {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.nav-link').forEach(function (link) {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
      // aria-current="page" tells screen readers which link is the current page.
      link.setAttribute('aria-current', 'page');
    }
  });

  // ============================================================
  // MOBILE NAV TOGGLE (hamburger)
  //
  // Below the 768px breakpoint (see .nav-toggle / .site-nav.nav-open in
  // style.css), #site-nav starts collapsed and #nav-toggle is the only way
  // to reach it. Above that breakpoint the toggle is display:none and
  // .site-nav is always the ordinary visible row it always was — none of
  // this code changes that, since .nav-open only ever matters where the CSS
  // gives it something to do.
  // ============================================================
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');

  if (toggle && nav) {
    const isOpen = function () {
      return nav.classList.contains('nav-open');
    };

    const closeMenu = function () {
      nav.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = function () {
      nav.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', function () {
      if (isOpen()) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Escape closes the menu and returns focus to the button that opened
    // it — the same pattern a native <dialog> gives you for free, worth
    // doing by hand here since this is a plain <nav>, not a dialog.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        closeMenu();
        toggle.focus();
      }
    });

    // A tap anywhere outside the open menu (or its own toggle button)
    // closes it — the behaviour every native mobile menu has trained
    // people to expect. Checked on the open state first so this listener
    // costs nothing on every other click across the site.
    document.addEventListener('click', function (e) {
      if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) {
        closeMenu();
      }
    });

    // If the viewport crosses back above the breakpoint while the menu is
    // open — rotating a tablet, or a desktop window resized down and back
    // up — drop the open state. Without this, .nav-open would sit inert in
    // the class list and reappear the next time the window narrows, open
    // when the visitor never asked for it this time.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768 && isOpen()) closeMenu();
    });
  }
});
