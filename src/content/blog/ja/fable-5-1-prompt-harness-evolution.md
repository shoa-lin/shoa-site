---
translationKey: "fable-5-1-prompt-harness-evolution"
locale: "ja"
title: "Fable 5 から Fable 5.1 へ：System Prompt は Agent OS になり始めている"
description: "2 世代の Claude Runtime Prompt を比較し、Memory、Past Chats、Skills、ツールルーティング、安全ガバナンスの構造的変化と Agent Harness の次の方向を読み解く。"
publishedAt: "2026-09-02"
updatedAt: "2026-09-02"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/fable-5-1-prompt-harness-evolution/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## 先に結論

Anthropic は 2026 年 9 月 1 日に Claude Fable 5.1 を公開した。多くの議論はモデル性能、価格、ベンチマークに集中している。しかし私がより注目したのは、見た目は地味でも製品の方向性をよく示す資料、つまり **Claude が実際の製品内で動作するときに使われる System Prompt と Runtime Prompt** である。

私は、2026 年 6 月 9 日の Fable 5 完全 Runtime Prompt アーカイブと、2026 年 9 月 2 日に取得した Fable 5.1 Runtime Prompt のスナップショットを比較した。前者は約 1,580 行、126,943 バイト、後者は 2,195 行、275,723 バイトである。ツール定義も 18 個から 44 個に増えている。

ただし、これは単純に「Prompt が 2 倍になった」という話ではない。ファイルサイズの多くは Tool Schema、例、動的な実行環境の説明によるものだ。**長さは知能ではなく、製品能力そのものでもない。**重要なのは構造である。

> Fable 5 はすでに Tools、Skills、MCP、Artifacts を備えた Agent だった。Fable 5.1 はそこに Memory、過去会話、能力探索、出力ルーティング、権限、安全ガバナンスを整理し、より完全な Agent Runtime を形成し始めている。

つまり、Claude を取り巻く Harness は「モデルにツールを付ける」段階から、「モデルにオペレーティングシステムを与える」段階へ移っている。

## まず比較範囲を明確にする

この記事が比較するのは、モデルの重み、学習データ、Anthropic のサーバー側ソースコードではない。比較対象は、観測可能な 2 つの **Prompt と Runtime 設定のスナップショット** である。

Anthropic が公開している System Prompt ページは、主に claude.ai とモバイルアプリで使われる中核的な行動指示を示す。一方、完全な Runtime スナップショットには、そのセッションで利用可能なツール定義、Skills、ファイルシステム規則、ネットワーク権限、ユーザーコンテキストのプレースホルダー、製品内ルーティング方針も含まれる。本稿では、この全体を **Runtime Prompt Bundle** と呼ぶ。

したがって、この比較から「製品がモデル周辺の能力をどう組織しているか」はかなり読み取れる。しかし、基盤モデルの推論能力がどれだけ向上したかを Prompt だけで断定することはできない。モデル能力と Harness 能力は分けて評価すべきである。

## 主な変化を一覧で見る

| 観点 | Fable 5 | Fable 5.1 | 構造的な変化 |
| --- | --- | --- | --- |
| Memory | Memory 利用についての短い説明 | ファイル分類、抽出、読み書き、Version、Privacy、適用ルールを詳細化 | 機能説明から統制された Data Plane へ |
| Past Chats | 独立した過去会話検索レイヤーなし | `conversation_search`、`recent_chats`、`read_conversation` | 圧縮された Memory と元の証拠を分離 |
| ツール数 | 18 個のツール定義 | 44 個のツール定義 | 汎用ツール箱から広い Capability Interface へ |
| 能力拡張 | Skills と MCP Apps | Skills、Plugin Catalog、MCP Apps | 静的設定から探索・導入へ |
| 出力形式 | Text、Files、Artifacts、Maps など | Charts、比較カード、手順カード、Quiz、翻訳、商品、Links などの型付き出力を追加 | 文字列からルーティング可能な UI Type へ |
| 出力ルーティング | 個別ツールの説明に分散 | MCP、File、Visualizer の優先順位を明示 | Harness が Capability Router を担い始める |
| 作業の可視性 | 汎用的な進捗更新ルールなし | 長い Tool Run 中に短い更新を出し、最後に完全な結果を返す | 長時間タスクの体験を明示的に統制 |
| 文章形式 | Lists、Headings、Bold を強く抑制 | 複雑さに応じて必要最小限の形式を使う | 新しいモデル既定値に合わせて再調整 |
| Search | 時間依存情報の確認をすでに要求 | 変化の速い Product、Model、Tool は「知っていても」検索する | 馴染みを鮮度の証拠としない |
| Safety と Privacy | 拒否・Wellbeing の詳細ルールを保有 | Child Safety、Copyright の継続性、Memory Privacy、Deletion Semantics、会話終了を細分化 | 出力フィルタから Lifecycle Governance へ |

