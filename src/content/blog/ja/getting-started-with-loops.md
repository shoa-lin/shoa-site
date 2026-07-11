---
translationKey: "getting-started-with-loops"
locale: "ja"
title: "Claude Code のループ入門：手動ターンからプロアクティブ・ループまで"
description: "ターンベース、ゴールベース、時間ベース、プロアクティブの各ループが何をきっかけに動き、どう停止し、どの場面に適するかを解説します。"
publishedAt: "2026-07-07"
updatedAt: "2026-07-07"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/getting-started-with-loops"
sourceAuthor: "Delba de Oliveira, Michael Segner"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Getting started with loops のカバー画像](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6903d229e73ca2d0d73d78f7_682ac293884c9d4ee4ebe2355a2f6c4ecfdd9c1b-1000x1000.svg)

---

いま、コーディングエージェントにただプロンプトを与えるのではなく、「ループを設計する」ことが盛んに語られています。ループとは何かを確かめようと X を少し眺めるだけでも、いくつもの異なる答えが見つかるでしょう。

Claude Code チームは、ループを「停止条件が満たされるまで、エージェントが作業サイクルを繰り返す仕組み」と定義しています。チームは主に次の観点でループを分類しています。

1. 何がループを起動するか。
2. ループがどう停止するか。
3. Claude Code のどの基本機能を使うか。
4. どのようなタスクに最も適しているか。

この記事では、主なループの種類、それぞれを使う場面、そしてトークン使用量を管理しながらコード品質を保つ方法を説明します。すべてのタスクに複雑なループが必要なわけではありません。まず最も単純な方法から始め、適合する箇所にだけ、これらのパターンを選んで適用してください。

## 4 種類のループ

原文では、ターンベース・ループ（Turn-based loop）、ゴールベース・ループ（Goal-based loop）、時間ベース・ループ（Time-based loop）、プロアクティブ・ループ（Proactive loop）の 4 種類を取り上げています。違いは単なる「自動化の度合い」ではありません。それぞれ起動条件、停止条件、タスクの境界が異なります。

### ターンベース・ループ

![ターンベース・ループの図](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98c_8ace2295.png)

- **起動条件**：ユーザーのプロンプト。
- **停止条件**：Claude がタスクを完了した、または追加のコンテキストが必要だと判断したとき。
- **適する用途**：定例プロセスやスケジュールの一部ではない、短い単発タスク。
- **使用量の管理方法**：具体的なプロンプトを書き、スキルで検証を改善してターン数を減らす。

送信するプロンプトの一つひとつが、あなた自身が各ターンを指揮する手動ループを開始します。Claude はコンテキストを集め、作業し、結果を確認し、必要なら繰り返してから応答します。これが原文でいう agentic loop です。

たとえば、Claude に「いいね」ボタンの作成を頼むとします。Claude はコードを読み、編集し、テストを実行して、動作すると判断した結果を返します。あなたはその結果を確認し、次のプロンプトを書きます。

手作業で行っている確認を `SKILL.md` に記述すれば、この検証工程を改善し、Claude 自身がより広い範囲をエンドツーエンドで確認できるようになります。この種の自動化でスキル、フック、サブエージェントをどう使い分けるかについては、[steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) を参照してください。スキルには、結果を確認、計測、操作できるツールやコネクターを与える必要があります。確認項目を定量化できるほど、Claude は自分の作業を検証しやすくなります。

たとえば、フロントエンドを検証するスキルは次のように書けます。

```markdown
---
name: verify-frontend-change
description: Verify any UI change end-to-end before declaring it done.
---

# Verifying frontend changes

Never report a UI change as complete based on a successful edit alone. Verify it the way a human reviewer would:

1. Start the dev server and open the edited page in the browser.
2. Interact with the change directly. For a new control (button, input, toggle): click it, confirm the expected state change, and screenshot before/after.
3. Check the browser console: zero new errors or warnings.
4. Use the Chrome Devtools MCP, run a performance trace and audit Core Web Vitals.

If any step fails, fix the issue and rerun from step 1 — do not hand back partially verified work.
```

重要なのは、万能なスキルを一つ作ることではありません。あなたが実際に考える「完了」の定義を明文化することです。そうしなければ、Claude はいつ停止すべきかを自分の判断だけで決めることになります。

### ゴールベース・ループ

