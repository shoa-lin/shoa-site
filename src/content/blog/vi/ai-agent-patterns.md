---
translationKey: "ai-agent-patterns"
locale: "vi"
title: "Mẫu thiết kế AI Agent (Phần 1): Vận hành đáng tin cậy"
description: "Bản đồ nhiệm vụ thực tiễn về cách AI agent suy luận, sử dụng công cụ, cộng tác, ghi nhớ và duy trì an toàn, khả năng kiểm soát trong môi trường production."
publishedAt: "2026-04-09"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/ai-agent-patterns/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Nhiều bài viết về AI agent trộn lẫn hai vấn đề: **làm thế nào để mô hình hoàn thành nhiệm vụ** và **làm thế nào để xây dựng một hệ thống đáng tin cậy quanh mô hình**. Kết quả là người đọc nhớ một danh sách dài thuật ngữ, nhưng khi thực sự bắt tay vào thiết kế lại không biết nên giải quyết vấn đề nào trước.

Bài viết này trước hết trả lời câu hỏi đầu tiên: một agent nên phán đoán, hành động, cộng tác và duy trì khả năng kiểm soát trong môi trường thực tế như thế nào. Có thể xem đây là một bản đồ nhiệm vụ: bắt đầu từ vòng lặp suy luận của một agent đơn lẻ, mở rộng sang cộng tác đa agent, bộ nhớ và tri thức, rồi bổ sung các cơ chế an toàn và chịu lỗi cần thiết cho production.

Khi đọc, bạn không cần ghi nhớ tên từng mẫu. Mỗi phần thực chất trả lời một câu hỏi: **Trong loại nhiệm vụ này, sự bất định nào cần được loại bỏ?** Đó có thể là bước tiếp theo nên làm gì, ai nên thực hiện, thông tin nào cần được ghi nhớ, hoặc làm sao tránh hậu quả không thể đảo ngược.

## Lớp 1: Mô hình lõi đơn agent

### 01 ReAct — Suy luận và hành động đan xen

**Bài báo**: Yao et al., 2022 — _ReAct: Synergizing Reasoning and Acting in Language Models_

💡 Ý tưởng cốt lõi

Không nên suy nghĩ xong trước rồi mới làm, mà phải vừa suy nghĩ vừa làm. LLM luân phiên tạo ra Thought ( suy luận) và Action ( hành động), quan sát kết quả rồi tiếp tục suy luận.

> Thought: Người dùng muốn biết thời tiết Bắc Kinh hôm nay. Tôi cần tìm kiếm.
> Hành động: tìm kiếm (“Thời tiết Bắc Kinh ngày 9 tháng 4 năm 2026”)
> Observation: Trời quang, 18°C, gió bắc cấp 3
> Thought: Đã nhận được dữ liệu thời tiết, có thể trả lời rồi.
> Answer: Bắc Kinh hôm nay trời trong, nhiệt độ 18°C, có gió bắc cấp 3.

**Tại sao có hiệu quả**:

- **Suy luận hướng dẫn hành động**: Mỗi bước Action đều có Thought giải thích “tại sao phải làm như vậy”, giảm thiểu thử nghiệm mù quáng
- **Suy luận phản hồi hành động**: Observation cung cấp thông tin về thế giới thực, giúp suy luận tiếp theo chính xác hơn
- **Tính có thể giải thích**: Bản thân liên kết Thought là một “nhật ký quyết định” tự nhiên

**Tình huống áp dụng**: Tác vụ yêu cầu suy luận nhiều bước + lệnh gọi công cụ (Hỏi đáp, phân tích, gỡ lỗi)

**Hạn chế**: Chuỗi dài dễ “đi chệch hướng”; các Observation về sau có thể kéo agent rời xa mục tiêu ban đầu. Cần kết hợp Reflection hoặc Planning để giữ đúng hướng.

### 02 Plan-and-Execute — Lập kế hoạch trước khi hành động

💡 Tư tưởng cốt lõi

Tạo một kế hoạch thực thi hoàn chỉnh rồi **thực hiện từng bước**, thay vì vừa làm vừa ứng biến. Khác với cách “vừa nghĩ vừa làm” của ReAct, mẫu này tách **lập kế hoạch** và **thực thi** thành hai giai đoạn rõ ràng.