## 変化 1：Memory が 2 文の説明からファイルシステムへ成長した

Fable 5 の Memory セクションは極めて薄い。過去の会話から導出された Memory を Claude が受け取れることと、ユーザーがその機能を有効にしているかどうかを示すだけである。「Memory がある」ことは説明するが、どのように生成、更新、削除されるのか、異なる記憶をどう分けるのかは定義していない。

Fable 5.1 は Memory を永続ファイルシステムとしてモデル化し、少なくとも 5 種類の内容に分けている。

- `/profile.md`：比較的安定した本人情報、役割情報。
- `/topics/`：習慣、好み、繰り返し議論される領域。
- `/areas/`：進行中の Project、責任、Decision。
- `/people/`：現在の質問に関係する人物・関係の Context。
- `/preferences.md`：Claude に望む回答・協働方法。

設計はファイル名にとどまらない。Background Memory Pass、`[stated]` などの Provenance Label、Read-before-write、Version Conflict、Append と Replace、ファイル全体の Delete、Sensitive Data の境界、既存の Memory を回答に使うべき場合と使うべきでない場合まで定義している。

```text
会話の完了
   ↓
Background で Durable Facts を抽出
   ↓
分類・重複排除・Privacy Filter・Version Merge
   ↓
Persistent Memory Files
   ↓
将来の質問に対して関連性で取得
   ↓
答えを実質的に変える Context だけを注入
```

これは単に「会話履歴を Embedding し、Top-K Retrieval を行う」設計ではない。Schema、Provenance、Lifecycle、Access Policy を持つ **Context Database** に近い。

私の結論は、Agent Memory の競争は「覚えられるか」から、「何を覚え、なぜ信頼でき、誰が変更でき、いつ失効し、どう撤回できるか」へ移るということだ。Vector Retrieval はその中の一実装にすぎない。

## 変化 2：Past Chats と Memory が別々の Context Plane になった

Fable 5.1 には、過去会話専用の `conversation_search`、`recent_chats`、`read_conversation` が追加された。これは Memory 機能の単純な追加ではない。2 種類の情報が本質的に異なることを、Architecture として認めたものだ。

- **Memory は圧縮された Durable Claim を保存**し、効率よく再利用する。
- **Past Chats は元の会話証拠を保持**し、文脈の復元と検証に使う。

Prompt は、ユーザーが実際に発言・決定した内容と、Claude が提案しただけの内容を区別するよう明示している。過去の会話に Assistant の提案しかなければ、それを次の会話でユーザーの決定へ昇格させてはならない。仮説的な議論なら、圧縮によって仮説を事実に変えてはならない。

これは長期 Memory すべてが抱える核心問題を扱っている。**圧縮は使いやすさを高めるが、証拠を失わせる。**

したがって、より信頼できる構造は、万能の Memory Store にすべてを任せるものではない。

```text
Memory = 再利用できる結論
Past Chats = 追跡できる証拠
Current Session = 今進行している Task State
```

成熟した Agent は覚えるだけでは不十分だ。その記憶がどこから来たのか、ユーザーが述べたのか、Tool が検証したのか、Model が推論したのかを説明できなければならない。

## 変化 3：Skills、Plugins、MCP が Capability Supply Chain を形成する

Fable 5 にはすでに Skills と MCP Apps があった。文書、Spreadsheet、Presentation、Code Artifact を作成する前に対応する `SKILL.md` を読み、外部サービスへアクセスするときは接続済み MCP を優先することを理解していた。

Fable 5.1 はその構造を維持しつつ、検索、推薦、インストール経路を含む Plugin Catalog と Skill Catalog を追加した。新しい Capability Layer は次のように理解できる。

- **Skill** は、ある Task Class の経験、規則、方法をパッケージ化する。
- **Plugin** は、Tools、Commands、Skills を配布可能な Capability Bundle にまとめる。
- **MCP** は、外部 Data、System、現実世界の Authority を接続する。
- **Tool Schema** は、具体的な Action を Model に公開する。
- **Router** は、現在の Task をどの Capability Class が処理するかを決める。

ツール定義が 18 から 44 に増えたことも、単に「関数が 26 個増えた」という意味ではない。新規ツールは、Memory CRUD、Past Chat Retrieval、Plugin/Skill Discovery、Research Suggestion、さらに Charts、Comparison、Steps、Translation、Quiz、Products、Links などの Structured UI に集中している。

これは従来の Software Layering に近づいている。Model がすべての作業方法を恒久的に保持する必要はなく、すべての外部権限を直接持つべきでもない。Capability は Discovery、Load、Authorization、Invocation、Removal の対象になる。

