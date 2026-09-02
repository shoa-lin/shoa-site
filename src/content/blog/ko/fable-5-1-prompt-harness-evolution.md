---
translationKey: "fable-5-1-prompt-harness-evolution"
locale: "ko"
title: "Fable 5에서 Fable 5.1로: System Prompt가 Agent OS로 진화하고 있다"
description: "두 세대의 Claude Runtime Prompt를 비교해 Memory, Past Chats, Skills, 도구 라우팅, 안전 거버넌스의 구조적 변화와 Agent Harness의 다음 방향을 분석한다."
publishedAt: "2026-09-02"
updatedAt: "2026-09-02"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/fable-5-1-prompt-harness-evolution/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## 결론부터 말하면

Anthropic은 2026년 9월 1일 Claude Fable 5.1을 공개했다. 대부분의 논의는 모델 성능, 가격, 벤치마크에 집중되어 있다. 그러나 내가 더 주목한 것은 겉보기에는 덜 화려하지만 제품의 방향을 훨씬 잘 보여 주는 자료, 즉 **Claude가 실제 제품 안에서 동작할 때 사용하는 System Prompt와 Runtime Prompt**다.

나는 2026년 6월 9일의 Fable 5 전체 Runtime Prompt 아카이브와 2026년 9월 2일에 확보한 Fable 5.1 Runtime Prompt 스냅샷을 비교했다. 전자는 약 1,580줄, 126,943바이트이고, 후자는 2,195줄, 275,723바이트다. 도구 정의 수도 18개에서 44개로 늘었다.

그렇다고 이번 변화를 단순히 “Prompt가 두 배가 됐다”라고 요약할 수는 없다. 파일 크기의 상당 부분은 Tool Schema, 예시, 동적 실행 환경 설명에서 나온다. **길이는 지능이 아니며, 제품 능력 그 자체도 아니다.** 중요한 것은 구조다.

> Fable 5는 이미 Tools, Skills, MCP, Artifacts를 탑재한 Agent였다. Fable 5.1은 Memory, 과거 대화, 능력 탐색, 출력 라우팅, 권한, 안전 거버넌스를 더 완전한 Agent Runtime으로 조직하기 시작했다.

다시 말해 Claude를 둘러싼 Harness는 “모델에 도구를 붙이는 것”에서 “모델에 운영체제를 제공하는 것”으로 이동하고 있다.

## 먼저 비교 범위를 분명히 하자

이 글은 모델 가중치, 학습 데이터, Anthropic의 서버 측 소스 코드를 비교하지 않는다. 비교 대상은 관찰 가능한 두 개의 **Prompt 및 Runtime 구성 스냅샷**이다.

Anthropic이 공개한 System Prompt 페이지는 주로 claude.ai와 모바일 앱에서 사용하는 핵심 행동 지침을 보여 준다. 반면 전체 Runtime 스냅샷에는 해당 세션에서 사용할 수 있는 도구 정의, Skills, 파일 시스템 규칙, 네트워크 권한, 사용자 컨텍스트 자리표시자, 제품 라우팅 정책까지 들어간다. 이 글에서는 이 전체 묶음을 **Runtime Prompt Bundle**이라고 부른다.

따라서 이 비교를 통해 제품이 모델 주변의 능력을 어떻게 구성하는지는 상당히 정확하게 읽을 수 있다. 그러나 Prompt만 보고 기본 모델의 추론 능력이 얼마나 향상됐는지 단정할 수는 없다. 모델 능력과 Harness 능력은 분리해서 평가해야 한다.

## 주요 변화를 한눈에 보기