![ゴールベース・ループの図](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98f_c6fa9ae5.png)

- **起動条件**：リアルタイムで入力する手動プロンプト。
- **停止条件**：目標を達成したとき、または最大ターン数に達したとき。
- **適する用途**：終了条件を検証できるタスク。
- **使用量の管理方法**：具体的な完了条件と、「5 回試したら停止」のような明示的なターン上限を設定する。

特に複雑なタスクでは、1 ターンだけでは足りないことがあります。一般にエージェントは、反復できるほうが高い成果を出します。`/goal` では、何をもって完了とするかを定義し、Claude が目標に向けて作業を続けられる余地を与えます。

成功条件を定義しておけば、「十分に良い」の基準を Claude 自身が決める必要がなくなり、ループを早く終えすぎる可能性が下がります。Claude が停止しようとするたびに評価モデルが条件を確認します。条件を満たしていなければ、目標を達成するかターン上限に達するまで、Claude を作業に戻します。

このため、成功したテスト数、スコアのしきい値、空のエラー一覧といった決定的に判定できる基準が特に有効です。

たとえば、次のように指定します。

```text
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries.
```

要点は、停止する権限を、エージェントの主観的な完了感から、検証可能な条件へ移すことです。

### 時間ベース・ループ

- **起動条件**：指定した時間間隔。
- **停止条件**：ユーザーが取り消したとき、または PR のマージやキューの空状態など、作業が完了したとき。
- **適する用途**：定期的な作業、または外部環境や外部システムと連動するタスク。
- **使用量の管理方法**：実行間隔を長くするか、固定間隔で状態を確認せず、イベントに反応する。

エージェントに任せる作業の中には、タスク自体は同じまま入力だけが変わる反復作業があります。毎朝 Slack メッセージを要約する仕事が一例です。また、外部システムに依存する作業では、定期的に状態を確認して変化に対応するのが単純な運用方法です。たとえば PR にはレビューコメントが付いたり、CI が失敗したりします。

このような場合、`/loop` を使って一定間隔でプロンプトを再実行できます。たとえば次のようにします。

```text
/loop 5m check my PR, address review comments, and fix failing CI
```

`/loop` は手元のコンピューターで動作するため、コンピューターの電源を切ると停止します。ループをクラウドへ移すには、`/schedule` で定期処理を作成します。

大切なのは、対象システムが実際に変化する頻度より高い頻度で定期処理を実行しないことです。1 時間に 1 回しか変わらないキューを毎分スキャンすれば、不要なトークンを消費します。

### プロアクティブ・ループ

![プロアクティブ・ループの図](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d989_eb9e496a.png)

- **起動条件**：イベントまたはスケジュール。人がその場にいる必要はない。
- **停止条件**：各タスクは目標を達成すると終了する。定期処理自体は、ユーザーが無効にするまで継続する。
- **適する用途**：バグ報告、issue の振り分け、移行、依存関係の更新など、明確に定義された作業が繰り返し到着するケース。
- **使用量の管理方法**：定期処理は小さく高速なモデルに割り当て、高性能なモデルは判断が必要な場面に限定する。

プロアクティブ・ループとは、人がリアルタイムで指示しなくても、イベントやスケジュールをきっかけに自律的に動くループです。ここまでに挙げた基本機能を、auto mode や dynamic workflows（research preview）など Claude Code のほかの機能と組み合わせると、長時間稼働する作業のループを構成できます。

たとえば、継続的に届くフィードバックを処理するには、次の機能を組み合わせます。

1. `/schedule`（research preview）で、新しい報告を確認する定期処理を実行する。
2. `/goal` で完了条件を定義し、スキルに検証方法を記述する。
3. dynamic workflows で、各報告を振り分け、問題を修正し、その修正をレビューするエージェントを連携させる。
4. auto mode を使い、各ステップで許可を求めて停止せずに定期処理を実行できるようにする。

これらをまとめると、プロンプトは次のようになります。

```text
/schedule every hour: check #project-feedback for bug reports. /goal: don't stop until every report found this run is triaged, actioned, and responded to. When fixing a bug, use a workflow to explore three solutions in parallel worktrees and have a judge adversarially review them.
```

これは単に長いプロンプトを書く話ではありません。起動条件、停止条件、並行探索、レビュー、権限境界を、一つの実行システムに組み込むということです。

