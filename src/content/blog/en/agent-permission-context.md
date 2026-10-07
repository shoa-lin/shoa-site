---
translationKey: "agent-permission-context"
locale: "en"
title: "What It Can Touch, What It Knows: Why Agents Keep Changing Shape"
description: "An agent only gets work done where 'can act' and 'knows the situation' overlap. Following those two axes, trace how agents moved from the repository to the computer, to the channel, and finally to an identity of their own."
publishedAt: "2026-10-05"
updatedAt: "2026-10-05"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/agent-permission-context/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Over the past year or so, agent products have been changing shape fast. First came coding assistants in the terminal and the IDE, then desktop apps and bots inside chat software. Later, some vendors gave the agent a cloud computer of its own, some pulled it into the team channel, and some gave it its own email address and phone number.

At first glance it looks like every vendor is just trying on new shells. I use two questions to make sense of the changes:

- **Permission**: what is the agent allowed to act on?
- **Context**: what does the agent know, and what can it keep?

An agent only gets work done where the two overlap. Knowing the situation without being able to act makes it a consultant; being able to act without knowing the situation makes it a stranger holding your keys. So my view is this: **an agent's form is the place where permission and context overlap.** Every time a product changes form, it pushes that overlap outward by one ring: one axis breaks out first, and the other catches up.

## Start With a Map

![Permission × context map: the horizontal axis is permission scope, the vertical axis is context scope, and seven groups of products are placed on it](/assets/blog/agent-permission-context/map-en.svg)

*Caption: the further right on the horizontal axis, the more the agent can act on, and the harder mistakes are to undo. Where each product sits is my judgment, not the vendor's claim.*

This map looks at only two things: who sits on the diagonal, with both axes advancing together, and who has drifted off it, with one axis running ahead. The sections below work through it one step at a time, and each section follows from the one before.

## Why Coding Broke Out First

In a chat box, the agent knows what you said, but all it can do is answer. The work is still yours to do.

A repository is different: it packs both axes into the same directory. The code, the commit history, and the tests are the context the agent needs; editing files and running commands are its permission. More important, what it does with that permission can be walked back: if an edit breaks something, git can revert it, and the tests can check whether the edit was right. When actions can be undone, granting a bit more permission is nothing to fear.

In May 2025, OpenAI released Codex, which runs engineering tasks in parallel in isolated environments; a few days later Claude Code became generally available, with its changes landing directly in the files in your VS Code or JetBrains. Both companies started from the repository, independently.

![Comparison: in a chat box, context and permission barely overlap; in a repository, they overlap heavily](/assets/blog/agent-permission-context/repo-en.svg)

*Caption: the repository is the first place where the situation is all there and mistakes can be undone.*

So, to judge when a domain is ready to hand to an agent, first look for a place like this: the context is complete, and the actions can be reversed.

## Leaving the Repository, the Road Forks

Once you leave the repository, things get hard. Your context is scattered across chat histories, files, and assorted accounts; the places where an agent could act are scattered across a pile of websites and apps with no API. With no ready-made place that holds both at once, the road splits.

One route thickens context first: put the agent inside the chat software you already use, and keep the memory and sessions on your side. OpenClaw uses a gateway to connect to channels like WhatsApp, Telegram, and Slack, with the workspace, memory files, sessions, and secrets all in the user's hands; Hermes's command line, desktop app, and messaging gateway share a single set of sessions and configuration.

The other route widens permission first: just give the agent a computer. A graphical interface plus a logged-in browser is the most general way to deal with "things that have no API." Grok Bot works on a persistent cloud computer with a browser, a file system, and a terminal, and it logs in to the tools and websites you already use; Muse gives each person a secure virtual machine with a browser, and it keeps working after you close the app.

![Fork diagram: after leaving the repository, one route thickens context first and the other widens permission first; both end up having to fill in the other axis](/assets/blog/agent-permission-context/fork-en.svg)

*Caption: whichever axis runs ahead, the other is the debt that comes due next.*

## Approval Is Humans Filling In Context

Take the permission route first and you hit a problem right away. A computer logged in to your accounts can click any button, but it does not know which actions you would stand behind: what your budget is, what your relationship with the recipient is, where your lines are.

