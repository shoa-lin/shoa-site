# AI 产业地图 · 数据流程

`/ai-map` 页面的数据分两部分：

| 文件 | 谁维护 | 内容 |
|---|---|---|
| `src/data/ai-map/taxonomy.json` | 人工 | 4 层 17 格的分类、每格名额上限、新鲜度规则 |
| `src/data/ai-map/entries.json` | 人工（策展种子） | 收录哪些公司/产品、放在哪格、一句话简介、入选理由、人工核实的指标（`manualFacts`）、每条用哪些数据源（`sources`）和展示哪些脚本指标（`show`） |
| `src/data/ai-map/policies.json` | 人工 | 底部「政策与法规」 |
| `src/data/ai-map/metrics.json` | 脚本（`apply.mjs` 写入） | 每条最终展示的 1–3 个数字，每个数字都带来源链接、数据日期 `asOf`、核实日期 `verifiedAt`、采集方式 `method` |

脚本**只更新数字**，不会新增或删除条目，也不会改简介。收录与否始终由人决定。

## 每月流程

```
collect.mjs  →  data/ai-map/raw/<日期>/<数据源>.json   原始快照（含抓取时间）
build.mjs    →  data/ai-map/candidates/<日期>.json    候选数据（合并、去重、挑选指标）
             →  data/ai-map/reports/<日期>.md         差异报告 + 审核清单
apply.mjs    →  src/data/ai-map/metrics.json          写入站点数据
validate.mjs →  校验（也在 npm run verify 里，作为 audit:ai-map）
```

- `.github/workflows/ai-map-monthly.yml` 每月 1 日 09:00（北京时间）自动跑一遍，并开一个 `ai-map/data-YYYY-MM` 分支的数据 PR，PR 正文就是差异报告。**它不会自动合并，不会 push main，也不会触发部署**；部署只在人工合并到 main 后由 `deploy-pages.yml` 执行。
- 工作流只用 Actions 自动发放的 `GITHUB_TOKEN`（提高 GitHub API 限额、开 PR），不需要配置任何密钥。
- 首次使用前，需要在仓库 Settings → Actions → General 打开「Allow GitHub Actions to create and approve pull requests」，否则开 PR 那一步会失败（数据仍会推到分支上）。
- 也可以在 Actions 页面手动 `Run workflow`。

本地手动跑：

```bash
npm run ai-map:collect                 # 可加 -- --only huggingface,github 或 -- --date 2026-12-01
npm run ai-map:build
# 打开 data/ai-map/reports/<日期>.md 逐项审核
npm run ai-map:apply
npm run audit:ai-map
TMPDIR=/workspace/tmp npm run verify
```

## 数据源

全部是公开 API 或公开数据集，采集过程不调用 AI。

| 模块 | 来源 | 采什么 | 许可 / 限制 |
|---|---|---|---|
| `huggingface` | Hugging Face Hub API | 机构关注数、模型数、下载最多的模型（近 30 天）、最新模型、热门数据集 | 公开 API，无需 key |
| `github` | GitHub REST API | 仓库 Star 数、最近一次推送 | 匿名 60 次/小时；有 `GITHUB_TOKEN` 时自动使用 |
| `epochModels` | Epoch AI · AI Models（`all_ai_models.csv`） | 近 24 个月显著模型数、最新显著模型 | CC BY 4.0，页面已署名 |
| `epochCompanies` | Epoch AI · AI Companies | 年化收入、周/月活、投后估值 | CC BY 4.0；**只用 Confidence = Confident 的行**，链接指向 Epoch 记录的原始出处 |
| `epochChips` | Epoch AI · AI Chip Sales / Owners | 累计出货算力（H100 当量）、持有算力 | CC BY 4.0 |
| `secEdgar` | SEC EDGAR XBRL companyfacts | 上市公司年度营收 | 公开；需要带联系方式的 User-Agent（已内置） |
| `wikidata` | Wikidata | 成立年份；总部国家（只用于校验，不直接展示） | CC0 |
| `openalex` | OpenAlex | 论文数（预留） | 2026 年起匿名调用计费，**没有 `OPENALEX_API_KEY` 时自动跳过** |

