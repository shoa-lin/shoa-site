---
translationKey: "gpt-6-astra-codex-harness"
locale: "ja"
title: "ターン制からコントロールプレーンへ：GPT-6 Astra は Codex Harness をどう書き換えるか"
description: "非同期ツール呼び出し、Mid-turn steering、動的推論、そして Agents API。Agent 開発は、自前のランタイムを組み立てる段階から、能力と責任を再び層分けする段階へ押し出されつつある。"
publishedAt: "2026-09-15"
updatedAt: "2026-09-15"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://developers.openai.com/api/docs/guides/latest-model"
sourceAuthor: "OpenAI Developers とコミュニティ資料"
contentType: "adaptation"
translationStatus: "reviewed"
---

## 結論から

GPT-6 Astra がもたらす変化は、モデルが強くなったという話にとどまらない。Agent の時間モデル、制御モデル、ランタイムの境界がそろって変わりつつある。

非同期ツール呼び出しによって、モデルは遅いツールの実行中も独立した作業を進められる。Mid-turn steering によって、ユーザーはモデルがまだ完了していない段階で要求を変えられる。`configuration_update` によって、アプリケーションはリクエストレベルの推論パラメータを書き換えることなく、後続の推論強度を調整しつつ prompt cache のプレフィックスを維持できる。

さらに大きな変化は、2026 年 9 月 10 日に公開テストが始まった Agents API から来ている。これは OpenAI が管理する Codex Harness を API 経由で提供するものだ。アプリケーションはモデルへの指示、業務ツール、実行環境を用意し、OpenAI がセッション、オーケストレーション、コンテキスト圧縮、復旧、イベントストリームを管理する。

つまり、Agent 開発では責任の移転が起きている。

> プラットフォームが汎用ランタイムを吸収し、モデルがインタラクションプロトコルの一部を吸収する。アプリケーションチームは、業務能力、権限の境界、実行環境、結果検証に力を戻す。

## なぜ私はこれらを自分で作っていたのか

初期の Agent 開発では、非同期ツール呼び出しも「作業しながら方向を変える」ことも、たいていは二つの API パラメータではなく、一連のステートマシンの問題だった。

未完了タスクを保存し、モデルのターンとバックグラウンドタスクを区別し、プロセス再起動、タイムアウト、キャンセル、重複コールバック、順序の乱れた結果を処理する。ユーザーの新しい指示を実行中のフローに差し込み、さらに古い出力が無効になったか、すでに実行したアクションを巻き戻せるかを判断する。推論強度の変更はリクエスト構造、キャッシュヒット、コンテキストのリプレイにまで影響した。

こうしたエンジニアリングは業務価値を生まないが、Agent が安定して動くかどうかを左右する。チームは往々にして、モデルの制約を取り囲むように組んだ「補償層」の保守に膨大な時間を費やしていた。

Astra は、その一部をプロトコルのセマンティクスへ変え始めている。

## Astra はモデルが遅いツールに足止めされないようにする

Responses API の非同期ツール呼び出しでは、function または custom tool の定義で `async: true` を設定する必要がある。モデルは呼び出しを発行した後、その結果に依存しない作業を続けられる。アプリケーションはタスク完了後、元の `call_id` を使って結果を返す。

ここで減るのはモデル側の待ち時間であって、アプリケーション側の作業ではない。OpenAI がアプリケーションの代わりにバックグラウンドタスクを実行するわけでも、業務キューを提供するわけでもない。本番システムは引き続き、タスクの責任者、認可の方法、リトライのやり方、結果の保持期間、失敗時の見せ方を自分で決める必要がある。

複数のタスクが同時に走る場合、アプリケーションは通常の `wait_for_tasks` ツールを定義して、モデルが本当に結果を比較する必要があるときだけ待たせることもできる。この wait ツールはアプリケーション自身のプロトコルに属する。

