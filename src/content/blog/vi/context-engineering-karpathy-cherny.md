---
translationKey: "context-engineering-karpathy-cherny"
locale: "vi"
title: "Context Engineering và Loop Engineering: biến Prompt thành một hệ thống vận hành"
description: "Từ cửa sổ ngữ cảnh của Karpathy đến vòng lặp của Boris Cherny: chất lượng Agent phụ thuộc vào điều nó thấy, cách nó kiểm chứng và lưu giữ kinh nghiệm."
publishedAt: "2026-07-08"
updatedAt: "2026-07-26"
category: "development"
sourceLocale: "en"
sourceUrl: "https://x.com/vartekxx/status/2074864291568664646"
sourceAuthor: "vartekx"
contentType: "adaptation"
translationStatus: "reviewed"
---

> Đây là bản chuyển thể có cấu trúc từ [bài viết của vartekx](https://x.com/vartekxx/status/2074864291568664646), không phải bản dịch từng câu. Hãy kiểm tra tại nguồn các nhận định về con người, sản phẩm và số liệu.

## Kết luận trước

Prompt chỉ là một phần nhỏ đầu vào của Agent. Kết quả ổn định phụ thuộc vào toàn bộ hệ thống ngữ cảnh: các dữ kiện được thấy ở bước hiện tại, cách chọn và nén lịch sử, cách cô lập tác vụ con, và một cổng kiểm chứng độc lập.

Karpathy xem cửa sổ ngữ cảnh là một giao diện lập trình mới. Boris Cherny mở rộng nó thành vòng lặp kỹ thuật có thể chạy lặp lại, kiểm chứng và tích lũy kinh nghiệm. Mục tiêu không phải Prompt dài hơn mà là hệ thống có thể làm đúng việc nhiều lần.

- **Context engineering** xác định điều mô hình cần biết lúc này.
- **Loop engineering** xác định cách ngữ cảnh được chạy, kiểm tra và cải thiện.
- **Verifier** phân biệt tiến bộ thật với việc chỉ sinh thêm đầu ra.
- **Trạng thái bền vững** truyền kinh nghiệm đã kiểm chứng sang lần chạy sau.

![Quy tắc dự án, bộ nhớ, Skills, Hooks và ghi chép học tập tạo thành cửa sổ ngữ cảnh](/assets/blog/context-engineering-karpathy-cherny/cover.jpg)

*Hình: kiến trúc context engineering (vartekx, ảnh tiếng Anh).*

## Ngữ cảnh là môi trường làm việc

Cùng một mô hình có thể cho kết quả khác khi ngữ cảnh khác. Nó không chỉ thực thi một câu lệnh; trong bộ nhớ làm việc hữu hạn, nó hiểu nhiệm vụ, đọc tệp, gọi công cụ, xử lý lịch sử và chọn hành động tiếp theo.

Vì vậy cần hỏi: bước này thật sự cần dữ kiện, tệp và ràng buộc nào? Điều gì đã cũ, trùng lặp hoặc gây nhiễu? Khám phá nào phải tách khỏi việc chính? Ai kiểm tra đầu ra một cách độc lập?

Bài viết nêu ba lớp: **prompt engineering** viết chỉ dẫn một lần; **context engineering** thiết kế môi trường mô hình nhìn thấy; **loop engineering** đặt thiết kế đó vào chu trình tự động, lặp lại được.

![Tiến trình từ prompt engineering đến context engineering và loop engineering](/assets/blog/context-engineering-karpathy-cherny/three-layers.png)

*Hình: ba lớp bổ sung cho nhau (vartekx, ảnh tiếng Anh).*

## Cửa sổ ngữ cảnh là bộ nhớ làm việc cần điều phối

Phép so sánh của Karpathy rất thực dụng: mô hình là bộ xử lý, cửa sổ ngữ cảnh là bộ nhớ làm việc. Không nên nhồi mọi tài liệu vào đó mà phải đặt đúng thông tin vào đúng thời điểm.

![Nhiều lượt tương tác tiêu thụ một cửa sổ ngữ cảnh hữu hạn](/assets/blog/context-engineering-karpathy-cherny/context-window-program.jpg)

*Hình: đầu vào và đầu ra nhiều lượt dùng chung một cửa sổ hữu hạn (vartekx, ảnh tiếng Anh).*

![Chỉ dẫn hệ thống, quy tắc, bộ nhớ, công cụ, lịch sử và ví dụ tạo nên ngữ cảnh](/assets/blog/context-engineering-karpathy-cherny/context-operations.png)

*Hình: Prompt người dùng viết thường chỉ là phần nhỏ của toàn bộ ngữ cảnh (vartekx, ảnh tiếng Anh).*

**Ghi, chọn, nén và cô lập.**

Quy ước, lệnh, quyết định kiến trúc, nguyên nhân lỗi và script tái dùng nên ở trong các tệp ngắn, có thể tìm kiếm, thay vì chỉ tồn tại trong một cuộc trò chuyện. Giá trị nằm ở tính thực thi: lệnh đã thử, đường dẫn không được sửa, bất biến giao diện và nguyên nhân lỗi đã xác nhận.

Nhiều ngữ cảnh không đồng nghĩa ngữ cảnh tốt hơn. Khi sửa một giao diện, hãy ưu tiên điểm vào, nơi gọi, test, hợp đồng và lỗi gần nhất; để lại ngoài cửa sổ các thư mục không liên quan và log cũ. Nén kết luận, ràng buộc và trạng thái tiếp theo, đồng thời ưu tiên mã nguồn và kết quả kiểm tra mới. Tác vụ song song chỉ nên trả về kết quả có cấu trúc và có thể xem xét.

## Loop engineering biến các thao tác thành cơ chế

Theo góc nhìn được gán cho Boris Cherny, công việc của con người chuyển từ nhắc Agent liên tục sang thiết kế vòng lặp: mỗi lần chạy đọc trạng thái, thực thi, kiểm tra, ghi kết quả và bắt đầu lần sau với thông tin tốt hơn.

![So sánh Prompt thủ công với hệ thống tự động thực hiện ngữ cảnh và kiểm chứng](/assets/blog/context-engineering-karpathy-cherny/loop-context.png)

*Hình: “bạn là động cơ” so với “hệ thống là động cơ” (vartekx, ảnh tiếng Anh).*

Một vòng lặp lành mạnh ghi trạng thái quan trọng, chỉ chọn trạng thái liên quan, tóm tắt lịch sử cũ và cô lập công việc độc lập. Context engineering là công thức; loop engineering là nhà bếp. Tự động hóa khuếch đại cả kỷ luật lẫn sai lầm.

## Vòng lặp tối thiểu có thể áp dụng

Cần có nhịp chạy và điều kiện dừng, tri thức dự án ngắn đã được kiểm chứng, sự tách biệt giữa triển khai và rà soát, connector thật với quyền phù hợp, cùng verifier độc lập như test, kiểm tra kiểu, build, kiểm tra hợp đồng hoặc phê duyệt của con người.

![Vòng lặp tự động hóa ghi, chọn, nén, cô lập và kiểm chứng ngữ cảnh](/assets/blog/context-engineering-karpathy-cherny/loop-building-blocks.png)

*Hình: loop engineering tự động hóa context engineering (vartekx, ảnh tiếng Anh).*

## Nâng Prompt thành specification

“Refactor hệ thống xác thực” là một mong muốn. Specification có thể thực thi phải nêu mục tiêu, phạm vi, đầu ra, cách xử lý xung đột và điều kiện dừng: thư mục trong phạm vi, vùng phải giữ nguyên, test cần cập nhật, lúc cần báo cáo và các kiểm tra bắt buộc.

![Ngữ cảnh trước và sau khi biên tập để dành chỗ cho thông tin hữu ích](/assets/blog/context-engineering-karpathy-cherny/claude-code-context-workflow.jpg)

*Hình: chọn lọc và nén tạo chỗ cho ngữ cảnh hữu ích (vartekx, ảnh tiếng Anh).*

## Tích lũy kinh nghiệm, không phải bản ghi trò chuyện

Sau nhiệm vụ, chỉ lưu vài bài học có thể hành động: điều hiệu quả, điều thất bại và điều cần kiểm tra sớm hơn. Lỗi lặp lại có thể trở thành quy tắc dự án hoặc kiểm tra tự động. Thực thi tạo bằng chứng, bằng chứng thành trạng thái, lần chạy sau đọc có chọn lọc và verifier tiếp tục lọc lỗi.

![Các tuyên bố về thời gian và chất lượng của specification, ngữ cảnh tích lũy và kiểm chứng](/assets/blog/context-engineering-karpathy-cherny/self-improving-loop.png)

*Hình: các số liệu là tuyên bố của tác giả và chưa được kiểm chứng độc lập ở đây (vartekx, ảnh tiếng Anh).*

## Kết

Context engineering không xóa ảo giác hoặc thay thế phán đoán chuyên môn. Nhiều tài liệu hơn không tự thành tài liệu tốt hơn, và tự động hóa chưa kiểm chứng không đáng tin cậy. Hãy thiết kế ngữ cảnh trước, xây vòng lặp sau, rồi kiểm chứng bằng bằng chứng độc lập để sự lặp lại không khuếch đại lỗi.