> [giai đoạn lập kế hoạch]
> Người dùng: Giúp tôi phân tích động thái mới nhất của đối thủ cạnh tranh HireGo
> Kế hoạch:
> 1. Tìm kiếm thông tin sản phẩm trên trang web chính thức của HireGo
> 2. Tìm kiếm đánh giá Google Play / App Store
> 3. Tìm kiếm các bài báo liên quan trong 30 ngày qua trên các phương tiện truyền thông công nghệ
> 4. Tìm kiếm động thái tuyển dụng trên LinkedIn (định hướng mở rộng đội ngũ)
> 5. Tổng hợp các thông tin trên để tạo ra bản tóm tắt thông tin cạnh tranh
>
> [Bước thực hiện]
> Thực hiện bước 1 → Quan sát → Thực hiện bước 2 → Quan sát → ... → Báo cáo cuối cùng

**Thiết kế chính**:

- **Kế hoạch có thể điều chỉnh động**: Phát hiện manh mối mới khi thực hiện bước 2, có thể quay lại bổ sung tìm kiếm của bước 1
- **Tương thích với ReAct**: Plan-and-Execute cung cấp “quan điểm toàn cầu”, ReAct cung cấp “tính linh hoạt cục bộ”
- **Thường được sử dụng kết hợp trong kỹ thuật thực tế**: Tạo kế hoạch độ chi tiết thô trước, thực thi bằng chế độ ReAct trong mỗi bước

**Tình huống áp dụng**: Nhiệm vụ nhiều bước, có quy trình rõ ràng (báo cáo nghiên cứu, đường ống xử lý dữ liệu, tái cấu trúc mã)

**Giới hạn**: Kế hoạch ban đầu có thể không hoàn hảo; nếu môi trường thay đổi mạnh mẽ, kế hoạch tĩnh sẽ trở nên lỗi thời.

### 03 Reflection — Hoàn thành rồi nhìn lại

💡 Ý tưởng cốt lõi

Cho agent **đánh giá đầu ra của chính mình** và tự sửa khi phát hiện thiếu sót. Đây có lẽ là mẫu “giống con người” nhất: hoàn thành công việc, kiểm tra, phát hiện sai sót rồi sửa lại.

> [Đầu tiên xuất ra]
> “Doanh thu quý 1 năm 2026 của Nvidia là 28 tỷ đô la, tăng 78% so với cùng kỳ năm trước”
>
> [Tự phản tư]
> Khoan, hãy kiểm tra lại: 28 tỷ so với 26 tỷ ở quý 1 năm trước...
> 28/26 - 1 = 7,7%, không phải 78%. Mức 78% là khi so với quý 1 năm 2024.
> Tôi cần ghi rõ mốc so sánh.
>
> [Đầu ra đã sửa]
> “Doanh thu Nvidia quý 1/2026 đạt 28 tỷ USD, tăng 7,7% so với quý trước và tăng 78% so với cùng kỳ năm 2024.”

**Ví dụ điển hình của Andrew Ng**: Yêu cầu LLM viết mã → chạy kiểm tra → phản hồi lỗi cho LLM → sửa đổi mã LLM → kiểm tra lại. Vòng lặp này có thể lặp lại nhiều lần cho đến khi vượt qua.

**Điểm thực hiện**:

- Tín hiệu phản hồi có thể là bên ngoài (kết quả kiểm tra, phản hồi của người dùng, giá trị trả về của công cụ) hoặc bên trong (tự đánh giá LLM)
- Cần kiểm soát tần suất suy ngẫm: Mỗi lần suy ngẫm đều lãng phí thời gian, chỉ suy ngẫm tại các nút chính (sau khi viết xong mã, tạo báo cáo)
- Cần có “các tiêu chuẩn hoàn thành” rõ ràng, nếu không Agent sẽ “nghĩ lại” trong vòng lặp vô hạn

**Tình huống áp dụng**: Tạo mã, viết, phân tích dữ liệu – bất kỳ nhiệm vụ nào mà “chất lượng rất quan trọng”

### 04 Tool Use — Trao cho agent khả năng hành động

💡 Ý tưởng cốt lõi

Bản thân LLM chỉ là một trình tạo văn bản. Thông qua **Function Calling / Tool Use**, nó có thể vận hành các công cụ trong thế giới thực. Đây là hạ tầng nền tảng của mọi hệ thống agent — không có Tool Use thì chưa thể gọi là agent.

