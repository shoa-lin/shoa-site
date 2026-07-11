---
translationKey: "getting-started-with-loops"
locale: "ko"
title: "Claude Code 루프 시작하기: 수동 턴에서 능동형 루프까지"
description: "수동 턴에서 목표, 시간, 능동형 루프까지 네 가지 루프의 시작 방식과 종료 조건을 살펴봅니다."
publishedAt: "2026-07-07"
updatedAt: "2026-07-07"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/getting-started-with-loops"
sourceAuthor: "Delba de Oliveira, Michael Segner"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Getting started with loops 표지 이미지](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6903d229e73ca2d0d73d78f7_682ac293884c9d4ee4ebe2355a2f6c4ecfdd9c1b-1000x1000.svg)

---

최근에는 코딩 에이전트에 프롬프트를 보내는 데 그치지 말고 "루프를 설계하라"는 논의가 활발합니다. X에서 루프가 정확히 무엇인지 찾아보면 서로 다른 답을 여럿 만나게 됩니다.

Claude Code 팀은 루프를 에이전트가 종료 조건을 충족할 때까지 작업 사이클을 반복하는 방식으로 정의합니다. 루프 유형은 다음 몇 가지 기준으로 구분할 수 있습니다.

1. 무엇이 루프를 시작하는가.
2. 루프는 어떻게 종료되는가.
3. 어떤 Claude Code 프리미티브를 사용하는가.
4. 어떤 종류의 작업에 가장 적합한가.

이 글에서는 주요 루프 유형과 각각을 사용하기 좋은 상황, 그리고 토큰 사용량을 관리하면서 코드 품질을 유지하는 방법을 다룹니다. 모든 작업에 복잡한 루프가 필요한 것은 아닙니다. 가장 단순한 해법에서 시작하고, 적합한 지점에만 이런 패턴을 선택적으로 적용해야 합니다.

## 네 가지 루프

원문은 턴 기반 루프(Turn-based loop), 목표 기반 루프(Goal-based loop), 시간 기반 루프(Time-based loop), 능동형 루프(Proactive loop)라는 네 가지 유형을 설명합니다. 차이는 단순히 "자동화 수준"에 있지 않습니다. 각 유형은 시작 방식, 종료 조건, 작업 경계가 서로 다릅니다.

### 턴 기반 루프

![턴 기반 루프 구성도](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98c_8ace2295.png)

- **시작 조건**: 사용자의 프롬프트.
- **종료 조건**: Claude가 작업을 완료했다고 판단하거나 더 많은 맥락이 필요하다고 판단할 때.
- **가장 적합한 작업**: 정기 프로세스나 예약 작업이 아닌 짧은 일회성 작업.
- **사용량 관리 방법**: 더 구체적인 프롬프트를 작성하고 스킬로 검증 단계를 개선해 왕복 턴 수를 줄입니다.

사용자가 보내는 프롬프트 하나하나가 수동 루프를 시작하며, 각 턴의 지휘는 사용자가 맡습니다. Claude는 맥락을 수집하고, 행동하고, 자신의 작업을 확인하고, 필요하면 반복한 뒤 응답합니다. 이것이 원문에서 말하는 에이전트형 루프(agentic loop)입니다.

예를 들어 Claude에게 좋아요 버튼을 만들어 달라고 요청할 수 있습니다. Claude는 코드를 읽고, 파일을 수정하고, 테스트를 실행한 뒤 작동한다고 판단한 결과를 돌려줍니다. 사용자는 결과를 직접 확인하고 다음 프롬프트를 작성합니다.

이 검증 단계를 개선하려면 원래 수동으로 하던 확인 절차를 `SKILL.md`에 기록해 Claude가 더 많은 작업을 처음부터 끝까지 스스로 검증하도록 만들 수 있습니다. 이런 자동화에서 스킬, 훅, 서브에이전트 중 무엇을 선택할지는 [steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) 가이드를 참고할 수 있습니다. 스킬은 Claude가 결과를 직접 보고, 측정하고, 상호작용할 수 있는 도구나 커넥터를 제공해야 합니다. 확인 기준을 정량화할수록 Claude가 스스로 검증하기 쉬워집니다.

