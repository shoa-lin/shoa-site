---
translationKey: "harness-engineering"
locale: "en"
title: "Harness project for coding agent users"
description: "For coding agent users, the system organizes guides, sensors, feedback loops and architectural constraints."
publishedAt: "2026-04-07"
updatedAt: "2026-04-07"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://martinfowler.com/articles/harness-engineering.html"
sourceAuthor: "Birgitta Böckeler"
contentType: "translation"
translationStatus: "draft"
---

> **Terminology Note**
>
> **Harness**: refers to all components of the AI Agent except the model itself, that is, Agent = Model + Harness. In the context of coding agents, it includes both the builder's built-in system prompts, code retrieval mechanisms, orchestration systems, etc., as well as user-customizable external controls - such as rule files, Skills, custom inspection scripts, etc. The word Harness remains untranslated in this article.
>
> **Guides / Sensors**: Guides are feedforward control, providing guidance before the Agent takes action; Sensors are feedback control, detecting problems and triggering self-correction after the Agent takes action.
>
> **Computational / Inferential**: Computational refers to deterministic tools (such as linter, type checker) executed by CPU; Inferential refers to semantic analysis (such as AI code review, LLM-as-judge) executed by GPU/NPU.

---

"Harness" has become a common abbreviation in the field of AI Agent, referring to everything except the model - **Agent = Model + Harness**. But this definition is too broad and deserves further narrowing for different Agent categories. This article focuses on encoding the bounded context of Agent.

In the coding agent, some harnesses are built in by the builder - system prompts, code retrieval mechanisms, orchestration systems, etc. But the coding agent also provides users with rich capabilities, allowing us to build an outer harness for our own use cases and systems.

![Three concentric circles: the model is at the core (the final object being harnessed), the builder harness encoding the Agent is the middle circle, and the user harness encoding the Agent is the outermost layer](/assets/blog/harness-engineering/harness-bounded-contexts.png)

Figure 1: The same word "harness" has different meanings in different bounded contexts.

A well-constructed outer harness has two goals: to increase the success rate of the first Agent spawn, and to self-correct as much as possible through a feedback loop before the problem is exposed to humans. The final effect is to reduce the workload of manual review, improve system quality, and save token consumption.

![Overview diagram: Guides input coding agents through feedforward (examples include [inferential] principles, CfRs, Rules, Ref Docs, How-tos, and [computational] Language Servers, CLIs, scripts, codemods); Sensors observe the output of the agent through feedback and feed into its self-correcting loop (examples include [inferential] review agents, and [computational] static analysis, logs, browsers). The human on the left controls both Guides and Sensors. ](/assets/blog/harness-engineering/harness-overview.png)

## Feedforward and Feedback

There are two core ideas for building a harness for coding agents:

- **Guides (feedforward control)**: predict the behavior of the Agent and guide it** before it acts**, thereby increasing the success rate of the first generation.
- **Sensors (Feedback Control)**: Detect problems** after the Agent acts** to help it correct itself. The best results are when the signal output by the Sensor is specifically optimized for LLM - such as a custom linter message with correction instructions. This is actually a "forward" prompt injection.

If only feedback is used without feedforward, the Agent will make the same mistake repeatedly; if only feedforward is used without feedback, the Agent will write the rules but never know whether the rules are effective. Both are indispensable.

## Computational vs Inferential

Guides and Sensors each have two execution methods:

- **Computational**: Deterministic, fast, executed by CPU. Typical examples: testing, linters, type checkers, structural analysis. Run times range from milliseconds to seconds, and results are reliable.
- **Inferential (inferential)**: semantic analysis, AI code review, "LLM as judge". Usually performed by GPU or NPU, it is slower, more expensive, and the results are non-deterministic.

Computational guides pave the way for agents with deterministic tools to improve first-time build quality. Computational sensors are cheap and fast and work with agents to run every time the code changes. Inferential controls, while more expensive and non-deterministic, can provide rich semantic guidance and judgment—inferential sensors are particularly effective at promoting trust when paired with a strong model (or model that is appropriate for the task at hand).

**Example**

| Scenario | Direction | Type | Example Implementation |
| --- | --- | --- | --- |
| Coding Standards | feedforward | Inferential | AGENTS.md, Skills |
| Project initialization instructions | feedforward | both | Skill with instructions + bootstrap script |
| Codemods | feedforward | Computational | Tools to integrate OpenRewrite recipes |
| Structural testing | feedback | Computational | pre-commit hook to run ArchUnit tests and check module boundaries |
| Code review instructions | feedback | Inferential | Skills |

## Steering Loop

The core task of humans in this process is to steer the agent through continuous iteration of the harness. Whenever a problem reoccurs, feedforward and feedback controls should be improved to reduce the probability of the problem recurring, or even eliminate it completely.