单个数据源失败不会中断整次运行，报告第 1 节会列出每个源的状态（ok / partial / failed / skipped）。

## 指标规则

- 每条最多展示 3 个数字：先放人工核实的 `manualFacts`，再按 `show` 的顺序放脚本指标。
- 数据日期 `asOf` 超过 400 天的指标自动丢弃（报告里会列出）。
- 页面上，核实日期超过 45 天显示「待更新」，超过 90 天隐藏数字只留来源链接（构建时计算，浏览器端再按当天日期复查一次）。
- `validate.mjs` 会拦下：没有来源链接或来源不是 https 的数字、缺 `asOf`/`verifiedAt` 的数字、一个数字都没有的条目、超出名额的格子、中英文缺失或简介过长、区域与国家不一致等。

## 入选标准

1. 有可核实的硬信号（营收、用户数、下载量、Star 数、出货量等至少一项，带公开来源）；
2. 在所在格子里有代表性；
3. 近 6 个月仍活跃（`activeWithinDays: 183`，报告会提示长期没有动静的条目）；
4. 一句话简介不夸大，只写它是什么、做什么。

大厂只按其 AI 业务收录（例如「Google TPU」「Microsoft Azure」而不是整个公司）。区域按总部 / 母公司所在地划分，行名为「中国 / 其他地区」。

## 增删改条目

直接编辑 `src/data/ai-map/entries.json`：

- `id` 用小写短横线；`layer` / `category` 必须在 `taxonomy.json` 里；`region` 为 `cn` 或 `global`。
- `oneLiner.zh` ≤ 45 字，`oneLiner.en` ≤ 110 字符；`reason` 写入选理由。
- `sources` 写各数据源的查询参数（如 `{"github": {"repo": "vllm-project/vllm"}}`），`show` 写要展示的脚本指标 key。
- 拿不到脚本数据的，用 `manualFacts` 手工录入：`key`、`label{zh,en}`、`value`、`unit`（可选）、`sourceUrl`（https，指向你亲自打开过的原始页面）、`sourceName`、`asOf`（数据所属日期）、`verifiedAt`（你核实的日期）、`verifiedBy`。**核实不了就不放，不要估算。**
- Wikidata 国家与 `country` 不一致但有正当理由时（如母公司规则），加 `countryNote` 说明，报告就不再提示。
- 改完跑 `npm run ai-map:build && npm run ai-map:apply && npm run audit:ai-map`。

## 审核清单（每月数据 PR）

- [ ] 报告第 1 节：失败的数据源是否只是暂时的？
- [ ] 第 3 节标 ⚠️ 的变化（> 50%）逐个打开来源确认，不是单位或口径变了。
- [ ] 第 4 节：只有 1 个指标的条目能否补一个人工指标；超过 45 天的 `manualFacts` 重新核实。
- [ ] 不活跃、疑似重复、国家不一致的条目是否需要调整。
- [ ] 本地 `npm run verify` 通过后再合并。

## 需要人工判断的约定

- **台积电（TSMC）** 放在「中国」行，国家标注「中国台湾 / Taiwan, China」，沿用中国信通院 2018 年版图的分区方式。如需改到「其他地区」行，除了改 `entries.json` 里的 `region`，还要放宽 `validate.mjs` 中「TW 必须用 cn 行」的检查。
- **Google DeepMind**、**Hugging Face** 按母公司 / 总部规则归入美国，带 `countryNote`。
- 媒体转述的人工指标（例如火山引擎的 IDC 份额）在来源名里写明转述关系，审核时优先换成一手来源。

## 署名

版式参考中国信通院《全球人工智能产业地图》（2018）。Epoch AI 数据按 CC BY 4.0 使用，页面「方法说明」与每个数字的来源处均已署名。
