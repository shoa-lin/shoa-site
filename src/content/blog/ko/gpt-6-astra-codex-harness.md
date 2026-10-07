---
translationKey: "gpt-6-astra-codex-harness"
locale: "ko"
title: "턴 기반에서 컨트롤 플레인으로: GPT-6 Astra는 Codex Harness를 어떻게 다시 쓰는가"
description: "비동기 도구 호출, Mid-turn steering, 동적 추론, 그리고 Agents API가 에이전트 개발을 자체 런타임 구축에서 역량과 책임의 재계층화로 밀어 옮기고 있다."
publishedAt: "2026-09-15"
updatedAt: "2026-09-15"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://developers.openai.com/api/docs/guides/latest-model"
sourceAuthor: "OpenAI Developers 및 커뮤니티 자료"
contentType: "adaptation"
translationStatus: "reviewed"
---

## 결론부터

GPT-6 Astra가 가져온 변화는 모델이 더 강해졌다는 데서 그치지 않는다. 에이전트의 시간 모델, 제어 모델, 런타임 경계가 모두 바뀌고 있다.

비동기 도구 호출은 느린 도구가 실행되는 동안 모델이 독립적인 작업을 계속 처리할 수 있게 한다. Mid-turn steering은 모델이 아직 끝나지 않은 시점에 사용자가 요구를 바꿀 수 있게 한다. `configuration_update`는 요청 수준의 추론 파라미터를 고쳐 쓰지 않고도 이후 추론 강도를 조정하면서 prompt cache 접두사를 유지할 수 있게 한다.

더 큰 변화는 2026년 9월 10일 공개 베타로 나온 Agents API에서 온다. 이것은 OpenAI가 관리하는 Codex Harness를 API로 제공한다. 애플리케이션은 모델 지시, 비즈니스 도구, 실행 환경을 제공하고, OpenAI는 세션, 오케스트레이션, 맥락 압축, 복구, 이벤트 스트림을 관리한다.

이는 에이전트 개발에서 책임의 이동이 일어나고 있다는 뜻이다.

> 플랫폼이 범용 런타임을 흡수하고, 모델이 상호작용 프로토콜의 일부를 흡수하며, 애플리케이션 팀은 비즈니스 역량, 권한 경계, 실행 환경, 결과 검증에 다시 힘을 쏟는다.

## 예전에 나는 왜 이것들을 직접 만들어야 했나

초기에 에이전트를 만들 때, 비동기 도구 호출과 "하면서 방향 바꾸기"는 대개 두 개의 API 파라미터가 아니라 한 묶음의 상태 머신 문제였다.

미완료 작업을 저장하고, 모델 턴과 백그라운드 작업을 구분하고, 프로세스 재시작, 타임아웃, 취소, 중복 콜백, 순서가 뒤바뀐 결과를 처리해야 했다. 사용자의 새 지시를 실행 중인 흐름에 끼워 넣어야 했고, 이전 출력이 무효가 되는지, 이미 실행된 동작을 되돌릴 수 있는지도 판단해야 했다. 추론 강도의 변화는 또 요청 구조, 캐시 적중, 맥락 재생에 영향을 미쳤다.

이런 엔지니어링은 비즈니스 가치를 만들지 않지만, 에이전트가 안정적으로 돌아갈 수 있는지를 결정한다. 팀은 흔히 모델의 한계를 둘러싸고 세운 "보상 계층"을 유지하는 데 많은 시간을 썼다.

Astra는 그중 일부를 프로토콜 의미론으로 바꾸기 시작했다.

## Astra는 모델이 느린 도구에 더 이상 막히지 않게 한다

Responses API의 비동기 도구 호출은 function이나 custom tool 정의에 `async: true`를 설정하도록 요구한다. 모델은 호출을 내보낸 뒤 그 결과에 의존하지 않는 작업을 계속 진행할 수 있고, 애플리케이션은 작업이 끝난 뒤 원래의 `call_id`로 결과를 돌려준다.

여기서 줄어드는 것은 모델 쪽의 대기이지, 애플리케이션 쪽의 일이 아니다. OpenAI는 애플리케이션 대신 백그라운드 작업을 실행해 주지 않으며, 비즈니스 큐도 제공하지 않는다. 프로덕션 시스템은 여전히 작업을 누가 책임지는지, 어떻게 권한을 부여하는지, 어떻게 재시도하는지, 결과를 얼마나 보관하는지, 실패를 어떻게 드러내는지 결정해야 한다.

여러 작업이 동시에 실행된다면, 애플리케이션은 일반적인 `wait_for_tasks` 도구를 정의해 모델이 정말 결과를 비교해야 할 때만 기다리게 할 수도 있다. 이 wait 도구는 애플리케이션 자체의 프로토콜에 속한다.