We can also use AI to improve the harness itself. Coding Agents drastically reduce the cost of building custom controls and static analysis - Agents can help you write structural tests, generate draft rules from existing patterns, build custom linters, and even generate how-to guides through code archeology.

## Timing: Shift mass left

Continuous integration teams have always faced a problem: how to reasonably distribute tests, inspections, and manual reviews on the development timeline based on cost, speed, and criticality. Teams pursuing continuous delivery even want every commit to be in a deployable state. The core principle is: **Move the checkpoint to the left as much as possible** - the earlier the problem is discovered, the lower the repair cost.

Feedback sensors—including emerging inferential sensors—need to be distributed accordingly throughout the life cycle.

**feedforward and feedback in the change life cycle**

- Which checks are fast enough and should be run before integration, or even before the commit is generated? (e.g. linter, quick test suite, basic code review agent)
- Which checks are more expensive and should only be run in the pipeline after integration, as a complement to quick checks? (such as mutation testing, code review that requires an overall view)

![Examples of feedforward and feedback in the change lifecycle. Feedforward includes LSP, architecture.md, /how-to-test skill, AGENTS.md, MCP server, etc., and inputs the initial generation of Agent; Feedback sensors include /code-review, npx eslint, semgrep, npm run coverage, npm run dep-cruiser, etc.; then manual review is used as additional feedback; after integration, all sensors are re-run in the pipeline, and the more expensive /architecture-review is added skill, /detailed-review skill, mutation testing, etc.](/assets/blog/harness-engineering/harness-change-lifecycle-examples.png)

**Continuous drift and health sensors**

In addition to checks during the change life cycle, there are two types of continuously running sensors:

- **Codebase drift sensors**: Monitor the gradual accumulation of code base degradation. For example, dead code detection, test coverage quality analysis, and dependency scanning.
- **Runtime health sensors**: Let the Agent monitor runtime indicators. For example, pay attention to SLO deterioration and proactively provide improvement suggestions, or use AI judge to continuously sample response quality and mark log anomalies.

![Examples of continuous feedback sensors after change integration: continuous drift detection (such as /find-dead-code, /code-coverage-quality, dependabot) and continuous runtime feedback (such as latency, error rate, availability SLO triggering agent recommendations, or /response-quality-sampling, /log-anomalies AI judges).](/assets/blog/harness-engineering/harness-continuous-feedback-examples.png)

## Adjustment category

Harness is like a regulator in cybernetics, gradually pushing the codebase to the desired state through feedforward and feedback. This "desired state" itself has multiple dimensions, each corresponding to a harness category. This distinction is necessary - harnessability and complexity vary greatly between categories, and using a qualifier to qualify the general word "harness" can make the discussion more precise.

Currently I identify three useful categories:

### Maintainability Harness

Most of the examples in this article fall into this category - regulating internal code quality and maintainability. This is by far the easiest type of harness to build because we have a lot of ready-made tools.

To evaluate the extent to which the maintainability harness improves trust, I mapped the common coding agent failure patterns I summarized earlier:

- **Computational sensors reliably capture**: duplicate code, cyclomatic complexity, missing test coverage, architectural drift, style violations. These tools are cheap, proven, and highly deterministic.
- **LLM can partially address, but at a high cost**: semantic duplication of code, redundant testing, brute force fixes, and over-engineering. These problems require semantic judgment and can only be handled in a probabilistic manner, and it is impossible to run every commit.
- **High-impact issues currently difficult for both to reliably capture**: Problem misdiagnosis, over-engineering and unnecessary functionality, misunderstood instructions. They can occasionally be detected, but not enough to reduce human oversight. **If humans don’t make it clear what they want from the beginning, accuracy will be beyond the capabilities of any sensor. **

### Architecture Fitness Harness

These guides and sensors are responsible for defining and validating the architectural characteristics of the application - essentially **Fitness Functions** (fitness functions).

Example:

- Skills feed-forward description of performance requirements, and feedback to the Agent on improvement or degradation in conjunction with performance testing.
- Skills describe observability coding specifications (such as logging standards), and cooperate with debugging instructions to require the Agent to reflect on the quality of its logs.

### Behavior Harness

This is the hardest question - how to guide and detect whether the functional behavior of the application is as expected? Currently, most teams that give coding agents a high degree of autonomy adopt this approach:

- **Feedforward**: Functional specification (level of detail ranging from a short prompt to a multi-file description)
- **Feedback**: Check whether the AI-generated test suite passes and whether the coverage is reasonable. Some teams will also use mutation testing to monitor test quality. Finally, it is supplemented by manual testing.

This approach places too much trust in AI-generated tests. Some of my colleagues have had good results using the **approved fixtures pattern** (approved fixtures pattern), but it doesn't work in every scenario - teams only use it selectively where appropriate, and it's not a comprehensive solution to test quality issues.

Overall, we still have a long way to go when it comes to behavior harnesses - we need to find solutions that are good enough to provide confidence that they can truly reduce human oversight and manual testing.