Every approval prompt that pops up at this point is really the agent asking you for the piece of context it is missing. Writing the rules down in advance hands that context over in one go. Dots does this by letting you sort actions into three tiers: allowed, needs approval, forbidden. Muse asks you before sending mail or making a purchase, and it keeps a record.

![Diagram: permission extends past context, and the gap is filled by pop-up approvals, rules written in advance, and accumulated memory and preferences](/assets/blog/agent-permission-context/approval-en.svg)

*Caption: lots of approval prompts means the two axes are far apart.*

So "how many times you have to approve per task" can be read as a gauge of how far apart permission and context are. To bring it down, the fix is to add context: rules, memory, preferences. Not to tear out the gate.

There is one piece of context that is deliberately withheld: passwords. Muse puts credentials in secure storage, and the model cannot see your passwords or payment methods. The agent can use them, but it cannot see them.

## Entry Points Converge on Where Context Accumulates

Look back at the route that grew context first, and it shows something else.

Whether the entry point is a terminal, chat software, a desktop app, or WhatsApp does not change what the agent can touch or what it knows, so entry points can be opened and closed freely. What actually accumulates, bit by bit, is context: memory, skills, sessions, threads. And that is exactly what you lose when you switch products.

So vendors are pulling entry points in toward wherever context accumulates, while the execution environment that does the actual work retreats into the background and becomes a swappable backend. The new ChatGPT desktop folds Chat, Work, and Codex into one shell; Dots launches tasks in Codex or Work, and those tasks are metered the way they always were. Hermes's Bot Mode is just a desktop plugin; turn it off and the profile and sessions are still there. The interface can be taken apart; the state stays.

So an agent's real moat is the state it has accumulated on your behalf. Export, forget, reset, isolate: these have to be treated as core product features.

## Team Tasks: The Channel Cuts Both Axes Together

Once context belongs to several people, a new problem appears. A team's situation is spread across each of its members, and a single-user agent sees only one person's context and can use only one person's permissions.

A channel solves both ends at once. Claude Tag is Claude for teams, inside Slack: admins grant it tools, data, and codebases per channel, and anyone in the channel can @ it to hand off work; each channel gets its own Claude, everything it does is visible to the whole channel, and admins can set spending caps and read the action log. The boundary of permission and the boundary of context land on the same channel. That is why it can sit in the top-right corner of the map.

Compare Hermes's Bot Mode: several named bots, each with its own role, model, memory, and skills, able to chat in a group and message each other, but all belonging to the same user. That is one person's context split into several parts; it has not yet touched anyone else's context.

So when building a team agent, first find where the team's context already accumulates (channels, projects, repositories) and hang the permissions there, not on any one person.

## Identity: Slicing Permission as Finely as Context

On the last ring outward, the problem is that the agent logs in as you. It operates under your identity, so it gets all of your permissions: they cannot be sliced any smaller, and they cannot be revoked separately. To revoke them, you have to revoke yourself along with them.

With more agents, the problem gets amplified. Grok Bot is a good example: several Bots share one cloud computer, each with its own screen; conversations and what they have learned are kept separate per Bot, but the files and browser login state are shared. Context has been sliced per Bot; permission is still one account's worth.

![Diagram: several Bots each have their own context but share the whole account's permissions; once each agent has its own identity, both context and permission are sliced per agent](/assets/blog/agent-permission-context/identity-en.svg)

*Caption: every Bot holds all of the permissions but knows only part of the situation.*

Giving an agent an identity of its own is the most direct way to slice permission as finely as context. Cue gives each agent its own email address, phone number, wallet, and computer, and it can only pay within the budget you set; Dots's specialist dot has its own identity and IT-provisioned hardware and can connect to company systems, though for now it is still in preview. Permission then becomes something that can be issued, capped, and revoked on its own, rather than a stretch of login state lent to the agent.

Some will ask whether identity counts as a third axis. My view is that rather than another step to the right on the horizontal axis, it is asking a different question: who does this permission belong to?

## Closing

Every change of form comes down to the same thing: one axis breaks out first, the other catches up, and a new product grows where they overlap. The next time you see a new agent, don't rush to look at what the entry point looks like. Two questions are enough: what can it touch, and what does it know?
