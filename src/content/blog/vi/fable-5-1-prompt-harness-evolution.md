---
translationKey: "fable-5-1-prompt-harness-evolution"
locale: "vi"
title: "Từ Fable 5 đến Fable 5.1: System Prompt đang trở thành một Agent OS"
description: "So sánh hai thế hệ Claude Runtime Prompt, phân tích thay đổi cấu trúc về Memory, Past Chats, Skills, định tuyến công cụ, quản trị an toàn và hướng phát triển tiếp theo của Agent Harness."
publishedAt: "2026-09-02"
updatedAt: "2026-09-02"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/fable-5-1-prompt-harness-evolution/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## Kết luận trước

Anthropic phát hành Claude Fable 5.1 vào ngày 1 tháng 9 năm 2026. Phần lớn thảo luận tập trung vào năng lực mô hình, giá và benchmark. Tôi quan tâm hơn đến một tài liệu trông ít hấp dẫn hơn nhưng lại cho thấy rõ hướng đi của sản phẩm: **System Prompt và Runtime Prompt mà Claude sử dụng khi vận hành trong sản phẩm thực tế.**

Tôi đã so sánh bản lưu trữ Full Runtime Prompt của Fable 5 ngày 9 tháng 6 năm 2026 với một snapshot Runtime Prompt của Fable 5.1 thu được ngày 2 tháng 9 năm 2026. Bản đầu có khoảng 1.580 dòng và 126.943 byte; bản sau có 2.195 dòng và 275.723 byte. Số định nghĩa công cụ cũng tăng từ 18 lên 44.

Điều đó không có nghĩa đơn giản rằng “Prompt đã tăng gấp đôi”. Phần lớn kích thước tệp đến từ Tool Schema, ví dụ và mô tả môi trường Runtime động. **Độ dài không phải là trí thông minh, cũng không phải năng lực sản phẩm.** Điều quan trọng là cấu trúc:

> Fable 5 đã là một Agent được gắn Tools, Skills, MCP và Artifacts. Fable 5.1 bắt đầu tổ chức Memory, hội thoại trước đây, khám phá năng lực, định tuyến đầu ra, quyền và quản trị an toàn thành một Agent Runtime hoàn chỉnh hơn.

Nói cách khác, Harness xung quanh Claude đang chuyển từ “gắn vài công cụ cho mô hình” sang “cung cấp một hệ điều hành cho mô hình”.

## Trước hết, xác định ranh giới so sánh

Bài viết này không so sánh trọng số mô hình, dữ liệu huấn luyện hay mã nguồn phía máy chủ của Anthropic. Đối tượng so sánh là hai **snapshot Prompt và cấu hình Runtime có thể quan sát được**.

Các trang System Prompt công khai của Anthropic chủ yếu trình bày chỉ dẫn hành vi cốt lõi dùng trên claude.ai và ứng dụng di động. Một snapshot Runtime đầy đủ còn chứa định nghĩa công cụ khả dụng trong Session, Skills, quy tắc hệ thống tệp, quyền mạng, placeholder ngữ cảnh người dùng và chính sách định tuyến sản phẩm. Vì vậy, tôi gọi toàn bộ gói này là **Runtime Prompt Bundle**.

Phép so sánh này cho biết khá rõ sản phẩm tổ chức năng lực quanh mô hình như thế nào. Tuy nhiên, chỉ từ Prompt, ta không thể kết luận năng lực suy luận của Base Model đã tăng bao nhiêu. Năng lực mô hình và năng lực Harness phải được đánh giá riêng.

## Các thay đổi chính trong một bảng

