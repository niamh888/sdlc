# Database Entity-Relationship Diagram

Every table this project's backend owns, and how they relate — generated
directly from the SQLAlchemy models in [`app/models.py`](app/models.py), not
drawn separately by hand. That matters for the same reason
[`tests/capture_backend_screenshots.py`](../tests/capture_backend_screenshots.py)
photographs the real running site instead of a mockup: a hand-drawn diagram
can silently drift out of sync with the actual schema the moment a column
changes, and nothing would ever say so. This one is checked against the real
models below.

```mermaid
erDiagram
    USERS ||--o{ QUIZ_ATTEMPTS : "takes"
    USERS ||--o{ COURSE_REVIEWS : "writes"
    COURSES ||--o{ COURSE_VERSIONS : "has"
    COURSES ||--o{ COURSE_REVIEWS : "is reviewed via"
    COURSE_VERSIONS ||--o{ QUIZ_QUESTIONS : "contains"
    COURSE_VERSIONS ||--o{ QUIZ_ATTEMPTS : "attempted against"
    QUIZ_ATTEMPTS ||--o{ QUIZ_ATTEMPT_ANSWERS : "breaks down into"
    QUIZ_QUESTIONS ||--o{ QUIZ_ATTEMPT_ANSWERS : "answered by"

    USERS {
        string id PK
        string email UK
        string password_hash
        string full_name
        datetime created_at
    }

    COURSES {
        string id PK
        string slug UK
        string title
        string description
        datetime created_at
    }

    COURSE_VERSIONS {
        string id PK
        string course_id FK
        string version_label
        boolean is_current
        date effective_date
        datetime created_at
    }

    QUIZ_QUESTIONS {
        string id PK
        string course_version_id FK
        string level
        text question
        json options
        int correct_index
        text explanation
        int sort_order
        datetime created_at
    }

    QUIZ_ATTEMPTS {
        string id PK "client-generated — see note below"
        string user_id FK
        string course_version_id FK
        string level
        string participant_name
        int score
        int total
        int pct
        boolean passed
        datetime started_at
        datetime completed_at
    }

    QUIZ_ATTEMPT_ANSWERS {
        string id PK
        string attempt_id FK
        string question_id FK
        int selected_index
        boolean correct
    }

    COURSE_REVIEWS {
        string id PK
        string user_id FK
        string course_id FK
        string participant_name
        int rating
        text comment
        string status
        datetime created_at
    }
```

GitHub renders the block above as an actual diagram wherever this file is
viewed on github.com — nothing to install or export separately.

## Notes that don't fit in a box

**IDs are plain strings, not a dedicated UUID column type.** Every `PK`/`FK`
above is a `String(36)` holding a UUID's canonical text form, not
SQLAlchemy's own `Uuid` type. That type expects real `uuid.UUID` Python
objects and broke the moment a plain string reached it (this project's own
fixed seed IDs, for one) — see the comment at the top of `app/models.py` for
the full story. Functionally this changes nothing; every id is still
globally unique and still validated as a real UUID at the API boundary by
Pydantic (`app/schemas.py`) — only the database column's own type is
simpler than the "obvious" choice.

**`QUIZ_ATTEMPTS.id` is usually chosen by the browser, not the database.**
`quiz.js` generates it via `crypto.randomUUID()` the moment the quiz starts,
specifically so a certificate can display a real, working Certificate ID
the instant someone passes — before the save to this table has even begun,
let alone finished. `POST /attempts` accepts that id rather than generating
its own. See the long comment on `quizState.attemptId` in `quiz.js`.

**`QUIZ_ATTEMPT_ANSWERS` exists but nothing writes to it yet.** Modelled for
parity with the original design (and to leave room for a future "review your
answers" feature) but deliberately left unwired — grading has always
happened entirely client-side in `quiz.js`, and only the final score is
saved today.

**No foreign key back from `COURSE_REVIEWS`/`QUIZ_ATTEMPTS` enforces "one
course" as a business rule** — `course_id` and `course_version_id` are real,
enforced foreign keys, but the schema itself allows any number of courses
and versions. Right now exactly one of each exists (seeded by
[`seed.py`](seed.py)); the shape was kept general on purpose, the same
reasoning `supabase/schema.sql`'s own comments gave for the equivalent
tables before this backend replaced it.

**Row Level Security is gone, and that is a real trade-off, not a wash.**
The Supabase-era schema (`supabase/schema.sql`) enforced "a user may only
read their own attempts" as a database policy — impossible to bypass even
by a buggy query. This backend enforces the same rule in Python instead
(every route in `app/routers/` that touches another user's data filters
explicitly by `current_user.id`), which works, but means each route has to
get its own filtering right rather than being unable to get it wrong. See
the comment at the top of `app/models.py` for the full reasoning.
