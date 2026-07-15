---
translationKey: "pi-minimal-agent"
locale: "vi"
title: "Pi: Agent tối giản bên trong OpenClaw"
description: "Bản chuyển thể có cấu trúc từ bài giới thiệu Pi của Armin Ronacher, tập trung vào lõi nhỏ, phiên làm việc có thể mở rộng và triết lý phần mềm xây dựng phần mềm."
publishedAt: "2026-01-31"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://lucumr.pocoo.org/2026/1/31/pi/"
sourceAuthor: "Armin Ronacher"
contentType: "adaptation"
translationStatus: "reviewed"
---

<div class="blog-article-body">

*Viết ngày 31 tháng 1 năm 2026*

OpenClaw từng lan truyền mạnh dưới nhiều tên gọi, trong đó có ClawdBot và MoltBot. Về bản chất, đây là một agent được kết nối với một kênh giao tiếp và có khả năng chạy mã.

Bên dưới OpenClaw là một coding agent nhỏ có tên **Pi**. Armin Ronacher mô tả Pi là coding agent mà hiện nay ông gần như sử dụng độc quyền, đồng thời giải thích vì sao thiết kế nhỏ gọn có chủ đích của nó lại hấp dẫn đến vậy.

Pi được **Mario Zechner** tạo ra. Cách tiếp cận thực tế của Mario khác với phong cách “khoa học viễn tưởng pha chút điên rồ” của Peter, nhưng Pi và OpenClaw cùng dựa trên một tiền đề: LLM rất giỏi viết và chạy mã, vì vậy hệ thống nên tận dụng trực tiếp năng lực đó.

## Pi là gì?

Pi là một trong nhiều coding agent, nhưng nổi bật nhờ hai đặc điểm. Armin cũng nhắc đến **AMP** như một sản phẩm khác được định hình bởi những người đã thực sự thử nghiệm lập trình với agent, thay vì chỉ bọc nó trong một giao diện bóng bẩy.

Pi đáng chú ý vì hai lý do chính:

- **Lõi rất nhỏ.** System prompt ngắn bất thường và lõi chỉ cung cấp bốn công cụ: Read, Write, Edit và Bash.
- **Hệ thống mở rộng mạnh.** Extension có thể bổ sung hành vi và lưu trạng thái riêng vào phiên làm việc.

Pi còn có một lợi ích thực tế: nó được thiết kế cẩn thận và mang lại cảm giác của một phần mềm được hoàn thiện tốt. Hệ thống ổn định, dùng ít bộ nhớ và không làm người dùng phân tâm bởi hiện tượng nhấp nháy hay lỗi ngẫu nhiên.

Pi đồng thời là một tập hợp các thành phần nhỏ để xây dựng agent khác. OpenClaw được xây trên những thành phần này; Armin dùng chúng cho một bot Telegram, còn Mario dùng chúng cho `mom`. Nếu cho Pi đọc chính mã nguồn của nó và một ví dụ như `mom`, nó có thể hỗ trợ lắp ghép một agent khác quanh tích hợp mong muốn.

## Những gì Pi cố ý không tích hợp

Hiểu Pi cũng có nghĩa là hiểu những phần được chủ động loại bỏ. Lõi **không hỗ trợ MCP sẵn**. Điều đó không có nghĩa MCP là bất khả thi: một extension có thể bổ sung nó, hoặc agent có thể dùng **mcporter**, công cụ cung cấp lời gọi MCP qua CLI hoặc binding TypeScript.

Sự thiếu vắng này phản ánh triết lý của Pi. Khi agent thiếu một năng lực, phản ứng mặc định không phải là tìm một extension có sẵn trên marketplace. Thay vào đó, người dùng yêu cầu agent tự mở rộng bằng cách viết và chạy mã.

Pi vẫn hỗ trợ tải extension. Khác biệt nằm ở văn hóa sử dụng: một extension hiện có có thể được xem như tài liệu tham khảo để agent phối lại cho nhu cầu cục bộ, thay vì một dependency bất biến.

## Agent dành cho agent đang xây dựng agent

Phần mềm được thiết kế để tự thay đổi cần một số năng lực nền tảng.

Thứ nhất, AI SDK của Pi cho phép một phiên chứa thông điệp từ nhiều nhà cung cấp mô hình. Nó thừa nhận rằng phiên làm việc không thể di chuyển hoàn hảo, nhưng tránh phụ thuộc không cần thiết vào tính năng riêng của từng nhà cung cấp.

Thứ hai, tệp phiên có thể chứa thông điệp tùy chỉnh bên cạnh thông điệp của mô hình. Extension dùng chúng để lưu trạng thái, còn hệ thống có thể quyết định một phần thông tin sẽ không bao giờ được gửi tới mô hình hoặc chỉ được đưa vào một phần.

Thứ ba, trạng thái extension có thể được lưu xuống đĩa và extension hỗ trợ hot reload. Agent có thể viết extension, tải lại, kiểm thử rồi tiếp tục lặp. Thứ tư, Pi đi kèm tài liệu và ví dụ để agent đọc trong lúc tự mở rộng. Thứ năm, phiên làm việc có cấu trúc cây: người dùng có thể rẽ sang một nhiệm vụ phụ, sửa một công cụ hỏng mà không tiêu tốn context của nhánh chính, rồi quay lại trong khi Pi tóm tắt những gì đã xảy ra ở nhánh kia.