| Khía cạnh | Fable 5 | Fable 5.1 | Thay đổi cấu trúc |
| --- | --- | --- | --- |
| Memory | Mô tả ngắn về quyền truy cập Memory | Quy tắc đầy đủ về phân loại tệp, trích xuất, đọc ghi, Version, Privacy và cách áp dụng | Từ mô tả tính năng thành Data Plane có quản trị |
| Past Chats | Không có lớp truy xuất hội thoại cũ độc lập | `conversation_search`, `recent_chats`, `read_conversation` | Tách Memory đã nén khỏi bằng chứng nguồn |
| Số công cụ | 18 định nghĩa công cụ | 44 định nghĩa công cụ | Từ hộp công cụ chung thành Capability Interface rộng hơn |
| Mở rộng năng lực | Skills và MCP Apps | Skills, Plugin Catalog và MCP Apps | Từ cấu hình tĩnh sang khám phá và cài đặt |
| Dạng đầu ra | Text, Files, Artifacts, Maps và các dạng liên quan | Thêm Charts, thẻ so sánh, thẻ bước, Quiz, Translation, Products, Links và các đầu ra có kiểu khác | Từ chuỗi văn bản sang UI Type có thể định tuyến |
| Định tuyến đầu ra | Phân tán trong mô tả từng công cụ | Ưu tiên rõ ràng giữa MCP, File và Visualizer | Harness bắt đầu đóng vai trò Capability Router |
| Khả năng theo dõi công việc | Không có quy tắc chung về cập nhật tiến độ | Cập nhật ngắn trong các Tool Run dài, sau đó trả kết quả cuối đầy đủ | Sản phẩm quản trị rõ trải nghiệm tác vụ dài |
| Định dạng viết | Hạn chế mạnh Lists, Headings và Bold | Chỉ dùng định dạng tối thiểu mà độ phức tạp thực sự cần | Hiệu chỉnh lại theo hành vi mặc định của mô hình mới |
| Search | Đã yêu cầu xác minh thông tin nhạy theo thời gian | Product, Model và Tool thay đổi nhanh phải được Search ngay cả khi mô hình “nhận ra” | Sự quen thuộc không còn là bằng chứng về tính cập nhật |
| Safety và Privacy | Đã có quy tắc đáng kể về từ chối và wellbeing | Chi tiết hơn về Child Safety, tính liên tục của Copyright, Memory Privacy, ngữ nghĩa xóa và kết thúc hội thoại | Từ lọc đầu ra sang Lifecycle Governance |

## Thay đổi thứ nhất: Memory phát triển từ hai câu thành một hệ thống tệp

Phần Memory của Fable 5 cực kỳ mỏng. Nó nói Claude có thể nhận Memory được suy ra từ các hội thoại trước và ghi nhận liệu người dùng đã bật tính năng này hay chưa. Nó mô tả sự tồn tại của Memory, nhưng không nói Memory được tạo, cập nhật, xóa hay phân tách ra sao.

Fable 5.1 thì mô hình hóa Memory như một hệ thống tệp bền vững với ít nhất năm nhóm nội dung:

- `/profile.md` cho thông tin danh tính và vai trò tương đối ổn định;
- `/topics/` cho thói quen, sở thích và các miền thảo luận lặp lại;
- `/areas/` cho Projects, trách nhiệm và Decisions đang diễn ra;
- `/people/` cho ngữ cảnh quan hệ liên quan đến câu hỏi hiện tại;
- `/preferences.md` cho cách người dùng muốn Claude trả lời và cộng tác.

Thiết kế vượt xa tên tệp. Các quy tắc mới định nghĩa Background Memory Pass, Provenance Label như `[stated]`, Read-before-write, Version Conflict, Append so với Replace, xóa toàn bộ tệp, ranh giới Sensitive Data và điều kiện khi nào một Memory hiện có được phép hoặc không nên được đưa vào câu trả lời.

```text
Hội thoại kết thúc
   ↓
Trích xuất Durable Facts trong nền
   ↓
Phân loại, khử trùng lặp, lọc Privacy, hợp nhất Version
   ↓
Persistent Memory Files
   ↓
Truy xuất theo mức liên quan cho câu hỏi tương lai
   ↓
Chỉ đưa vào Context thực sự làm thay đổi câu trả lời
```