![Simplified overview of the harness: guides and sensors in the horizontal direction and three adjustment dimensions in the vertical direction - maintenance, architecture fitness and behaviour. In the Behavior harness, the spec serves as the feedforward guide, the test suite serves as the feedback sensor (a mixture of inferential and computational), and the human icon represents manual review and manual testing as the main additional feedback sensor.](/assets/blog/harness-engineering/harness-types.png)

## Harnessability

Not all codebases are equally suitable for building harnesses. A codebase written in a strongly typed language naturally has type checking as a sensor; clear module boundaries make architectural constraint rules possible; frameworks like Spring abstract away many details, and the Agent does not need to care, thus indirectly improving the success rate. **Lack of these characteristics, corresponding control means cannot be constructed. **

Greenfield and Legacy projects face very different challenges:

- The **Greenfield Team** can design harnessability into the design from day one - technology selection and architectural decisions determine how manageable the codebase is.
- **Legacy teams**, especially projects that have accumulated a lot of technical debt, face a more difficult dilemma: the places where harness is most needed are precisely where it is hardest to build.

## Harness Template

Most enterprises have a handful of common service topologies that cover 80% of their needs—business services that expose data through APIs, event processing services, data dashboards. In mature engineering organizations, these topologies are often already encoded as service templates.

In the future these may evolve into a harness template - a bundle of guides and sensors that constrains the coding agent within the structure, specifications and technology stack of a specific topology. When choosing a technology stack and architecture, the team may give priority to solutions that already have ready-made harnesses.

![Topology example stack: Node data dashboard, JVM CRUD business service, Golang event handler. The top shows the detailed structure definition and technology stack of the data dashboard, and is marked with "harness template", which contains guides and sensors for each topology and can be instantiated and used.](/assets/blog/harness-engineering/harness-templates.png)

Of course, as with service templates, once a team instantiates a template, it becomes increasingly disconnected from upstream updates. The Harness template also faces version management and contribution issues - perhaps even more so, since non-deterministic guides and sensors are harder to test.

## Human role

As human developers, we bring our skills and experience to every codebase as an implicit harness. We’ve internalized coding conventions and best practices, we’ve experienced firsthand the cognitive load of complexity, and we know our names are attached to every commit. We also carry organizational context - knowing what the team is doing, what technical debt the business can tolerate, and what "good code" looks like in this particular scenario. We move in small steps, working at a human rhythm that provides just the right amount of thinking space for experience to play out.

The coding agent has none of these: it has no sense of social accountability, no instinctive aversion to 300-line functions, no "we don't do that here" intuition, and no organizational memory. It doesn't know which norms are core constraints and which are just habits, or whether the technically correct solution meets the team's actual intentions.

The essence of Harness is to try to externalize and make explicit the things that are implicit in human developer experience - but there are limits. Building a coherent set of guides, sensors, and self-correction loops is not cheap, so we must focus on the core goal: **A good harness is not to completely replace human input, but to guide human input to the most critical places. **

## Starting point and open questions

The mental model described in this article summarizes the technology that is already happening in practice and attempts to provide a framework for discussion of "what are we missing?" Its purpose is to elevate the conversation from a specific function (a certain skill, a certain MCP server) to the system level - how do we strategically design a control system to make the Agent's output truly trustworthy.

Some current harness-related practices in the field:

- The **OpenAI team** documented their approach to harnessing: enforcing a layered architecture with custom linter and fabric tests, plus "garbage collection" that regularly scans for drift and lets the agent suggest fixes. They concluded: "Our most difficult challenges now focus on designing the environment, feedback loops and control systems."
- **Stripe's minions article** describes pre-push hooks that run relevant linters based on heuristics, emphasizing the importance of **"shift feedback left"** to them, and their "blueprints" show how to integrate feedback sensors into the Agent workflow.
- **Mutation testing and structural testing** are experiencing a renaissance as computational feedback sensors, which have been underutilized in the past.
- There is increasing discussion of integrating **LSP and code intelligence** into coding agents - these are examples of computational feedforward guides.
- **Thoughtworks' team** shared their experience in using computational and inferential sensors to deal with architecture drift, such as using a combination of Agent + custom linter to improve API quality, or using "janitor army" to improve code quality.

But there are still a lot of questions to be answered - not just the behavior harness mentioned above:

- How to maintain consistency as the harness continues to expand and avoid guides and sensors from conflicting with each other?
- When instructions and feedback signals point in different directions, can the Agent make reasonable trade-offs? How much can we trust it?
- If a sensor never triggers - is the quality really high, or is the detection capability insufficient?
- We need a way to evaluate harness coverage and quality like code coverage and mutation testing do for tests.
- Currently feedforward and feedback controls are scattered throughout various delivery links, and there is a lot of room for tooling here - to help configure, synchronize, and view them as a system.

Building outer harnesses is evolving from a one-time configuration to an ongoing engineering practice.
