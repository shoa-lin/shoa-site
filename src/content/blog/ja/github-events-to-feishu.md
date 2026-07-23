---
translationKey: "github-events-to-feishu"
locale: "ja"
title: "GitHub イベントを Feishu 開発グループへ: 軽量なローカル Agent パイプライン"
description: "GitHub Webhook、Cloudflare Tunnel、ローカル Agent を使い、重要な開発イベントを簡潔な Feishu 更新にまとめる。"
publishedAt: "2026-07-23"
updatedAt: "2026-07-24"
category: "development"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/github-events-to-feishu/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

開発協業には、小さいけれど集中を切る作業がある。GitHub を何度も開き、PR、Issue、Review に変化がないかを確かめることだ。大事なのは単に「イベントが起きたか」ではなく、「それがチームに何を意味するか」である。

そこで私は、イベント駆動の経路にする方が好ましいと考えている。GitHub の変化がローカル Agent を起こし、必要な事実だけを取り出して、Feishu の開発グループへ短い更新を一件送る。

![GitHub イベントを開発更新へまとめる](/assets/blog/github-events-to-feishu/01-event-to-update.png)

## 考え方はシンプル

経路は次のようになる。

```text
GitHub Webhook
→ Cloudflare Tunnel
→ ローカル Agent
→ Feishu 開発グループ
```

GitHub は事実を生む。たとえば PR が開かれた、Review で修正が求められた、Issue が閉じられた、といった事実だ。Cloudflare Tunnel は公開 HTTPS リクエストを、ローカルでのみ待ち受けるサービスまで安全に運ぶ。最後にローカル Agent が、人がすぐ読める短い中国語の要約にしてチームグループへ届ける。

重要なのは役割を分けることだ。Tunnel は転送だけを担い、コードを解釈したりモデルを呼んだりしない。Agent は検証済みのイベントだけを処理し、チームに代わって GitHub へ書き込まない。

## なぜ定期的に GitHub をポーリングしないのか

数分ごとに GitHub API を呼ぶこともできる。しかし無駄なリクエスト、遅延、そして何を確認済みにしたかという状態管理が生まれる。Webhook の方が実際の目的に合う。リポジトリが変わった時だけ通知し、変化がない時は何もしない。

一つのリポジトリと一つの開発グループなら、これで十分である。最初からメッセージキュー、イベント基盤、複雑な複数リポジトリ統制を作る必要はない。

## 守るべき二つの境界

一つ目は安全性だ。公開 URL があるからといって、誰でも Agent を起動できてよいわけではない。受信側は生のリクエスト本文で Webhook 署名を検証してからイベントを解析し、配信 ID で重複を除いて再送による二重通知を防ぐ。

二つ目は権限である。この Agent は読み取り専用の情報整理役に向く。必要な文脈を読み、事実を要約し、リスクを示し、通知を送る。既定ではコードの push、PR のマージ、Issue の変更、生の payload や認証情報の転送をさせない。

## グループへのメッセージはどうあるべきか

生の JSON をグループに投げるより、よい開発更新は三つだけを答える。何が起きたか、どこに影響するか、誰かが追うべきかである。

```text
PR が作成されました

事実: 何が追加され、現在どの状態か。
注目点: 注意すべきモジュールや変更。
リンク: 元の文脈は GitHub で確認。
```

小さな規律が役に立つ。事実と判断を分けることだ。「PR はマージされた」は事実であり、「互換性に影響するかもしれない」は検証が必要な判断である。こうすれば役に立ちながら、結論を大きく言い過ぎない。

## 最小限の構成

試すなら、まずはこの小さな組み合わせから始められる。

```text
GitHub Webhook
+ Cloudflare Tunnel
+ ローカルでのみ待ち受ける Webhook 受信側
+ 署名検証と重複排除
+ 読み取り専用のイベント要約
+ 専用の Feishu Bot
```

Issue、Pull request、Review のように本当に重要なイベントだけを購読する。最初は通知を信頼でき、短く、追跡可能にする。ノイズ、複数リポジトリの統合、監査や再試行が実際に必要になってから拡張すればよい。

イベント駆動 Agent は特別なものではない。GitHub が事実を渡し、Tunnel が経路を作り、Agent が情報を整え、Feishu が協業へ届ける。何度もページを更新する作業を減らすだけでも、十分に価値ある自動化になる。

> この記事へのリンクをあなたの AI Agent に渡し、まず考え方を理解させたうえで、チーム向けの最小版を設計させてみてください。
>
> アカウント、鍵、内部設定をそのまま写す必要はない。信頼できる小さな経路から始めればよい。