Đây không chỉ là “Embedding lịch sử chat rồi chạy Top-K Retrieval”. Nó gần với một **cơ sở dữ liệu ngữ cảnh** có Schema, Provenance, Lifecycle và Access Policy.

Kết luận của tôi là cạnh tranh về Agent Memory sẽ chuyển từ “có nhớ được không?” sang “nhớ điều gì, vì sao đáng tin, ai có thể sửa, khi nào hết hạn và làm sao rút lại?”. Vector Retrieval chỉ là một chi tiết triển khai trong hệ thống đó.

## Thay đổi thứ hai: Past Chats và Memory trở thành hai Context Plane riêng

Fable 5.1 bổ sung bộ công cụ dành riêng cho hội thoại cũ: `conversation_search`, `recent_chats` và `read_conversation`. Đây không chỉ là thêm một tính năng Memory. Nó thừa nhận ở cấp kiến trúc rằng có hai loại thông tin khác nhau về bản chất:

- **Memory lưu các Durable Claim đã được nén** để tái sử dụng hiệu quả.
- **Past Chats giữ bằng chứng hội thoại gốc** để khôi phục và xác minh ngữ cảnh.

Prompt yêu cầu rõ phải phân biệt điều người dùng thực sự nói hoặc quyết định với điều Claude chỉ đề xuất. Nếu một hội thoại cũ chỉ có đề xuất của Assistant, hội thoại tiếp theo không được nâng nó thành quyết định của người dùng. Nếu cuộc trao đổi chỉ là giả định, quá trình nén không được biến giả định thành sự thật.

Điều này xử lý một vấn đề cốt lõi của mọi hệ thống Long-term Memory: **nén giúp dễ sử dụng hơn nhưng làm mất bằng chứng.**

Vì vậy, một kiến trúc đáng tin cậy hơn không bắt một kho Memory phổ quát làm mọi việc:

```text
Memory = kết luận có thể tái sử dụng
Past Chats = bằng chứng có thể truy vết
Current Session = Task State đang diễn ra
```

Một Agent trưởng thành phải làm nhiều hơn việc ghi nhớ. Nó phải giải thích được Memory đến từ đâu và đó là điều người dùng nêu, Tool xác minh hay Model suy luận.

## Thay đổi thứ ba: Skills, Plugins và MCP tạo thành chuỗi cung ứng năng lực

Fable 5 đã có Skills và MCP Apps. Nó biết đọc `SKILL.md` phù hợp trước khi tạo document, spreadsheet, presentation hay code artifact, đồng thời ưu tiên MCP đã kết nối khi truy cập dịch vụ bên ngoài.

Fable 5.1 giữ cấu trúc đó và bổ sung Plugin Catalog cùng Skill Catalog, bao gồm đường dẫn tìm kiếm, đề xuất và cài đặt. Capability Layer mới có thể hiểu như sau:

- **Skill** đóng gói kinh nghiệm, quy tắc và phương pháp cho một lớp tác vụ;
- **Plugin** kết hợp Tools, Commands và Skills thành Capability Bundle có thể phân phối;
- **MCP** kết nối dữ liệu, hệ thống và quyền lực thực tế từ bên ngoài;
- **Tool Schema** phơi bày một hành động cụ thể cho Model;
- **Router** quyết định lớp năng lực nào xử lý tác vụ hiện tại.

Việc tăng từ 18 lên 44 định nghĩa công cụ không chỉ có nghĩa “thêm 26 hàm”. Các công cụ mới tập trung vào Memory CRUD, truy xuất Past Chats, khám phá Plugin và Skill, gợi ý Research, cùng Structured UI cho Charts, Comparison, Steps, Translation, Quiz, Products và Links.