> Người dùng: “Giúp tôi tạo một lời nhắc theo lịch trình, nhắc tôi họp lúc 9 giờ sáng mai”
>
> Quyết định nội bộ của LLM:
> Cần gọi → cron_schedule(
> tin nhắn: “Nhắc nhở: họp lúc 9 giờ”,
> thời gian: “2026-04-10T09:00:00+08:00”
> )
>
> → Cuộc gọi thành công → “Lời nhắc đã đặt: 9:00 ngày mai — nhắc bạn họp”

Phân loại công cụ:

| Danh mục | Ví dụ | Đặc điểm |
| --- | --- | --- |
| **Thu thập thông tin** | web\_search, web\_fetch, read\_file | Chỉ đọc, không có tác dụng phụ |
| **Thực hiện hành động** | send\_message, write\_file, exec | Có tác dụng phụ, cần thận trọng |
| **Công cụ tương tác** | browser, message, canvas | Giao tiếp hai chiều |
| **Công cụ tính toán** | calculator, code\_interpreter | Đầu ra xác định |

**Thực tiễn kỹ thuật**:

- **Chất lượng mô tả công cụ quyết định chất lượng gọi**: LLM có thể chọn công cụ chính xác hay không, 90% phụ thuộc vào việc mô tả công cụ được viết tốt hay không
- **Nguyên tắc đặc quyền tối thiểu**: Agent chỉ cần các công cụ cần thiết cho nhiệm vụ hiện tại của nó, không nên cho tất cả một lần
- **Xử lý lỗi là cốt lõi**: Lỗi gọi công cụ là bình thường, Agent phải có khả năng xử lý lỗi một cách tao nhã (thử lại, dự phòng, báo cáo)

### 05 Chuỗi suy nghĩ & Cây suy nghĩ

**Chain-of-Thought**: Yêu cầu LLM “viết ra quá trình suy nghĩ”, thay vì trực tiếp đưa ra câu trả lời.

> Thực hành kém: “Câu trả lời là 42” (hộp đen)
> Cách thực hành tốt: “Giả sử x là..., thay thế công thức bằng..., vì vậy câu trả lời là 42” (quá trình hiển thị)

Đây không phải là một mô hình Agent độc lập, mà là cơ sở hạ tầng cơ bản của tất cả các mô hình - Thought trong ReAct, Plan trong Plan-and-Execute, đánh giá trong Reflection, tất cả đều phụ thuộc vào CoT.

**Tree-of-Thought**: Phiên bản nâng cấp của CoT – không chỉ là một chuỗi suy nghĩ, mà là**khám phá nhiều con đường, chọn ra con đường tốt nhất**.

> Câu hỏi: “Làm thế nào để giảm độ trễ của API tìm kiếm từ 2 giây xuống 200 mili giây?”
>
> Đường dẫn A: Chuyển sang nhà cung cấp API nhanh hơn → Chi phí tăng 3 lần → Không khuyến nghị
> Đường dẫn B: Thêm lớp bộ nhớ đệm → Tỷ lệ trúng mục tiêu không xác định → Cần đánh giá
> Đường dẫn C: Yêu cầu đồng thời nhiều API, lấy kết quả trả về nhanh nhất → độ phức tạp tăng → đáng để thử
>
> Đánh giá: Đường dẫn C có thể đạt được mục tiêu trong điều kiện chi phí có thể kiểm soát → Chọn đường dẫn C

**Tình huống áp dụng**: Quyết định phức tạp yêu cầu khám phá nhiều phương án (thiết kế kiến trúc, lựa chọn phương án)

## Lớp 2: Chế độ cộng tác đa agent

Khi năng lực của một Agent đơn lẻ không đủ, cần phải có sự hợp tác của nhiều Agent chuyên nghiệp. Điều này đưa đến lĩnh vực Điều phối.

### 06 Supervisor – Giám sát viên phân công nhiệm vụ

Một “Agent giám sát” chịu trách nhiệm hiểu ý định của người dùng, sau đó phân chia các nhiệm vụ thành từng phần**và phân phối cho các Agent chuyên nghiệp thực hiện**.

> Người dùng: “Giúp tôi làm một báo cáo hàng tuần về ngành AI”
>
> Supervisor Agent:
> → Nhân viên thu thập thông tin: “Thu thập các tin tức quan trọng trong ngành AI tuần này”
> → Nhân viên tài chính: “Thu thập động thái giá cổ phiếu của các công ty liên quan đến AI trong tuần này”
> → Research Agent: “Collect this week‘s important papers”
> ← Tổng hợp đầu ra của tất cả các Agent → Tổng hợp thành báo cáo hàng tuần → Gửi cho người dùng

