# IEC 62304 SDLC Training

An interactive web-based training course covering the IEC 62304 medical device software development lifecycle standard.

## Live Site

Hosted on GitHub Pages: [https://niamh888.github.io/sdlc/](https://niamh888.github.io/sdlc/)

## Project Overview

This course is designed for software developers, quality engineers, and regulatory affairs professionals working on medical device software. It covers the 13 process areas defined in IEC 62304:2006+AMD1:2015 across Clauses 4–9.

## Features

- **Home page** — Introduction to IEC 62304 with key statistics
- **Learn page** — 13 expandable topic cards covering Clauses 4–9, rendered from a JavaScript data array; toggle between Introductory and Advanced depth; filter by safety class (A/B/C); study progress tracker
- **Quiz page** — 15 randomised multiple-choice questions with a per-question countdown timer, immediate feedback, and a pass/fail results screen; 80% pass mark earns a downloadable certificate that reflects the training level completed
- **Contact page** — Feedback form with real-time client-side validation (no page reload)

## Files

| File | Purpose |
|---|---|
| `index.html` | Home page |
| `learn.html` | Lifecycle process area cards |
| `quiz.html` | Timed knowledge assessment |
| `contact.html` | Feedback and contact form |
| `style.css` | Shared CSS — professional medical theme, responsive layout |
| `nav.js` | Shared navigation — highlights active page link |
| `learn.js` | Topic card rendering, expand/collapse, introductory/advanced level toggle, safety class filter, progress tracking |
| `quiz.js` | Quiz engine — shuffle, timer, scoring, results |
| `contact.js` | Form validation and submission handling |

## Accessing the Hosted Project

Open [https://niamh888.github.io/sdlc/](https://niamh888.github.io/sdlc/) in any modern browser. No installation required.

To run locally, clone the repository and open `index.html` in a browser.

## Standard Covered

IEC 62304:2006 + Amendment 1:2015 — Medical device software — Software life cycle processes
