---
translationKey: "prompt-caching-best-practices"
locale: "vi"
title: "Bài học từ Claude Code: Prompt Caching quyết định mọi thứ"
description: "Bản chuyển thể có cấu trúc về kinh nghiệm production của nhóm Claude Code với prefix ổn định, công cụ, chuyển mô hình và compaction an toàn cho cache."
publishedAt: "2026-02-20"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2024574133011673516"
sourceAuthor: "Thariq Shihipar"
contentType: "adaptation"
translationStatus: "reviewed"
---

<div class="blog-article-body">

## Giới thiệu

Các kỹ sư đôi khi nói cache chi phối mọi thứ xung quanh họ. Điều tương tự đúng với agent chạy dài hạn.

Những sản phẩm như Claude Code khả thi về kinh tế vì Prompt Caching cho phép yêu cầu sau tái sử dụng tính toán từ các lượt trước. Việc tái sử dụng này giảm độ trễ và chi phí, đặc biệt khi hội thoại dài lên.

## Kiến trúc caching của Claude Code

Claude Code được thiết kế xoay quanh Prompt Caching. Tỷ lệ cache hit cao giảm chi phí vận hành và hỗ trợ rate limit đăng ký rộng rãi hơn. Nhóm theo dõi tỷ lệ này sát đến mức một đợt giảm nghiêm trọng có thể được xử lý như incident.

Các phần dưới đây ghi lại bài học production khi tối ưu Prompt Caching ở quy mô lớn.