## 変化 4：Prompt が Model Behavior を逆方向から調整するようになった

Fable 5 の Prompt は、当時の Model が過剰な形式やテンプレート的な回答を生成しやすかったため、Headings、Lists、Bold を強く抑制していた。Fable 5.1 はこの規則を緩和し、内容が複雑なら List を使い、明確さに必要な最小限の形式だけを使うようにしている。

これは単なる製品上の好みの変化ではない。Model の既定挙動が変わった。Anthropic の Fable 5.1 Prompting Guide は、新しい Model が Fable 5 より Headings、Lists、Bold を使いにくいと説明している。古い Anti-formatting Prompt を残すと、密度の高い文章の塊になり得る。

同じ補償関係は、ほかの 2 点にも現れている。

- Fable 5.1 は長い Tool Chain で自発的な進捗更新が少ないため、新しい Prompt は数回の Tool Call ごとに短い Update を出すよう求める。
- Fable 5.1 は低い Effort で既存知識から答えやすいため、新しい Prompt は変化の速い Product、Model、Tool の検証規則を強めている。

Prompt Engineering にとって重要な教訓は、**System Prompt は一度書けば終わる製品仕様ではなく、Model Behavior の Controller である**ということだ。Model が変われば、古い Prompt は動作しても過剰補償となり、新しい Model を悪化させる可能性がある。

成熟したチームは、すべての Model に 1 つの「万能 Prompt」を使わない。Eval で Failure Mode を観察し、現在の Model に必要な最小限の調整を行う。

## 変化 5：Safety が「何を答えられるか」から State と Data Governance へ移った

Fable 5 もすでに広範な Safety Policy を持っていた。Fable 5.1 の重要な変化は、禁止事項が増えただけではない。Safety Rule が Interaction Lifecycle 全体へ広がったことである。

新しい Prompt は、拒否後の後続要求が State をどう継承するか、Copyright の境界が要求の縮小や言い換え後も続くか、どの情報が Long-term Memory に決して入ってはいけないか、Memory を削除するときそれだけから導出された結論も削除すべきか、Sensitive Memory をいつ読めるか、会話終了要求をどう確認するか、さらに Abuse、Self-harm Risk、Potential Violence がある場合に会話を終了できるかを扱う。

これらは最終 Text 以上のものを統制する。

- Data を保存できるか。
- どの Provenance Label を付けるか。
- 後から再利用できるか。
- ユーザーが撤回できるか。
- Tool Side Effect をどう制約するか。
- Conversation State が次の Decision をどう変えるか。

Safety は、Answer の前後に置く Classifier から、Agent Runtime 内の Policy Engine へ進化している。

## 根本的には変わっていないもの

すべてを革命的と呼ばないために、Fable 5 がすでに持っていたものも確認すべきだ。

Fable 5 には、Persistent Artifact Storage、MCP Connectors、Skills、File Creation、Computer Use、Web Search、Image Search、型付き Map Output がすでに存在した。Text-only Chatbot ではなく、Fable 5.1 が Agent をゼロから発明したわけでもない。

本当のアップグレードは、Fable 5.1 が既存 Component に、より明確な Context Category、Evidence Recovery、Capability Catalog、Output Routing、Process Feedback、Governance Rule を与えたことだ。

したがって、変化は「多数の部品がある」状態から、「部品間に OS のような責任境界ができる」状態への移行である。

## 私のまとめ：4 つの Plane が形になりつつある

今回の変化を抽象化すると、Claude Runtime は 4 つの Plane で説明できると思う。

```text
Instruction Plane
System Prompt / Turn Instruction / User Preference / Skill

Context Plane
Current Session / Memory / Past Chats / Files / Web

Capability Plane
Tools / Plugins / MCP / Computer / Typed UI

State & Governance Plane
Provenance / Version / Permission / Safety / Audit
```

Fable 5 は主に Capability を拡張していた。Fable 5.1 は Context と State Governance へ、より本格的に投資し始めている。

私は現在、Agent Product を次の式で理解するのがよいと考えている。

> **Agent Product Capability = Model × Context × Capability × State Governance**

これは足し算ではなく掛け算である。強い Model でも Context が誤っていれば失敗する。Tools が豊富でも Permission が制御されていなければ Enterprise に導入できない。Provenance と Delete Mechanism のない豊かな Memory は汚染を蓄積する。検証可能な Feedback のない完全な Workflow は、Agent により自動的に失敗させるだけだ。

## これからどこへ向かうのか

### 1. Monolithic System Prompt は Modular Policy に分割される

現在は 2,000 行を超える Runtime Prompt Bundle を読むことができる。しかし、その多くを永続的な Natural Language として Model に注入し続けるべきではない。これらは徐々に、Versioned Policy、Skills、Routers、Permission Settings、Task-scoped Instructions へ移るだろう。