💡 **Một cách triển khai phổ biến** là để một supervisor điều phối các agent chuyên môn về thu thập thông tin, tài chính và nghiên cứu.

**Ưu điểm**: Trách nhiệm rõ ràng, mỗi Agent tập trung vào lĩnh vực của mình
**Nhược điểm**: Supervisor là nút thắt cổ chai đơn điểm; nếu lỗi phân tích nhiệm vụ xảy ra, toàn bộ quy trình sản xuất sẽ bị lệch hướng

### 07 Hierarchical – Quản lý phân cấp

Phiên bản nâng cấp của Supervisor —**Chuỗi chỉ huy đa cấp bậc**.

```text
协调 Agent
├── 产品负责人 Agent — 负责产品相关任务
│   ├── 竞品分析 Agent — 数据搜集
│   └── 用户研究 Agent — 数据搜集
├── 技术负责人 Agent — 负责技术任务
│   ├── 前端开发 Agent
│   └── 后端开发 Agent
└── 运营负责人 Agent — 负责运营任务
    ├── 数据分析 Agent
    └── 内容创作 Agent
```

**Khác biệt so với Giám sát viên**: Giám sát viên là “dẹt” - một sếp trực tiếp quản lý tất cả mọi người. Hierarchical là “trụ” - có tầng quản lý trung gian, có thể xử lý các nhiệm vụ quy mô lớn hơn.

### 08 Swarm - Tổ ong phi tập trung

Không có kiểm soát trung tâm, các agent hợp tác với nhau thông qua chuyển thẻ tay (Handoff).

> Người dùng: “Tôi muốn đặt vé máy bay từ Bắc Kinh đến Thượng Hải”
>
> Routing Agent:
> Phân tích ý định → Nhận dạng là “Đặt vé máy bay”
> → Thẻ tay cho Agent vé máy bay
>
> Ticket Agent:
> Tìm kiếm chuyến bay → Tìm thấy yêu cầu đăng nhập
> → Đưa thẻ cho Nhân viên xác thực
>
> Xác thực Agent:
> Hướng dẫn người dùng đăng nhập → Đăng nhập thành công
> → Trình đại diện thẻ quay về
>
> Agent vé máy bay:
> Tiếp tục quy trình đặt chỗ → Hoàn thành

**Handoff (trò chơi tay)**: Sau khi Agent A hoàn thành phần của mình, chuyển ngữ cảnh cho Agent B để tiếp tục. Không có quản trị viên toàn cầu, mỗi Agent chỉ chịu trách nhiệm về vai trò của mình.

**Ưu điểm**: Linh hoạt, có thể mở rộng, không có điểm tắc nghẽn đơn lẻ
**Nhược điểm**: Quá trình khó theo dõi; nếu logic Handoff được thiết kế không phù hợp, các tác vụ sẽ lặp lại “ping pong” giữa các Agent

**Thực hiện điển hình**: Khung OpenAI Swarm được thiết kế dựa trên mô hình này.

### 09 Blackboard - Bảng chia sẻ

Nhiều Agent làm việc xung quanh một bảng đen chung, mỗi người viết thông tin lên đó và cũng có thể đọc thông tin của người khác.

```text
[共享黑板]
┌─────────────────────────────────┐
│ 用户需求: "做一个天气预报 App"    │
│                                 │
│ [搜索 Agent 写入]               │
│ 天气API: OpenWeatherMap 免费    │
│ 地理API: Nominatim              │
│                                 │
│ [设计 Agent 写入]               │
│ 技术栈: React + Node.js        │
│ 架构: 三层（UI/API/数据）        │
│                                 │
│ [代码 Agent 读取黑板后开始编码]  │
│ ...                            │
└─────────────────────────────────┘
```

**Khác biệt với Supervisor**: Supervisor là “được điều khiển bởi chỉ dẫn” - người quản lý nói cho ai làm gì. Blackboard là “được điều khiển bởi dữ liệu” - ai thấy thông tin mà họ có thể xử lý sẽ chủ động xử lý.

### 10 Pipeline / DAG - Quy trình sản xuất