따라서 비동기 능력의 가치는 모든 도구에 async를 붙이는 데 있지 않다. 정말 독립적인 작업을 앞당겨 시작하되, 명확한 의존성 장벽을 유지하는 데 있다.

## Mid-turn steering은 사용자를 실행 중의 제어 신호로 바꾼다

Astra의 Mid-turn steering은 Responses API의 WebSocket 모드를 통해 제공된다. 애플리케이션이 `response.steer`를 보내면 API는 새로운 사용자 요구를 현재 응답의 큐에 넣고, 이어지는 continuation을 자동으로 생성한다.

이미 보낸 출력을 고쳐 쓰지도 않고, 이미 시작된 도구를 되돌리지도 않는다. `accepted`는 입력이 큐에 들어갔다는 뜻일 뿐이며, 모델이 실제로 실행했는지는 이벤트를 계속 읽으며 확인해야 한다.

그러므로 steering은 "제약 추가"이지 "시간 되감기"가 아니다. Harness는 여전히 다음을 관리해야 한다.

- 현재 응답과 successor 응답의 관계;
- 여러 차례 steering의 순서;
- 이미 부작용이 발생한 권한 경계;
- 도구 결과와 새 방향 사이의 충돌 처리;
- 연결 끊김과 중복 전달 시의 복구 전략.

이는 과거에 "요청을 종료하고 맥락을 다시 만드는" 코드를 손으로 짜던 것보다 더 신뢰할 만하다. 프로토콜이 continuation의 생명주기를 이미 표현하고 있기 때문이다. 하지만 애플리케이션을 대신해 비즈니스 차원의 취소 의미론을 정의해 주지는 않는다.

## configuration_update는 추론 강도를 세션 상태로 바꾼다

애플리케이션은 히스토리에 다음을 삽입할 수 있다.

```json
{
  "type": "configuration_update",
  "reasoning": { "effort": "high" }
}
```

요청 수준의 `reasoning.effort`는 원래 값을 유지하고, 업데이트 항목은 이후 응답에만 영향을 준다. 이렇게 하면 일반 작업에는 낮은 추론 강도를 쓰다가 장애 분석이나 위험 평가를 만나면 강도를 높이면서도 기존 prompt 접두사를 그대로 유지할 수 있어 캐시 재사용에 유리하다.

이 메커니즘은 현재 GPT-6 Astra의 표준 단일 에이전트 모드만 지원하고, reasoning effort만 바꾼다. 인접한 업데이트, 자동 compaction, 자동 truncation에는 모두 명시적인 제한이 있다.