Prompt は消えない。ただし「すべての規則を運ぶ Text」から、「現在の Goal と Boundary を Model に理解させる Interface」へ後退する。

### 2. Context Engineering は State Engineering になる

以前の問いは、より多くの Context を Window に入れる方法だった。これから重要なのは、State を誰が所有し、どの Version が現行で、どの Fact が失効し、Rollback をどう行い、External Action の発生をどう証明するかである。

Memory、Past Chats、Session、Tool Trace、External System State は別々にモデル化される。Agent Context は、増え続ける Prompt より Database と Event Stream に近づく。

### 3. より多くの制約が Prompt から Protocol Layer へ移る

Fable 5.1 は同時に、Turn-scoped System Message、Thinking Block Binding、Content Provenance、Per-message Effort も導入している。これらは同じ方向を示す。重要な制約は、Model が「規則を覚えている」ことに依存せず、API と Runtime が直接表現し始めている。

Type System、Permission System、Version Number、Protocol で保証できることは、最終的に Prompt Text だけに存在すべきではない。

### 4. Agent Output は Text ではなく Typed Result になる

44 個の Tools の追加分には、Action Tool ではなく、Charts、Cards、Steps、Quiz、Translation、Product Lists などの Output Component が多い。Model の最終成果物は Markdown String から、Application が直接処理できる Typed Result へ移っている。

将来の Frontend は Answer を表示するだけではない。Result Type に応じて Interactive UI を選び、次の User Interaction を次の Turn の State に変換する。

### 5. Model と Harness は一緒に Training・Iteration される

最も重要な長期トレンドは、Model と Harness が独立した製品ではなくなることだ。Post-training は、特定の Tool Protocol、Progress Reporting、Editing Pattern、Memory Structure、Permission Boundary に Model を適応させる。Harness は、新しい Model の Failure Mode に応じて Prompt、Router、Eval を再調整する。

Fable 5 から Fable 5.1 で Formatting Guidance が反転したことは、小さいが明確な例だ。Model の既定挙動が変われば、周辺制御も変わらなければならない。

最終的な競争は、最強の Base Model を誰が持つかだけではない。最も豊かな Real Environment、最も質の高い Task Trajectory、最も信頼できる Feedback Signal、そしてそれらを Model と Harness の双方へ戻す Closed Loop を誰が持つかで決まる。

## Agent Builder にとっての意味

第一に、System Prompt を Product Architecture と取り違えてはならない。Prompt は Boundary を説明できるが、信頼できる Boundary には Permission、Schema、Version、Idempotency、Audit、Eval が必要である。

第二に、Memory を Vector Database に還元してはならない。Long-term Memory はまず Data Governance の問題であり、その次に Retrieval の問題である。

第三に、Final Answer だけを評価してはならない。Tool-using Agent では、Trajectory が正しいか、Side Effect が制御されているか、Failure から復旧できるか、Evidence が Traceable かの方が重要である。

第四に、Model を交換すれば古い Harness が自動的に改善すると考えてはならない。Model Upgrade ごとに Real-task Eval を再実行し、Search、Parallel Tool Use、File Editing、Formatting、Stopping Condition、Progress Reporting の Drift を確認すべきだ。

## 最後に

Fable 5.1 の Prompt 変更で最も示唆的なのは、規則が何個増えたかではない。Anthropic が、すべての Agent Product がいずれ直面する問いに、より体系的に答え始めたことだ。Context はどこから来るのか、Capability はどう Load されるのか、State はどう持続するのか、Side Effect はどう統制されるのか、Result はどう提示されるのか、Error はどう修正されるのか。

私の最終的な判断は次の通りである。

> 次世代 Agent の競争は、誰の Prompt が長いかではない。Model を、より現実的で、Stateful で、検証可能で、継続的に学習できる Environment に置けるかどうかである。

Environment Capability が安定すれば、System Prompt は再び短くなる可能性がある。最も信頼できる規則は、最終的に「Model に正しい行動を教える」ものから、「System が正しい方法でしか行動できないようにする」ものへ進化するからだ。

## 参考資料

- [Anthropic：System prompts overview](https://platform.claude.com/docs/en/release-notes/system-prompts/overview)
- [Anthropic：Claude Fable 5 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5)
- [Anthropic：Claude Fable 5.1 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5-1)
- [Anthropic：Claude Fable 5.1 model overview](https://platform.claude.com/docs/en/models/fable-5-1/overview)
- [Anthropic：Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)
- [Fable 5 完全 Runtime Prompt の Community Archive](https://github.com/infineural/fable-5/blob/main/system-prompt/full-system-prompt.md)