| 차원 | Fable 5 | Fable 5.1 | 구조적 변화 |
| --- | --- | --- | --- |
| Memory | Memory 접근에 대한 짧은 설명 | 파일 분류, 추출, 읽기·쓰기, Version, Privacy, 적용 규칙을 상세히 정의 | 기능 설명에서 거버넌스가 있는 Data Plane으로 |
| Past Chats | 독립적인 과거 대화 검색 계층 없음 | `conversation_search`, `recent_chats`, `read_conversation` | 압축된 Memory와 원본 증거를 분리 |
| 도구 수 | 18개 도구 정의 | 44개 도구 정의 | 범용 도구 상자에서 폭넓은 Capability Interface로 |
| 능력 확장 | Skills와 MCP Apps | Skills, Plugin Catalog, MCP Apps | 정적 구성에서 탐색과 설치로 |
| 출력 형태 | Text, Files, Artifacts, Maps 등 | Charts, 비교 카드, 단계 카드, Quiz, 번역, 상품, Links 등의 Typed Output 추가 | 문자열에서 라우팅 가능한 UI Type으로 |
| 출력 라우팅 | 개별 도구 설명에 흩어짐 | MCP, File, Visualizer 간 우선순위를 명시 | Harness가 Capability Router 역할을 시작 |
| 작업 가시성 | 일반적인 진행 업데이트 규칙 없음 | 긴 Tool Run 중 짧은 업데이트를 제공하고 마지막에 완전한 결과 전달 | 장기 작업 경험을 명시적으로 관리 |
| 글 형식 | Lists, Headings, Bold를 강하게 억제 | 복잡도에 필요한 최소 형식만 사용 | 새 모델의 기본 행동에 맞춰 재조정 |
| Search | 시의성 있는 정보 검증을 이미 요구 | 빠르게 변하는 Product, Model, Tool은 “알고 있어도” 검색 | 친숙함을 최신성의 증거로 보지 않음 |
| Safety와 Privacy | 상당한 거절·Wellbeing 규칙 보유 | Child Safety, Copyright 연속성, Memory Privacy, 삭제 의미, 대화 종료 규칙을 세분화 | 출력 필터에서 Lifecycle Governance로 |

## 변화 1: Memory가 두 문장의 설명에서 파일 시스템으로 성장했다

Fable 5의 Memory 섹션은 매우 얇다. Claude가 과거 대화에서 파생된 Memory를 받을 수 있고, 사용자가 기능을 활성화했는지를 알려 줄 뿐이다. “Memory가 있다”는 사실은 설명하지만, Memory가 어떻게 만들어지고, 갱신되고, 제거되는지, 서로 다른 기억을 어떻게 구분하는지는 정의하지 않는다.

Fable 5.1은 Memory를 영속 파일 시스템으로 모델링하고 최소 다섯 가지 콘텐츠 유형으로 나눈다.

- `/profile.md`: 비교적 안정적인 신원과 역할 정보
- `/topics/`: 습관, 선호, 반복되는 대화 주제
- `/areas/`: 진행 중인 Project, 책임, Decision
- `/people/`: 현재 질문과 관련된 관계 Context
- `/preferences.md`: 사용자가 Claude의 답변과 협업 방식에 기대하는 것

설계는 파일 이름에서 끝나지 않는다. Background Memory Pass, `[stated]` 같은 Provenance Label, Read-before-write, Version Conflict, Append와 Replace, 전체 파일 Delete, Sensitive Data 경계, 기존 Memory를 답변에 사용해야 하는 경우와 사용하지 말아야 하는 경우까지 정의한다.

```text
대화 완료
   ↓
Background에서 Durable Facts 추출
   ↓
분류, 중복 제거, Privacy Filter, Version Merge
   ↓
Persistent Memory Files
   ↓
미래 질문에 대해 관련성 기반 조회
   ↓
답을 실질적으로 바꾸는 Context만 주입
```

이는 단순히 “대화 기록을 Embedding하고 Top-K Retrieval을 수행하는 것”이 아니다. Schema, Provenance, Lifecycle, Access Policy를 가진 **Context Database**에 가깝다.

내 결론은 Agent Memory의 경쟁이 “기억할 수 있는가”에서 “무엇을 기억하고, 왜 신뢰할 수 있으며, 누가 수정할 수 있고, 언제 만료되며, 어떻게 철회할 수 있는가”로 이동한다는 것이다. Vector Retrieval은 그 시스템 안의 한 구현 세부사항일 뿐이다.

## 변화 2: Past Chats와 Memory가 별도의 Context Plane이 되었다

Fable 5.1은 과거 대화 전용 도구인 `conversation_search`, `recent_chats`, `read_conversation`을 추가했다. 이는 단순히 Memory 기능 하나를 더한 것이 아니다. 두 종류의 정보가 본질적으로 다르다는 점을 Architecture 수준에서 인정한 것이다.

- **Memory는 압축된 Durable Claim을 저장**해 효율적으로 재사용한다.
- **Past Chats는 원본 대화 증거를 보존**해 맥락을 복원하고 검증한다.

Prompt는 사용자가 실제로 말하거나 결정한 것과 Claude가 단지 제안한 것을 명확히 구분하도록 요구한다. 과거 대화에 Assistant의 제안만 있다면 다음 대화에서 그것을 사용자의 결정으로 승격할 수 없다. 당시 논의가 가설적이었다면 압축 과정이 가설을 사실로 바꿔서도 안 된다.

이는 모든 장기 Memory 시스템의 핵심 문제를 다룬다. **압축은 사용성을 높이지만 증거를 없앤다.**