Cấu trúc này ngày càng giống phân lớp phần mềm truyền thống. Model không cần giữ vĩnh viễn mọi phương pháp làm việc và cũng không nên trực tiếp nắm mọi quyền bên ngoài. Năng lực có thể được khám phá, nạp, cấp quyền, gọi và gỡ bỏ.

## Thay đổi thứ tư: Prompt bắt đầu hiệu chỉnh ngược hành vi của mô hình

Prompt của Fable 5 cố gắng hạn chế Headings, Lists và Bold vì Model khi đó dễ tạo câu trả lời quá nhiều định dạng và giống khuôn mẫu. Fable 5.1 nới quy tắc: List phù hợp khi nội dung đa chiều, và định dạng nên giới hạn ở mức cần thiết để tăng rõ ràng.

Đây không đơn thuần là thay đổi gu sản phẩm. Hành vi mặc định của Model đã đổi. Hướng dẫn Prompting Fable 5.1 của Anthropic nói rằng Model mới ít có xu hướng dùng Headings, Lists và Bold hơn Fable 5. Giữ Anti-formatting Prompt cũ có thể tạo ra những khối văn bản quá dày.

Mối quan hệ bù trừ tương tự xuất hiện ở hai nơi khác:

- Fable 5.1 ít tự đưa Progress Update hơn trong Tool Chain dài, vì vậy Prompt mới yêu cầu một cập nhật ngắn sau vài Tool Calls;
- ở Effort thấp, Fable 5.1 dễ trả lời từ kiến thức sẵn có thay vì Search, vì vậy Prompt mới tăng cường quy tắc xác minh cho Product, Model và Tool thay đổi nhanh.

Bài học quan trọng cho Prompt Engineering là: **System Prompt không phải đặc tả sản phẩm viết một lần rồi thôi; nó là Controller của Model Behavior.** Khi Model thay đổi, Prompt cũ có thể vẫn chạy nhưng bù quá mức và làm Model mới tệ hơn.

Một đội ngũ trưởng thành không dùng một “Universal Prompt” cho mọi Model. Họ quan sát Failure Mode bằng Eval và chỉ áp dụng mức hiệu chỉnh tối thiểu cần thiết cho Model hiện tại.

## Thay đổi thứ năm: Safety chuyển từ “được trả lời gì” sang quản trị trạng thái và dữ liệu

Fable 5 đã có Safety Policy rộng. Thay đổi quan trọng ở Fable 5.1 không chỉ là thêm lệnh cấm. Safety Rule giờ trải dài trên toàn bộ vòng đời tương tác.

Prompt mới xử lý cách yêu cầu sau kế thừa trạng thái sau một lần từ chối; liệu ranh giới Copyright có tiếp tục khi yêu cầu bị thu hẹp hoặc viết lại; thông tin nào tuyệt đối không được vào Long-term Memory; khi xóa một Memory có phải xóa cả kết luận chỉ được suy ra từ nó; khi nào được đọc Sensitive Memory; cách xác nhận yêu cầu kết thúc hội thoại; và liệu có được kết thúc hội thoại khi có lạm dụng, nguy cơ tự hại hay bạo lực tiềm tàng.

Các quy tắc này quản trị nhiều hơn văn bản cuối:

- dữ liệu có được lưu không;
- nhận Provenance Label nào;
- có được dùng lại sau này không;
- người dùng có thể rút lại không;
- Tool Side Effect được hạn chế ra sao;
- Conversation State thay đổi quyết định tiếp theo thế nào.

Vì vậy, Safety đang tiến hóa từ Classifier bao quanh câu trả lời thành Policy Engine bên trong Agent Runtime.

## Những gì không thay đổi về bản chất

Để tránh gọi mọi chi tiết là một cuộc cách mạng, cần nhìn rõ Fable 5 đã có gì.

Fable 5 đã bao gồm Persistent Artifact Storage, MCP Connectors, Skills, File Creation, Computer Use, Web Search, Image Search và Typed Map Output. Nó không phải Text-only Chatbot, và Fable 5.1 cũng không phát minh Agent từ con số không.

