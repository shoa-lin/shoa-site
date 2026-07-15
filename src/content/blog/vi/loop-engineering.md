---
translationKey: "loop-engineering"
locale: "vi"
title: "Kỹ thuật thiết kế vòng lặp"
description: "Phân tích năm thành phần của kỹ thuật vòng lặp và trạng thái bên ngoài, cùng lý do việc xác minh, nợ hiểu biết và sự từ bỏ tư duy vẫn là trách nhiệm của kỹ sư."
publishedAt: "2026-06-09"
updatedAt: "2026-07-16"
category: "development"
sourceLocale: "en"
sourceUrl: "https://addyosmani.com/blog/loop-engineering/"
sourceAuthor: "Addy Osmani"
contentType: "adaptation"
translationStatus: "reviewed"
---

**Kỹ thuật thiết kế vòng lặp là thay thế chính bạn trong vai trò người liên tục đưa prompt cho agent. Thay vào đó, bạn thiết kế hệ thống thực hiện việc đó.** Ở đây, một vòng lặp có thể được hiểu như một mục tiêu đệ quy: bạn xác định mục đích, còn AI lặp lại cho đến khi hoàn thành. Tôi cho rằng đây có thể là tương lai của cách chúng ta làm việc với coding agent. Nhưng lĩnh vực này vẫn còn sớm, tôi vẫn hoài nghi, và bạn nhất định phải [cẩn thận](https://x.com/weswinder/status/2063700289710964906) với chi phí token vì kiểu sử dụng thay đổi mạnh khi ngân sách token tăng lên. Vì vậy, tôi muốn phân tích kỹ thuật vòng lặp là gì và nó có ý nghĩa ra sao.

---

Peter Steinberger gần đây [nói](https://x.com/steipete/status/2063697162748260627): “Bạn không nên tiếp tục tự prompt coding agent. Bạn nên thiết kế các vòng lặp để prompt agent của mình.” Tương tự, nguồn gốc của bài viết [kể lại](https://addyosmani.com/blog/loop-engineering/) lời Boris Cherny, người đứng đầu Claude Code tại Anthropic: “Tôi không còn prompt Claude nữa. Tôi có các vòng lặp đang prompt Claude và xác định việc cần làm. Công việc của tôi là viết vòng lặp.”

Vậy những điều đó thực sự có nghĩa gì?

Trong khoảng hai năm, để nhận được kết quả hữu ích từ coding agent, người dùng cần viết prompt tốt và cung cấp đủ context. Bạn nhập một yêu cầu, đọc kết quả rồi nhập yêu cầu tiếp theo. Agent là công cụ bạn trực tiếp cầm lái trong suốt quá trình, từng lượt một. Giai đoạn đó về cơ bản đã kết thúc, hoặc ít nhất một số người tin là như vậy.

Giờ đây, bạn xây một hệ thống nhỏ có thể tìm việc, giao việc, kiểm tra, ghi lại phần đã hoàn thành và quyết định bước tiếp theo. Bạn để hệ thống điều khiển agent thay vì tự thực hiện từng thao tác. Tôi từng viết về hai khái niệm gần gũi: [kỹ thuật agent harness](https://addyosmani.com/blog/agent-harness-engineering/), tức thiết kế môi trường mà một agent hoạt động bên trong, và [mô hình nhà máy](https://addyosmani.com/blog/factory-model/), tức hệ thống xây dựng phần mềm. Kỹ thuật vòng lặp nằm cao hơn harness một tầng. Đó là một harness chạy theo lịch, tạo các trợ lý và đưa kết quả vào chu kỳ tiếp theo.

Điều khiến tôi bất ngờ là đây không còn thực sự là vấn đề ở cấp công cụ. Một năm trước, nếu muốn có vòng lặp, bạn phải viết một đống Bash script, bảo trì chúng mãi mãi và sở hữu một hệ thống dùng một lần mà không ai khác có. Giờ đây các thành phần đã được tích hợp ngay trong sản phẩm. Danh sách của Steinberger gần như khớp hoàn toàn với ứng dụng Codex và cũng rất gần với Claude Code. Khi nhận ra hình dạng của chúng giống nhau, bạn ngừng tranh luận về công cụ và bắt đầu thiết kế một vòng lặp hoạt động bất kể nó chạy trên sản phẩm nào.

## Năm thành phần, cộng thêm trạng thái

Một [vòng lặp](https://x.com/reach_vb/status/2063713960495558940) cần năm thành phần và một nơi để ghi nhớ trạng thái. Trước khi đi sâu, đây là toàn cảnh:

1. **Automations** chạy theo lịch và tự thực hiện discovery cùng triage.
2. **Worktree** để hai agent làm việc song song không giẫm lên tệp của nhau.
3. **Skill** ghi lại kiến thức dự án mà nếu không agent sẽ phải đoán.
4. **Plugin và connector** kết nối agent với những công cụ bạn đang sử dụng.
5. **Subagent** để một agent đề xuất giải pháp và agent khác kiểm tra.

Sau đó là thành phần thứ sáu: bộ nhớ. Nó có thể là tệp Markdown, bảng Linear hoặc bất kỳ thứ gì tồn tại lâu hơn một cuộc hội thoại và ghi lại phần đã làm cùng bước tiếp theo. Nghe có vẻ quá đơn giản để đáng kể, nhưng đây chính là kỹ thuật mà mọi agent chạy dài hạn đều phụ thuộc, như tôi đã trình bày trong [long-running agents](https://addyosmani.com/blog/long-running-agents/): mô hình quên mọi thứ giữa các lần chạy, vì vậy bộ nhớ phải nằm trên đĩa thay vì trong context. Agent quên; repository thì không.

Cả hai sản phẩm hiện đều cung cấp đủ năm thành phần.

| Thành phần | Vai trò trong vòng lặp | Ứng dụng Codex | Claude Code |
| --- | --- | --- | --- |
| **Automations** | Discovery + triage theo lịch | [Tab Automations](https://developers.openai.com/codex/app/automations): chọn dự án, prompt, chu kỳ và môi trường; kết quả vào hộp thư Triage; `/goal` cung cấp hành vi chạy đến khi hoàn thành | Tác vụ theo lịch và cron, `/loop`, `/goal`, hook, GitHub Actions |
| **Worktree** | Cô lập các tính năng chạy song song | Worktree tích hợp cho từng thread | `git worktree`, `--worktree` và `isolation: worktree` trên subagent |
| **Skill** | Mã hóa kiến thức dự án | [Agent Skills](https://developers.openai.com/codex/skills) (`SKILL.md`), gọi bằng `$name` hoặc kích hoạt ngầm | [Agent Skills](https://addyosmani.com/blog/agent-skills/) (`SKILL.md`) |
| **Plugin / connector** | Kết nối công cụ | Connector (MCP) và plugin để phân phối | MCP server và plugin |
| **Subagent** | Phát triển và xác minh giải pháp | [Subagents](https://developers.openai.com/codex/subagents), định nghĩa bằng TOML trong `.codex/agents/` | Subagent trong `.claude/agents/`, cùng agent team |
| **Trạng thái** | Theo dõi phần việc hoàn thành | Markdown hoặc Linear qua connector | Markdown (`AGENTS.md`, tệp tiến độ) hoặc Linear qua MCP |

Tên gọi hơi khác nhau nhưng năng lực giống nhau. Chi tiết rất quan trọng vì chúng quyết định một vòng lặp có giữ được cấu trúc hay âm thầm rò rỉ trạng thái khắp nơi.

## Automations: nhịp tim của vòng lặp

Automation biến một lần chạy đơn lẻ thành vòng lặp thực sự. Trong ứng dụng Codex, bạn tạo automation ở tab Automations, chọn dự án, prompt, chu kỳ và quyết định chạy trên checkout cục bộ hay worktree nền. Lần chạy tìm thấy vấn đề sẽ vào hộp thư Triage; lần chạy không có kết quả sẽ tự lưu trữ. OpenAI sử dụng automation nội bộ cho các việc thường kỳ như triage issue hằng ngày, tóm tắt lỗi CI, viết bản tin commit và truy tìm bug được đưa vào tuần trước. Automation cũng có thể gọi skill, giúp hành vi dùng lại dễ bảo trì: kích hoạt `$skill-name` thay vì dán một bức tường hướng dẫn vào lịch chạy mà không ai cập nhật.

Claude Code đi đến cùng đích bằng lịch và hook. Bạn có thể dùng `/loop` để chạy prompt hoặc lệnh theo chu kỳ, lập lịch cron, dùng hook để kích hoạt lệnh shell tại những thời điểm cụ thể trong vòng đời agent, hoặc đưa toàn bộ quy trình vào GitHub Actions để nó tiếp tục sau khi bạn đóng laptop. Ý tưởng vẫn giống nhau: xác định nhiệm vụ tự chủ, đặt chu kỳ và để phát hiện tìm đến bạn thay vì tự kiểm tra từng hệ thống.

Còn một primitive trong phiên đi sát hơn tới cốt lõi bài viết. `/loop` lặp theo chu kỳ. `/goal` tiếp tục làm việc cho đến khi điều kiện bạn viết thực sự đúng. Sau mỗi lượt, một mô hình nhỏ độc lập kiểm tra điều kiện đã đạt chưa, vì vậy agent viết mã không tự chấm bài của mình. Hãy đưa ra điều kiện như “mọi test trong test/auth đều qua và lint sạch”, rồi rời đi. Codex có primitive tương tự, cũng gọi là `/goal`: nó tiếp tục qua nhiều lượt đến khi điều kiện dừng có thể xác minh được thỏa mãn, đồng thời hỗ trợ tạm dừng, tiếp tục và xóa. Cùng một primitive tồn tại trong cả hai công cụ, đúng với mẫu hình xuyên suốt bài viết này.

Đó là phần đưa công việc lên bề mặt. Phần còn lại của vòng lặp hành động dựa trên nó.

## Worktree ngăn công việc song song biến thành hỗn loạn

Khi chạy nhiều hơn một agent, tệp bắt đầu va chạm. Hai agent sửa cùng một tệp tạo ra vấn đề tương tự hai kỹ sư cùng thay đổi những dòng giống nhau mà không phối hợp. Git worktree giải quyết phần cơ học: đó là thư mục làm việc độc lập trên branch riêng nhưng dùng chung lịch sử repository, vì vậy thay đổi của agent này không thể chạm vào checkout của agent khác.

Codex tích hợp worktree trực tiếp trong ứng dụng, cho phép nhiều thread làm việc trên cùng repository mà không sửa checkout của nhau. Claude Code cung cấp mức cô lập tương tự qua `git worktree`, cờ `--worktree` mở phiên trong checkout riêng và thiết lập `isolation: worktree` cho subagent, cấp checkout mới cho từng trợ lý rồi dọn dẹp sau đó. Tôi từng viết về phía con người trong [the orchestration tax](https://addyosmani.com/blog/orchestration-tax/): worktree loại bỏ xung đột cơ học, nhưng **bạn** vẫn là giới hạn. Khả năng review của bạn, không phải công cụ, quyết định số agent thực sự có thể chạy.

## Skill giúp bạn không phải giải thích lại dự án

Skill giúp tránh phải giải thích cùng một context dự án trong mỗi phiên. Hai công cụ dùng cùng định dạng: một thư mục chứa `SKILL.md` với hướng dẫn và metadata, kèm script, tài liệu tham khảo và asset tùy chọn. Codex chạy skill khi bạn gọi bằng `$` hoặc `/skills`, hoặc tự kích hoạt khi nhiệm vụ phù hợp với mô tả. Đó là lý do mô tả ngắn gọn, trực tiếp tốt hơn mô tả thông minh nhưng mơ hồ. Claude Code hoạt động tương tự, như tôi đã mô tả trong [agent skills](https://addyosmani.com/blog/agent-skills/).

Skill cũng là nơi ý định không còn khiến bạn trả chi phí lặp lại. Trong [intent debt](https://addyosmani.com/blog/intent-debt/), tôi lập luận rằng agent bắt đầu mỗi phiên mà không có ngữ cảnh và lấp khoảng trống trong ý định bằng những phỏng đoán đầy tự tin. Skill đưa ý định ra ngoài: quy ước, bước build và ghi chú như “chúng ta không làm theo cách này vì sự cố trước đây”. Viết một lần, agent đọc trong mọi lần chạy. Không có skill, vòng lặp phải suy ra dự án lại từ đầu ở mỗi chu kỳ. Có skill, kiến thức dự án có thể tích lũy qua các vòng.

Cần phân biệt một điểm: skill là định dạng biên soạn, còn plugin là cách phân phối. Khi muốn chia sẻ skill giữa các repository hoặc đóng gói nhiều skill, bạn biến chúng thành plugin. Điều này đúng với cả Codex và Claude Code.

## Plugin và connector đưa vòng lặp tới công cụ thực

Vòng lặp chỉ nhìn thấy filesystem là một vòng lặp rất nhỏ. Connector dựa trên MCP cho phép agent đọc issue tracker, truy vấn cơ sở dữ liệu, gọi staging API hoặc gửi tin nhắn trong Slack. Codex và Claude Code đều hỗ trợ MCP, nên connector viết cho một bên thường hoạt động với bên kia. Plugin đóng gói connector và skill, cho phép đồng đội cài toàn bộ thiết lập một lần thay vì dựng lại từ trí nhớ.

Đây là khác biệt giữa agent nói “đây là bản sửa” và vòng lặp tự mở PR, liên kết ticket Linear rồi báo vào kênh khi CI chuyển xanh. Connector cho phép vòng lặp hành động trong môi trường thực thay vì chỉ mô tả nó sẽ làm gì nếu được cấp quyền.

## Subagent tách người tạo khỏi người kiểm tra

Kỹ thuật cấu trúc hữu ích nhất trong vòng lặp là tách agent viết khỏi agent kiểm tra. Mô hình thường quá dễ dãi khi chấm công việc của chính mình. Một agent thứ hai với hướng dẫn khác, đôi khi dùng mô hình khác, có thể bắt những vấn đề mà agent đầu tiên đã tự thuyết phục rằng chúng có thể chấp nhận.

Codex tạo subagent khi bạn yêu cầu, chạy chúng đồng thời và tổng hợp kết quả vào một câu trả lời. Agent tùy chỉnh được định nghĩa bằng tệp TOML trong `.codex/agents/`, mỗi agent có tên, mô tả, hướng dẫn cùng mô hình và mức reasoning tùy chọn. Nhờ đó security reviewer có thể dùng mô hình mạnh với mức nỗ lực cao, trong khi explorer dùng mô hình nhanh và chỉ đọc. Claude Code làm điều tương tự qua subagent trong `.claude/agents/` và agent team chuyển việc cho nhau. Cách chia phổ biến ở cả hai công cụ là một agent khám phá, một agent triển khai và một agent xác minh theo đặc tả.

Tôi đã đưa ra lập luận này hai lần: trong [the code agent orchestra](https://addyosmani.com/blog/code-agent-orchestra/) và [agentic code review](https://addyosmani.com/blog/agentic-code-review/). Nó đặc biệt quan trọng bên trong vòng lặp vì vòng lặp chạy khi bạn không quan sát. Một verifier mà bạn thực sự tin tưởng mới cho phép bạn rời đi. Subagent tiêu tốn nhiều token hơn vì mỗi agent thực hiện công việc mô hình và công cụ riêng, vì vậy hãy dùng token ở nơi ý kiến thứ hai xứng đáng với chi phí. Đây cũng là cấu trúc phía sau `/goal` của Claude Code: một mô hình mới quyết định vòng lặp đã hoàn thành hay chưa, thay vì mô hình đã thực hiện công việc. Phân tách maker-checker được áp dụng ngay vào điều kiện dừng.

## Một vòng lặp trông như thế nào

Khi ghép các phần lại, một thread trở thành bảng điều khiển nhỏ. Đây là mẫu tôi thường sử dụng.

Mỗi sáng, một automation chạy trên repository. Prompt gọi skill triage để đọc lỗi CI hôm qua, issue đang mở và commit gần đây, rồi ghi phát hiện vào tệp Markdown hoặc bảng Linear. Với mỗi phát hiện đáng xử lý, thread mở worktree cô lập, giao một subagent phác thảo bản sửa và giao subagent thứ hai kiểm tra bản nháp theo skill dự án cùng test hiện có.

Connector cho phép vòng lặp mở PR và cập nhật ticket. Bất cứ việc gì vòng lặp không xử lý được sẽ vào hộp thư triage của tôi. Tệp trạng thái là xương sống của hệ thống: nó nhớ điều đã thử, điều đã qua và điều còn mở, để lần chạy sáng mai tiếp tục từ nơi hôm nay dừng lại.

Hãy nhìn vào điều bạn thực sự làm. Bạn thiết kế quy trình một lần. Bạn không prompt từng bước riêng lẻ. Đó là cách biến quan điểm của Steinberger thành thực tế, và đây vẫn là cùng một vòng lặp trong Codex lẫn Claude Code vì các thành phần giống nhau.

## Những gì vòng lặp vẫn không thể làm thay bạn

Vòng lặp thay đổi công việc; nó không loại bạn khỏi công việc. Ba vấn đề trở nên sắc nét hơn khi vòng lặp tốt hơn, chứ không dễ hơn.

**Xác minh vẫn là trách nhiệm của bạn.** Vòng lặp chạy không giám sát cũng có thể mắc lỗi không giám sát. Việc tách verifier khỏi maker giúp tuyên bố “hoàn thành” có trọng lượng hơn. Dù vậy, hoàn thành vẫn chỉ là tuyên bố, không phải bằng chứng. Tôi tiếp tục nhắc lại một câu từ [code review in the age of AI](https://addyosmani.com/blog/code-review-ai/): công việc của bạn là phát hành mã mà bạn đã xác nhận hoạt động.

**Sự hiểu biết của bạn vẫn suy giảm nếu bạn cho phép.** Vòng lặp càng nhanh chóng phát hành mã bạn không viết, khoảng cách giữa hệ thống tồn tại và hệ thống bạn thực sự hiểu càng rộng. Đó là [comprehension debt](https://addyosmani.com/blog/comprehension-debt/). Nếu không đọc kỹ những gì vòng lặp tạo ra, một vòng lặp trơn tru chỉ làm khoản nợ đó tăng nhanh hơn.

**Tư thế quá thoải mái rất nguy hiểm.** Khi vòng lặp tự vận hành, bạn dễ ngừng hình thành phán đoán và chấp nhận mọi thứ trả về. Tôi gọi đây là [cognitive surrender](https://addyosmani.com/blog/cognitive-surrender/). Thiết kế vòng lặp có phán đoán có thể là phương thuốc; thiết kế nó để tránh suy nghĩ sẽ tăng tốc vấn đề. Hành động có vẻ giống nhau nhưng kết quả trái ngược.

## Xây vòng lặp. Vẫn là người kỹ sư.

Tôi nghĩ đây là hình ảnh xem trước về cách công việc sẽ phát triển. Tuy nhiên, nếu tôi ngừng tự review mã hoặc hoàn toàn dựa vào vòng lặp tự động để sửa nó, chất lượng sản phẩm sẽ giảm. Tôi có thể rơi vào vòng xoáy đi xuống, liên tục đào hố sâu hơn.

Vì vậy hãy xây vòng lặp, nhưng nhớ rằng prompt trực tiếp cho agent vẫn hiệu quả. Mục tiêu là tìm đúng điểm cân bằng.

Vòng lặp cũng có thể tạo kết quả rất khác tùy người sử dụng. Hai người có thể xây chính xác cùng một vòng lặp nhưng nhận kết quả trái ngược. Một người dùng nó để tăng tốc công việc mà họ hiểu sâu. Người kia dùng nó để tránh phải hiểu công việc. Vòng lặp không biết sự khác biệt. Bạn thì biết.

Đó là lý do thiết kế vòng lặp khó hơn prompt engineering, không phải dễ hơn. Quan điểm của Cherny không phải công việc trở nên đơn giản. Điểm tạo đòn bẩy đã dịch chuyển.

Hãy xây vòng lặp. Nhưng hãy xây nó như một người muốn tiếp tục là kỹ sư, không phải người chỉ bấm chạy.