Tác vụ được chia thành các giai đoạn cố định, mỗi giai đoạn được xử lý bởi một Agent, và dữ liệu được truyền theo thứ tự.

> Nhập → [Sưu tập Agent] → [Phân tích Agent] → [Viết Agent] → [Kiểm tra Agent] → Xuất
> Dữ liệu thô Phân tích có cấu trúc Tạo báo cáo Kiểm tra chất lượng

- Mỗi giai đoạn có thể được xử lý song song (nếu không có sự phụ thuộc giữa các giai đoạn)
- Truyền dữ liệu giữa các giai đoạn thông qua giao diện rõ ràng
- Dễ giám sát và gỡ lỗi (đầu vào và đầu ra của mỗi giai đoạn đều xác định)

**Hạn chế**: Không linh hoạt - quy trình là cố định, không thể điều chỉnh động dựa trên kết quả trung gian.

## Tầng thứ ba: Mô hình Ký ức và Kiến thức

Agent không có “bộ nhớ thực sự”, mỗi cuộc trò chuyện đều là một khởi đầu hoàn toàn mới. Chế độ bộ nhớ giải quyết vấn đề duy trì thông tin giữa các phiên.

### 11 Ký ức ngắn hạn - ngữ cảnh cuộc hội thoại hiện tại

**Bản chất**: chính là cửa sổ ngữ cảnh (Context Window) của LLM.

> Cuộc hội thoại hiện tại:
> Người dùng: “Giúp tôi phân tích NVIDIA một chút”
> Agent: [Gọi công cụ tìm kiếm, lấy dữ liệu]
> Người dùng: “Còn AMD thì sao?” ← Agent thông qua trí nhớ ngắn hạn biết rằng “phân tích” có nghĩa là phân tích tài chính

**Thử thách kỹ thuật**:

- **Cửa sổ ngữ cảnh có giới hạn**: Cuộc hội thoại dài sẽ “quên” nội dung trước đó (GPT-4 128K, Gemini 1M, GLM 128K)
- **Tích lũy tiếng ồn**: Cuộc hội thoại càng dài, càng có nhiều thông tin không liên quan, ảnh hưởng đến chất lượng suy luận
- **chi phí**: Số lượng token = tiền, ngữ cảnh dài = chi phí cao

**Thực tiễn kỹ thuật**: nén hội thoại (tổng kết định kỳ), cửa sổ trượt (chỉ giữ lại N vòng gần đây nhất), tăng cường truy xuất (truy xuất các đoạn có liên quan theo yêu cầu)

### 12 Ký ức dài hạn - Duy trì kiến thức giữa các phiên

Yêu cầu Agent lưu giữ thông tin giữa các phiên – ghi nhớ bạn là ai, bạn đã làm gì, sở thích của bạn.

| Phương thức | Nguyên tắc | Ưu điểm | Nhược điểm |
| --- | --- | --- | --- |
| **Bộ nhớ tệp** | Đọc và ghi MEMORY.md / .learnings/ | Đơn giản, minh bạch, dễ kiểm tra | Hạt thô, cần bảo trì thủ công |
| **Bộ nhớ vector** | Embedding thông tin rồi lưu vào cơ sở dữ liệu vector | Tìm kiếm ngữ nghĩa, liên kết tự động | Cần thêm hạ tầng |
| **Bộ nhớ có cấu trúc** | Knowledge graph, cơ sở dữ liệu quan hệ | Truy vấn chính xác, khả năng suy luận mạnh | Chi phí xây dựng cao |

💡 **Một thực tiễn phổ biến về ghi nhớ tệp**: sử dụng tài liệu ghi nhớ dài hạn để lưu trữ các sự kiện ổn định, lưu trữ các bản ghi theo ngày tháng để lưu trữ ngữ cảnh ban đầu, sau đó sử dụng nhật ký học tập để lắng đọng các lỗi và cải tiến.

### 13 RAG – Tạo tăng cường truy xuất

Thay vì để LLM “ghi nhớ” tất cả kiến thức, thay vào đó khi cần thiết sẽ truy xuất thông tin liên quan từ cơ sở kiến thức bên ngoài và đưa vào từ nhắc nhở.

