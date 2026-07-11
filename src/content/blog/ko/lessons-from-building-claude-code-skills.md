---
translationKey: "lessons-from-building-claude-code-skills"
locale: "ko"
title: "Claude Code를 만들며 배운 것: 우리는 Skills를 어떻게 사용하는가"
description: "Claude Code 팀이 수백 개의 Skills를 설계하고 구성하며 유지보수하면서 얻은 실전 교훈을 소개합니다."
publishedAt: "2026-03-17"
updatedAt: "2026-03-17"
category: "development"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2033949937936085378"
sourceAuthor: "Thariq Shihipar"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Claude Code를 만들며 배운 것: 우리는 Skills를 어떻게 사용하는가 표지](https://pbs.twimg.com/media/HDl2jn9a0AAZkyz?format=jpg&name=small)

Skills는 Claude Code에서 가장 많이 사용되는 확장 지점 중 하나가 됐습니다. 유연하고 만들기 쉬우며 배포도 간단합니다.

하지만 이 유연성 때문에 어떤 방식이 가장 효과적인지 판단하기 어려울 수도 있습니다. 어떤 Skills를 만들 가치가 있을까요? 좋은 Skill을 작성하는 비결은 무엇일까요? 언제 다른 사람들과 공유해야 할까요?

Anthropic에서는 Claude Code 전반에 Skills를 폭넓게 활용하고 있으며, 현재 수백 개가 실제로 사용되고 있습니다. 이 글에서는 Skills로 개발 속도를 높이는 과정에서 얻은 교훈을 소개합니다.

---

## Skills란 무엇인가요?

Skills가 처음이라면 먼저 [문서](https://code.claude.com/docs/en/skills)를 읽거나 최신 [Agent Skills Skilljar 과정](https://anthropic.skilljar.com/introduction-to-agent-skills)을 살펴보세요. 이 글은 Skills에 대한 기본적인 이해가 있다고 가정합니다.

Skills가 "그저 마크다운 파일"이라는 오해가 흔합니다. 하지만 흥미로운 점은 단순한 텍스트 파일이 아니라는 데 있습니다. Skills는 스크립트, 애셋, 데이터와 그 밖의 리소스를 포함할 수 있는 폴더이며, 에이전트는 그 안의 내용을 발견하고 탐색하고 조작할 수 있습니다.

Claude Code의 Skills에는 동적 훅을 비롯해 [매우 다양한 구성 옵션](https://code.claude.com/docs/en/skills#frontmatter-reference)도 있습니다.

특히 흥미로운 Skills는 이런 구성 옵션과 폴더 구조를 창의적으로 활용합니다.

---

## Skills의 유형

Skills를 분류해 보니 몇 가지 반복되는 범주로 모인다는 사실을 발견했습니다. 좋은 Skills는 대개 하나의 범주에 명확히 들어맞고, 이해하기 어려운 Skills는 여러 범주에 걸쳐 있습니다. 아래 목록이 완전한 분류 체계는 아니지만, 조직 안에 무엇이 부족한지 생각하는 데 유용합니다.

![일반적인 Skill 범주를 보여 주는 차트](https://pbs.twimg.com/media/HDlvMmubEAIzF-N?format=jpg&name=small)

---

### 1. 라이브러리 및 API 레퍼런스

라이브러리, CLI 또는 SDK를 올바르게 사용하는 방법을 설명하는 Skills입니다. 사내 라이브러리일 수도 있고 Claude Code가 간혹 다루기 어려워하는 일반 도구일 수도 있습니다. 이런 Skills에는 참조용 코드 조각과 Claude가 스크립트를 작성할 때 피해야 할 주의 사항 목록이 자주 포함됩니다.

**예시:**

- **billing-lib** - 사내 결제 라이브러리의 경계 사례, 함정 및 그 밖의 오류가 발생하기 쉬운 세부 사항
- **internal-platform-cli** - 사내 CLI 래퍼의 모든 하위 명령과 각 명령을 언제 사용해야 하는지 보여 주는 예시
- **frontend-design** - Claude가 디자인 시스템을 더 잘 적용하도록 지원

---

### 2. 제품 검증

코드가 제대로 작동하는지 테스트하거나 검증하는 방법을 설명하는 Skills입니다. Playwright나 tmux 같은 외부 도구와 함께 사용하는 경우가 많습니다.

검증용 Skills는 Claude의 결과가 올바른지 보장하는 데 매우 유용합니다. 엔지니어 한 명이 일주일을 들여 완성도를 높일 만한 가치가 충분할 수 있습니다.

Claude가 정확히 무엇을 테스트했는지 확인할 수 있도록 영상을 녹화하거나, 모든 단계에서 상태를 프로그램으로 단언하도록 강제하는 방법을 고려해 보세요. 이런 기능은 대개 Skill 안의 스크립트로 구현합니다.

**예시:**

- **signup-flow-driver** - 헤드리스 브라우저에서 가입 -> 이메일 인증 -> 온보딩을 실행하고 훅으로 각 단계의 상태를 검증
- **checkout-verifier** - Stripe 테스트 카드로 결제 UI를 구동하고 청구서가 올바른 상태에 도달했는지 검증
- **tmux-cli-driver** - 워크플로에 TTY가 필요한 대화형 CLI를 테스트

---

### 3. 데이터 수집 및 분석

데이터와 모니터링 스택에 연결하는 Skills입니다. 인증이 필요한 데이터를 가져오는 라이브러리, 특정 대시보드 ID, 일반적인 워크플로나 쿼리를 위한 지침이 포함될 수 있습니다.

**예시:**

- **funnel-query** - 가입 -> 활성화 -> 유료 전환을 분석할 때 조인해야 할 이벤트와 표준 `user_id`가 들어 있는 테이블
- **cohort-compare** - 두 코호트의 유지율 또는 전환율을 비교하고 통계적으로 유의미한 차이를 표시하며 세그먼트 정의로 연결
- **grafana** - 데이터 소스 UID, 클러스터 이름, 문제별 대시보드 조회표

---

### 4. 비즈니스 프로세스 및 팀 자동화

반복되는 워크플로를 하나의 명령으로 바꾸는 Skills입니다. 지침 자체는 단순한 경우가 많지만 다른 Skills나 MCP에 의존할 수 있습니다. 이전 결과를 로그 파일에 저장하면 모델이 일관성을 유지하고 과거 실행을 되돌아보는 데 도움이 됩니다.

**예시:**

- **standup-post** - 티켓 추적기, GitHub 활동, 이전 Slack 게시물을 모아 변경 사항만 담은 형식화된 스탠드업을 생성
- **create-<ticket-system>-ticket** - 유효한 열거형 값과 필수 필드가 포함된 스키마를 강제한 다음 리뷰어에게 알리고 Slack에 티켓을 연결하는 등 생성 후 워크플로를 실행
- **weekly-recap** - 병합된 PR, 종료된 티켓, 배포 내역을 형식화된 주간 회고 게시물로 정리

---

### 5. 코드 스캐폴딩 및 템플릿

코드베이스의 특정 기능을 위한 프레임워크 보일러플레이트를 생성하는 Skills입니다. 자연어 지침과 조합 가능한 스크립트를 함께 사용할 수 있어, 스캐폴딩 요구 사항을 코드만으로 완전히 표현하기 어려울 때 특히 유용합니다.

**예시:**

- **new-<framework>-workflow** - 애너테이션을 적용해 새로운 서비스, 워크플로 또는 핸들러를 스캐폴딩
- **new-migration** - 마이그레이션 템플릿과 일반적인 주의 사항을 제공
- **create-app** - 인증, 로깅, 배포 구성이 이미 연결된 사내 앱을 생성

---

### 6. 코드 품질 및 리뷰

조직의 코드 품질 기준을 적용하고 코드 리뷰를 돕는 Skills입니다. 안정성을 높이기 위해 결정적 스크립트나 도구를 포함할 수 있으며, 훅 또는 GitHub Actions를 통해 자동으로 실행할 수도 있습니다.

**예시:**

- **adversarial-review** - 새로운 관점의 서브에이전트를 생성해 작업을 비판하고, 수정 사항을 반영하며, 발견 내용이 사소한 지적 수준으로 줄어들 때까지 반복
- **code-style** - Claude가 기본적으로 잘 처리하지 못하는 코드 스타일을 강제
- **testing-practices** - 테스트 작성 방법과 테스트해야 할 대상을 설명

---

### 7. CI/CD 및 배포

코드를 가져오고 푸시하고 배포하는 데 도움을 주는 Skills입니다. 데이터를 수집하기 위해 다른 Skills를 호출할 수도 있습니다.

**예시:**

- **babysit-pr** - PR 모니터링 -> 불안정한 CI 재시도 -> 병합 충돌 해결 -> 자동 병합 활성화
- **deploy-<service>** - 빌드 -> 스모크 테스트 -> 오류율을 비교하며 점진적으로 트래픽 확대 -> 회귀 발생 시 자동 롤백
- **cherry-pick-prod** - 격리된 워크트리 생성 -> cherry-pick -> 충돌 해결 -> 올바른 템플릿으로 PR 생성

---

### 8. 운영 절차

Slack 스레드, 알림 또는 오류 시그니처 같은 증상에서 출발해 여러 도구를 활용한 조사를 진행하고 구조화된 보고서를 만드는 Skills입니다.

**예시:**

- **<service>-debugging** - 트래픽이 많은 서비스를 위해 증상 -> 도구 -> 쿼리 패턴을 매핑
- **oncall-runner** - 알림 가져오기 -> 일반적인 원인 점검 -> 조사 결과 형식화
- **log-correlator** - 요청 ID를 받아 해당 요청을 처리했을 가능성이 있는 모든 시스템에서 일치하는 로그를 수집

---

### 9. 인프라 운영

정기 유지보수와 운영 절차를 수행하는 Skills입니다. 일부는 파괴적 작업을 포함하므로 강력한 가드레일이 필요합니다. 엔지니어가 중요한 운영 작업에서 모범 사례를 더 쉽게 따르도록 해 줍니다.

**예시:**

- **<resource>-orphans** - 고립된 포드 또는 볼륨 찾기 -> Slack에 게시 -> 안정화 대기 기간을 거침 -> 사용자 확인 요청 -> 연쇄 정리 수행
- **dependency-management** - 조직의 의존성 승인 워크플로를 실행
- **cost-investigation** - 관련 버킷과 쿼리 패턴을 사용해 스토리지 또는 외부 전송 비용이 급증한 이유를 조사

---

## Skills를 만드는 팁

![Skills 제작 팁 요약 이미지](https://pbs.twimg.com/media/HDoKg58bEAAL1bw?format=jpg&name=small)

만들 Skill을 정했다면 어떻게 작성해야 할까요? 다음은 실제로 가장 효과가 좋았던 관행과 기법입니다.

최근에는 Claude Code에서 Skills를 더 쉽게 만들 수 있도록 [Skill Creator](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills)도 공개했습니다.

---

### 당연한 내용을 반복하지 마세요

Claude Code는 이미 코드베이스에 대해 많은 것을 알고 있고, Claude 역시 프로그래밍과 관련된 지식과 기본 관점을 폭넓게 갖고 있습니다. Skill이 주로 지식을 전달한다면 Claude가 평소의 사고방식을 넘어설 수 있게 하는 정보에 집중하세요.

[frontend design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)이 좋은 예입니다. Anthropic의 한 엔지니어는 고객과 반복적으로 작업하며 Claude의 디자인 감각을 개선하고 Inter 글꼴이나 보라색 그라데이션 같은 익숙한 기본값을 피하도록 이 Skill을 발전시켰습니다.

---

### 주의 사항 섹션을 만드세요

![주의 사항 섹션 예시](https://pbs.twimg.com/media/HDlwEG1bEAUdmcV?format=jpg&name=small)

어떤 Skill에서든 신호 밀도가 가장 높은 내용은 주의 사항 섹션인 경우가 많습니다. Claude가 해당 Skill을 사용하면서 자주 마주치는 실패 지점에서 내용을 만들고, 새로운 주의 사항이 나타날 때마다 계속 갱신하세요.

---

### 파일 시스템과 점진적 공개를 활용하세요

![점진적 공개에 사용되는 Skill 폴더 구조](https://pbs.twimg.com/media/HDlwhSjbEAIJSc9?format=jpg&name=small)

Skill은 단순한 마크다운 파일이 아니라 폴더입니다. 전체 파일 시스템을 컨텍스트 엔지니어링과 점진적 공개의 한 형태로 다루세요. Claude에게 Skill에 어떤 파일이 들어 있는지 알려 주면, 관련성이 생겼을 때 해당 파일을 읽을 수 있습니다.

가장 단순한 형태의 점진적 공개는 Claude가 다른 마크다운 파일을 참조하도록 안내하는 것입니다. 예를 들어 자세한 함수 시그니처와 사용 예시는 `references/api.md`에 둘 수 있습니다.

최종 결과가 마크다운 문서라면 Skill의 `assets/` 아래에 Claude가 복사해 사용할 템플릿을 넣을 수 있습니다.

참조 자료, 스크립트, 예시와 그 밖의 리소스 폴더는 Claude가 더 효과적으로 작업하도록 돕습니다.

---

### Claude를 지나치게 구속하지 마세요

Claude는 대체로 지침을 충실히 따르려 합니다. Skills는 재사용 범위가 넓기 때문에 지나치게 구체적인 지침은 쉽게 취약해집니다. Claude가 상황에 적응할 유연성을 남겨 두면서 필요한 정보를 제공하세요.

![유연한 지침과 지나치게 제한적인 지침 비교](https://pbs.twimg.com/media/HDlwurvbEAM5ZNu?format=jpg&name=small)

---

### 설정을 충분히 고민하세요

![Skill 설정 구성 예시](https://pbs.twimg.com/media/HDlw1mYbEAY-Bul?format=jpg&name=small)

일부 Skills는 설정 과정에서 사용자의 컨텍스트가 필요합니다. 예를 들어 Skill이 Slack에 스탠드업을 게시한다면 Claude는 어느 Slack 채널을 사용할지 물어봐야 할 수 있습니다.

설정 정보를 Skill 디렉터리 안의 `config.json`에 저장하는 방식이 좋습니다. 구성이 없다면 에이전트가 사용자에게 필요한 내용을 물을 수 있습니다.

구조화된 객관식 질문을 제시하려면 Claude가 AskUserQuestion 도구를 사용하도록 지시하세요.

---

### 설명 필드는 모델을 위한 것입니다

Claude Code가 세션을 시작하면 사용 가능한 모든 Skill과 각 설명 필드의 목록을 만듭니다. Claude는 이 목록을 살펴보며 "이 요청에 맞는 Skill이 있는가?"를 판단합니다. 따라서 설명 필드는 요약문이 아니라 모델이 언제 해당 Skill을 트리거해야 하는지 설명하는 필드입니다.

![모델 트리거를 위해 작성된 Skill 설명 필드 예시](https://pbs.twimg.com/media/HDlw5ULbEAQOqtJ?format=jpg&name=small)

---

### 메모리 및 데이터 저장

![Skill에 메모리와 데이터를 저장하는 예시](https://pbs.twimg.com/media/HDoImh1bEAU-mMI?format=jpg&name=small)

일부 Skills는 데이터를 저장해 메모리를 가질 수 있습니다. 추가 전용 텍스트 로그나 JSON 파일처럼 단순한 방식부터 SQLite 데이터베이스처럼 복잡한 방식까지 가능합니다.

예를 들어 `standup-post` Skill은 지금까지 작성한 모든 게시물을 `standups.log`에 보관할 수 있습니다. 다음 실행에서 Claude가 이 기록을 읽으면 어제 이후 무엇이 달라졌는지 파악할 수 있습니다.

Skill 디렉터리 안의 데이터는 Skill이 업그레이드될 때 삭제될 수 있습니다. 장기 보존할 데이터는 안정적인 위치에 저장하세요. 현재로서는 `${CLAUDE_PLUGIN_DATA}`가 플러그인마다 하나씩 제공되는 안정적인 폴더입니다.

---

### 스크립트를 저장하고 코드를 생성하세요

Claude에게 제공할 수 있는 가장 강력한 자원 중 하나는 코드입니다. 스크립트와 라이브러리를 제공하면 Claude는 보일러플레이트를 다시 만드는 대신 기능을 조합하고 다음 작업을 결정하는 데 턴을 사용할 수 있습니다.

예를 들어 데이터 과학 Skill에는 이벤트 소스에서 데이터를 가져오는 함수가 포함될 수 있습니다. Claude가 더 복잡한 분석을 조합할 수 있도록 도우미 함수 모음을 제공하세요.

![Skill 안의 도우미 함수 라이브러리 예시](https://pbs.twimg.com/media/HDlxbtkbkAAOse7?format=jpg&name=small)

그러면 Claude는 "화요일에 무슨 일이 있었나요?" 같은 프롬프트에 답하기 위해 이 함수들을 조합하는 스크립트를 즉석에서 생성할 수 있습니다.

![Claude가 도우미 함수로 생성한 스크립트 예시](https://pbs.twimg.com/media/HDlxfEIb0AA2E7l?format=jpg&name=small)

---

### 필요할 때만 쓰는 훅

Skills는 Skill이 호출될 때만 활성화되고 세션 동안 유지되는 훅을 정의할 수 있습니다. 항상 실행하면 방해가 되지만 특정 상황에서는 유용한 강한 보호 장치에 활용하세요.

예시:

- **/careful** - Bash의 PreToolUse 매처를 사용해 `rm -rf`, `DROP TABLE`, 강제 푸시, `kubectl delete`를 차단합니다. 프로덕션을 다룰 때 활성화하세요. 계속 켜 두면 작업이 지나치게 불편해집니다.
- **/freeze** - 특정 디렉터리 밖에서의 Edit/Write를 차단합니다. 관련 없는 코드를 실수로 "수정"하지 않고 로그만 추가하고 싶은 디버깅 상황에 유용합니다.

---

## Skills 배포하기

Skills의 가장 큰 장점 중 하나는 팀의 다른 구성원과 공유할 수 있다는 것입니다.

일반적인 배포 경로는 두 가지입니다.

- Skills를 저장소의 `./.claude/skills` 아래에 체크인합니다.
- 플러그인과 Claude Code 플러그인 마켓플레이스를 만들어 사용자가 설치할 수 있게 합니다. 자세한 내용은 [플러그인 마켓플레이스 문서](https://code.claude.com/docs/en/plugin-marketplaces)를 참고하세요.

비교적 적은 수의 저장소에서 작업하는 소규모 팀이라면 Skills를 각 저장소에 체크인하는 방식이 효과적입니다. 다만 체크인된 Skill은 모두 모델에 약간의 컨텍스트를 추가합니다. 규모가 커지면 내부 플러그인 마켓플레이스를 통해 조직 전체에 Skills를 배포하면서 각 팀이 설치할 항목을 선택할 수 있습니다.

---

### 마켓플레이스 관리

어떤 Skills를 마켓플레이스에 넣을지 팀은 어떻게 결정해야 할까요? 구성원은 어떤 방식으로 제출해야 할까요?

Anthropic에서는 중앙 팀 하나가 모든 결정을 내리지 않습니다. 유용한 Skills가 자연스럽게 드러나도록 합니다. 소유자는 GitHub의 샌드박스 폴더에 Skill을 업로드하고 Slack이나 다른 포럼에서 사람들에게 공유할 수 있습니다.

해당 Skill이 충분히 널리 사용된다고 소유자가 판단하면 마켓플레이스로 옮기는 PR을 열 수 있습니다.

품질이 낮거나 중복되는 Skills는 쉽게 생길 수 있으므로 출시 전에 일정한 선별 과정이 중요합니다.

---

### Skills 조합하기

Skills는 서로 의존할 수 있습니다. file-upload Skill은 파일을 업로드하고, CSV-generation Skill은 CSV를 만든 다음 upload Skill을 호출할 수 있습니다. 마켓플레이스와 Skills에는 아직 기본 의존성 관리 기능이 없지만, Skill에서 다른 Skill을 이름으로 참조할 수 있으며 설치돼 있다면 모델이 이를 호출합니다.

---

### Skills 측정하기

Skill의 성능을 파악하기 위해 Anthropic에서는 회사 내부의 Skill 사용량을 기록하는 PreToolUse 훅을 사용합니다. [예시 코드](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5)에서 구현 방식을 확인할 수 있습니다. 이를 통해 어떤 Skills가 인기 있는지, 어떤 Skills가 예상보다 적게 트리거되는지 알 수 있습니다.

---

## 결론

Skills는 에이전트를 위한 강력하고 유연한 도구지만, 아직 초기 단계인 분야이므로 모두가 더 나은 사용법을 배워 가고 있습니다.

이 글의 교훈을 확정적인 가이드라기보다 유용한 기법 모음으로 받아들이세요. Skills를 이해하는 가장 좋은 방법은 직접 시작하고 실험하며 무엇이 효과적인지 관찰하는 것입니다. Anthropic의 Skills 대부분도 처음에는 몇 줄의 내용과 주의 사항 하나로 시작했습니다. 이후 Claude가 새로운 경계 사례를 만날 때마다 사람들이 교훈을 추가하면서 점차 발전했습니다.

도움이 되었기를 바랍니다. 궁금한 점이 있다면 알려 주세요.