예를 들어 프런트엔드 검증 스킬은 다음처럼 작성할 수 있습니다.

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
4. Use the Chrome DevTools MCP, run a performance trace and audit Core Web Vitals.

If any step fails, fix the issue and rerun from step 1 — do not hand back partially verified work.
```

핵심은 "만능 스킬 하나"를 작성하는 것이 아니라, 실제로 무엇을 "완료"라고 보는지 명시하는 데 있습니다. 그렇지 않으면 Claude는 언제 멈출지 자체 판단에 의존해야 합니다.

### 목표 기반 루프

![목표 기반 루프 구성도](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98f_c6fa9ae5.png)

- **시작 조건**: 실시간으로 입력한 수동 프롬프트.
- **종료 조건**: 목표를 달성하거나 최대 턴 수에 도달할 때.
- **가장 적합한 작업**: 검증 가능한 종료 기준이 있는 작업.
- **사용량 관리 방법**: 구체적인 완료 기준과 명시적인 턴 상한을 정합니다. 예: "최대 5번 시도".

특히 복잡한 작업은 한 턴만으로 충분하지 않을 수 있습니다. 에이전트는 반복할 수 있을 때 대체로 더 나은 결과를 냅니다. `/goal`을 사용하면 완료 상태를 정의하고 Claude가 그 목표를 향해 계속 작업할 여지를 줄 수 있습니다.

성공 기준을 사용자가 직접 정의하면 Claude가 무엇을 "충분히 좋다"고 볼지 스스로 결정할 필요가 없으므로 루프를 너무 일찍 끝낼 가능성이 줄어듭니다. Claude가 멈추려고 할 때마다 평가 모델(evaluator model)이 조건을 검사합니다. 조건을 충족하지 못하면 목표를 달성하거나 지정한 턴 수에 도달할 때까지 작업을 다시 이어 갑니다.

통과한 테스트 수, 점수 임계값 달성, 오류 목록 비우기처럼 결정론적인 조건이 특히 효과적인 이유도 여기에 있습니다.

예시는 다음과 같습니다.

```text
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries.
```

이 유형의 핵심은 "언제 멈출지 결정하는 권한"을 에이전트의 주관적 감각에서 검사 가능한 조건으로 옮기는 것입니다.

### 시간 기반 루프

- **시작 조건**: 지정한 시간 간격.
- **종료 조건**: 사용자가 취소하거나, PR 병합이나 대기열 소진처럼 작업이 완료될 때.
- **가장 적합한 작업**: 주기적인 작업이나 외부 환경 및 외부 시스템과 상호작용해야 하는 작업.
- **사용량 관리 방법**: 실행 간격을 더 길게 설정하거나, 가능하면 고정 시간보다 이벤트를 기준으로 시작합니다.

일부 에이전트 작업은 주기적으로 발생합니다. 작업 자체는 같고 입력만 바뀝니다. 예를 들어 매일 아침 Slack 메시지를 요약하는 작업이 그렇습니다. 또 어떤 작업은 외부 시스템에 의존하며, 주기적으로 변화를 확인하고 대응하는 것이 간단한 상호작용 방식이 될 수 있습니다. PR에 코드 리뷰가 달리거나 CI가 실패하는 경우가 여기에 해당합니다.

이런 상황에서는 `/loop`로 프롬프트를 일정 간격마다 다시 실행할 수 있습니다. 예시는 다음과 같습니다.

```text
/loop 5m check my PR, address review comments, and fix failing CI
```

`/loop`는 사용자의 컴퓨터에서 실행되므로 컴퓨터를 끄면 함께 중단됩니다. 루프를 클라우드로 옮기려면 `/schedule`로 루틴을 만들 수 있습니다.

여기서 중요한 점은 실제 변화보다 루틴을 더 자주 실행하지 않는 것입니다. 한 시간에 한 번만 바뀌는 대기열을 확인하기 위해 매분 토큰을 소비할 필요는 없습니다.

### 능동형 루프

![능동형 루프 구성도](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d989_eb9e496a.png)

- **시작 조건**: 실시간으로 사람이 참여하지 않아도 이벤트나 일정에 따라 시작됩니다.
- **종료 조건**: 각 작업은 자체 목표를 달성하면 종료되며, 루틴 자체는 사용자가 끌 때까지 계속 실행됩니다.
- **가장 적합한 작업**: 버그 보고, 이슈 분류, 마이그레이션, 의존성 업그레이드처럼 반복되고 경계가 명확한 워크플로.
- **사용량 관리 방법**: 루틴은 더 작고 빠른 모델에 맡기고, 판단이 필요한 작업만 가장 강력한 모델로 보냅니다.

앞에서 본 프리미티브에 자동 모드(auto mode), 동적 워크플로(dynamic workflows, research preview) 같은 Claude Code의 다른 기능을 결합하면 장시간 실행되는 루프를 만들 수 있습니다.

예를 들어 계속 들어오는 피드백을 처리하려면 다음 기능을 조합할 수 있습니다.

1. `/schedule`(research preview)을 사용해 새 보고서를 확인하는 루틴을 실행합니다.
2. `/goal`로 "완료" 상태를 정의하고 스킬에 검증 방법을 기록합니다.
3. 동적 워크플로로 여러 에이전트를 조율해 보고서 분류, 문제 수정, 수정 사항 리뷰를 각각 맡깁니다.
4. 자동 모드로 루틴이 모든 단계마다 권한을 요청하느라 멈추지 않게 합니다.

이를 조합한 프롬프트는 다음과 같은 형태가 됩니다.

```text
/schedule every hour: check #project-feedback for bug reports. /goal: don't stop until every report found this run is triaged, actioned, and responded to. When fixing a bug, use a workflow to explore three solutions in parallel worktrees and have a judge adversarially review them.
```

이는 단순히 프롬프트를 더 길게 쓰는 일이 아닙니다. 시작 조건, 종료 조건, 병렬 탐색, 리뷰, 권한 경계를 하나의 실행 시스템에 넣는 일입니다.

## 코드 품질 유지하기

루프가 내놓는 결과의 품질은 루프를 둘러싼 시스템에 달려 있습니다. 원문은 이 시스템을 설계할 때 다음 사항을 강조합니다.

1. **코드베이스를 깨끗하게 유지하기**: Claude는 코드베이스에 이미 존재하는 패턴과 규칙을 따릅니다. 코드베이스가 혼란스러우면 루프가 그 혼란을 증폭합니다.
2. **Claude가 스스로 검증할 방법 제공하기**: [skills](https://code.claude.com/docs/en/skills)를 사용해 사용자와 팀이 생각하는 "좋은 결과"를 명확히 기록합니다.
3. **문서에 쉽게 접근할 수 있게 하기**: 프레임워크와 라이브러리 문서에는 최신 모범 사례가 담겨 있으므로 Claude가 문서에 접근할 수 있어야 합니다.
4. **두 번째 에이전트로 코드 리뷰하기**: 새로운 맥락을 가진 리뷰어는 편향이 적고, 주 에이전트의 추론 과정에도 영향을 덜 받습니다. 내장 `/code-review` 스킬이나 GitHub의 [Code Review](https://code.claude.com/docs/en/code-review)를 사용할 수 있습니다.

한 번의 결과가 기대에 못 미쳤다면 그 문제만 고치는 데 그치지 마십시오. 실패를 시스템에 다시 반영해 앞으로의 모든 반복이 개선되도록 하는 편이 낫습니다. 즉, 실패는 일회성 임시 패치가 아니라 스킬, 테스트, 스크립트, 규칙, 리뷰 기준으로 남아야 합니다.

## 토큰 사용량 관리하기

토큰 사용량을 관리하려면 루프에 명확한 경계가 있어야 합니다. 원문의 권장 사항은 다음과 같이 정리할 수 있습니다.

1. **작업에 맞는 프리미티브와 모델 선택하기**: 작은 작업에는 여러 에이전트나 복잡한 루프가 필요하지 않습니다. 더 저렴하고 빠른 모델로 충분한 작업도 있습니다.
2. **성공 조건과 종료 조건을 명확히 정의하기**: 조건이 구체적일수록 Claude가 너무 일찍 멈추지 않으면서도 더 빠르게 해법에 도달할 가능성이 높아집니다.
3. **대규모 실행 전에 파일럿 수행하기**: 동적 워크플로는 많은 에이전트를 시작할 수 있으므로 먼저 작은 범위에서 사용량을 추정합니다.
4. **결정론적인 작업에는 스크립트 사용하기**: 매번 모델이 다시 추론하게 하는 것보다 스크립트를 실행하는 편이 저렴합니다. 예를 들어 PDF 스킬에 양식 작성 스크립트를 포함하면 Claude가 매번 코드를 새로 작성하지 않고 바로 실행할 수 있습니다.
5. **필요 이상으로 루틴을 자주 실행하지 않기**: 주기는 관찰 대상이 실제로 변하는 빈도에 맞춰야 합니다.
6. **사용량 검토하기**: `/usage`는 최근 사용량을 스킬, 서브에이전트, MCP별로 나눠 보여 줍니다. 인수 없이 실행한 `/goal`은 현재 턴 수와 토큰 사용량을 표시합니다. `/workflows`는 각 에이전트의 토큰 사용량을 보여 주며 언제든 에이전트를 중지할 수 있게 합니다.

[모델과 effort level](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) 역시 루프 비용을 좌우하는 주요 수단입니다.

한 문장으로 요약하면, 루프는 에이전트를 무한히 실행하는 방식이 아니라 명확한 경계 안에서 작업을 반복하게 하는 방식입니다.

## 시작하기

원문 마지막의 비교표는 "작업의 어느 부분을 루프에 맡기는가"라는 관점으로 이해할 수 있습니다.

| 루프 | 맡기는 부분 | 적합한 시점 | 우선 사용할 기능 |
| --- | --- | --- | --- |
| 턴 기반 | 확인 단계 | 아직 탐색하거나 결정하는 중일 때 | 사용자 정의 검증 스킬 |
| 목표 기반 | 종료 조건 | 완료 상태를 알고 있을 때 | `/goal` |
| 시간 기반 | 시작 트리거 | 프로젝트 외부에서 일정에 따라 작업이 발생할 때 | `/loop`, `/schedule` |
| 능동형 | 프롬프트 | 작업이 반복되고 명확히 정의되어 있을 때 | 위 기능 전체와 동적 워크플로 |

루프를 시작할 때는 먼저 지금 하고 있는 작업을 살펴보십시오. 자신이 병목이 되고 있는 작업 하나를 고른 뒤 다음을 물어보면 됩니다. 검증 절차를 작성할 수 있는가? 완료 여부를 판단할 만큼 목표가 명확한가? 이 작업은 일정이나 외부 이벤트에 따라 발생하는가?

아이디어가 생기면 루프를 실행하고, 어디에서 막히고 어디에서 경계를 넘는지 관찰한 뒤 계속 개선하십시오.

자세한 내용은 Claude Code 문서의 [parallel agents](https://code.claude.com/docs/en/agents), [loop](https://code.claude.com/docs/en/goal), [schedule](https://code.claude.com/docs/en/routines), [goal](https://code.claude.com/docs/en/goal), [dynamic workflows](https://code.claude.com/docs/en/workflows#orchestrate-subagents-at-scale-with-dynamic-workflows) 페이지를 참고할 수 있습니다.