> Người dùng: “Chúng ta đã thảo luận những gì vào ngày 02/04/2026?”
>
> → Truy xuất cơ sở dữ liệu véc-tơ: query=“2026-04-02 thảo luận”
> → Truy xuất đến: memory/2026-04-02.md
> → Chèn vào prompt: “Trả lời câu hỏi của người dùng theo ngữ cảnh sau: [Kết quả tìm kiếm]”
> → LLM tạo câu trả lời

💡 **RAG là “công cụ tìm kiếm” của lớp bộ nhớ** — nó không giải quyết câu hỏi “lưu như thế nào”, mà giải quyết “tìm nhanh thông tin cần thiết như thế nào”.

## Tầng thứ tư: Chế độ kỹ thuật cấp sản xuất

Giữa nguyên mẫu học thuật và hệ thống sản xuất có sẵn, có một rào cản thực hành kỹ thuật.

### 14 Guardrails - Lưới bảo vệ an toàn

Đặt các ràng buộc ranh giới cho hành vi của Agent để ngăn nó làm những điều không nên làm.

```text
[输入护栏]                          [输出护栏]
用户输入 → ┌──────────┐ → LLM → ┌──────────┐ → 最终输出
          │ 过滤敏感词  │         │ 验证事实   │
          │ 检测注入    │         │ 检查格式   │
          │ 限制话题    │         │ 过滤有害内容│
          └──────────┘         └──────────┘
```

| Mặt phẳng | Ví dụ |
| --- | --- |
| **Xác thực đầu vào** | Phát hiện prompt injection, lọc chỉ dẫn nhạy cảm |
| **Quyền công cụ** | Danh sách trắng lệnh exec, xác nhận trước khi ghi tệp |
| **Kiểm tra đầu ra** | Kiểm chứng sự thật, xác thực định dạng, lọc thông tin nhạy cảm |
| **Ràng buộc hành vi** | Giới hạn agent chỉ được truy cập nguồn dữ liệu cụ thể và không gửi tin nhắn ra ngoài |

### 15 Human-in-the-Loop - Con người trong vòng lặp

Agent không hoàn toàn tự chủ,**các quyết định quan trọng cần có sự xác nhận của con người**.

> Agent: “Tôi chuẩn bị xóa thư mục /tmp/old-data/, tổng cộng 342 tệp. Xác nhận xóa?”
> Con người: [Xác nhận] / [Từ chối] / [Sửa đổi: Chỉ xóa tệp .log]

| Loại quyết định | mức độ tự động hóa | nguyên nhân |
| --- | --- | --- |
| đọc tệp, tìm kiếm | hoàn toàn tự động | không có tác dụng phụ |
| ghi tệp vào vị trí được chỉ định | bán tự động | có thể ghi đè nội dung hiện có |
| gửi tin nhắn cho người khác | cần xác nhận | có tác động bên ngoài |
| xóa dữ liệu | cần xác nhận | thao tác không thể đảo ngược |
| thực thi lệnh shell | theo rủi ro | có thể ảnh hưởng đến bảo mật hệ thống |

**Thực hiện kỹ thuật**: Cổng phê duyệt là một thực hiện điển hình của Human-in-the-Loop.

### 16 Fallback & Retry – Khả năng chịu lỗi và hạ cấp

Mỗi bước của Agent đều có thể thất bại, hệ thống phải có khả năng xử lý thất bại một cách tao nhã.

```text
搜索请求 → web_search(Gemini)
              ↓ 429 限流
           unified-search(Tavily)
              ↓ 无结果
           unified-search(Exa)
              ↓ 全部失败
           返回提示: "搜索服务暂时不可用，请稍后重试"
```

💡 **Một lớp tìm kiếm vững chắc** có thể tự động chuyển sang nguồn dự phòng khi nguồn chính không có kết quả, đồng thời cung cấp cho người dùng một kết quả suy giảm nhưng vẫn hữu ích.

**Nguyên tắc thiết kế dung sai**:

1. Fail Fast: Đừng chờ đợi quá lâu một thao tác chắc chắn sẽ thất bại
2. **Hạ cấp có ý nghĩa**: Chương trình dự phòng không thể là “không thể làm gì cả”, phải cung cấp một số chức năng
3. **Có giới hạn tối đa về số lần thử lại**: thử lại vô hạn = vòng lặp vô hạn, phải đặt số lần thử lại tối đa
4. Ghi lại nguyên nhân thất bại: Ghi lỗi vào hàng đợi lỗi có cấu trúc để phân tích và cải thiện sau này

### 17 Self-Improvement — Tự cải tiến