Những lựa chọn này đặc biệt quan trọng với công cụ. Trên nhiều nhà cung cấp mô hình, công cụ MCP và các LLM tool khác được nạp vào system context hoặc phần khai báo công cụ ngay khi phiên bắt đầu. Việc thay toàn bộ định nghĩa về sau có thể phá cache hoặc khiến mô hình giữ những ký ức mâu thuẫn về cách các lời gọi trước đó hoạt động.

## Công cụ nằm ngoài context của mô hình

Một extension của Pi có thể đăng ký LLM tool có thể gọi trực tiếp, và đôi khi Armin sử dụng lựa chọn này. Issue tracker cục bộ của ông là một ví dụ: vì agent cần tự quản lý việc cần làm, ông cung cấp thêm một công cụ thay vì CLI. Hiện đây là công cụ bổ sung duy nhất được nạp vào context của mô hình.

Phần lớn năng lực bổ sung không cần chiếm context dưới dạng schema công cụ. Chúng là skill hoặc extension TUI giúp cải thiện quy trình của con người. Extension của Pi có thể hiển thị spinner, thanh tiến độ, bộ chọn tệp, bảng và khung xem trước ngay trong terminal. Mario thậm chí từng trình diễn Doom chạy trong TUI; không thực tế, nhưng là một minh chứng hữu ích cho độ linh hoạt của giao diện.

Các extension dưới đây chỉ là ví dụ, không phải một gói cố định. Quy trình được khuyến khích là đưa một extension cho agent xem và yêu cầu nó phối lại hành vi cho nhu cầu riêng.

### `/answer`

Armin không dùng Plan Mode. Ông thích trao đổi qua lại bằng văn phong tự nhiên của agent, xen kẽ giải thích và sơ đồ, hơn là một hộp thoại hỏi đáp có cấu trúc cứng nhắc.

Câu hỏi đặt trực tiếp trong phần trả lời đôi khi khó phản hồi gọn gàng, vì vậy `/answer` đọc phản hồi cuối của agent, trích xuất các câu hỏi và định dạng chúng thành một ô nhập tập trung.

![Extension /answer hiển thị hộp thoại câu hỏi](https://lucumr.pocoo.org/static/pi-answer.png)

### `/todos`

Dù Armin phê bình cách Beads được triển khai, ông vẫn thấy danh sách việc cần làm cho agent rất hữu ích. `/todos` mở các mục được lưu dưới `.pi/todos` dưới dạng tệp Markdown. Cả người dùng và agent đều có thể sửa chúng, và một phiên có thể nhận một nhiệm vụ để đánh dấu đang thực hiện.

### `/review`

Khi agent viết ngày càng nhiều mã, phần việc chưa hoàn chỉnh nên được một agent khác review trước khi chuyển cho con người. Vì phiên Pi là cấu trúc cây, Armin có thể rẽ sang một context review mới, thu thập phát hiện rồi đưa các bản sửa về phiên chính.

![Extension /review hiển thị các tùy chọn review](https://lucumr.pocoo.org/static/pi-review.png)

Giao diện được mô phỏng theo Codex và hỗ trợ các mục tiêu review như commit, diff, thay đổi chưa commit và pull request từ xa. Review prompt nhấn mạnh loại phản hồi Armin quan tâm, bao gồm yêu cầu nêu rõ dependency mới được thêm vào.

### `/control`

Đây là extension thử nghiệm chứ không phải một phần trong quy trình hằng ngày của Armin. Nó cho phép một agent Pi gửi prompt tới agent khác, tạo ra một hệ thống đa agent nhỏ mà không cần tầng điều phối phức tạp.

### `/files`

Extension này liệt kê các tệp đã được thay đổi hoặc nhắc đến trong phiên. Người dùng có thể hiện chúng trong Finder, so sánh diff bằng VS Code, mở bằng Quick Look hoặc tham chiếu trong prompt. `shift+ctrl+r` mở tệp được nhắc gần nhất bằng Quick Look, rất tiện khi agent tạo ra một tệp PDF.

Các nhà phát triển khác cũng đã xây extension, trong đó có extension subagent của Nico và `interactive-shell`, cho phép Pi tự chạy CLI tương tác bên trong một lớp phủ TUI có thể quan sát.

## Phần mềm xây dựng phần mềm

Điểm cốt lõi là Armin không tự tay viết những extension này. Ông mô tả điều mình muốn và Pi xây chúng. Lõi Pi không có MCP hay skill cộng đồng đi kèm, nhưng agent có thể tạo và duy trì năng lực được điều chỉnh cho chính chủ sở hữu. Một ví dụ là thay CLI tự động hóa trình duyệt hoặc tích hợp MCP bằng một skill giao tiếp trực tiếp với CDP.

Agent của ông có nhiều skill, nhưng chúng có thể bị thay thế. Một số đọc phiên Pi do các kỹ sư khác chia sẻ để review mã; số khác định hình commit message, hành vi commit hoặc cập nhật changelog. Ông cũng đang chuyển một số slash command trước đây thành skill, đồng thời kết hợp một skill khuyến khích dùng `uv` với extension chuyển hướng lời gọi `pip` và `python` sang `uv`.

Đó là sức hấp dẫn của một agent tối giản như Pi: phần mềm xây dựng phần mềm trở thành phương thức làm việc bình thường. OpenClaw đưa ý tưởng đi xa hơn bằng cách bỏ giao diện cục bộ và kết nối agent với chat. Kết luận của Armin không phải mọi chi tiết đã được giải quyết, mà là hướng đi này ngày càng giống một phần tương lai của phần mềm.

</div>