したがって、非同期の価値はすべてのツールに async を付けることにあるのではない。本当に独立した作業を前倒しで始めつつ、明確な依存の壁を残すことにある。

## Mid-turn steering はユーザーを実行中の制御信号に変える

Astra の Mid-turn steering は、Responses API の WebSocket モードで提供される。アプリケーションが `response.steer` を送ると、API は新しいユーザー要求を現在のレスポンスにキューイングし、後続の continuation を自動生成する。

すでに送信済みの出力を書き換えることはなく、すでに開始したツールを取り消すこともない。`accepted` は入力がキューに入ったことを示すだけで、モデルがすでにそれを処理したかどうかは、引き続きイベントを読んで確認する必要がある。

つまり steering は「制約の追加」であって、「時間の巻き戻し」ではない。Harness は引き続き次のものを管理しなければならない。

- 現在のレスポンスと successor レスポンスの関係
- 複数回の steering の順序
- すでに副作用が発生した箇所の権限境界
- ツール結果と新しい方向との衝突の処理
- 接続断や重複配信からの復旧戦略

これは、かつて手書きしていた「リクエストを打ち切ってコンテキストを組み直す」よりも信頼できる。プロトコルが continuation のライフサイクルを表現しているからだ。しかし、業務上の取り消しセマンティクスをアプリケーションの代わりに定義してくれるわけではない。

## configuration_update は推論強度をセッション状態にする

アプリケーションは履歴の中に次を挿入できる。

```json
{
  "type": "configuration_update",
  "reasoning": { "effort": "high" }
}
```

リクエストレベルの `reasoning.effort` は元の値のままで、更新項目は後続のレスポンスにだけ作用する。これにより、通常のタスクでは低めの推論強度を使い、障害分析やリスク評価に差しかかったら強度を上げる、ということが元の prompt プレフィックスを保ったまま行え、キャッシュの再利用に有利に働く。

この仕組みは現時点では GPT-6 Astra の標準的なシングル Agent モードでのみサポートされ、変更できるのは reasoning effort だけだ。隣接する更新、自動 compaction、自動 truncation にはいずれも明確な制限がある。