Agent có thể học hỏi từ những sai lầm của mình và liên tục cải thiện.

```text
执行任务 → 出错 → 记录错误 → 分析模式 → 提炼规则 → 下次避免
                                                    ↑
                                              注入到行为中
```

**Một cách triển khai điển hình**:

- Tự động phát hiện lỗi sau khi gọi công cụ và ghi vào hàng đợi lỗi có cấu trúc
- Chèn lời nhắc học tập đang chờ xử lý trước khi xây dựng từ nhắc nhở
- Đánh giá định kỳ các lỗi lưu trữ, phát hiện các mẫu trùng lặp và nâng cấp quy tắc thành cấu hình ổn định

💡 **Nhận thức quan trọng**: Trọng tâm của sự tự tiến hóa không phải là bản thân “học tập” - LLM bẩm sinh sẽ học tập từ ngữ cảnh. Trọng tâm là **làm cho việc học tập liên tục, có hệ thống, tự động hóa**, thay vì phụ thuộc vào lời nhắc nhở nhân tạo.

## Tổng quan về mô hình

```text
[生产级工程层]
├ Guardrails
├ Human-in-Loop
├ Fallback
└ Self-Improvement

[多 Agent 编排层]
├ Supervisor
├ Hierarchical
├ Swarm
├ Blackboard
└ Pipeline

[记忆与知识层]
├ 短期记忆
├ 长期记忆
└ RAG

[单 Agent 核心层]
├ ReAct
├ Plan-Execute
├ Reflection
└ Tool Use · CoT / ToT
```

Một hệ thống Agent hoàn chỉnh thường được sử dụng đồng thời: ReAct, Tool Use, Supervisor, File Memory, Guardrails, Human-in-the-Loop, Fallback và Self-Improvement. Cùng nhau, những mô hình này tạo thành một hệ thống có thể vận hành và quản lý được.

## Hướng dẫn lựa chọn

| Đặc điểm nhiệm vụ | Mô hình Đề xuất | Lý do |
| --- | --- | --- |
| Hỏi đáp đơn giản | **ReAct + Tool Use** | Có thể giải quyết trong một hoặc hai bước, không cần lập kế hoạch phức tạp |
| Nghiên cứu nhiều bước | **Plan-and-Execute + ReAct** | Cần tầm nhìn toàn diện, nhưng mỗi bước đều đòi hỏi sự linh hoạt |
| Tạo mã | **Tool Use + Reflection** | Cần thực sự chạy mã và sửa lỗi |
| Cộng tác đa lĩnh vực | **Supervisor / Hierarchical** | Cần phân công chuyên môn |
| Xử lý song song quy mô lớn | **Swarm / Pipeline** | Không cần điều phối tập trung, có thể xử lý song song |
| Công việc nặng tri thức | **RAG + bộ nhớ dài hạn** | Cần truy xuất từ kho tri thức lớn |
| Nhạy cảm về an toàn | **Guardrails + Human-in-the-Loop** | Phải có ràng buộc và bước xác nhận |
| Vận hành dài hạn | **Self-Improvement + Fallback** | Cần học từ lỗi và có khả năng chịu lỗi |

## Tóm tắt: Chọn mẫu nhiệm vụ trước, rồi mới bàn cấu trúc mã

Đến đây, bạn đã có thể đánh giá trước một agent **nên làm việc như thế nào**: vừa suy nghĩ vừa hành động hay lập kế hoạch trước rồi mới thực hiện; cần một supervisor điều phối hay để các agent chuyên môn tự chuyển giao; cần ghi nhớ điều gì và phải dừng lại trước hành động quan trọng nào để con người xác nhận.

Những lựa chọn này xác định ranh giới hành vi của hệ thống. Bước tiếp theo là tổ chức những khả năng này thành các cấu trúc mã có thể thay thế, quan sát được và có thể khôi phục.

## Bài viết tiếp theo: Mô hình thiết kế kỹ thuật AI Agent

Bài viết tiếp theo không còn thảo luận về những gì Agent nên làm, mà thảo luận về việc thực hiện kỹ thuật: cách thay thế nhà cung cấp công cụ, cách thu gọn logic chéo, cách khôi phục các tác vụ dài, và cách sử dụng các mô hình thiết kế phần mềm cổ điển để làm cho hệ thống Agent ổn định hơn và dễ phát triển hơn.
