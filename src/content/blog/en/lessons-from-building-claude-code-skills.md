---
translationKey: "lessons-from-building-claude-code-skills"
locale: "en"
title: "Experience building Claude Code: How we use Skills"
description: "Claude Code team's hands-on experience in designing, organizing, and maintaining Skills."
publishedAt: "2026-03-17"
updatedAt: "2026-03-17"
category: "development"
sourceLocale: "zh"
sourceUrl: "https://x.com/trq212/status/2033949937936085378"
sourceAuthor: "Thariq Shihipar"
contentType: "translation"
translationStatus: "draft"
---

![cover image](https://pbs.twimg.com/media/HDl2jn9a0AAZkyz?format=jpg&name=small)

Skills have become one of the most widely used extension points in Claude Code. They are flexible, easy to make, and simple to distribute.

But this flexibility also makes it difficult to know what is best practice. What kinds of Skills are worth making? What’s the secret to writing a good Skill? When should you share it with others?

At Anthropic, we use Skills heavily in Claude Code, with hundreds of Skills currently in active use. Here are our lessons learned on how to use Skills to speed up development.

---

## What are Skills?

If you are not familiar with Skills yet, I suggest you read [Our documentation](https://code.claude.com/docs/en/skills) or watch our latest [Agent Skills Course](https://anthropic.skilljar.com/introduction-to-agent-skills) first. This article assumes that you already have some understanding of Skills.

A misconception we often hear is that Skills are "just markdown files", but the most interesting part about Skills is that they are more than just text files. They are folders that can contain scripts, resources, data, etc., which agents can discover, explore, and manipulate.

In Claude Code, Skills also have [Rich configuration options](https://code.claude.com/docs/en/skills#frontmatter-reference), including registering dynamic hooks.

We've found that some of the most interesting Skills in Claude Code make creative use of these configuration options and folder structures.

---

## Types of Skills

After categorizing all of our Skills, we noticed that they clustered into a few common categories. The best Skills fit neatly into one category; the confusing ones span multiple categories. This isn’t an exhaustive list, but it’s a good way to think about it if you’re wondering if there are certain skills you’re missing within your organization.

![Skills Type Chart](https://pbs.twimg.com/media/HDlvMmubEAIzF-N?format=jpg&name=small)

---

### 1. Library and API reference

Skills that explain how to properly use a library, CLI, or SDK. These can be internal libraries or common libraries that Claude Code sometimes doesn't handle well. These Skills typically include a folder of reference code snippets and a list of pitfalls that Claude should avoid when writing scripts.

**Example:**

- **billing-lib** — Your internal billing library: edge cases, error-prone points, etc.
- **internal-platform-cli** — Every subcommand of your internal CLI wrapper, with examples of when to use them
- **frontend-design** — Let Claude better understand your design system

---

### 2. Product Verification

Skills that describe how to test or verify that code is working correctly. These are often paired with external tools (such as playwright, tmux, etc.) for verification.

Validating Skills is useful for ensuring that Claude's output is correct. It might be worth having an engineer spend a week perfecting your validation skills.

Consider some tricks like having Claude record a video of its output so you can see exactly what it's testing, or enforcing programmatic assertions on the state at each step. These are typically accomplished by including various scripts within the Skill.

**Example:**

- **signup-flow-driver** — runs the signup → email verification → bootstrap flow in a headless browser, with hooks that assert status at each step
- **checkout-verifier** — Use Stripe to test the card-driven checkout UI and verify that the invoice actually enters the correct state
- **tmux-cli-driver** — for interactive CLI testing when the content you are validating requires a TTY

---

### 3. Data acquisition and analysis

Skills that connect to your data and monitoring stack. These Skills may include libraries for using credentials to get data, specific dashboard IDs, etc., as well as instructions on common workflows or methods for getting data.

**Example:**

- **funnel-query** — "What events do I need to concatenate to see registration → activation → payment", and the table that actually has the canonical user_id
- **cohort-compare** — Compares retention or conversion rates of two cohorts, flags statistically significant differences, links to segment definitions
- **grafana** — data source UID, cluster name, issue → dashboard lookup table

---

### 4. Business process and team automation

Skills that automate repetitive workflows into one command. These Skills are typically simpler instructions, but may have more complex dependencies on other Skills or MCPs. For these Skills, saving previous results in a log file can help the model stay consistent and reflect on previous executions of the workflow.

**Example:**

- **standup-post** — Aggregates your ticket tracker, GitHub activity, and previous Slack → Formatted standup to show only changes
- **create-<ticket-system>-ticket** — Enforce mode (valid enum values, required fields) plus post-creation workflow (notify reviewers, link in Slack)
- **weekly-recap** — Merged PR + Closed Ticket + Deployment → Formatted recap post

---

### 5. Code scaffolding and templates

Skills that generate framework boilerplate code for specific functionality in the code base. You can use these Skills with composable scripts. They are particularly useful when your scaffolding has natural language requirements that cannot be covered purely with code.

**Example:**

- **new-<framework>-workflow** — scaffold new services/workflows/handlers with your annotations
- **new-migration** — your migration file template plus common pitfalls
- **create-app** — new internal app, pre-configured with your authentication, logging and deployment configuration

---

### 6. Code quality and review

Skills that enforce code quality within the organization and help review code. These can include deterministic scripts or tools for maximum robustness. You may want to run these Skills as part of a hook or automatically in a GitHub Action.

**Example:**

- **adversarial-review** — spawn a completely new sub-agent to criticize, implement fixes, and iterate until discovered issues become nitpicks
- **code-style** — enforce code style, especially styles that Claude doesn't do well by default
- **testing-practices** — Instructions on how to write tests and what to test

---

### 7. CI/CD and deployment

Skills that help you fetch, push, and deploy code in your code base. These Skills may reference other Skills to collect data.

**Example:**

- **babysit-pr** — Monitor PRs → Retry unstable CIs → Resolve merge conflicts → Enable automatic merges
- **deploy-<service>** — Build → Smoke test → Gradually roll out traffic and compare error rates → Automatic rollback on regression
- **cherry-pick-prod** — Isolated worktree → cherry-pick → conflict resolution → PR with templates

---

### 8. Operation manual

Skills to receive symptoms (such as Slack threads, alerts, or error signatures), investigate via multi-tools, and generate structured reports.

**Example:**

- **<service>-debugging** — Map symptoms for your highest traffic services → Tools → Query Patterns
- **oncall-runner** — Get alerts → Check for common suspects → Format findings
- **log-correlator** — Given a request ID, pull matching logs from every system that may touch it

---

### 9. Infrastructure operation and maintenance

Skills that perform routine maintenance and operating procedures—some of which involve destructive operations that benefit from guardrails. These make it easier for engineers to follow best practices in critical operations.

**Example:**

- **<resource>-orphans** — Find orphaned pods/volumes → publish to Slack → observation period → user confirmation → cascade cleanup
- **dependency-management** — Dependency approval workflow for your organization
- **cost-investigation** — "Why our storage/egress bills are skyrocketing", contains specific buckets and query patterns

---

## Tips for making Skills

![Tips for making Skills](https://pbs.twimg.com/media/HDoKg58bEAAL1bw?format=jpg&name=small)

Once you decide what skill you want to make, how do you write it? Here are some of the best practices, tips, and tricks we’ve discovered.

We also recently released [Skill Creator](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills), making it easier to create Skills in Claude Code.

---

### Don’t state the obvious

Claude Code knows a lot about your codebase, and Claude knows a lot about coding, including many default perspectives. If you're publishing a Skill that's primarily about knowledge, try to focus on information that will push Claude to think outside of his conventional way of thinking.

[frontend design skills](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) is a good example — it was built by one of Anthropic's engineers by iterating with clients to refine Claude's design tastes, avoiding classic patterns like Inter fonts and purple gradients.

---

### Building the Gotchas section

![Gotchas part](https://pbs.twimg.com/media/HDlwEG1bEAUdmcV?format=jpg&name=small)

The highest signal content in any Skill is the Gotchas section. These sections should build from common failure points that Claude encounters when using your Skill. Ideally, you'll update your skills over time to catch these pitfalls.

---

### Using file systems and progressive disclosure

![file system](https://pbs.twimg.com/media/HDlwhSjbEAIJSc9?format=jpg&name=small)

As mentioned before, Skill is a folder, not just a markdown file. You should think of the entire file system as a form of contextual engineering and progressive disclosure. Tell Claude what files are in your Skill and it will read them when appropriate.

The simplest form of progressive disclosure is to point to other markdown files for Claude to use. For example, you might split detailed function signatures and usage examples into references/api.md.

Another example: if your final output is a markdown file, you might include a template file in assets/ for copying and using.

You can have folders for references, scripts, examples, etc., which all help Claude work more efficiently.

---

### Avoid over-restraining Claude

Claude will usually try to follow your instructions, and because Skills are so reusable, you want to be careful about being too specific in your instructions. Give Claude the information it needs, but give it the flexibility to adapt to the situation. For example:

![Avoid over-restraint](https://pbs.twimg.com/media/HDlwurvbEAM5ZNu?format=jpg&name=small)

---

### Consider settings carefully

![set up](https://pbs.twimg.com/media/HDlw1mYbEAY-Bul?format=jpg&name=small)

Some Skills may require context settings from the user. For example, if you're making a Skill that publishes a chat to Slack, you might want Claude to ask which Slack channel to publish to.

A good pattern is to store this settings information in a config.json file in the Skill directory, as in the example above. If the configuration is not set, the agent can ask the user for information.

If you want the agent to render structured multiple-choice questions, you can instruct Claude to use the AskUserQuestion tool.

---

### Description field is for the model to see

When Claude Code starts a session, it builds a list of each available Skill and its description. This list is what Claude scans to determine if there is a Skill suitable for this request. This means that the description field is not a summary - it is a description of when this Skill was triggered.

![Description field](https://pbs.twimg.com/media/HDlw5ULbEAQOqtJ?format=jpg&name=small)

---

### Memory and data storage

![Memory and data storage](https://pbs.twimg.com/media/HDoImh1bEAU-mMI?format=jpg&name=small)

Some Skills can contain some form of memory by storing data within it. You can store data in something as simple as an append-only text log file or JSON file, or as complex as an SQLite database.

For example, a standup-post Skill might keep a standups.log of every post it has ever written, meaning that the next time you run it, Claude will read its own history and can tell what has changed since yesterday.

Data stored in the Skill directory may be deleted when you upgrade the Skill, so you should store it in a stable folder. As of today, we provide `${CLAUDE_PLUGIN_DATA}` as a stable folder for each plugin to store data.

---

### Storing scripts and generating code

One of the most powerful tools you can give Claude is code. Giving Claude scripts and libraries allows Claude to spend its turns on composition and deciding what to do next, rather than rebuilding boilerplate code.

For example, in your data science skill, you might have a library of functions that get data from an event source. To let Claude perform complex analysis, you can give it a set of helper functions, like this:

![Script example 1](https://pbs.twimg.com/media/HDlxbtkbkAAOse7?format=jpg&name=small)

Claude can then generate scripts on the fly to combine these features to perform more advanced analysis for prompts like "What happened on Tuesday?"

![Script example 2](https://pbs.twimg.com/media/HDlxfEIb0AA2E7l?format=jpg&name=small)

---

### On-demand hooks

Skills can contain hooks that are only activated when the Skill is called and persist for the duration of the session. This is for more assertive hooks that you don't want to run all the time but are sometimes extremely useful.

For example:

- **/careful** — Block rm -rf, DROP TABLE, force-push, kubectl delete on Bash via PreToolUse matcher. You only need this if you know you're going to touch production - leaving it on will drive you crazy
- **/freeze** — Block any Edit/Write not in a specific directory. Useful when debugging: "I want to add logs, but I keep accidentally 'fixing' irrelevant stuff"

---

## Distribute Skills

One of the biggest benefits of Skills is that you can share them with the rest of your team.

You may share Skills with others in two ways:

- Submit your Skills to your repository (under ./.claude/skills)
- Make a plugin and build a Claude Code plugin marketplace where users can upload and install plugins (read more in [document](https://code.claude.com/docs/en/plugin-marketplaces))

For smaller teams working in relatively few repositories, submitting Skills to repositories works well. But each submitted Skill also adds a little more context to the model. As you scale, the internal plugin marketplace allows you to distribute Skills and let your team decide which ones to install.

---

### Manage Market

How do you decide which Skills to bring to market? How do people submit them?

We don’t have a centralized team making decisions; instead, we try to find the most useful Skills organically. If you have a Skill you want people to try, you can upload it to a sandbox folder in GitHub and point to it in Slack or other forums.

Once a Skill gains traction (which is determined by the Skill owner), they can submit a PR to move it to the marketplace.

It’s important to note that it can be easy to create poor or redundant Skills, so it’s important to make sure you have some sort of curation approach before launching.

---

### Combination Skills

You may want to have Skills that depend on each other. For example, you might have a File Upload Skill that uploads files, and a CSV Generation Skill that generates a CSV and uploads it. This dependency management is not yet built natively into the Marketplace or Skills, but you can reference other Skills by name and the model will call them if they are installed.

---

### Measuring Skills

To understand how a Skill is performing, we use the PreToolUse hook, which allows us to log Skill usage within the company ([Sample code here](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5)). This means we can find popular Skills or Skills that are under-triggered compared to what we expected.

---

## Conclusion

Skills are very powerful and flexible tools for agents, but it’s early days and we’re all figuring out how to best use them.

Think of this more as a helpful bag of tips we've found work, rather than a definitive guide. The best way to understand Skills is to start, experiment, and see what works for you. Most of our Skills started with a few lines and a trap and got better as people kept adding to them as Claude encountered new edge cases.

Hope this helps, if you have any questions please let me know.