ここでは三つの層を区別する必要がある。API はこのプロトコルをすでにサポートしている。Codex の内部には一部のデータ構造がすでにあるかもしれない。しかし現行の Codex クライアントが通常の設定変更時にこれを正しく使っているかどうかは、具体的なバージョンごとに検証が必要だ。公開されている [Codex Issue #42996](https://github.com/openai/codex/issues/42996) では、推論強度の切り替え後にキャッシュヒットの問題が依然として報告されており、API ドキュメントをそのままクライアント側の統合完了の証拠として扱うことはできない。

## Responses API から Codex Harness へ、そして Agents API へ

OpenAI は現在、三種類のランタイム境界をはっきりと説明している。

| 方式 | ランタイムを管理するのは誰か | 向いている用途 |
| --- | --- | --- |
| Responses API | アプリケーション自身 | Agent ループを完全に制御したい |
| Codex SDK / App Server | ローカルの Codex ランタイムを再利用 | Codex を自分のツールやプロダクトに統合したい |
| Agents API | OpenAI がホストする Codex Harness | セッション、オーケストレーション、圧縮、復旧をプラットフォームに任せたい |

Agents API の意義は、これまで各チームが繰り返し実装してきた汎用 Harness をプラットフォームの能力に変えた点にある。公式ドキュメントが挙げるマネージド機能には、サンドボックス、Skills、MCP、steering、コンテキスト管理、サブ Agent、セッション復旧が含まれる。

アプリケーションチームは引き続きツールを提供し、実行環境を選ぶ必要があるが、汎用的な agent loop のすべてをゼロから実装する必要はなくなる。

これは「すべての作業をプラットフォームに渡す」という話ではない。プラットフォームは汎用的な実行機構を担い、アプリケーションは業務上の真実を担う。たとえば次のようなものだ。

- どのテナントがこのデータを読む権限を持つか
- ツール呼び出しが外部への副作用を生むことを許すか
- リトライが二重課金や二重デプロイを引き起こさないか
- どんな証拠があればタスク完了と言えるか
- どの結果に人間の承認が必須か

## Harness の複雑さは消えるのではなく、層が組み替わる

かつてのエンジニアリングの複雑さは、三種類に分けられる。

1. **モデル補償の複雑さ**：待機、コンテキストの再構築、割り込みの模倣、手書きの非同期プロトコル。Astra がその一部を吸収しつつある。
2. **汎用ランタイムの複雑さ**：セッション、イベントストリーム、圧縮、復旧、サブ Agent、サンドボックス。Codex Harness と Agents API がその一部を吸収しつつある。
3. **業務の正しさの複雑さ**：権限、データ整合性、承認、冪等性、受け入れ、監査。これらは引き続きアプリケーション自身に属する。

だから本当の変化は「もうエンジニアリングは要らない」ではなく、エンジニアリングの重心が移ったということだ。

```text
以前：自分で Agent Runtime を構築する
現在：能力を接続し、境界を宣言し、結果を検証する
```

## Codex への示唆

Codex Harness がこのまま進化を続けるなら、その中核はターンのループからコントロールプレーンへ移っていく。

```text
イベントストリーム
  ├─ モデルのレスポンス
  ├─ ツールの開始と完了
  ├─ ユーザーの steering
  ├─ 推論設定の更新
  └─ continuation

コントロールプレーン
  ├─ 現在の conversation head
  ├─ pending task registry
  ├─ 権限と承認
  ├─ キャッシュの不変条件
  ├─ 復旧と冪等性
  └─ 結果検証
```

LangChain、Hermes、ZeroClaw をはじめとするゲートウェイをめぐるコミュニティの議論も、プロトコルが登場してからエコシステムが追随するまでには時間がかかることを示している。よくある問題は「async フィールドを送れるか」ではなく、ストリーミングの変換、メッセージのリプレイ、順不同の完了、切断からの復旧、重複配信が元のセマンティクスを保っているかどうかだ。

## 最後の判断

Astra と Agents API は、そろって Agent の新しい役割分担を指し示している。

> モデルはより柔軟に考えることを担い、プロトコルは実行中の制御を表現することを担い、Harness は汎用的なオーケストレーションを担い、アプリケーションは業務の世界にある現実の制約を担う。

これは新しい Agent の立ち上げコストを大きく下げるだろう。かつて数週間かけて組み立てていた非同期ループ、状態復旧、途中介入は、将来的にはランタイムの設定とツールの接続になるかもしれない。

しかし同時に、アプリケーションチームには「問題を定義する」力がより強く求められるようになる。汎用的な仕組みがプラットフォームに引き取られるほど、本当に差がつく部分はツール設計、権限モデル、環境の境界、検証器、フィードバックループに集中していく。

Agent 開発の中心的な問いは、「どうやってモデルを動かすか」から「どうやって現実の世界で信頼して使われるようにするか」へ移りつつある。

## 参考資料

- [OpenAI：Using GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI：Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling)
- [OpenAI：Mid-turn steering](https://developers.openai.com/api/docs/guides/steering)
- [OpenAI：Change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation)
- [OpenAI：Agents API overview](https://developers.openai.com/api/docs/guides/agents-api/overview)
- [OpenAI：Agents runtime comparison](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI：Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [OpenAI：Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Chasing Next：Async Tool Calling in the Responses API](https://chasingnext.com/updates/async-tool-calling-in-the-responses-api)
- [The Syntax Diaries：OpenAI Async Tool Calling Without Lost Results](https://thesyntaxdiaries.com/openai-async-tool-calling)
- [LangChain Issue #40204](https://github.com/langchain-ai/langchain/issues/40204)