Nâng cấp thực sự là Fable 5.1 cung cấp cho các thành phần hiện có những Context Category rõ hơn, khả năng khôi phục bằng chứng, Capability Catalog, Output Routing, Process Feedback và Governance Rule.

Do đó, bước chuyển chính xác hơn là từ “có nhiều thành phần” sang “các thành phần bắt đầu có ranh giới trách nhiệm giống hệ điều hành”.

## Tóm tắt của tôi: bốn mặt phẳng đang hình thành

Nếu trừu tượng hóa các thay đổi, tôi cho rằng Claude Runtime hiện có thể được mô tả bằng bốn mặt phẳng:

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

Fable 5 chủ yếu mở rộng Capability. Fable 5.1 bắt đầu đầu tư nghiêm túc hơn nhiều vào Context và State Governance.

Giờ đây tôi thích dùng công thức sau để hiểu một sản phẩm Agent:

> **Agent Product Capability = Model × Context × Capability × State Governance**

Đây là phép nhân, không phải phép cộng. Một Model mạnh với Context sai vẫn thất bại. Một sản phẩm nhiều Tools nhưng Permission mất kiểm soát không thể vào doanh nghiệp. Memory phong phú mà thiếu Provenance và cơ chế Delete sẽ tích tụ ô nhiễm. Workflow đầy đủ nhưng không có Feedback kiểm chứng được chỉ khiến Agent mắc lỗi tự động hơn.

## Xu hướng tiếp theo

### 1. System Prompt nguyên khối sẽ tách thành Policy mô-đun

Ngày nay ta vẫn có thể đọc một Runtime Prompt Bundle hơn hai nghìn dòng, nhưng nhiều quy tắc trong đó không nên mãi là Natural Language được liên tục đưa vào Model. Chúng sẽ dần chuyển thành Versioned Policy, Skills, Routers, Permission Settings và Task-scoped Instructions.

Prompt sẽ không biến mất. Nó sẽ rút từ “văn bản mang mọi quy tắc” thành “giao diện giúp Model hiểu mục tiêu và ranh giới hiện tại”.

### 2. Context Engineering sẽ trở thành State Engineering

Câu hỏi trước đây là làm sao nhét nhiều Context hơn vào Window. Những câu hỏi quan trọng hơn sẽ là ai sở hữu State, Version nào đang hiện hành, Fact nào đã hết hạn, Rollback ra sao và làm sao chứng minh một External Action đã xảy ra.

Memory, Past Chats, Session, Tool Trace và trạng thái hệ thống bên ngoài sẽ được mô hình hóa riêng. Context của Agent sẽ ngày càng giống database và event stream hơn là một Prompt không ngừng dài ra.

### 3. Nhiều ràng buộc sẽ chuyển từ Prompt xuống lớp giao thức

Fable 5.1 đồng thời giới thiệu Turn-scoped System Message, Thinking Block Binding, Content Provenance và Per-message Effort. Các cơ chế này cùng chỉ một hướng: ràng buộc quan trọng bắt đầu được biểu diễn trực tiếp bởi API và Runtime thay vì phụ thuộc Model “nhớ quy tắc”.

Bất cứ điều gì có thể được bảo đảm bằng Type System, Permission System, Version Number hoặc Protocol cuối cùng không nên chỉ tồn tại dưới dạng Prompt Text.

### 4. Đầu ra của Agent sẽ là kết quả có kiểu thay vì văn bản

Nhiều bổ sung trong 44 Tools không phải công cụ hành động mà là Output Component cho Charts, Cards, Steps, Quiz, Translation và Product Lists. Sản phẩm cuối của Model đang chuyển từ Markdown String sang Typed Result mà ứng dụng có thể sử dụng trực tiếp.

Frontend tương lai sẽ không chỉ render một câu trả lời. Nó sẽ chọn Interactive UI theo Result Type và chuyển tương tác tiếp theo của người dùng thành State cho Turn kế tiếp.