따라서 더 신뢰할 수 있는 구조는 하나의 만능 Memory Store에 모든 역할을 맡기지 않는다.

```text
Memory = 재사용 가능한 결론
Past Chats = 추적 가능한 증거
Current Session = 지금 진행 중인 Task State
```

성숙한 Agent는 단지 기억하는 것만으로 부족하다. 그 기억이 어디서 왔고, 사용자가 말한 것인지, Tool이 검증한 것인지, Model이 추론한 것인지 설명할 수 있어야 한다.

## 변화 3: Skills, Plugins, MCP가 Capability Supply Chain을 만든다

Fable 5에는 이미 Skills와 MCP Apps가 있었다. 문서, Spreadsheet, Presentation, Code Artifact를 만들기 전에 관련 `SKILL.md`를 읽고, 외부 서비스에 접근할 때 연결된 MCP를 우선 사용한다는 규칙도 있었다.

Fable 5.1은 이 구조를 유지하면서 검색, 추천, 설치 경로를 포함한 Plugin Catalog와 Skill Catalog를 추가한다. 새로운 Capability Layer는 다음처럼 이해할 수 있다.

- **Skill**은 특정 Task Class의 경험, 규칙, 방법을 패키징한다.
- **Plugin**은 Tools, Commands, Skills를 배포 가능한 Capability Bundle로 묶는다.
- **MCP**는 외부 Data, System, 현실 세계의 Authority를 연결한다.
- **Tool Schema**는 구체적인 Action을 Model에 노출한다.
- **Router**는 현재 Task를 어느 Capability Class가 처리할지 결정한다.

도구 정의가 18개에서 44개로 늘어난 것도 단순히 “함수가 26개 더 생겼다”는 뜻이 아니다. 신규 도구는 Memory CRUD, Past Chat Retrieval, Plugin/Skill Discovery, Research Suggestion, 그리고 Charts, Comparison, Steps, Translation, Quiz, Products, Links 같은 Structured UI에 집중되어 있다.

이는 전통적인 Software Layering에 가까워지고 있음을 보여 준다. Model이 모든 업무 방법을 영구히 기억할 필요는 없고, 모든 외부 권한을 직접 보유해서도 안 된다. Capability는 Discovery, Load, Authorization, Invocation, Removal의 대상이 될 수 있다.

## 변화 4: Prompt가 Model Behavior를 역으로 보정하기 시작했다

Fable 5의 Prompt는 당시 Model이 과도한 형식과 템플릿 같은 답변을 만들기 쉬웠기 때문에 Headings, Lists, Bold를 강하게 억제했다. Fable 5.1은 이를 완화해 내용이 복합적이면 List를 사용하고, 명확성을 위해 필요한 최소 형식만 사용하도록 한다.

이는 단순히 제품 취향이 바뀐 것이 아니다. Model의 기본 행동이 바뀌었다. Anthropic의 Fable 5.1 Prompting Guide는 새 Model이 Fable 5보다 Headings, Lists, Bold를 덜 사용하는 경향이 있다고 설명한다. 이전 Anti-formatting Prompt를 그대로 유지하면 오히려 빽빽한 긴 문단이 생길 수 있다.

같은 보정 관계는 두 군데 더 나타난다.

- Fable 5.1은 긴 Tool Chain에서 자발적인 진행 업데이트를 덜 제공하므로, 새 Prompt는 몇 차례 Tool Call마다 짧은 Update를 요청한다.
- Fable 5.1은 낮은 Effort에서 검색보다 기존 지식으로 답하기 쉬우므로, 새 Prompt는 빠르게 변하는 Product, Model, Tool의 검증 규칙을 강화한다.

Prompt Engineering에 중요한 교훈은 **System Prompt가 한 번 작성하고 끝나는 제품 사양이 아니라 Model Behavior의 Controller**라는 점이다. Model이 바뀌면 이전 Prompt가 여전히 실행되더라도 과도한 보정이 되어 새 Model을 더 나쁘게 만들 수 있다.

성숙한 팀은 모든 Model에 하나의 “범용 Prompt”를 쓰지 않는다. Eval로 Failure Mode를 관찰하고 현재 Model에 필요한 최소한의 보정을 적용한다.

## 변화 5: Safety가 “무엇을 답할 수 있는가”에서 State와 Data Governance로 이동했다

Fable 5에도 이미 광범위한 Safety Policy가 있었다. Fable 5.1의 중요한 변화는 금지 항목이 단순히 늘어난 것이 아니다. Safety Rule이 상호작용의 전체 Lifecycle로 확장되었다.

