# `docs/` — the thinking behind the app

Decisions that shape the product but aren't visible in the code. Four documents,
each answering a different question. They are stubs; fill them in as the
decisions get made, and keep them current — a stale spec is worse than none,
because people trust it.

| File                     | Answers                                        |
| ------------------------ | ---------------------------------------------- |
| `design-brief.md`        | Who is this for, and what makes it good?       |
| `user-flows.md`          | What does someone actually do, start to end?   |
| `interaction-spec.md`    | How does it behave — states, motion, keyboard? |
| `api-contract.md`        | What data crosses the boundary, in what shape? |

## Why these live in the repo

They sit next to the code so they change in the same pull request as the code
they describe. A design decision that only exists in a chat thread or a Figma
comment is a decision that gets silently reversed six weeks later.

`api-contract.md` has a second job: it is the shared reference between this app
and whoever provides the data. When it disagrees with the Zod schemas in
[`src/lib/api/`](../src/lib/api/README.md), the schemas win — they are the thing
that actually runs — and the doc gets fixed.