여기서 세 가지 층위를 구분해야 한다. API는 이미 이 프로토콜을 지원하고, Codex 하부에는 일부 데이터 구조가 이미 있을 수 있지만, 현재 Codex 클라이언트가 일반적인 설정 변경 시 이를 올바르게 사용하는지는 구체적인 버전별로 검증해야 한다. 공개된 [Codex Issue #42996](https://github.com/openai/codex/issues/42996)은 여전히 추론 강도 전환 후의 캐시 적중 문제를 보고하고 있으므로, API 문서를 클라이언트가 연동을 마쳤다는 증거로 바로 받아들여서는 안 된다.

## Responses API에서 Codex Harness로, 다시 Agents API로

OpenAI는 이제 세 가지 런타임 경계를 매우 분명하게 설명한다.

| 방식 | 누가 런타임을 관리하는가 | 어디에 적합한가 |
| --- | --- | --- |
| Responses API | 애플리케이션 자신 | 에이전트 루프를 완전히 제어해야 할 때 |
| Codex SDK / App Server | 로컬 Codex 런타임 재사용 | Codex를 자신의 도구와 제품에 통합할 때 |
| Agents API | OpenAI가 호스팅하는 Codex Harness | 플랫폼이 세션, 오케스트레이션, 압축, 복구를 관리해 주기를 바랄 때 |

Agents API의 의미는 과거 모든 팀이 반복해서 구현해야 했던 범용 Harness를 플랫폼 역량으로 바꾼다는 데 있다. 공식 문서가 나열한 호스팅 역량에는 샌드박스, Skills, MCP, steering, 맥락 관리, 서브 에이전트, 세션 복구가 포함된다.

애플리케이션 팀은 여전히 도구를 제공하고 실행 환경을 선택해야 하지만, 모든 범용 agent loop를 처음부터 구현할 필요는 없다.

이것은 "모든 일을 플랫폼에 넘긴다"는 뜻이 아니다. 플랫폼은 범용 실행 메커니즘을 맡고, 애플리케이션은 비즈니스의 진실을 맡는다. 예를 들면 이렇다.

- 어느 테넌트가 이 데이터를 읽을 권한이 있는가;
- 도구 호출이 외부 부작용을 일으켜도 되는가;
- 재시도가 중복 결제나 중복 배포를 일으키지 않는가;
- 어떤 증거가 있어야 작업이 완료되었다고 말할 수 있는가;
- 어떤 결과가 반드시 사람의 승인을 거쳐야 하는가.

## Harness의 복잡도는 사라지는 것이 아니라 다시 계층화된다

과거의 엔지니어링 복잡도를 세 가지로 나눌 수 있다.

1. **모델 보상 복잡도**: 대기, 맥락 재구성, 중단 시뮬레이션, 비동기 프로토콜 직접 작성. Astra가 그중 일부를 흡수하고 있다.
2. **범용 런타임 복잡도**: 세션, 이벤트 스트림, 압축, 복구, 서브 에이전트, 샌드박스. Codex Harness와 Agents API가 그중 일부를 흡수하고 있다.
3. **비즈니스 정확성 복잡도**: 권한, 데이터 일관성, 승인, 멱등성, 인수 검증, 감사. 이것들은 여전히 애플리케이션 자체의 몫이다.

그러니 진짜 변화는 "앞으로는 엔지니어링을 안 해도 된다"가 아니라, 엔지니어링의 무게중심이 이동했다는 것이다.

```text
과거: 직접 Agent Runtime을 구축
현재: 역량 연결, 경계 선언, 결과 검증
```

## Codex에 주는 시사점

Codex Harness가 계속 진화한다면, 핵심은 턴 루프에서 컨트롤 플레인으로 옮겨 갈 것이다.

```text
이벤트 스트림
  ├─ 모델 응답
  ├─ 도구 시작과 완료
  ├─ 사용자 steering
  ├─ 추론 설정 업데이트
  └─ continuation

컨트롤 플레인
  ├─ 현재 conversation head
  ├─ pending task registry
  ├─ 권한과 승인
  ├─ 캐시 불변량
  ├─ 복구와 멱등성
  └─ 결과 검증
```

LangChain, Hermes, ZeroClaw 및 다른 게이트웨이를 둘러싼 커뮤니티 논의도 보여 주듯, 프로토콜이 나온 뒤에도 생태계가 적응하는 데는 시간이 필요하다. 흔한 문제는 "async 필드를 내보낼 수 있는가"가 아니라, 스트리밍 변환, 메시지 재생, 순서가 뒤바뀐 완료, 끊김 복구, 중복 전달이 원래의 의미론을 보존하는가다.

## 마지막 판단

Astra와 Agents API는 함께 새로운 에이전트 분업을 가리킨다.

> 모델은 더 유연하게 생각하는 일을, 프로토콜은 실행 중의 제어를 표현하는 일을, Harness는 범용 오케스트레이션을, 애플리케이션은 비즈니스 세계의 실제 제약을 맡는다.

이는 새 에이전트의 초기 비용을 크게 낮출 것이다. 과거에 몇 주가 걸리던 비동기 루프, 상태 복구, 중도 개입 구축은 앞으로 런타임 설정과 도구 연결로 바뀔 수 있다.

하지만 이는 애플리케이션 팀에게 "문제를 정의하는" 능력을 더 높이 요구하기도 한다. 범용 메커니즘이 플랫폼에 넘어갈수록, 진짜 차별화되는 부분은 도구 설계, 권한 모델, 환경 경계, 검증기, 피드백 루프에 더 집중된다.

에이전트 개발의 핵심 질문은 "어떻게 모델을 돌아가게 할 것인가"에서 "어떻게 현실 세계에서 믿고 쓰이게 할 것인가"로 옮겨 가고 있다.

## 참고 자료

- [OpenAI: Using GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI: Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling)
- [OpenAI: Mid-turn steering](https://developers.openai.com/api/docs/guides/steering)
- [OpenAI: Change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation)
- [OpenAI: Agents API overview](https://developers.openai.com/api/docs/guides/agents-api/overview)
- [OpenAI: Agents runtime comparison](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI: Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [OpenAI: Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Chasing Next: Async Tool Calling in the Responses API](https://chasingnext.com/updates/async-tool-calling-in-the-responses-api)
- [The Syntax Diaries: OpenAI Async Tool Calling Without Lost Results](https://thesyntaxdiaries.com/openai-async-tool-calling)
- [LangChain Issue #40204](https://github.com/langchain-ai/langchain/issues/40204)