![Sơ đồ kiến trúc Prompt Caching](https://pbs.twimg.com/media/HBipHa1boAAXD_A?format=jpg&name=large)

## Prompt Caching hoạt động thế nào

### Khớp prefix

Prompt Caching hoạt động bằng **prefix matching**. API có thể tái sử dụng nội dung từ đầu yêu cầu đến các cache breakpoint khi prefix đó không đổi.

Vì vậy thứ tự rất quan trọng: càng nhiều yêu cầu chia sẻ cùng phần đầu, chúng càng tái sử dụng được nhiều công việc đã cache.

### Thứ tự thân thiện với cache của Claude Code

Claude Code dùng bố cục thân thiện với cache: **nội dung ổn định đặt trước, nội dung động đặt sau**.

Yêu cầu được tổ chức gần như sau:

1. **System prompt và công cụ ổn định** (chia sẻ rộng)
2. **Context dự án** (chia sẻ trong dự án)
3. **Context phiên** (chia sẻ trong phiên)
4. **Tin nhắn hội thoại**

Cách sắp xếp này tăng khả năng yêu cầu và phiên chia sẻ prefix tái sử dụng được.

### Vì sao thứ tự mong manh

Prefix có thể bị phá bởi thay đổi tưởng như vô hại, chẳng hạn:

- đặt timestamp chính xác trong system prompt ổn định;
- xuất định nghĩa tool theo thứ tự không xác định;
- đổi tham số tool, ví dụ agent tool được phép gọi agent nào.

## Giữ cache hợp lệ

### Cập nhật thông tin cũ

Một số thông tin trong prompt tự nhiên trở nên lỗi thời: ngày thay đổi, tệp được sửa hoặc trạng thái runtime dịch chuyển.

Sửa system prompt trước đó có vẻ gọn, nhưng làm thay đổi prefix và gây cache miss cho mọi phần theo sau.

Mẫu của Claude Code là gửi cập nhật trong tin nhắn về sau. Ví dụ, tin nhắn người dùng hoặc kết quả tool tiếp theo có thể chứa `<system-reminder>` cho biết hôm nay đã là thứ Tư. Prefix cũ vẫn tái sử dụng được trong khi mô hình nhận thông tin mới.

## Cạm bẫy khi chuyển mô hình

### Cache gắn với từng mô hình

Prompt cache phụ thuộc vào mô hình, khiến tính toán chi phí kém trực giác hơn tưởng tượng.

Nếu hội thoại đã có 100k token được cache cho Opus, hỏi Opus thêm một câu đơn giản có thể rẻ hơn chuyển sang Haiku, vì Haiku cần xây cache mới cho toàn bộ lịch sử.

### Dùng subagent để bàn giao mô hình

Khi mô hình khác phù hợp hơn, Claude Code ưu tiên bàn giao cho **subagent** thay vì đổi mô hình của hội thoại hiện tại. Opus có thể chuẩn bị mô tả nhiệm vụ gọn cho mô hình kia.

Explore agent là ví dụ phổ biến: chúng có thể dùng Haiku mà không bỏ cache riêng theo mô hình của hội thoại cha.

## Vì sao thay đổi tool tốn kém

Thay bộ tool giữa hội thoại là cách phổ biến khác phá khả năng tái sử dụng prompt cache.

Chỉ hiển thị tool cần ngay lúc này có vẻ hiệu quả. Nhưng định nghĩa tool là phần của prefix được cache, nên thêm hoặc bỏ tool sẽ vô hiệu phần prefix hội thoại theo sau.

### Plan Mode: biểu diễn trạng thái mà không đổi tool

Plan Mode cho thấy Claude Code thiết kế tính năng quanh ràng buộc này như thế nào.

Cách hiển nhiên là thay bộ tool thường bằng tool chỉ đọc khi người dùng vào Plan Mode. Thay schema như vậy sẽ phá cache.

Thay vào đó, Claude Code giữ tool ổn định và đưa `EnterPlanMode`, `ExitPlanMode` thành tool thường. Một system message về sau cho agent biết nó đang ở Plan Mode: kiểm tra codebase, không sửa tệp và gọi `ExitPlanMode` khi kế hoạch xong. Định nghĩa tool không đổi.

Vì `EnterPlanMode` tự là một tool, mô hình cũng có thể vào Plan Mode khi nhận thấy vấn đề cần lập kế hoạch sâu, mà không vô hiệu prefix đã cache.

### Tool Search: trì hoãn tải thay vì loại bỏ tool

Nguyên tắc tương tự áp dụng cho Tool Search. Claude Code có thể có hàng chục tool MCP, nhưng gửi toàn bộ schema mỗi yêu cầu rất tốn. Loại tool giữa hội thoại vẫn phá cache.

Giải pháp là `defer_loading`. Claude Code gửi stub tool nhẹ, ổn định với `defer_loading: true`. Khi cần, mô hình dùng `ToolSearch` tải schema đầy đủ. Các stub giữ nguyên thứ tự nên prefix được bảo toàn.

API cung cấp `ToolSearch` để ứng dụng dùng cùng mẫu.

## Compaction và caching

![Sơ đồ compaction và caching](https://pbs.twimg.com/media/HBitEdRbUAMVSnM?format=jpg&name=large)

Compaction xảy ra khi hội thoại gần giới hạn cửa sổ context. Hệ thống tạo bản tóm tắt rồi tiếp tục với biểu diễn nhỏ hơn.

Điều này tạo một số trường hợp biên cho Prompt Caching.

### Vấn đề

Để tạo tóm tắt, mô hình cần lịch sử hội thoại. Cách triển khai ngây thơ tạo yêu cầu riêng với system prompt khác và không có tool. Yêu cầu đó không còn khớp prefix chính, nên mọi input token phải được xử lý với giá đầy đủ.

### Giải pháp: fork an toàn cho cache

Claude Code xem compaction như một fork an toàn cho cache. Yêu cầu compaction dùng cùng system prompt, context người dùng và hệ thống, định nghĩa tool và lịch sử như yêu cầu cha. Nó nối hướng dẫn compaction thành tin nhắn người dùng mới ở cuối.

Từ góc nhìn tính prefix đầu vào, yêu cầu chia sẻ prefix, tool và lịch sử với cha. Cache có thể tái sử dụng, vì vậy chủ yếu chỉ token của hướng dẫn mới cần xử lý fresh. Mô hình vẫn phải tạo tóm tắt nên tính toán đó và output token vẫn được tính phí.

Điều này cũng cần một buffer compaction: cửa sổ context phải còn đủ chỗ cho hướng dẫn thêm vào và bản tóm tắt được tạo.

## Năm bài học

Compaction tinh tế, nhưng bài học rộng hơn áp dụng cho mọi agent xây trên Prompt Caching.

<div class="info-box">

**1. Prompt Caching là khớp prefix**

Mọi thay đổi trong prefix vô hiệu mọi phần sau nó. Hãy thiết kế yêu cầu với thứ tự ổn định ngay từ đầu.

</div>

<div class="tip-box">

**2. Gửi cập nhật dưới dạng tin nhắn**

Với ngày, trạng thái runtime hoặc mode thay đổi, hãy nối thêm tin nhắn thay vì viết lại system prompt trước đó.

</div>

<div class="warning-box">

**3. Không đổi mô hình hoặc tool giữa hội thoại**

Dùng handoff cho đổi mô hình, tool cho chuyển trạng thái và deferred loading cho danh mục tool lớn.

</div>

<div class="info-box">

**4. Giám sát cache hit như uptime**

Vài điểm phần trăm có thể ảnh hưởng đáng kể đến chi phí và độ trễ, vì vậy regression cache cần cảnh báo vận hành.

</div>

<div class="tip-box">

**5. Công việc fork nên giữ prefix cha**

Compaction, tóm tắt và tính toán phụ nên tái sử dụng hình dạng yêu cầu an toàn cho cache của cha khi có thể.

</div>

## Kết luận

Claude Code được xây quanh Prompt Caching ngay từ đầu. Bài học thực tế không phải mọi agent phải sao chép một bố cục chính xác, mà sự ổn định của cache cần được coi là ràng buộc kiến trúc hạng nhất.

---

> Bản chuyển thể có cấu trúc từ một X Article của Thariq Shihipar, dựa trên thực hành production của nhóm Claude Code.

</div>
