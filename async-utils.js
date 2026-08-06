// ============================================================
// async-utils.js  —  Shared asynchronous helpers
// Loaded before learn.js, quiz.js and contact.js on every page.
// ============================================================
//
// ---------------------------------------------------------------
// WHAT "ASYNCHRONOUS" MEANS
// ---------------------------------------------------------------
// JavaScript in a browser runs on a SINGLE thread. Think of it as one
// shop assistant serving one queue. While that assistant is busy, nobody
// else gets served — the page cannot redraw, buttons cannot respond,
// scrolling stutters. A frozen page is almost always a single thread
// stuck doing one long job.
//
// Most slow jobs, though, are not the assistant WORKING. They are the
// assistant WAITING — waiting for a file to arrive over the network,
// waiting for a timer, waiting for a server to reply. It would be
// wasteful to stand still during that wait.
//
// So JavaScript splits slow jobs into two halves:
//   1. "Start the job"  — happens immediately, takes almost no time.
//   2. "Here's what to do when it finishes" — happens later.
// In between, the assistant is free to serve everyone else. That is all
// asynchronous means: START NOW, FINISH LATER, DON'T BLOCK THE QUEUE.
//
// ---------------------------------------------------------------
// THREE GENERATIONS OF THE SAME IDEA
// ---------------------------------------------------------------
// 1. CALLBACKS (oldest). You hand over a function to be called later:
//
//        button.addEventListener('click', doSomething);
//        setInterval(tick, 1000);
//
//    The rest of this site already uses this style — every event listener
//    is a callback. It works, but nesting callbacks inside callbacks
//    inside callbacks becomes unreadable ("callback hell"), and errors are
//    awkward to catch because there is no single place to put a try/catch.
//
// 2. PROMISES (2015). A Promise is an OBJECT representing a result that
//    does not exist yet — a receipt, or a tracking number. You get it
//    instantly; the goods come later. Every Promise is in one of three
//    states, and once it leaves "pending" it can never change again:
//
//        pending    → still waiting
//        fulfilled  → succeeded, and carries a value
//        rejected   → failed, and carries an error
//
//    You attach follow-up work with .then() and handle failure with
//    .catch():
//
//        fetch('data/phases.json')
//          .then(response => response.json())
//          .then(data => render(data))
//          .catch(error => showError(error));
//
// 3. ASYNC / AWAIT (2017). Not a new mechanism — just nicer SYNTAX for
//    Promises, the way a shortcut is not a new place. Two keywords:
//
//    * `async` before a function does two things: it lets you use `await`
//      inside, and it makes the function always return a Promise. Even
//      `async function f() { return 1; }` returns a Promise of 1, not 1.
//
//    * `await` before a Promise means "pause THIS function here until the
//      Promise settles, then give me its value". Crucially it pauses only
//      that one function — the browser carries on serving everything else.
//      It is a polite pause, not a freeze.
//
//    The same code as above, rewritten:
//
//        async function load() {
//          try {
//            const response = await fetch('data/phases.json');
//            const data = await response.json();
//            render(data);
//          } catch (error) {
//            showError(error);
//          }
//        }
//
//    It reads top-to-bottom like ordinary synchronous code, and ordinary
//    try/catch works again. That readability is the whole point.
//
// ---------------------------------------------------------------
// THE RULE WORTH MEMORISING
// ---------------------------------------------------------------
// Every asynchronous operation has THREE possible states, and a good user
// interface shows all three:
//
//        LOADING  — tell the user something is happening
//        SUCCESS  — show the result
//        FAILURE  — say what went wrong and what to do about it
//
// Beginners build only the success path, then wonder why their page looks
// broken on a slow or flaky connection. Both helpers below exist to make
// all three states easy to handle properly.
// ============================================================


// ---------- DELAY ----------
// Turns setTimeout (a callback API) into a Promise (an awaitable one).
// This pattern is called "promisifying" and it is worth understanding,
// because it shows what a Promise actually IS underneath the syntax.
//
// `new Promise(...)` takes a function, and hands that function two of its
// own functions to call: `resolve` (succeeded, here is the value) and
// `reject` (failed, here is the error). We ignore `reject` because a
// timer cannot really fail. We simply pass `resolve` to setTimeout, so
// when the time is up, setTimeout calls resolve, and the Promise becomes
// fulfilled — which is exactly what any `await` on it was waiting for.
//
// Usage:  await delay(100);   // pause 100ms without blocking the page
function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}


// ---------- FETCH JSON ----------
// Loads a .json file from the server and returns the parsed data.
//
// `fetch()` is the browser's built-in way to request a file over the
// network. It returns a Promise, so it is awaitable.
//
// There are TWO separate waits here, which is why there are two awaits:
//   1. await fetch(...)         — waits for the response HEADERS to arrive
//                                 (status code, content type, and so on)
//   2. await response.json()    — waits for the response BODY to finish
//                                 downloading, then parses it into a real
//                                 JavaScript array or object
//
// THE CLASSIC FETCH TRAP
// A fetch Promise only REJECTS when the request could not be made at all —
// no network, DNS failure, blocked by the browser. A 404 (file not found)
// or a 500 (server error) is, as far as fetch is concerned, a perfectly
// successful round trip: you asked a question and got an answer, and the
// answer happened to be "no". So a 404 does NOT throw. If you forget to
// check `response.ok`, you will sail straight into response.json(), fail
// to parse the server's HTML error page, and get a confusing syntax error
// far away from the real cause. The `if (!response.ok)` below is what
// turns that quiet failure into a loud, clearly-worded one.
//
// This function deliberately does NOT catch its own errors. It lets them
// propagate to the caller, because only the caller knows how to show a
// message in the right place on the page. Catching an error where you
// cannot do anything useful about it just hides the problem.
async function fetchJSON(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (networkError) {
    // We reach here when the request never completed. By far the most
    // common cause during development is opening the page by
    // double-clicking the .html file, which loads it over the file://
    // protocol. Browsers block fetch on file:// for security reasons
    // (a downloaded page could otherwise read your local documents), so
    // we detect that case and explain the fix rather than showing a bare
    // "Failed to fetch", which tells a learner nothing.
    if (window.location.protocol === 'file:') {
      throw new Error(
        'This page needs to be served over HTTP. Browsers block loading ' +
        'local data files when a page is opened directly from disk. ' +
        'Run "python -m http.server" in the project folder and visit ' +
        'http://localhost:8000 instead. See the README for details.'
      );
    }
    throw new Error('Network error while loading ' + url + '. Check your connection and try again.');
  }

  // The request succeeded, but did the server actually give us the file?
  if (!response.ok) {
    throw new Error('Could not load ' + url + ' (HTTP ' + response.status + ' ' + response.statusText + ').');
  }

  // Second wait: download and parse the body. This throws a SyntaxError if
  // the file contains malformed JSON — e.g. a trailing comma, which JSON
  // forbids even though JavaScript allows it. We rewrap it so the message
  // names the file at fault.
  try {
    return await response.json();
  } catch (parseError) {
    throw new Error(url + ' is not valid JSON. Check for a trailing comma or a missing quote.');
  }
}