새 Prompt는 거절 이후 후속 요청이 State를 어떻게 상속하는지, 요청을 축소하거나 표현을 바꿔도 Copyright 경계가 유지되는지, 어떤 정보가 Long-term Memory에 절대 들어가면 안 되는지, 한 Memory를 삭제할 때 그것만으로 파생된 결론도 삭제해야 하는지, Sensitive Memory를 언제 읽을 수 있는지, 대화 종료 요청을 어떻게 확인하는지, Abuse, Self-harm Risk, Potential Violence 상황에서 대화를 종료할 수 있는지를 다룬다.

이 규칙들은 최종 Text 이상을 통제한다.

- Data를 저장할 수 있는가
- 어떤 Provenance Label을 붙이는가
- 나중에 다시 사용할 수 있는가
- 사용자가 철회할 수 있는가
- Tool Side Effect를 어떻게 제한하는가
- Conversation State가 다음 Decision을 어떻게 바꾸는가

따라서 Safety는 Answer 주변의 Classifier에서 Agent Runtime 내부의 Policy Engine으로 진화하고 있다.

## 근본적으로 달라지지 않은 것

모든 세부사항을 혁명적이라고 부르지 않으려면 Fable 5가 이미 가지고 있던 것도 확인해야 한다.

Fable 5에는 Persistent Artifact Storage, MCP Connectors, Skills, File Creation, Computer Use, Web Search, Image Search, Typed Map Output이 이미 있었다. Text-only Chatbot이 아니었고, Fable 5.1이 Agent를 처음부터 발명한 것도 아니다.

실제 업그레이드는 Fable 5.1이 기존 구성요소에 더 명확한 Context Category, Evidence Recovery, Capability Catalog, Output Routing, Process Feedback, Governance Rule을 부여한 것이다.

따라서 이번 전환은 “구성요소가 많다”에서 “구성요소 사이에 운영체제 같은 책임 경계가 생긴다”로 이해하는 편이 정확하다.

## 내 요약: 네 개의 Plane이 형성되고 있다

이번 변화를 추상화하면 Claude Runtime을 네 개의 Plane으로 설명할 수 있다고 본다.

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

Fable 5는 주로 Capability를 확장했다. Fable 5.1은 Context와 State Governance에 훨씬 더 진지하게 투자하기 시작했다.

나는 이제 Agent Product를 다음 공식으로 이해하는 편이 낫다고 생각한다.

> **Agent Product Capability = Model × Context × Capability × State Governance**

이는 덧셈이 아니라 곱셈이다. 강한 Model도 Context가 틀리면 실패한다. Tools가 많아도 Permission이 통제되지 않으면 Enterprise에 들어갈 수 없다. Provenance와 Delete Mechanism이 없는 풍부한 Memory는 오염을 축적한다. 검증 가능한 Feedback이 없는 완전한 Workflow는 Agent가 실수를 더 자동으로 하게 만들 뿐이다.

## 앞으로 어디로 갈 것인가

### 1. Monolithic System Prompt는 Modular Policy로 분리될 것이다

오늘은 2,000줄이 넘는 Runtime Prompt Bundle을 읽을 수 있지만, 그 안의 많은 규칙이 영원히 Natural Language 형태로 Model에 주입될 필요는 없다. 점차 Versioned Policy, Skills, Routers, Permission Settings, Task-scoped Instructions로 이동할 것이다.

Prompt는 사라지지 않는다. 다만 “모든 규칙을 담는 Text”에서 “현재 Goal과 Boundary를 Model이 이해하게 하는 Interface”로 역할이 축소될 것이다.

### 2. Context Engineering은 State Engineering으로 발전할 것이다

과거의 질문은 더 많은 Context를 Window에 넣는 방법이었다. 앞으로 더 중요한 질문은 State의 소유자가 누구인지, 어느 Version이 현재인지, 어떤 Fact가 만료됐는지, Rollback을 어떻게 하는지, External Action이 실제로 발생했음을 어떻게 증명하는지다.

Memory, Past Chats, Session, Tool Trace, External System State는 별도로 모델링될 것이다. Agent Context는 계속 길어지는 Prompt보다 Database와 Event Stream에 더 가까워진다.

### 3. 더 많은 제약이 Prompt에서 Protocol Layer로 내려갈 것이다

Fable 5.1은 Turn-scoped System Message, Thinking Block Binding, Content Provenance, Per-message Effort도 함께 도입했다. 이는 같은 방향을 가리킨다. 중요한 제약이 Model이 “규칙을 기억하는 것”에 의존하지 않고 API와 Runtime에 직접 표현되기 시작했다.

