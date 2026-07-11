---
translationKey: "lessons-from-building-claude-code-skills"
locale: "en"
title: "Lessons from Building Claude Code: How We Use Skills"
description: "What the Claude Code team has learned from designing, organizing, and maintaining hundreds of Skills."
publishedAt: "2026-03-17"
updatedAt: "2026-03-17"
category: "development"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2033949937936085378"
sourceAuthor: "Thariq Shihipar"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Cover image for Lessons from Building Claude Code: How We Use Skills](https://pbs.twimg.com/media/HDl2jn9a0AAZkyz?format=jpg&name=small)

Skills have become one of the most-used extension points in Claude Code. They are flexible, easy to make, and simple to distribute.

That flexibility also makes it hard to know what works best. What kinds of Skills are worth making? What is the secret to writing a good Skill? When should you share one with other people?

At Anthropic, we use Skills extensively in Claude Code, with hundreds in active use. These are the lessons we have learned about using Skills to accelerate development.

---

## What are Skills?

If you are new to Skills, start by [reading the documentation](https://code.claude.com/docs/en/skills) or taking the latest [Skilljar course on Agent Skills](https://anthropic.skilljar.com/introduction-to-agent-skills). This article assumes some familiarity with them.

A common misconception is that Skills are "just markdown files." The interesting part is that they are not merely text files: they are folders that can include scripts, assets, data, and other resources that an agent can discover, explore, and manipulate.

In Claude Code, Skills also have a [wide variety of configuration options](https://code.claude.com/docs/en/skills#frontmatter-reference), including dynamic hooks.

Some of the most interesting Skills use these configuration options and their folder structure creatively.

---

## Types of Skills

After cataloging our Skills, we noticed that they cluster into a few recurring categories. The best Skills fit cleanly into one category; the confusing ones straddle several. This is not a definitive list, but it is a useful way to think about what might be missing inside your organization.

![Chart of common Skill categories](https://pbs.twimg.com/media/HDlvMmubEAIzF-N?format=jpg&name=small)

---

### 1. Library & API Reference

Skills that explain how to use a library, CLI, or SDK correctly. They may cover internal libraries or common tools that Claude Code sometimes struggles with. These Skills often include reference code snippets and a list of Gotchas for Claude to avoid when writing scripts.

**Examples:**

- **billing-lib** - Your internal billing library: edge cases, footguns, and other failure-prone details
- **internal-platform-cli** - Every subcommand in your internal CLI wrapper, with examples of when to use each one
- **frontend-design** - Make Claude better at applying your design system

---

### 2. Product Verification

Skills that explain how to test or verify that code works. They are often paired with external tools such as Playwright or tmux.

Verification Skills are extremely useful for ensuring that Claude's output is correct. It can be worth having an engineer spend a week making them excellent.

Consider techniques such as recording a video so you can see exactly what Claude tested, or enforcing programmatic assertions on state at every step. These capabilities are often implemented with scripts inside the Skill.

**Examples:**

- **signup-flow-driver** - Runs signup -> email verification -> onboarding in a headless browser, with hooks that assert state at each step
- **checkout-verifier** - Drives the checkout UI with Stripe test cards and verifies that the invoice lands in the correct state
- **tmux-cli-driver** - Tests interactive CLIs when the workflow requires a TTY

---

### 3. Data Fetching & Analysis

Skills that connect to data and monitoring stacks. They may include libraries that fetch authenticated data, specific dashboard IDs, and instructions for common workflows or queries.

**Examples:**

- **funnel-query** - Which events to join for signup -> activation -> paid, plus the table containing the canonical `user_id`
- **cohort-compare** - Compares retention or conversion across two cohorts, flags statistically significant differences, and links to segment definitions
- **grafana** - Data source UIDs, cluster names, and a problem-to-dashboard lookup table

---

### 4. Business Process & Team Automation

Skills that turn repetitive workflows into one command. Their instructions are often simple, but they may depend on other Skills or MCPs. Saving previous results in log files can help the model stay consistent and reflect on earlier runs.

**Examples:**

- **standup-post** - Aggregates a ticket tracker, GitHub activity, and prior Slack posts into a formatted, delta-only standup
- **create-<ticket-system>-ticket** - Enforces a schema with valid enum values and required fields, then runs the post-creation workflow such as notifying a reviewer and linking the ticket in Slack
- **weekly-recap** - Turns merged PRs, closed tickets, and deployments into a formatted recap post

---

### 5. Code Scaffolding & Templates

Skills that generate framework boilerplate for a specific function in a codebase. They can combine natural-language guidance with composable scripts, which is especially useful when scaffolding requirements cannot be captured entirely in code.

**Examples:**

- **new-<framework>-workflow** - Scaffolds a new service, workflow, or handler with your annotations
- **new-migration** - Provides your migration template and common Gotchas
- **create-app** - Creates an internal app with authentication, logging, and deployment configuration already wired up

---

### 6. Code Quality & Review

Skills that enforce code quality inside an organization and help review code. They can include deterministic scripts or tools for greater robustness, and may run automatically through hooks or GitHub Actions.

**Examples:**

- **adversarial-review** - Spawns a fresh-eyed subagent to critique the work, implements fixes, and iterates until the findings degrade to nitpicks
- **code-style** - Enforces code styles that Claude does not handle well by default
- **testing-practices** - Explains how to write tests and what to test

---

### 7. CI/CD & Deployment

Skills that help fetch, push, and deploy code. They may invoke other Skills to collect data.

**Examples:**

- **babysit-pr** - Monitors a PR -> retries flaky CI -> resolves merge conflicts -> enables auto-merge
- **deploy-<service>** - Builds -> smoke-tests -> gradually rolls out traffic while comparing error rates -> rolls back automatically on regression
- **cherry-pick-prod** - Creates an isolated worktree -> cherry-picks -> resolves conflicts -> opens a PR with the correct template

---

### 8. Runbooks

Skills that take a symptom such as a Slack thread, alert, or error signature, walk through a multi-tool investigation, and produce a structured report.

**Examples:**

- **<service>-debugging** - Maps symptoms -> tools -> query patterns for high-traffic services
- **oncall-runner** - Fetches the alert -> checks the usual suspects -> formats the findings
- **log-correlator** - Given a request ID, pulls matching logs from every system that may have touched it

---

### 9. Infrastructure Operations

Skills that perform routine maintenance and operational procedures. Some involve destructive actions and benefit from strong guardrails. They make it easier for engineers to follow best practices during critical operations.

**Examples:**

- **<resource>-orphans** - Finds orphaned pods or volumes -> posts to Slack -> waits through a soak period -> asks for user confirmation -> performs cascading cleanup
- **dependency-management** - Implements the organization's dependency approval workflow
- **cost-investigation** - Investigates why storage or egress costs spiked, with the relevant buckets and query patterns

---

## Tips for Making Skills

![Summary graphic of tips for making Skills](https://pbs.twimg.com/media/HDoKg58bEAAL1bw?format=jpg&name=small)

Once you have chosen a Skill to build, how should you write it? These are some of the practices and techniques that have worked best for us.

We also recently released [Skill Creator](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills) to make Skills easier to create in Claude Code.

---

### Don't State the Obvious

Claude Code already knows a great deal about your codebase, and Claude knows a great deal about programming, including many default opinions. If a Skill is primarily about knowledge, focus on information that pushes Claude beyond its normal way of thinking.

The [frontend design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) is a strong example. An Anthropic engineer built it by iterating with customers to improve Claude's design taste and avoid familiar defaults such as the Inter font and purple gradients.

---

### Build a Gotchas Section

![Example Gotchas section](https://pbs.twimg.com/media/HDlwEG1bEAUdmcV?format=jpg&name=small)

The highest-signal content in any Skill is often the Gotchas section. Build it from common failure points Claude encounters while using the Skill, and keep updating it as new Gotchas appear.

---

### Use the File System & Progressive Disclosure

![Skill folder structure used for progressive disclosure](https://pbs.twimg.com/media/HDlwhSjbEAIJSc9?format=jpg&name=small)

A Skill is a folder, not just a markdown file. Treat the entire file system as a form of context engineering and progressive disclosure. Tell Claude which files the Skill contains, and it can read them when they become relevant.

The simplest form of progressive disclosure is to point Claude to other markdown files. For example, detailed function signatures and usage examples can live in `references/api.md`.

If the final output is a markdown document, the Skill can include a template under `assets/` for Claude to copy and use.

Folders for references, scripts, examples, and other resources help Claude work more effectively.

---

### Avoid Railroading Claude

Claude generally tries to follow instructions closely. Because Skills are highly reusable, overly specific instructions can make them brittle. Give Claude the information it needs while preserving enough flexibility to adapt to the situation.

![Example comparing flexible guidance with overly restrictive instructions](https://pbs.twimg.com/media/HDlwurvbEAM5ZNu?format=jpg&name=small)

---

### Think through the Setup

![Example Skill setup configuration](https://pbs.twimg.com/media/HDlw1mYbEAY-Bul?format=jpg&name=small)

Some Skills need context from the user during setup. For example, if a Skill posts a standup to Slack, Claude may need to ask which Slack channel to use.

A good pattern is to store setup information in a `config.json` file inside the Skill directory. If the configuration is missing, the agent can ask the user for it.

To present structured multiple-choice questions, instruct Claude to use the AskUserQuestion tool.

---

### The Description Field Is For the Model

When Claude Code starts a session, it builds a list of every available Skill and its description. Claude scans that list to answer: "Is there a Skill for this request?" The description is therefore not a summary; it describes when the model should trigger the Skill.

![Example of a Skill description written for model triggering](https://pbs.twimg.com/media/HDlw5ULbEAQOqtJ?format=jpg&name=small)

---

### Memory & Storing Data

![Example of storing memory and data for a Skill](https://pbs.twimg.com/media/HDoImh1bEAU-mMI?format=jpg&name=small)

Some Skills can include memory by storing data. That can be as simple as an append-only text log or JSON file, or as complex as a SQLite database.

For example, a `standup-post` Skill might keep `standups.log` with every post it has written. On the next run, Claude can read that history and identify what changed since yesterday.

Data inside the Skill directory may be deleted when the Skill is upgraded. Store durable data in a stable location; as of today, `${CLAUDE_PLUGIN_DATA}` provides one stable folder per plugin.

---

### Store Scripts & Generate Code

One of the most powerful things you can give Claude is code. Scripts and libraries let Claude spend its turns composing capabilities and deciding what to do next instead of rebuilding boilerplate.

For example, a data science Skill might include functions that fetch data from an event source. Give Claude a set of helper functions so it can compose more complex analyses:

![Example library of helper functions inside a Skill](https://pbs.twimg.com/media/HDlxbtkbkAAOse7?format=jpg&name=small)

Claude can then generate scripts on the fly to combine those functions for prompts such as "What happened on Tuesday?"

![Example script generated by Claude from helper functions](https://pbs.twimg.com/media/HDlxfEIb0AA2E7l?format=jpg&name=small)

---

### On Demand Hooks

Skills can define hooks that activate only when the Skill is called and remain active for the session. Use this for opinionated protections that would be disruptive if they ran all the time but are valuable in specific situations.

Examples:

- **/careful** - Uses a PreToolUse matcher on Bash to block `rm -rf`, `DROP TABLE`, force-push, and `kubectl delete`. Enable it when touching production; leaving it on permanently would be maddening.
- **/freeze** - Blocks any Edit/Write outside a specific directory. It is useful while debugging when you want to add logs without accidentally "fixing" unrelated code.

---

## Distributing Skills

One of the biggest benefits of Skills is that they can be shared with the rest of the team.

There are two common distribution paths:

- Check Skills into the repository under `./.claude/skills`
- Build a plugin and a Claude Code plugin marketplace where users can install it; see the [plugin marketplace documentation](https://code.claude.com/docs/en/plugin-marketplaces)

For smaller teams working across relatively few repositories, checking Skills into each repository works well. Every checked-in Skill adds a little context for the model, however. At larger scale, an internal plugin marketplace lets the organization distribute Skills while each team chooses what to install.

---

### Managing a Marketplace

How should a team decide which Skills enter the marketplace, and how should people submit them?

At Anthropic, no centralized team makes every decision. Useful Skills emerge organically. An owner can upload a Skill to a sandbox folder in GitHub and point people to it in Slack or another forum.

Once the Skill has gained enough traction, as judged by its owner, they can open a PR to move it into the marketplace.

Poor or redundant Skills are easy to create, so some form of curation is important before release.

---

### Composing Skills

Skills may depend on one another. A file-upload Skill might upload files, while a CSV-generation Skill creates a CSV and then invokes the upload Skill. Marketplaces and Skills do not yet have native dependency management, but a Skill can reference another by name and the model will invoke it when installed.

---

### Measuring Skills

To understand how a Skill performs, we use a PreToolUse hook that logs Skill usage inside the company. The [example code](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5) shows the approach. This reveals which Skills are popular and which trigger less often than expected.

---

## Conclusion

Skills are powerful, flexible tools for agents, but the field is still young and everyone is learning how to use them well.

Treat these lessons as a grab bag of useful techniques rather than a definitive guide. The best way to understand Skills is to start, experiment, and observe what works. Most of our Skills began as a few lines and a single Gotcha, then improved as people added new lessons whenever Claude encountered another edge case.

I hope this was helpful. Let me know if you have questions.
