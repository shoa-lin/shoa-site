---
translationKey: "harness-engineering"
locale: "en"
title: "Harness engineering for coding agent users"
description: "A practical model of guides, sensors, feedback loops, and architectural constraints for making coding agents more trustworthy."
publishedAt: "2026-04-02"
updatedAt: "2026-04-02"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://martinfowler.com/articles/harness-engineering.html"
sourceAuthor: "Birgitta Böckeler"
contentType: "adaptation"
translationStatus: "reviewed"
---

> **Terminology**
>
> **Harness** refers to everything in an AI agent other than the model itself: Agent = Model + Harness. For coding agents, this includes both the builder's system prompts, code retrieval, and orchestration, and the user-controlled outer layer of rules, Skills, scripts, and checks.
>
> **Guides / Sensors**: Guides are feedforward controls that steer the agent before it acts. Sensors are feedback controls that observe the result and trigger self-correction after it acts.
>
> **Computational / Inferential**: Computational controls are deterministic tools such as tests, linters, and type checkers. Inferential controls use semantic judgment, such as AI code review or an LLM-as-judge.

---

The term "harness" has become shorthand for everything in an AI agent except the model: [Agent = Model + Harness](https://blog.langchain.com/the-anatomy-of-an-agent-harness/). That definition is extremely broad, so it is useful to narrow it within the bounded context of coding agents.

Part of a coding agent's harness is built by its maker through system prompts, code retrieval, and sometimes a [sophisticated orchestration system](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents). Coding agents also give users the tools to build an outer harness for their own system and use case.

![Three concentric circles showing the model at the center, the coding agent builder harness around it, and the user harness as the outer layer](/assets/blog/harness-engineering/harness-bounded-contexts.png)

Figure 1: The term "harness" means different things in different bounded contexts.

A well-built outer harness serves two goals: it raises the probability that the agent gets the task right on the first attempt, and it provides a feedback loop that corrects as many issues as possible before they reach a human. The intended result is less review toil and higher system quality, with fewer wasted tokens along the way as an added benefit.

![Overview of guides feeding into a coding agent and sensors feeding results back into its self-correction loop, with a human steering both](/assets/blog/harness-engineering/harness-overview.png)

## Feedforward and Feedback

Harness engineering combines two forms of control:

- **Guides (feedforward controls)** anticipate unwanted behavior and steer the agent **before** it acts, increasing the chance of a good first result.
- **Sensors (feedback controls)** observe the result **after** the agent acts and help it self-correct. They are especially powerful when their signals are designed for LLM consumption, such as custom linter messages that include correction instructions: a positive form of prompt injection.

Either form is incomplete on its own. Feedback without feedforward lets an agent repeat the same mistakes; feedforward without feedback encodes rules but never reveals whether they worked.

## Computational vs Inferential

Guides and sensors can use two execution types:

- **Computational**: deterministic and fast, usually running on the CPU. Tests, linters, type checkers, and structural analysis complete in milliseconds to seconds and produce reliable results.
- **Inferential**: semantic analysis, AI code review, and LLM-as-judge evaluation, usually running on a GPU or NPU. These controls are slower, more expensive, and non-deterministic.

Computational guides improve first-pass results with deterministic tooling. Computational sensors are cheap and fast enough to run on every change alongside the agent. Inferential controls cost more and vary between runs, but they can provide rich guidance and semantic judgment. With a strong model, or more precisely a model suited to the task, inferential sensors can still increase trust.

**Examples**

| Scenario | Direction | Type | Example implementation |
| --- | --- | --- | --- |
| Coding conventions | feedforward | Inferential | AGENTS.md, Skills |
| Bootstrapping a new project | feedforward | Both | Skill with instructions and a bootstrap script |
| Codemods | feedforward | Computational | Tool with access to OpenRewrite recipes |
| Structural tests | feedback | Computational | Pre-commit or coding-agent hook that runs ArchUnit tests against module boundaries |
| Review instructions | feedback | Inferential | Skills |

### Relationship to context engineering

[Context engineering](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html) provides the means to make guides and sensors available to an agent. Engineering a user harness for a coding agent is a specific form of context engineering.

## The steering loop

The human's role is to **steer** the agent by iterating on the harness. Whenever an issue recurs, improve the feedforward and feedback controls so the issue becomes less likely, or is prevented entirely.

AI can help improve the harness itself. Coding agents have made custom controls and static analysis much cheaper to build. They can write structural tests, derive draft rules from observed patterns, scaffold custom linters, and create how-to guides through codebase archaeology.

## Timing: Keep quality left

Teams practicing [continuous integration](https://martinfowler.com/articles/continuousIntegration.html) have always had to distribute tests, checks, and human review across the development timeline according to cost, speed, and criticality. Teams pursuing [continuous delivery](https://martinfowler.com/bliki/ContinuousDelivery.html) ideally want every commit state to be deployable. Checks should sit as far left on the path to production as practical, because earlier failures are cheaper to fix.

Feedback sensors, including inferential ones, should be distributed across the lifecycle accordingly.

**Feedforward and feedback in the change lifecycle**

- Which controls are fast enough to run before integration, or even before a commit is created? Examples include linters, fast test suites, and a basic code review agent.
- Which controls are expensive enough to run only after integration in the pipeline, alongside a repeat of the fast checks? Examples include mutation testing and broader code review that needs the full picture.

![Examples of feedforward guides and feedback sensors before and after integration in a change lifecycle](/assets/blog/harness-engineering/harness-change-lifecycle-examples.png)

**Continuous drift and health sensors**

- **Codebase drift sensors** run outside the change lifecycle to detect degradation that accumulates gradually, such as dead code, weak test coverage, and dependency problems.
- **Runtime health sensors** let agents monitor production signals, such as degrading SLOs, sampled response quality, or anomalous logs, and propose improvements.

![Examples of continuous codebase drift detection and runtime feedback sensors after integration](/assets/blog/harness-engineering/harness-continuous-feedback-examples.png)

## Regulation categories

The agent harness acts like a [cybernetic](https://en.wikipedia.org/wiki/Cybernetics) governor, combining feedforward and feedback to regulate the codebase toward a desired state. That state has several dimensions, and each dimension needs a different kind of harness. The distinction matters because harnessability and complexity vary substantially across them.

Three categories are useful today:

### Maintainability harness

Most examples in this article regulate internal code quality and maintainability. This is currently the easiest kind of harness to build because mature tools already exist.

To judge how much these controls increase trust, compare them with [common coding-agent failure modes](https://martinfowler.com/articles/exploring-gen-ai/13-role-of-developer-skills.html):

- **Computational sensors reliably catch structural problems** such as duplicate code, cyclomatic complexity, missing coverage, architectural drift, and style violations. These controls are cheap, proven, and deterministic.
- **LLMs can partially address semantic problems** such as semantically duplicate code, redundant tests, brute-force fixes, and over-engineered solutions, but only expensively and probabilistically. These are not checks to run on every commit.
- **Neither reliably catches some high-impact problems**, including misdiagnosed issues, unnecessary features, over-engineering, and misunderstood instructions. They may catch them occasionally, but not reliably enough to remove human supervision. If the human never clearly specified the desired outcome, correctness lies outside any sensor's remit.

### Architecture fitness harness

This category groups guides and sensors that define and check the architectural characteristics of an application: in other words, [Fitness Functions](https://www.thoughtworks.com/en-de/radar/techniques/architectural-fitness-function).

Examples:

- Skills feed performance requirements forward, while performance tests report whether the agent improved or degraded them.
- Skills describe observability conventions such as logging standards, while debugging instructions ask the agent to reflect on the quality of the available logs.

### Behaviour harness

This is the hardest category: how do we guide and detect whether the application behaves as users need it to?

- **Feedforward**: a functional specification, ranging from a short prompt to a multi-file description.
- **Feedback**: an AI-generated test suite that passes with reasonable coverage, sometimes monitored with mutation testing, plus manual testing.

This approach places too much trust in AI-generated tests. Some teams are seeing good results with the [approved fixtures](https://lexler.github.io/augmented-coding-patterns/patterns/approved-fixtures/) pattern, but it is easier to apply in some areas than others. It is a selective tool, not a complete answer to test quality.

We still need better behaviour harnesses before teams can reduce supervision and manual testing with confidence.

![Simplified harness model with guides and sensors across maintainability, architecture fitness, and behaviour dimensions](/assets/blog/harness-engineering/harness-types.png)

## Harnessability

Not every codebase is equally amenable to harnessing. Strongly typed languages provide type checking as a sensor. Clear module boundaries make architectural constraints possible. Frameworks such as Spring hide details the agent does not need to manage, indirectly improving its chance of success. Without those properties, the corresponding controls cannot be built.

Greenfield and legacy systems face different constraints:

- **Greenfield teams** can design for harnessability from day one. Technology and architecture choices determine how governable the codebase will be.
- **Legacy teams**, especially those working with heavy technical debt, face the harder problem: the harness is most needed where it is hardest to construct.

## Harness templates

Most enterprises rely on a few common service topologies for most of their needs: API-backed business services, event processors, and data dashboards. Mature organizations often already encode these topologies as service templates.

Those templates may evolve into **harness templates**: bundles of guides and sensors that constrain a coding agent to the structure, conventions, and technology stack of a topology. Teams may eventually choose technologies partly according to the harnesses available for them.

![Example service topologies with a harness template containing guides and sensors for each topology](/assets/blog/harness-engineering/harness-templates.png)

### Ashby's Law

[Ashby's Law of Requisite Variety](https://en.wikipedia.org/wiki/Variety_%28cybernetics%29#Law_of_requisite_variety) strengthens the case for predefined topologies. A regulator must have at least as much variety as the system it governs, and it can regulate only what it has a model of. An LLM-based coding agent can produce almost anything; committing to a topology narrows that possibility space and makes a comprehensive harness more achievable. Defining topologies is a variety-reduction move.

Harness templates inherit the same maintenance problem as service templates: once instantiated, they drift from upstream improvements. Versioning and contribution may be even harder when guides and sensors are non-deterministic and difficult to test.

## The role of the human

Human developers bring skill and experience to every codebase as an implicit harness. We have absorbed conventions and good practices, felt the cognitive cost of complexity, and know our names are attached to commits. We also carry organizational context: what the team is trying to achieve, which technical debt is tolerated for business reasons, and what "good" means here. Working in small steps at a human pace creates room for that experience to surface.

A coding agent has none of this. It has no social accountability, no instinctive aversion to a 300-line function, no intuition that "we don't do it that way here," and no organizational memory. It cannot tell which conventions are load-bearing and which are habits, or whether a technically correct solution fits the team's intent.

Harnesses externalize and make explicit part of what human experience contributes, but only up to a point. A coherent system of guides, sensors, and self-correction loops is expensive. The goal of a good harness is not necessarily to eliminate human input; it is to direct human attention to where it matters most.

## A starting point and open questions

This mental model brings together techniques already appearing in practice and frames what remains unresolved. It moves the conversation above individual features such as Skills or MCP servers toward the strategic design of a control system that creates genuine confidence in agent output.

Examples from current practice include:

- [An OpenAI team documented its harness](https://openai.com/index/harness-engineering/): layered architecture enforced by custom linters and structural tests, plus recurring "garbage collection" that scans for drift and asks agents to propose fixes. Their conclusion was that the hardest challenges now center on designing environments, feedback loops, and control systems.
- [Stripe's write-up about its minions](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents) describes pre-push hooks that choose relevant linters heuristically, emphasizes shifting feedback left, and uses "blueprints" to integrate feedback sensors into agent workflows.
- Mutation testing and structural testing are computational feedback sensors that were underused and are now seeing renewed interest.
- LSP and code-intelligence integration are examples of computational feedforward guides.
- Thoughtworks teams are combining computational and inferential sensors to tackle architectural drift, including agents paired with custom linters and "janitor army" approaches to code quality.

Many questions remain. How do guides and sensors stay coherent as the harness grows? How far can agents be trusted to trade off conflicting instructions and feedback signals? If a sensor never fires, is quality high or detection weak? We need ways to evaluate harness coverage and quality comparable to code coverage and mutation testing. Feedforward and feedback are still scattered across delivery steps, leaving room for tooling that configures, synchronizes, and reasons about them as a system.

Building the outer harness is becoming an ongoing engineering practice, not a one-time configuration.
