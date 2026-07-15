---
translationKey: "dynamic-workflows-in-claude-code"
locale: "vi"
title: "Một harness cho mỗi nhiệm vụ: Dynamic Workflows trong Claude Code"
description: "Claude Code có thể tự viết và điều phối một harness đa agent dành riêng cho nhiệm vụ ngay trong lúc chạy."
publishedAt: "2026-06-02"
updatedAt: "2026-07-16"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code"
sourceAuthor: "Thariq Shihipar, Sid Bidasaria"
contentType: "adaptation"
translationStatus: "reviewed"
---

Tuần trước, Claude Code phát hành [dynamic workflows](https://code.claude.com/docs/en/workflows). Claude giờ có thể tự viết [harness](https://code.claude.com/docs/en/glossary#agentic-harness) ngay trong lúc chạy, được thiết kế riêng cho nhiệm vụ hiện tại.

> **Harness** là lớp điều khiển quanh mô hình AI, gồm lắp ráp prompt, điều phối tool, quản lý context và phục hồi lỗi. Claude Code có thể được hiểu là **Model + Harness**. Bài viết giữ nguyên thuật ngữ tiếng Anh này.

Harness mặc định của Claude Code được xây cho coding nhưng hữu ích với nhiều việc khác vì nhiều nhiệm vụ có hình dạng giống coding. Tuy nhiên, một số nhóm công việc chỉ đạt hiệu năng cao nhất với harness tùy chỉnh, gồm [Research](https://support.claude.com/en/articles/11088861-using-research-on-claude), [phân tích bảo mật](https://support.claude.com/en/articles/11932705-automated-security-reviews-in-claude-code), [agent team](https://code.claude.com/docs/en/agent-teams) và [Code Review](https://code.claude.com/docs/en/code-review).

Workflow cho phép Claude tạo động những harness dành riêng cho nhiệm vụ trên Claude Code. Chúng cũng có thể được lưu, chia sẻ và tái sử dụng. Best practice vẫn đang hình thành: dynamic workflow thường dùng nhiều token hơn và phù hợp nhất với nhiệm vụ phức tạp, giá trị cao.

## Prompt ví dụ

Một số prompt cho thấy phạm vi khả năng:

“Test này thất bại khoảng một lần trong 50 lượt. Hãy dựng workflow để tái hiện, tạo các giả thuyết cạnh tranh về race và chỉ dừng khi một giả thuyết sống sót qua bằng chứng.”

“Dùng workflow xem lại 50 phiên gần nhất, tìm các sửa chữa tôi lặp lại và biến chúng thành rule trong `CLAUDE.md`.”

“Đào qua sáu tháng `#incidents` trong Slack để tìm nguyên nhân gốc lặp lại mà chưa ai tạo ticket.”

“Cho nhiều agent phản biện kế hoạch kinh doanh từ góc nhìn nhà đầu tư, khách hàng và đối thủ.”

“Xếp hạng 80 hồ sơ cho vị trí backend, kiểm tra lại mười hồ sơ đầu và phỏng vấn tôi bằng AskUserQuestion để định nghĩa rubric.”

“Tạo nhiều tên cho CLI này rồi chạy tournament chọn ba tên tốt nhất.”

“Đổi tên model User thành Account ở mọi nơi.”

“Xác minh từng tuyên bố kỹ thuật trong bản nháp blog dựa trên codebase. Tôi không muốn xuất bản điều sai.”

## Dynamic workflow hoạt động thế nào

Dynamic workflow thực thi tệp JavaScript với một số hàm đặc biệt để tạo và điều phối [subagent](https://code.claude.com/docs/en/sub-agents):

![Sơ đồ dynamic workflow tạo và điều phối subagent](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1684f559cc83ff4b465b_image1.png)

Các đối tượng JavaScript chuẩn như JSON, Math và Array cũng sẵn có để xử lý dữ liệu. Workflow có thể chọn mô hình và mức cô lập worktree cho từng agent. Nếu bị ngắt bởi người dùng hoặc thoát terminal, tiếp tục phiên sẽ chạy từ điểm dừng.

## Vì sao cần dynamic workflow

Harness mặc định phải lập kế hoạch và thực thi trong cùng cửa sổ context. Điều này rất hiệu quả với nhiều nhiệm vụ coding nhưng có thể suy yếu khi công việc kéo dài, song song lớn, cấu trúc chặt hoặc mang tính đối kháng.

Claude càng làm lâu trên nhiệm vụ phức tạp trong một context, nó càng dễ gặp:

- **Agentic laziness**: dừng trước khi xong và tuyên bố thành công sau tiến độ một phần.
- **Self-preferential bias**: ưu tiên kết quả của chính mình, nhất là khi phải tự xác minh theo rubric.
- **Goal drift**: độ trung thành với mục tiêu giảm qua nhiều lượt và compaction; yêu cầu biên và ràng buộc “không làm X” có thể biến mất.

Workflow chống lại các lỗi này bằng cách điều phối subagent riêng, mỗi agent có context riêng và mục tiêu tập trung, cô lập.

## Workflow động và tĩnh

Workflow tĩnh dùng Claude Agent SDK hoặc `claude -p` phải dự đoán mọi edge case từ trước nên thường mang tính chung. Với [Claude Opus 4.8](https://www.anthropic.com/news/claude-opus-4-8) và dynamic workflow, Claude có thể viết harness tùy chỉnh cho trường hợp hiện tại.

![So sánh workflow tĩnh và động](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f3a0e17e2844bed86f22a_image9.png)

## Mẫu hữu ích cho dynamic workflow

Bạn có thể chỉ cần yêu cầu Claude tạo dynamic workflow hoặc dùng từ kích hoạt `ultracode`. Mô hình tư duy về các mẫu phổ biến giúp nhận ra thời điểm workflow hữu ích và cách định hướng nó trong prompt.

![Tổng quan mẫu dynamic workflow phổ biến](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f16d86247e586b929a407_image10.png)

### Classify and Act

Agent classifier nhận diện loại nhiệm vụ rồi định tuyến tới agent hoặc hành vi khác nhau. Classifier cũng có thể chạy cuối quy trình để quyết định xử lý đầu ra.

### Fan Out and Synthesize

Chia nhiệm vụ thành bước nhỏ, chạy agent trên từng bước rồi tổng hợp kết quả. Bước synthesis là barrier chờ mọi agent và hợp nhất đầu ra có cấu trúc, tránh nhiễu giữa context.

### Adversarial Verification

Với mỗi agent tạo kết quả, tạo một agent độc lập để thách thức kết quả theo rubric hoặc tiêu chí rõ.

### Generate and Filter

Tạo nhiều ý tưởng, lọc qua rubric hoặc bước xác minh, bỏ trùng và chỉ trả ứng viên mạnh đã được kiểm tra.

### Tournament

Cho N agent cạnh tranh giải cùng nhiệm vụ bằng cách khác nhau, rồi dùng judge so sánh theo cặp đến khi còn một người thắng.

### Loop Until Done

Với lượng việc chưa biết, tiếp tục tạo agent đến khi đạt điều kiện dừng như không còn phát hiện hoặc lỗi, thay vì chọn số lượt cố định.

## Trường hợp sử dụng

Hãy sáng tạo khi yêu cầu Claude Code dùng dynamic workflow. Nó có thể còn hữu ích hơn cho công việc phi kỹ thuật.

### Migration và refactor

[Bun](https://bun.com/) được viết lại từ Zig sang Rust bằng workflow. [Thread X của Jarred](https://x.com/jarredsumner/status/2060050578026189172) mô tả cách tiếp cận. Cần chia migration thành đơn vị cụ thể như call site, test lỗi hoặc module; tạo subagent trong worktree cho từng bản sửa, agent khác review đối kháng rồi merge.

### Deep research

Skill `/deep-research` của Claude Code dùng dynamic workflow để fan-out tìm kiếm web, lấy nguồn, xác minh đối kháng và tổng hợp báo cáo có trích dẫn. Mẫu tương tự dùng được cho báo cáo trạng thái từ Slack hoặc khám phá sâu codebase.

### Deep verification

![Workflow deep verification](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1721824a27cf13da87f4_image2.png)

Một agent xác định các tuyên bố trong báo cáo, subagent riêng điều tra từng tuyên bố và verifier khác đánh giá độ tin cậy của nguồn.

### Sắp xếp

![Workflow sắp xếp](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f173ce727a972001584cc_image3.png)

Xếp hơn 1.000 hàng theo tiêu chí định tính trong một prompt sẽ giảm chất lượng. Tournament, pipeline so sánh theo cặp hoặc xếp bucket song song rồi merge đáng tin hơn chấm điểm tuyệt đối; mỗi so sánh có context độc lập.

### Bộ nhớ và tuân thủ rule

![Workflow bộ nhớ và tuân thủ rule](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17517076bb59050d90bb_image8.png)

Nếu Claude liên tục bỏ sót rule trong `CLAUDE.md`, tạo workflow với verifier cho từng rule và skeptic review chính rule để giảm false positive. Chiều ngược lại cũng hiệu quả: khai thác phiên gần đây và comment review, gom cụm sửa chữa lặp lại, kiểm tra đối kháng rồi đưa rule sống sót trở lại `CLAUDE.md`.

### Điều tra nguyên nhân gốc

Debugging tốt nhất khi nhiều giả thuyết độc lập được hình thành và kiểm tra. Workflow có thể giao log, tệp và dữ liệu cho agent riêng, rồi để verifier và refuter độc lập thử từng giả thuyết. Mẫu này cũng áp dụng cho phân tích bán hàng, lỗi data engineering và post-mortem.

### Triage ở quy mô lớn

![Workflow triage quy mô lớn](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f1778dc00d34cca70819d_image6.png)

Workflow triage phân loại từng mục, loại trùng với dữ liệu đã theo dõi và thực hiện hành động phù hợp: thử sửa hoặc chuyển cho con người. Quarantine giúp agent đọc nội dung công khai không tin cậy bị cấm hành động đặc quyền. Kết hợp với [`/loop`](https://claude.com/blog/getting-started-with-loops) để chạy liên tục.

### Khám phá và thẩm mỹ

Workflow hữu ích khi khám phá nhiều giải pháp và lựa chọn cuối phụ thuộc vào thẩm mỹ như design hoặc naming. Tạo nhiều phương án, dùng agent review theo rubric và kết thúc khi đạt tiêu chí; tournament cũng có thể xếp hạng.

### Eval

Chạy eval nhẹ bằng agent độc lập trong worktree và agent so sánh chấm đầu ra theo rubric. Cách này dùng để đánh giá và tinh chỉnh skill.

### Định tuyến mô hình và trí tuệ

Tạo classifier phù hợp nhiệm vụ và để nó chọn mô hình sau khi nghiên cứu sơ bộ. Mô hình đúng cho “giải thích auth module” phụ thuộc kích thước và hình dạng module; classifier có thể xem rồi chọn Sonnet hoặc Opus.

## Khi không nên dùng dynamic workflow

Workflow còn mới, có thể tạo kết quả vượt trội nhưng không cần cho mọi nhiệm vụ và thường tốn nhiều token hơn. Chỉ dùng khi song song, chuyên môn hóa hoặc kiểm tra đối kháng xứng đáng với chi phí điều phối. Phần lớn nhiệm vụ coding thông thường không cần năm reviewer. Phán đoán tương tự áp dụng khi chọn [hệ thống đa agent hay đơn agent](https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them).

## Mẹo xây dynamic workflow

### Prompting

Prompt chi tiết, gọi tên mẫu workflow liên quan cho kết quả tốt nhất. Workflow không giới hạn ở nhiệm vụ lớn; có thể yêu cầu “quick workflow” để review đối kháng một giả định.

### Kết hợp với `/goal` và `/loop`

Với workflow lặp như triage, nghiên cứu hoặc xác minh, kết hợp [`/loop`](https://claude.com/blog/getting-started-with-loops) để chạy định kỳ và [`/goal`](https://code.claude.com/docs/en/workflows) để đặt yêu cầu hoàn thành cứng.

### Ngân sách token

Bạn có thể đặt ngân sách token rõ cho dynamic workflow. Prompt như “use 10k tokens” đặt trần 10k token.

### Lưu và chia sẻ dynamic workflow

Nhấn `s` trong menu workflow để lưu. Có thể đưa nó vào `~/.claude/workflows` hoặc phân phối qua skill.

![Lưu workflow từ menu](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17b1ca20533e666c867c_image4.png)

Để chia sẻ qua skill, đặt tệp JavaScript workflow trong thư mục skill và tham chiếu trong `SKILL.md`. Muốn linh hoạt hơn, hãy yêu cầu Claude coi workflow là template thay vì script phải chạy nguyên văn.

![Chia sẻ workflow qua skill](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a1f17cb835cf4f9fd5da921_image7.png)

## Điểm bắt đầu mới cho khám phá

Workflow là cách mới để mở rộng Claude Code. Hãy coi chúng như điểm bắt đầu khám phá cách Claude hỗ trợ công việc; vẫn còn nhiều điều cần học về cách dùng tốt.

Để biết nội dung nào nên nằm trong harness, xem [ba mẫu thiết kế harness](https://claude.com/blog/harnessing-claudes-intelligence) của Anthropic.

---

*Bài viết được viết bởi Thariq Shihipar và Sid Bidasaria, thành viên đội ngũ kỹ thuật Anthropic làm việc trên Claude Code.*
