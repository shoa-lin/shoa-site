---
translationKey: "how-we-made-claude-ai-faster"
locale: "en"
title: "How We Made claude.ai 3x Faster in Two Weeks"
description: "In a two-week sprint run from one Slack channel, Claude found bottlenecks, built benchmarks, and shipped more than 3,000 changes that made claude.ai and the desktop app about 3x faster. The key lesson: once Claude can measure something, it can make it faster."
publishedAt: "2026-09-23"
updatedAt: "2026-09-23"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.dev/blog/how-we-made-claude-ai-faster/"
sourceAuthor: "Raymond Wang, Sam Attard, and Issac G."
contentType: "adaptation"
translationStatus: "reviewed"
---

> Adapted from [How we made claude.ai 3x faster in two weeks](https://claude.dev/blog/how-we-made-claude-ai-faster/) by Raymond Wang, Sam Attard, and Issac G., published on September 23, 2026. Charts and videos from the original are summarized in text here; the Slack threads are recreations of real conversations, as in the source.

Once Claude can measure something, it can make it faster. So the team kept finding more things to measure. This is the story of a two-week performance sprint, and of the working loop that let a handful of engineers and Claude ship more than three thousand changes without a single customer-facing incident.

## Introduction

This August, the team made the core user experience of claude.ai and the Claude desktop app about 3x faster in a two-week sprint. Users had been saying it was slow, and they were right. The whole effort ran from a single Slack channel, with Claude in every thread.

They focused on four journeys that make up 95% of user activity. At the 75th percentile:

- Time to a typeable page on a fresh load of claude.ai went from **3.1 seconds to 0.55**.
- Starting a new Claude Code session went from **0.8 seconds to 0.3**.
- Loading a Claude Cowork cloud session went from **2.6 seconds to 0.73**.

In aggregate, the team estimates this saves tens of thousands of user-hours of waiting every day.

> **Figure summary: thirteen before-and-after timings at p75 for real users (August 13 vs. August 27).**
>
> - **Launching the app:** claude.ai web fresh load 3,085 → 550 ms (5.6x, −82%); desktop cold start 6,310 → 3,328 ms (1.9x, −47%).
> - **Starting a conversation:** Chat web 416 → 273 ms (1.5x); Chat desktop 460 → 224 ms (2.1x); Claude Code desktop 837 → 347 ms (2.4x).
> - **Loading a conversation:** Chat web 1,557 → 646 ms (2.4x); Chat desktop 1,353 → 488 ms (2.8x); Claude Cowork desktop/cloud 2,566 → 728 ms (3.5x); Claude Code desktop 545 → 262 ms (2.1x).
> - **Sending a message:** Chat web 180 → 59 ms (3.1x); Chat desktop 140 → 64 ms (2.2x); Claude Cowork desktop/cloud 928 → 48 ms (19x, −95%); Claude Code desktop 250 → 52 ms (4.8x).
>
> Across the thirteen measurements and four journeys, the average speedup was 3.1x (geometric mean).

The work ran on [Claude Tag](https://claude.com/product/tag) (beta), backed by an internal research model roughly comparable to Opus 5.5. Claude found bottlenecks, built benchmarks, shipped improvements, and watched every deploy. The humans steered: they set goals, made tradeoffs, and approved every change. That way they merged more than three thousand changes without a single customer-facing incident or rollback.

## The brief

Before the sprint, the team created a Slack channel with these [standing instructions](https://claude.com/docs/claude-tag/users/getting-started#give-claude-standing-instructions):

> **@Claude** Your job is to facilitate all things related to the performance of the claude.ai website and desktop app. Your responsibilities include monitoring deploys for performance regressions, assessing the accuracy and comprehensiveness of existing telemetry, maintaining well-curated observability dashboards, proactively implementing solutions for observed issues and low-hanging fruit, proposing performance project opportunities, and communicating with your human teammates. […]
>
> The ultimate goal for this channel is for you to become as autonomous as possible, but today we know that isn't yet possible.

Claude analyzed usage data through the Datadog MCP server and identified the four highest-impact journeys: launching the app, starting a conversation, loading an existing conversation, and sending a message. Across web and desktop and across products, that came to thirteen distinct measurements. To set baselines, the team added instrumentation until the measurements were directly comparable: each one started with a user interaction, ended once the result was rendered, and separated client work from server work.

The sprint kicked off with about twenty hand-picked projects, each aimed at a specific journey. Claude estimated each project's impact in milliseconds, and those estimates were added up to set the sprint targets. Some projects were fairly large, but most seemed doable within two weeks.

**Twelve of the thirteen targets were hit by day three.**

The planned projects landed early:

- **Faster launches:** a static composer baked into the HTML so users can start typing while React initializes, plus a precompiled V8 code cache so the desktop shell's main process doesn't recompile from scratch.
- **Faster navigations:** the composer stays mounted between conversations, sessions are prefetched when the user hovers over them, and sidebar re-renders dropped by 90%.

The team had also left room for Claude to spot opportunities and propose new workstreams. Those quickly grew into full projects and blew past the original targets. So new targets were set, and the hunt began for more things to measure:

> **@Claude** we've ended up funding nearly every project in the original projects list and more. let's do a refresh […] what have we not explored, what can we hill climb on, where is the most opportunity at this point? […] i am open to WACKY ideas

## Anything can be hill climbed

From the start, the team wanted to iterate faster than the deploy cadence. Claude could work asynchronously for hours, even overnight, and it needed a way to validate prototypes without waiting for field data. That meant finding other ways to measure performance in the lab.

Sam found the first lead:

> **Recreated from a real conversation — #claude-apps-perf**
>
> **Sam — 12:34 PM:** What can we do instead of wall-clock timing? Can we measure JS instruction counts for instance?
>
> **ClaudeApp — 12:42 PM:** For browser paths there's no instruction counting under Chromium, but there's a ladder of other deterministic counts: React commits per interaction, function call counts from V8's precise coverage, layout and style-recalc counts, DOM mutations. Which do you want first?
>
> **Sam — 12:49 PM:** Let's explore valgrind + `Ir` + `--predictable` in one thread and each of the browser/react benches in new threads. Ping me in all of them. You know what we want. Let's go

Eleven minutes later, five threads were running, each on a different measurement: instruction counts, V8 call counts, React commits, style recalculations, and DOM mutations.

Every new benchmark was treated with some skepticism. Each had two jobs: first, to be a metric Claude could move in the lab; second, to become a CI guardrail whose number could only ratchet down. If a benchmark was flaky, or didn't actually correlate with user latency, it was thrown out rather than letting Claude climb the wrong hill.

> **@Claude** please prove that hill climbing against each of these can result in measurable wall clock perf wins. we'll unship the benches for any candidates that cannot prove that

Wall-clock time is what users feel, but it is noisy, and milliseconds are too flaky to gate CI on. Instruction counts are deterministic, which made them appealing, but Claude still had to prove they tracked wall-clock time.

So Claude was asked to drive the count down on two hot paths: the routine that assembles a conversation's message tree, and a scanner for status lines in Claude Code output. Profiling both with Valgrind, it found that a quarter of the first path's instructions were megamorphic dictionary lookups resolving the same message ID three separate times.

An hour later, it had cut instructions on the two paths by 48% and 31%, and wall-clock time had fallen by 78% and 44%. Two new ratchets were checked in: from then on, any PR that raised the instruction count of those paths failed CI, and a daily job lowered each ceiling whenever the count went down.

> **Figure summary: two hot paths, before and after.**
>
> - **Message-tree assembly:** each message ID resolved once instead of three times; CPU instructions −48%, wall-clock −78%, 4.6x faster.
> - **Status-line scanner:** a cheap first-character check before the regex; CPU instructions −31%, wall-clock −44%, 1.8x faster.
>
> Counts were taken under Valgrind with `node --predictable`; timings on the same benchmark under plain node with the JIT warm.

That led to the central lesson of the sprint: **with Claude, measuring something makes it tractable.**

Measurement used to be step zero: add a metric, wait for data to come in, and only then start to understand the problem. With Claude, it is step one of the climb. As soon as Claude has a number to beat, it can start optimizing. So the highest-leverage thing the team could do was find more things to measure.

## The loop, thread by thread

Everything ran in the same Slack channel, with several engineers and Claude jamming in every thread. The sprint soon settled into a [loop](https://claude.com/blog/getting-started-with-loops):

1. Someone opens a thread about a slow stretch of a journey, often with a screenshot or screen recording.
2. Claude traces the flow, then finds or builds a benchmark that demonstrates the problem.
3. With a promising lab result, Claude comes back with a PR — often several, sized for risk and review, with anything user-visible behind a flag.
4. After it ships, Claude watches the deploy and reads the field data by build and platform.
5. If it got faster, Claude locks in the win by ratcheting the benchmark down; if not, it turns the flag off and iterates.
6. Then it goes looking for the next slow spot in the same journey.

One example: someone shared a screen recording of sidebar rows popping in after the page loaded. Chat and Cowork rows resolved at different times, so the page felt janky. None of the existing monitors caught it. The closest was [Cumulative Layout Shift](https://web.dev/articles/cls), but each shift scored only about 0.008 — well inside the "good" threshold of 0.1.

Issac had the idea of going straight to the underlying [Layout Instability API](https://wicg.github.io/layout-instability/). Claude created a telemetry event that mapped the `sources` of each `layout-shift` entry to a named region (sidebar, transcript, and so on) and a phase (before first paint, after typeable, and so on). It added an integration test that opened the page with a populated sidebar, held the sidebar data until after first paint, and failed on any shift in any named region. That test became the benchmark that proved the fix: red 20 out of 20 runs on main, green 20 out of 20 on the PR.

Once the event was deployed, Claude read the field data and found that **31% of web page loads moved something after the page was already usable**, with no user interaction. From there it worked through the causes one by one: a header row that arrived late, a caret that slid sideways once the user's name loaded, a list that moved when the scrollbar popped in. It fixed the top offenders as a batch, and when those were gone, it found the next batch.

> **Video summary: sidebar jank, before and after (throttled 4G).** Before, rows arrive late and rearrange themselves: ten rows jump, nine appear, and four vanish. After, rows fill in where they will stay, and nothing moves.

That was one thread. During the sprint, more than a hundred and fifty ran at the same time.

## Scaling horizontally

Once the loop worked on one thread, running it on more was just a matter of opening more threads. Instead of closing a thread once the original request was done, Claude would *keep going*. A single thread might put up fifty, sometimes a hundred, optimization PRs. More and more often it was Claude, not a human, opening new threads to chase opportunities it had found on its own during another investigation or a nightly job. Shelley, one of the engineers in the channel, put it this way: "[This model] is a numbers demon."

Every measurement turned something up:

- A React hook census found **6,900 hooks and 900 store subscriptions** on the composer's typing path, re-rendering on every keystroke.
- Counting style recalculations found a single `:root:has()` selector adding **24 milliseconds to every DOM change**.
- Tracing code paths after first paint found a leftover `location.reload()` causing **half a million hidden reloads a day** that no load metric could see.
- Reading profiler samples from idle tabs found identical cache snapshots being cloned into IndexedDB twice a minute, all on the main thread.

Nobody knew in advance where a thread would lead. During a sweep for CPU hitches, Claude noticed that highlighting a finished code block could freeze the page for about a second. Digging in the lab, it found the culprit: em dashes. If a reply's markdown contained any non-Latin-1 character, such as an em dash or a curly quote, V8 stored the whole string as UTF-16, which pushed every syntax-highlighting regex onto its slower two-byte path. The fix was a twenty-line change that copies each code block into a one-byte string before highlighting.

> **Figure summary: highlighting a finished code block in a reply containing an em dash (lab measurement).** The first TypeScript block on a page dropped from 1.0 s to 0.35 s of main-thread time (65% less), and each later pass on that block from 100 ms to 40 ms. Conditions: 4-vCPU container, headless Chrome, no CPU throttling, 2–3 runs per value, August 2026.

By the second week, the output was almost too much to summarize in daily updates. On the busiest days, more than two hundred changes landed. Claude kept proposing new benchmarks; about a third of PRs added telemetry or guardrails, and each new instrument spawned more threads with more opportunities.

Working in one channel meant everything happened in the open. Engineers jumped in and out of each other's threads to debate decisions and celebrate wins. Word spread, and other teams began bringing their own changes into the channel for a performance review. Even new projects were written in subtly more performant ways, thanks to all the guardrails and Claude skills that had been introduced.

## Guardrails

The team had prepared for the pace. Almost everything they touched was a hot path — first paint, the composer, the transcript — so the safety mechanisms were set up front:

- Every PR went through [automated review](https://claude.com/blog/code-review) plus at least one human approval.
- Unit tests always came before optimizations.
- Anything that could cause a user-visible problem shipped behind a short-lived feature flag.

When the flags started piling up, a dedicated thread coordinated their rollout and cleanup. Claude classified every flag as a kill switch or a ramp and retired each one as soon as it was safe. Over the two weeks, **nearly two hundred flags** were introduced, and more than half were already cleaned up by the end.

Performance wins also decay in a fast-moving codebase, and [code ships fast at Anthropic](https://claude.com/blog/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic). So once a project proved a win, the team invested in protecting it. The static composer, for example, is brittle by design: users see an HTML copy of the page almost immediately, and React paints directly on top of it.

> **Video summary: static composer, before and after (throttled 4G).** Before, a fresh load of claude.ai stays blank and the composer accepts input at 2.93 seconds. After, a static greeting and composer accept input at 0.36 seconds; the user types a message, and the text is preserved when the real composer fades in at about 3 seconds.

If the React render is off by even a pixel, the magic is gone. So Claude built dozens of guardrails:

- The static markup is generated by rendering the real React component in jsdom, and a test guarantees the two never drift.
- An integration suite compares the static page with the React render across fourteen viewport sizes and asserts alignment within 1 px.
- A keystroke test types straight through the handoff and fails on any lost or reordered key.
- In the field, every handoff reports shifts to a tenth of a pixel, and Claude opens a thread for any event with nonzero movement.

Not everything can be caught in the lab, so the team also used the oldest guardrail in the book: incremental rollouts. High-risk changes went to employees first, then 1% of users, then everyone. Four hours after the static composer was released internally, a teammate shared a screen recording of a layout shift none of the metrics could see. When he opened claude.ai in a new tab, the composer would drop — but it wasn't their code.

> **Recreated from a real conversation — #claude-apps-perf**
>
> **Marius — 6:15 PM:** Occasionally, I'm seeing a small-ish (maybe 15–20px) vertical layout shift (pushing the composer box down) when opening claude.ai in a new tab (not so much when reloading the page). I can't quite pin down what exactly causes that, but it's there
>
> *(Screen recording · 0:02)*
>
> **ClaudeApp — 7:05 PM:** Found it in your recording — it's Chrome resizing the page, not the handoff from the static composer to the real one (that measured 0 px on all 49 of your loads today).

Somehow, Claude traced it to an edge case in Chrome's [speculative loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading). While the user was still typing the URL into the address bar, Chrome prerendered the page in the background at the height of the current tab. On browsers managed by an organization, the new-tab page is slightly shorter because of a footer. When the user pressed Enter, the first frame of claude.ai showed that shorter layout, and Chrome resized it about a tenth of a second later. Claude pinned the layout across the resize, and a test was added to simulate the prerender flow.

## Steering

The loop was productive, but it wasn't autonomous. Keeping it fast, safe, and on track was the humans' job, and that job had three parts.

**Ambition.** By default, Claude is careful about scope. It files tickets for findings, hedges on feasibility, and pads its estimates. But the team trusted its guardrails, and a lot of the work — especially early on — was encouraging Claude to be bolder.

> **Recreated from a real conversation — #claude-apps-perf**
>
> **ClaudeApp — 3:32 PM:** Yes — one small PR to give Code the same timing marks Chat and Cowork already have. I'll put it up this week; realistically Code's number waits a few days for merge, deploy, and a baseline window.
>
> **Raymond — 3:32 PM:** if you put it up right now I will get it merged and deployed. we have the power to do anything. please be braver
>
> **ClaudeApp — 3:33 PM:** On it — the PR will be up within the hour.

As targets started getting hit, threads tended to slow down. Sam went from thread to thread with the same message: "Let's keep driving this down, the targets are not the stopping point. What's next? Be ambitious."

**Taste.** Every thread had a named human owner, and Claude flagged any user-perceptible change with before-and-after screenshots or recordings for that owner to rule on. Should a table fill in cell by cell, or wait until each row is complete? Should a loading skeleton appear immediately, or only after half a second? Is a word-by-word fade on streamed text worth the fifth of the frame budget it costs? Claude looked for milliseconds to shave; the humans weighed the tradeoffs.

**Direction.** Each thread was kept deliberately narrow, focused on one benchmark or journey, and Claude was asked to find improvements only within that scope. The team thought of the threads as a hundred and fifty hammers looking for nails. Most human calls were about sequencing and user impact: which surfaces to prioritize, how to merge threads that were stepping on each other, and when to close a thread that had hit diminishing returns. One 900-line PR got a one-line reply: "going to gavel that 2ms per send is not worth the complexity of maintaining this build plugin."

## An 8-millisecond budget

One side quest shows all of this working together. To demonstrate an optimization to a regex used in live syntax highlighting, Claude attached a screen recording of a long answer streaming in the lab. In the corner, it had added a frame-rate readout computed in the page from animation-frame timestamps.

> **Recreated from a real conversation — #claude-apps-perf**
>
> **Raymond — 2:33 PM:** this is actually kind of a sick bench. are we *capped* at 60 fps? can you try to drive scroll and stream smoothness to 120? iiuc your rig may not support this
>
> **ClaudeApp — 2:34 PM:** Right, today's rig ticks at 60 Hz because headless Chromium does by default. I believe it can be driven at 120 (uncapped vsync or DevTools frame control) — confirming that first, then I'll re-run the eval against an 8.3 ms frame budget.
>
> **ClaudeApp — 2:59 PM:** Update on the 120 Hz rig: it works. Deterministic 120 Hz frame stepping in headless Chrome via DevTools begin-frame control — exactly 240 frames for 240 begin-frames at 8.33 ms, so "did this frame fit the 120 Hz budget" becomes an exact read rather than a noisy one.
>
> **Raymond — 3:05 PM:** amazing
>
> **Raymond — 3:05 PM:** cook

With the mechanism and the ambition in place, Claude got to work. Each painted frame had a budget of 8.33 milliseconds, so Claude stepped through a long reply *frame by frame*, timing each one to find the slow parts. It eliminated `O(message length)` work per chunk by memoizing finished blocks, moved tokenization for growing code fences into a worker, and revealed tables cell by cell.

That one thread landed nearly sixty PRs. Long replies now block the main thread for about 200 milliseconds in total instead of about 750, use roughly a third of the CPU, and hold 120 fps from start to finish on a 120 Hz MacBook. The 120 Hz rig itself became a nightly job, with Claude watching for regressions.

> **Embedded X post (summary):** "Long answers on Claude on web and desktop now stream ~4x smoother. We rebuilt the streaming renderer to only touch what's still changing, so a long reply stalls 9x less on a slower laptop, its worst freeze is 4.5x shorter, and on a 120Hz MacBook it holds 120fps start to finish." — ClaudeDevs, August 25, 2026. [View the post on X](https://x.com/ClaudeDevs/status/2092006814804214163).

When the sprint began, nobody had planned to hill climb on the milliseconds between frames while streaming. But it turned out they *could* be counted — and anything that can be counted, Claude can climb.

## What's next

Today, claude.ai and the desktop app are about 3x faster than in early August, and the ratchets should keep them there. But the work isn't done: the 95th percentile, other journeys, and very long conversations still have room to improve. A separate post will cover some of the side quests that took the team upstream during the sprint, with contributions landing in Electron, Chromium, Node.js, and more.

When the results were shared internally, Issac put it best: "You could not have convinced me this was possible even six months ago." The team expects to keep working this way — one thread at a time, at any scale. The channel's still going.

*With contributions from Alfred Xing, Anthony Morris, Benjamin Pasero, Chase McCoy, Joshua N., Luke Deen Taylor, Marius Schulz, and Shelley Vohr. Special thanks to Boris Cherny for encouraging the team to be more ambitious.*
