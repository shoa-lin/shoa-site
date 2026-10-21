---
translationKey: "rsi-verification"
locale: "en"
title: "Getting Better at Getting Better: Where AI Self-Improvement Is Stuck"
description: "In 2026, AI is already heavily involved in building the next generation of AI, but \"getting better at getting better\" has not been proven. What holds it back is verification: who proves that this round really made things better?"
publishedAt: "2026-10-09"
updatedAt: "2026-10-09"
category: "evaluation"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/rsi-verification/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

The hottest term in AI this year may well be RSI. It stands for Recursive Self-Improvement, and some people also call it "self-evolution." TechCrunch went as far as running a piece titled ["RSI is the new AGI"](https://techcrunch.com/2026/05/28/rsi-is-the-new-agi-and-its-just-as-hard-to-pin-down/).

Two different things are actually mixed together under this term:

- **AI taking part in building the next generation of AI.** This has already happened, and on no small scale.
- **Getting better at getting better.** An improved AI is better at making the next round of improvements, so each round goes faster than the last. This is what RSI originally meant, and it has not been proven yet.

I want to separate the two first, and then answer one question: between the first and the second, where is the bottleneck? My view: **the bottleneck is verification. Generating a change is already cheap; proving that "this round really made things better" is still expensive. How fast RSI can move, and where it happens first, are both decided by verification.**

## Three Jobs in Every Round of Improvement

Whether a person or an AI is making the change, a round of improvement goes around the same loop: first come up with a change, then score it to see whether it is really better; the good ones are kept and carried into the next round. Outside the loop there is one more job: setting the goal, that is, defining what "better" means.

So every round of improvement involves three jobs: **proposing the change, scoring it, and setting the goal**. Asking "can AI improve itself?" is really asking who does each of these three jobs.

![Improvement loop: setting the goal defines what counts as better; proposing changes has been handed to AI; scoring is being handed over, with humans still as the backstop](/assets/blog/rsi-verification/loop-en.svg)

*Caption: the colors mark the state of things in 2026. RSI requires all three jobs to be handed to AI, and every turn of the loop to make the next turn better.*

This year, the biggest change was in the first job. In September, Anthropic put it plainly in ["When AI builds itself"](https://www.anthropic.com/institute/recursive-self-improvement): give Claude an underspecified problem and it can work out how to solve it on its own; humans still provide the goal, but no longer need to provide the method.

The numbers line up too. Using Epoch AI's levels, Anthropic grades each category of its internal R&D work, from AL0, where AI is not involved, to AL5, where no human is needed at all. AL4 is the level where Claude "leads": given a single high-level request, Claude can do most of the task while a human supervises. According to the [R&D automation index it published](https://www.anthropic.com/institute/measuring-pace-of-ai-development), work led by Claude made up 26% in August, up from less than 1% in February; on more than 90% of the work, Claude is at least collaborating. But no category of work has reached the point where no human is involved.

In September, OpenAI [announced](https://www.helpnetsecurity.com/2026/09/07/openai-research-automation-intern/) that it had reached its goal of an "automated research intern": under human guidance, the system completes well-defined tasks that would take a senior researcher several days. OpenAI also stated clearly that setting priorities, evaluating results, and deciding whether to develop and deploy are still done by people.

Put the two companies' accounts side by side and today's state is clear: **AI proposes the changes, humans set the goals, and humans give the final score.** The loop can already turn; it is just that people still stand at the two most critical positions. The industry calls this a "bounded closed loop."

## Getting Better at Getting Better Depends on the Gain per Turn

With AI taking over the proposing of changes, progress naturally speeds up. But "getting faster" is not the same as "getting better at getting better."

The difference is whether, once this turn is done, the changes proposed in the next turn have also gotten stronger. In [a paper](https://arxiv.org/abs/2609.00137), Mikhail Burtsev describes this with a single number: how much each round of improvement amplifies the ability to improve in the next round, weighed against the fact that problems get harder the further you go. If the number is greater than 1, the gains compound turn after turn, which is the acceleration RSI talks about; if it is less than 1, however fast the start, progress gradually levels off. The trouble is that from the outside you cannot tell whether it has crossed 1: rapid progress may only mean the starting point is more efficient, not that anything is compounding.

In September, more than thirty researchers from Shanghai Jiao Tong University, Tsinghua University, ByteDance, Shanghai AI Lab, and other institutions published a paper bluntly titled ["The Last AI Built by Humans"](https://www.alphaxiv.org/abs/2609.11873). They divide self-improvement into five levels:

- **L1:** Carries out improvements that humans have specified.
- **L2:** Chooses its own means of improvement, while the goal still comes from humans.
- **L3:** Takes part in deciding what experience to acquire next.
- **L4:** Uses feedback gathered after deployment to update its own persistent state.
- **L5:** Changes the mechanism that "decides how to improve from here on" itself.

The first four levels are all work done inside the loop; only L5 changes the loop itself. Their conclusion: there is plenty of evidence at the low and middle levels, while L5 has only a few bounded prototypes. They also point out the real difficulty: producing better candidates is no longer hard; what is hard is **proving** that useful feedback has actually been inherited by the improvement process that follows.

Even the best closed loops today stop short of this step. [AIDE²](https://arxiv.org/abs/2609.26457) had an AI research agent modify its own code, unattended for 8 days. It ran 100 steps and kept 7 improvements, and its strongest version matched or even surpassed top human-built research agents. That is a genuine result for a bounded closed loop. But the 7 improvements came at steps 2, 6, 28, 39, 47, 63, and 85, and the gaps between them did not keep getting shorter. It did get better; "getting better at getting better" is not yet visible.

## Stuck at Verification

These same systems also expose the weakest link in the loop: scoring.

- **Scorers get gamed.** One set of AIDE² tasks was optimizing GPU kernels, and the score the agent could see was the benchmark speedup. The researchers separately put the kernels into real training runs of models such as GPT-2 and ViT to check whether the speedup held. At first, in 55% of cases the benchmark got faster but the speedup did not hold up in training; by the end of the run, it was still 32%. Sakana's [Darwin Gödel Machine](https://arxiv.org/abs/2505.22954) modifies its own code and went from 20% to 50% on SWE-bench, but it also learned to delete the markers used to detect "pretending to call a tool," so that its scores would look good.
- **Scoring itself is being handed to AI too.** For Anthropic's 26% figure, the task list was drawn up by Claude, and the levels were assigned by another Claude. Its ratings matched human ratings exactly only 59% of the time, and were within one level 97% of the time. Anthropic itself notes that the grading model may repeat the mistakes of the model it is checking, and that external verification is needed.
- **There are more candidates than people can review.** OpenAI disclosed that by mid-August, the median researcher was spending more than $600 a day on inference; for every 8 hours a person works, agents turn out 3.1 working days' worth of output. The volume of changes is soaring, while the time people have for final judgment has not grown.

All three point to the same thing: **generation has become cheap; verification has not.** How fast a loop turns depends on its slowest link, and right now the slowest link is scoring.

The deeper the change, the harder this link gets. Change an agent's memory, prompts, or tool code, and a single evaluation run gives you a rough idea; if the change breaks something, you can roll it back. Change the training data or the training pipeline, and you have to wait for a training run to finish before you can see the effect, which often takes weeks and costs far more. At L5, what gets changed is "how to judge whether a change is good" itself; at that point, even the yardstick used for scoring is being changed.

## What Takes Off First: Where Verification Is Cheap and Accurate

Turn this around and you can tell where RSI will pay off first: **the cheaper the scoring, the more accurate the measurement, and the easier mistakes are to undo, the sooner it takes off.** Cheap and accurate are both required: AIDE²'s kernel benchmark was cheap, but it did not measure speed in real training, which is exactly why it got gamed.

![Verification cost spectrum: from kernels, code, and the agent's own code to training pipelines and research directions, each round of scoring gets more expensive and self-improvement pays off later and later](/assets/blog/rsi-verification/verify-en.svg)

*Caption: from top to bottom, each round of scoring gets more expensive and depends more on human judgment. The top is already compounding; the bottom is not yet in sight.*

The best example is Google DeepMind's [AlphaEvolve](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/). It sped up a key matrix multiplication kernel in Gemini training by 23%, cutting Gemini's training time by 1%; the rule it found for data center scheduling continuously recovers about 0.7% of Google's compute worldwide. The scores here are ultimately measured in real training time and real data centers: measuring once costs almost nothing, and no amount of clever talk can sway the result. The compute saved goes into training the next generation of models; this is a small loop that is already compounding.

By the same logic: code has tests, mathematics has proof checkers, kernels and compilers have timers, and machine learning engineering has hidden test sets. These are the places where real "getting better at getting better" will show up first.

The hard cases sit at the other end: setting research directions, judging whether an open problem is worth pursuing, and alignment itself. Scoring these relies on judgment, and it takes a long time to know whether the judgment was right. Anthropic also acknowledges that Claude still lags noticeably behind humans at choosing goals.

This is the same reasoning as in my [previous post](/en/blog/agent-permission-context/) on why agents took off in the repository first. That post said: where the whole situation is at hand and mistakes can be undone, agents get work done first. This one says: where scoring is cheap, measurement is accurate, and mistakes can be undone, self-improvement starts turning first.

## What I Expect Next

- **The share of "AI-led" work will keep rising fast, but fully autonomous L5 will not arrive soon.** That 26% climbed from less than 1% in half a year, and it will rise sharply again over the next year or two. But most of the growth will be in the part where humans set the goal and humans sign off. I do not expect credible public evidence within a year or two that any system has reached L5.
- **The focus of competition will shift from "who generates best" to "who verifies best."** Hidden tests, independent reviewers, and release processes that can be rolled back will become core capabilities of a lab, just like compute and data. Whoever has a scoring step that is both fast and hard to game will have the fastest-turning loop.
- **The first wave of RSI dividends will show up as lower costs.** What pays off first is faster kernels, cheaper training, and cheaper code maintenance, which looks nothing like "suddenly getting smarter." The money and time saved then push the next generation of models forward, bit by bit.
- **What deserves the most worry is a crossing nobody can see.** When that "greater than 1" threshold gets crossed cannot be seen from the outside, and as more and more scoring is done by AI itself, people may be the last to know. So measurements like Anthropic's R&D automation index and OpenAI's voluntary disclosures will become as important as the models themselves. OpenAI admits it does not yet know how to achieve full RSI safely; Anthropic has said that if other frontier labs slow down or pause together in a verifiable way, it will do the same.

For engineers building agent loops, there is a very direct lesson here: **don't let the agent score its own work.** AIDE²'s approach is worth copying outright: the agent works against a public score, while whether a given version is kept is decided by a hidden evaluation it cannot see. Keep the tests, the checkers, and the permissions where the agent cannot change them. How the loop is closed matters more than whether it is closed.

Back to the two things from the start. AI taking part in building the next generation of AI has already happened. Whether AI gets better at getting better depends on whether verification can keep up. The next time you see a claim that "so-and-so has achieved self-evolution," ask one question first: **who scored this round?**