### 5. Model và Harness sẽ được huấn luyện và lặp cùng nhau

Xu hướng dài hạn quan trọng nhất là Model và Harness không còn là hai sản phẩm độc lập. Post-training sẽ ngày càng thích nghi Model với Tool Protocol, Progress Reporting, Editing Pattern, Memory Structure và Permission Boundary cụ thể. Sau đó Harness sẽ được hiệu chỉnh lại bằng Prompt, Router và Eval theo Failure Mode của Model mới.

Việc hướng dẫn định dạng đảo chiều từ Fable 5 sang Fable 5.1 là một ví dụ nhỏ nhưng rõ: khi hành vi mặc định của Model đổi, các điều khiển xung quanh cũng phải đổi theo.

Cuộc cạnh tranh cuối cùng không chỉ là ai sở hữu Base Model mạnh nhất. Nó sẽ là ai có môi trường thực phong phú nhất, Task Trajectory chất lượng nhất, Feedback Signal đáng tin nhất và Closed Loop đưa các tín hiệu đó trở lại phát triển cả Model lẫn Harness.

## Điều này có ý nghĩa gì với người xây Agent

Thứ nhất, đừng nhầm System Prompt với kiến trúc sản phẩm. Prompt có thể mô tả một ranh giới, nhưng ranh giới đáng tin vẫn cần Permission, Schema, Version, Idempotency, Audit và Eval bảo đảm.

Thứ hai, đừng giản lược Memory thành vector database. Long-term Memory trước hết là bài toán Data Governance, sau đó mới là bài toán Retrieval.

Thứ ba, đừng chỉ đánh giá Final Answer. Với Tool-using Agent, câu hỏi quan trọng hơn là Trajectory có đúng không, Side Effect có được kiểm soát không, Failure có thể phục hồi không và Evidence có còn truy vết được không.

Thứ tư, đừng giả định Harness cũ tự động tốt lên khi Model thay đổi. Mỗi Model Upgrade phải chạy lại Real-task Eval và kiểm tra Drift trong Search, Parallel Tool Use, File Editing, Formatting, Stopping Condition và Progress Reporting.

## Kết lời

Điểm đáng chú ý nhất trong thay đổi Prompt của Fable 5.1 không phải số quy tắc được thêm. Đó là việc Anthropic đang trả lời có hệ thống hơn những câu hỏi mà mọi sản phẩm Agent cuối cùng đều gặp: Context đến từ đâu, Capability được nạp thế nào, State tồn tại ra sao, Side Effect được quản trị thế nào, Result được trình bày thế nào và Error được sửa ra sao.

Nhận định cuối cùng của tôi là:

> Cuộc cạnh tranh Agent thế hệ tiếp theo sẽ không nằm ở việc ai có Prompt dài hơn. Nó nằm ở việc ai có thể đặt Model vào một môi trường thực hơn, nhiều trạng thái hơn, kiểm chứng được hơn và có thể tiếp tục học.

Khi những năng lực môi trường này ổn định, System Prompt có thể ngắn lại. Những quy tắc đáng tin cậy nhất cuối cùng sẽ tiến hóa từ “nói cho Model biết nên hành động thế nào” thành “System chỉ cho phép cách hành động đúng”.

## Tài liệu tham khảo

- [Anthropic: System prompts overview](https://platform.claude.com/docs/en/release-notes/system-prompts/overview)
- [Anthropic: Claude Fable 5 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5)
- [Anthropic: Claude Fable 5.1 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5-1)
- [Anthropic: Claude Fable 5.1 model overview](https://platform.claude.com/docs/en/models/fable-5-1/overview)
- [Anthropic: Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)
- [Bản lưu trữ cộng đồng của Full Fable 5 Runtime Prompt](https://github.com/infineural/fable-5/blob/main/system-prompt/full-system-prompt.md)