## コード品質を維持する

ループの出力品質は、その周囲にあるシステムによって決まります。原文では、次の設計原則が強調されています。

1. **コードベース自体をきれいに保つ**：Claude は、コードベースにすでに存在するパターンと規約に従います。乱雑なコードベースは、ループが増幅する乱雑なパターンを与えてしまいます。
2. **Claude が自分の作業を検証できるようにする**：[スキル](https://code.claude.com/docs/en/skills) を使い、あなたとチームにとっての良い状態を記述します。
3. **ドキュメントへ容易にアクセスできるようにする**：フレームワークやライブラリのドキュメントには現在のベストプラクティスがあり、Claude がそれを参照できる必要があります。
4. **コードレビューに 2 番目のエージェントを使う**：新しいコンテキストを持つレビュアーはバイアスが少なく、メインエージェントの推論にも影響されません。組み込みの `/code-review` スキルまたは GitHub の [Code Review](https://code.claude.com/docs/en/code-review) を利用できます。

個別の結果が期待に届かなかったときは、その問題だけを直して終わりにしないでください。失敗をシステムへ戻し、以後のすべての反復で活かせるようにします。失敗は単発の修正ではなく、スキル、テスト、スクリプト、ルール、レビュー基準のいずれかに変えるべきです。

## トークン使用量を管理する

トークン使用量を制御するには、ループに明確な境界が必要です。原文の助言は次のようにまとめられます。

1. **タスクに適した基本機能とモデルを選ぶ**：小さなタスクに、複数のエージェントや複雑なループは必要ありません。より安価で高速なモデルを使える作業もあります。
2. **成功条件と停止条件を明確に定義する**：具体的であるほど、Claude は早く停止しすぎず、より短時間で解決へ到達できます。
3. **大規模実行の前に試行する**：dynamic workflows は多数のエージェントを生成できます。まず作業の小さな範囲で使用量を見積もります。
4. **結果が一意に決まる処理にはスクリプトを使う**：同じ手順を毎回モデルに推論させるより、スクリプトの実行のほうが安価です。たとえば PDF スキルにフォーム入力用スクリプトを含めれば、Claude はコードを書き直さず、そのスクリプトを直接実行できます。
5. **必要以上の頻度で定期処理を実行しない**：実行間隔を、観測対象システムの実際の変化率に合わせます。
6. **使用量を確認する**：`/usage` は直近の使用量をスキル、サブエージェント、MCP 別に表示します。引数なしの `/goal` は現在のターン数とトークン使用量を示します。`/workflows` は各エージェントのトークン使用量を表示し、いつでも停止できます。

[Model and effort level](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) の選択も、ループのコストを左右する大きな要因です。

要するに、ループはエージェントを永遠に走らせる仕組みではありません。明示した境界の中で、エージェントに作業を反復させる仕組みです。

## 始め方

原文の最後には、各ループに作業のどの部分を委ねるのかを比較する表があります。

| ループ | 委ねるもの | 使う場面 | 選ぶ機能 |
| --- | --- | --- | --- |
| ターンベース・ループ | 確認 | 探索中、または判断中 | 独自の検証スキル |
| ゴールベース・ループ | 停止条件 | 完了の定義が明確 | `/goal` |
| 時間ベース・ループ | 起動条件 | 作業がプロジェクト外でスケジュールに従って発生する | `/loop`, `/schedule` |
| プロアクティブ・ループ | プロンプト | 作業が反復的で明確に定義されている | 上記すべてと dynamic workflows |

ループを始めるには、まず普段の自分の作業を見直します。自分がボトルネックになっているタスクを一つ選び、次のように問いかけてください。検証項目を書き出せるか。目標は完了を判定できるほど明確か。作業はスケジュールまたは外部イベントによって到着するか。

アイデアが決まったらループを実行します。どこで止まり、どこで行き過ぎるかを観察し、システムを反復的に改善してください。

詳しくは、Claude Code の [parallel agents](https://code.claude.com/docs/en/agents)、[loop](https://code.claude.com/docs/en/goal)、[schedule](https://code.claude.com/docs/en/routines)、[goal](https://code.claude.com/docs/en/goal)、[dynamic workflows](https://code.claude.com/docs/en/workflows#orchestrate-subagents-at-scale-with-dynamic-workflows) に関するドキュメントを参照してください。