Type System, Permission System, Version Number, Protocol로 보장할 수 있는 것은 결국 Prompt Text에만 존재해서는 안 된다.

### 4. Agent Output은 Text가 아니라 Typed Result가 될 것이다

44개 Tools의 신규 항목 중 상당수는 Action Tool이 아니라 Charts, Cards, Steps, Quiz, Translation, Product Lists 같은 Output Component다. Model의 최종 산출물은 Markdown String에서 Application이 직접 소비할 수 있는 Typed Result로 이동하고 있다.

미래의 Frontend는 Answer를 렌더링하는 데 그치지 않는다. Result Type에 따라 Interactive UI를 선택하고 다음 User Interaction을 다음 Turn의 State로 변환한다.

### 5. Model과 Harness는 함께 Training되고 함께 Iteration될 것이다

가장 중요한 장기 추세는 Model과 Harness가 더 이상 독립적인 제품이 아니라는 점이다. Post-training은 특정 Tool Protocol, Progress Reporting, Editing Pattern, Memory Structure, Permission Boundary에 Model을 맞추게 될 것이다. Harness는 새 Model의 Failure Mode에 맞춰 Prompt, Router, Eval을 다시 조정한다.

Fable 5에서 Fable 5.1로 오며 Formatting Guidance가 반전된 것은 작지만 분명한 사례다. Model의 기본 행동이 바뀌면 주변 제어도 함께 바뀌어야 한다.

최종 경쟁은 가장 강한 Base Model을 누가 보유했는지만으로 결정되지 않는다. 더 풍부한 Real Environment, 더 높은 품질의 Task Trajectory, 더 신뢰할 수 있는 Feedback Signal, 그리고 이 신호를 Model과 Harness 양쪽 개발에 다시 투입하는 Closed Loop를 누가 가지고 있는지가 중요하다.

## Agent Builder에게 의미하는 것

첫째, System Prompt를 Product Architecture로 착각하지 말아야 한다. Prompt는 Boundary를 설명할 수 있지만, 신뢰할 수 있는 Boundary는 Permission, Schema, Version, Idempotency, Audit, Eval이 보장해야 한다.

둘째, Memory를 Vector Database로 축소하지 말아야 한다. Long-term Memory는 먼저 Data Governance 문제이고, 그다음이 Retrieval 문제다.

셋째, Final Answer만 평가하지 말아야 한다. Tool-using Agent에서는 Trajectory가 올바른지, Side Effect가 통제되는지, Failure에서 복구 가능한지, Evidence가 Traceable한지가 더 중요하다.

넷째, Model을 교체하면 이전 Harness가 자동으로 좋아질 것이라고 가정하지 말아야 한다. Model Upgrade마다 Real-task Eval을 다시 실행하고 Search, Parallel Tool Use, File Editing, Formatting, Stopping Condition, Progress Reporting의 Drift를 확인해야 한다.

## 마무리

Fable 5.1의 Prompt 변화에서 가장 중요한 것은 규칙이 몇 개 늘었는지가 아니다. Anthropic이 모든 Agent Product가 언젠가 마주치는 질문에 더 체계적으로 답하기 시작했다는 점이다. Context는 어디서 오고, Capability는 어떻게 Load되며, State는 어떻게 이어지고, Side Effect는 어떻게 관리되고, Result는 어떻게 표현되며, Error는 어떻게 수정되는가.

내 최종 판단은 다음과 같다.

> 다음 세대 Agent 경쟁은 누가 더 긴 Prompt를 가졌는지가 아니다. 누가 Model을 더 현실적이고, 더 Stateful하며, 더 검증 가능하고, 계속 학습할 수 있는 Environment 안에 놓을 수 있는가의 경쟁이다.

이러한 Environment Capability가 안정되면 System Prompt는 다시 짧아질 수 있다. 가장 신뢰할 수 있는 규칙은 결국 “Model에게 올바르게 행동하라고 말하는 것”에서 “System이 올바른 방식으로만 행동하도록 허용하는 것”으로 진화하기 때문이다.

## 참고 자료

- [Anthropic: System prompts overview](https://platform.claude.com/docs/en/release-notes/system-prompts/overview)
- [Anthropic: Claude Fable 5 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5)
- [Anthropic: Claude Fable 5.1 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5-1)
- [Anthropic: Claude Fable 5.1 model overview](https://platform.claude.com/docs/en/models/fable-5-1/overview)
- [Anthropic: Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)
- [Fable 5 전체 Runtime Prompt Community Archive](https://github.com/infineural/fable-5/blob/main/system-prompt/full-system-prompt.md)
