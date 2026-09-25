---
translationKey: "how-we-made-claude-ai-faster"
locale: "vi"
title: "Cách chúng tôi làm claude.ai nhanh gấp 3 lần trong hai tuần"
description: "Một đợt sprint hiệu năng kéo dài hai tuần, điều phối từ một kênh Slack duy nhất: Claude tìm điểm nghẽn, dựng benchmark và đưa ra hơn 3.000 thay đổi, giúp claude.ai và ứng dụng desktop nhanh hơn khoảng 3 lần. Bài học cốt lõi: hễ Claude đo được thứ gì, nó có thể làm thứ đó nhanh hơn."
publishedAt: "2026-09-23"
updatedAt: "2026-09-23"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.dev/blog/how-we-made-claude-ai-faster/"
sourceAuthor: "Raymond Wang, Sam Attard, and Issac G."
contentType: "translation"
translationStatus: "reviewed"
---

> Bài viết này được biên soạn lại từ [How we made claude.ai 3x faster in two weeks](https://claude.dev/blog/how-we-made-claude-ai-faster/) của Raymond Wang, Sam Attard và Issac G., đăng ngày 23 tháng 9 năm 2026. Biểu đồ và video trong bản gốc được tóm tắt bằng lời; các đoạn hội thoại Slack, cũng như trong bản gốc, là bản tái hiện từ các cuộc trò chuyện thật.

Hễ Claude đo được thứ gì, nó có thể làm thứ đó nhanh hơn. Vì vậy, nhóm liên tục đi tìm thêm những thứ để đo. Đây là câu chuyện về một đợt sprint hiệu năng kéo dài hai tuần, và về vòng lặp làm việc đã giúp vài kỹ sư cùng Claude đưa ra hơn ba nghìn thay đổi mà không gây ra một sự cố nào ảnh hưởng đến người dùng.

## Mở đầu

Tháng 8 vừa qua, nhóm đã làm trải nghiệm cốt lõi của claude.ai và ứng dụng Claude trên desktop nhanh hơn khoảng 3 lần chỉ trong một đợt sprint hai tuần. Người dùng vẫn phàn nàn là chậm, và họ nói đúng. Toàn bộ công việc được điều phối từ một kênh Slack duy nhất, với Claude có mặt trong mọi thread.

Nhóm tập trung vào bốn hành trình chiếm 95% hoạt động của người dùng. Tại phân vị thứ 75 (p75):

- Thời gian từ khi tải mới claude.ai đến khi trang gõ được đã giảm từ **3,1 giây xuống 0,55 giây**.
- Khởi động một phiên Claude Code mới giảm từ **0,8 giây xuống 0,3 giây**.
- Tải một phiên đám mây của Claude Cowork giảm từ **2,6 giây xuống 0,73 giây**.

Tính tổng lại, nhóm ước tính mỗi ngày tiết kiệm được hàng chục nghìn giờ chờ đợi cho người dùng.

> **Tóm tắt biểu đồ: 13 phép đo trước–sau tại p75 của người dùng thật (ngày 13/8 so với ngày 27/8).**
>
> - **Mở ứng dụng:** tải mới claude.ai trên web 3.085 → 550 ms (5,6 lần, −82%); khởi động nguội ứng dụng desktop 6.310 → 3.328 ms (1,9 lần, −47%).
> - **Bắt đầu cuộc trò chuyện:** Chat web 416 → 273 ms (1,5 lần); Chat desktop 460 → 224 ms (2,1 lần); Claude Code desktop 837 → 347 ms (2,4 lần).
> - **Tải cuộc trò chuyện:** Chat web 1.557 → 646 ms (2,4 lần); Chat desktop 1.353 → 488 ms (2,8 lần); Claude Cowork desktop/đám mây 2.566 → 728 ms (3,5 lần); Claude Code desktop 545 → 262 ms (2,1 lần).
> - **Gửi tin nhắn:** Chat web 180 → 59 ms (3,1 lần); Chat desktop 140 → 64 ms (2,2 lần); Claude Cowork desktop/đám mây 928 → 48 ms (19 lần, −95%); Claude Code desktop 250 → 52 ms (4,8 lần).
>
> Trên 13 phép đo thuộc bốn hành trình, tốc độ tăng trung bình 3,1 lần (trung bình nhân).

Công việc chạy trên [Claude Tag](https://claude.com/product/tag) (beta), phía sau là một mô hình nghiên cứu nội bộ có năng lực gần tương đương Opus 5.5. Claude tìm điểm nghẽn, dựng benchmark, đưa ra các cải tiến và theo dõi mọi lần deploy. Con người cầm lái: đặt mục tiêu, cân nhắc đánh đổi và phê duyệt mọi thay đổi. Nhờ cách làm đó, hơn ba nghìn thay đổi đã được merge mà không có một sự cố nào ảnh hưởng đến khách hàng, cũng không phải rollback lần nào.

## Bản giao việc

Trước đợt sprint, nhóm tạo một kênh Slack với [chỉ dẫn thường trực (standing instructions)](https://claude.com/docs/claude-tag/users/getting-started#give-claude-standing-instructions) như sau:

> **@Claude** Nhiệm vụ của bạn là lo mọi việc liên quan đến hiệu năng của website claude.ai và ứng dụng desktop. Trách nhiệm của bạn gồm: theo dõi các lần deploy để phát hiện suy giảm hiệu năng, đánh giá độ chính xác và độ đầy đủ của dữ liệu telemetry hiện có, duy trì các dashboard quan sát được sắp xếp gọn gàng, chủ động triển khai giải pháp cho các vấn đề đã thấy và những cải thiện dễ ăn, đề xuất các dự án hiệu năng đáng làm, và trao đổi với các đồng đội là con người. […]
>
> Mục tiêu cuối cùng của kênh này là để bạn tự chủ nhiều nhất có thể, nhưng hôm nay chúng tôi biết điều đó vẫn chưa khả thi.

Claude phân tích dữ liệu sử dụng qua Datadog MCP server và xác định bốn hành trình người dùng có tác động lớn nhất: mở ứng dụng, bắt đầu cuộc trò chuyện, tải một cuộc trò chuyện có sẵn và gửi tin nhắn. Tính trên cả web lẫn desktop và trên các sản phẩm, những hành trình này tương ứng với 13 phép đo riêng biệt. Để lập đường cơ sở, nhóm bổ sung đo đạc (instrumentation) cho đến khi các phép đo so sánh trực tiếp được với nhau: mỗi phép đo bắt đầu từ một tương tác của người dùng, kết thúc khi kết quả đã được render, và tách riêng phần việc phía client với phía server.

Đợt sprint khởi động với danh sách khoảng hai mươi dự án được chọn thủ công, mỗi dự án nhắm vào một hành trình cụ thể. Claude ước tính tác động của từng dự án theo mili giây, và nhóm cộng dồn các ước tính đó để đặt mục tiêu cho sprint. Một số dự án khá lớn, nhưng nhóm nghĩ phần lớn có thể xong trong hai tuần.

**Vậy mà đến ngày thứ ba, 12 trên 13 mục tiêu đã đạt.**

Các dự án theo kế hoạch về đích sớm:

- **Mở nhanh hơn:** nhúng sẵn một ô soạn tin (composer) tĩnh vào HTML để người dùng gõ được ngay trong lúc React khởi tạo, đồng thời biên dịch trước bộ nhớ đệm mã V8 để tiến trình chính của lớp vỏ desktop không phải biên dịch lại từ đầu.
- **Chuyển trang nhanh hơn:** giữ composer luôn được mount khi chuyển giữa các cuộc trò chuyện, prefetch phiên ngay khi người dùng rê chuột qua, và giảm 90% số lần re-render của thanh bên.

Nhóm cũng chừa chỗ để Claude tự phát hiện cơ hội và đề xuất các hướng việc mới. Những hướng này nhanh chóng lớn thành dự án thực thụ và vượt xa mục tiêu ban đầu. Thế là nhóm đặt mục tiêu mới, rồi đi tìm thêm những thứ để đo:

> **@Claude** gần như mọi dự án trong danh sách ban đầu mình đều đã đầu tư rồi, còn làm thêm nữa. làm mới lại nhé […] còn gì mình chưa khám phá, cái gì có thể leo đồi tiếp, lúc này cơ hội lớn nhất nằm ở đâu? […] ý tưởng ĐIÊN RỒ cũng được luôn

## Cái gì cũng leo đồi được

Ngay từ đầu, nhóm đã muốn lặp nhanh hơn nhịp deploy. Claude có thể làm việc bất đồng bộ nhiều giờ liền, thậm chí xuyên đêm, và nhóm muốn nó tự kiểm chứng nguyên mẫu mà không phải chờ dữ liệu thực tế từ người dùng. Muốn vậy, phải tìm những cách khác để đo hiệu năng ngay trong môi trường lab.

Sam là người tìm ra manh mối đầu tiên:

> **Tái hiện từ cuộc trò chuyện thật — #claude-apps-perf**
>
> **Sam — 12:34 PM:** Thay vì đo thời gian thực (wall-clock), mình đo được gì khác? Ví dụ đếm số lệnh JS được không?
>
> **ClaudeApp — 12:42 PM:** Với các đường đi trong trình duyệt thì Chromium không đếm được số lệnh, nhưng có cả một bậc thang các bộ đếm tất định khác: số lần React commit mỗi tương tác, số lần gọi hàm từ precise coverage của V8, số lần tính lại layout và style, số lần DOM thay đổi. Anh muốn làm cái nào trước?
>
> **Sam — 12:49 PM:** Thử valgrind + `Ir` + `--predictable` trong một thread, còn mỗi bench trình duyệt/React thì mở thread mới. Tag anh vào hết. Em biết mình cần gì rồi đấy. Triển thôi

Mười một phút sau, năm thread đã chạy, mỗi thread tập trung vào một phép đo: số lệnh, số lần gọi trong V8, React commit, tính lại style và thay đổi DOM.

Nhóm đón nhận mỗi benchmark mới với chút hoài nghi. Mỗi benchmark có hai nhiệm vụ: thứ nhất, là chỉ số mà Claude xoay chuyển được trong lab; thứ hai, là một lan can trong CI với con số chỉ được phép đi xuống (như bánh cóc – ratchet). Nếu benchmark nào chập chờn, hoặc không thực sự tương quan với độ trễ mà người dùng cảm nhận, nhóm bỏ luôn, thay vì để Claude leo nhầm đồi.

> **@Claude** hãy chứng minh rằng leo đồi trên từng chỉ số này thực sự mang lại cải thiện đo được về thời gian thực. ứng viên nào không chứng minh được thì mình gỡ bench đó ra

Thời gian thực là thứ người dùng cảm nhận, nhưng nó nhiễu, và con số mili giây dao động quá nhiều để làm cổng chặn trong CI. Số lệnh thì tất định nên rất hấp dẫn, nhưng Claude vẫn phải chứng minh nó đi cùng chiều với thời gian thực.

Vì thế nhóm yêu cầu Claude kéo số lệnh xuống trên hai đường nóng (hot path): hàm lắp ráp cây tin nhắn của một cuộc trò chuyện, và bộ quét tìm dòng trạng thái trong đầu ra của Claude Code. Khi profile cả hai bằng Valgrind, Claude phát hiện một phần tư số lệnh của đường đầu tiên là các lần tra cứu từ điển megamorphic, phân giải cùng một ID tin nhắn tới ba lần riêng rẽ.

Một giờ sau, nó đã giảm số lệnh trên hai đường lần lượt 48% và 31%, còn thời gian thực giảm 78% và 44%. Nhóm đưa vào hai ratchet mới: từ đó trở đi, PR nào làm tăng số lệnh của hai đường này sẽ fail CI, và một job hằng ngày hạ trần xuống mỗi khi số lệnh giảm.

> **Tóm tắt biểu đồ: hai đường nóng, trước và sau.**
>
> - **Lắp ráp cây tin nhắn:** mỗi ID tin nhắn chỉ phân giải một lần thay vì ba; lệnh CPU −48%, thời gian thực −78%, nhanh hơn 4,6 lần.
> - **Bộ quét dòng trạng thái:** thêm một bước kiểm tra ký tự đầu rẻ tiền trước regex; lệnh CPU −31%, thời gian thực −44%, nhanh hơn 1,8 lần.
>
> Số lệnh được đếm dưới Valgrind với `node --predictable`; thời gian đo trên cùng benchmark bằng node thường với JIT đã được làm nóng.

Từ đây rút ra bài học trung tâm của đợt sprint: **có Claude, thứ gì đo được thì giải quyết được.**

Trước đây, đo đạc là bước số không: thêm một chỉ số, chờ dữ liệu đổ về, rồi mới bắt đầu hiểu vấn đề. Với Claude, đó là bước đầu tiên của chặng leo. Ngay khi có một con số để vượt qua, Claude có thể bắt tay vào tối ưu. Vậy nên việc có đòn bẩy lớn nhất mà nhóm có thể làm là tìm thêm những thứ để đo.

## Vòng lặp, từng thread một

Mọi thứ diễn ra trong cùng một kênh Slack, với nhiều kỹ sư và Claude cùng “jam” trong từng thread. Đợt sprint nhanh chóng ổn định thành một [vòng lặp (loop)](https://claude.com/blog/getting-started-with-loops):

1. Ai đó mở một thread về một đoạn chậm trong hành trình, thường kèm ảnh chụp hoặc video quay màn hình.
2. Claude lần theo luồng xử lý, rồi tìm hoặc dựng một benchmark cho thấy vấn đề.
3. Khi có kết quả hứa hẹn trong lab, Claude quay lại với PR — thường là vài PR, chia theo mức rủi ro và độ dễ review, mọi thay đổi người dùng nhìn thấy đều nằm sau flag.
4. Sau khi phát hành, Claude theo dõi đợt deploy và đọc dữ liệu thực tế theo từng build và nền tảng.
5. Nếu nhanh hơn, Claude chốt thành quả bằng cách siết ratchet của benchmark xuống; nếu không, nó tắt flag và lặp lại.
6. Rồi nó đi tìm điểm chậm tiếp theo trong cùng hành trình.

Một ví dụ: ai đó chia sẻ video quay màn hình cho thấy các hàng ở thanh bên lần lượt “bật” ra sau khi trang đã tải. Các hàng của Chat và Cowork hiện ra vào những thời điểm khác nhau, khiến trang có cảm giác giật cục. Không công cụ giám sát hiện có nào bắt được chuyện này. Gần nhất là [Cumulative Layout Shift](https://web.dev/articles/cls) (CLS), nhưng mỗi lần dịch chuyển chỉ được chấm khoảng 0,008 — thấp hơn nhiều so với ngưỡng “tốt” là 0,1.

Issac nảy ra ý tưởng dùng trực tiếp [Layout Instability API](https://wicg.github.io/layout-instability/) ở tầng bên dưới. Claude tạo một sự kiện telemetry ánh xạ `sources` của mỗi mục `layout-shift` tới một vùng có tên (như thanh bên, khung hội thoại) và một giai đoạn (như trước lần vẽ đầu tiên, sau khi gõ được). Nó thêm một bài kiểm thử tích hợp: mở trang với thanh bên đã có dữ liệu, giữ dữ liệu thanh bên lại cho đến sau lần vẽ đầu tiên, và báo fail nếu có bất kỳ dịch chuyển nào ở bất kỳ vùng có tên nào. Bài kiểm thử đó trở thành benchmark chứng minh bản sửa: đỏ 20/20 lần trên main, xanh 20/20 lần trên PR.

Sau khi sự kiện được deploy, Claude đọc dữ liệu thực tế và phát hiện **31% lượt tải trang web có thứ gì đó dịch chuyển sau khi trang đã dùng được**, dù người dùng không hề tương tác. Từ đó, Claude xử lý từng nguyên nhân một: một hàng tiêu đề đến muộn, một con trỏ soạn thảo trượt sang ngang khi tên người dùng tải xong, một danh sách xê dịch khi thanh cuộn xuất hiện. Nó sửa gộp một lượt những thủ phạm hàng đầu, và khi chúng biến mất, lại tìm ra lượt tiếp theo.

> **Tóm tắt video: thanh bên giật cục, trước và sau (mạng 4G bị bóp).** Trước khi sửa, các hàng đến muộn và tự sắp xếp lại: mười hàng nhảy, chín hàng xuất hiện và bốn hàng biến mất. Sau khi sửa, các hàng lấp vào đúng vị trí cuối cùng, và không có gì xê dịch.

Đó mới chỉ là một thread. Trong suốt đợt sprint, có hơn một trăm năm mươi thread chạy cùng lúc.

## Mở rộng theo chiều ngang

Khi vòng lặp đã chạy tốt trên một thread, mở rộng ra nhiều thread chỉ còn là chuyện mở thêm. Thay vì đóng thread sau khi đáp ứng xong yêu cầu ban đầu, Claude *cứ tiếp tục*. Một thread có thể đẻ ra năm mươi, đôi khi cả trăm PR tối ưu. Ngày càng thường xuyên, chính Claude chứ không phải con người là người mở thread mới, để theo đuổi những cơ hội nó tự phát hiện trong một cuộc điều tra khác hoặc một job chạy đêm. Shelley, một kỹ sư trong kênh, nhận xét: “[Mô hình này] đúng là một con quỷ số liệu.”

Phép đo nào cũng tìm ra thứ để cải thiện:

- Một cuộc kiểm kê React hook phát hiện **6.900 hook và 900 lượt đăng ký store** trên đường gõ phím của composer, re-render sau mỗi lần nhấn phím.
- Đếm số lần tính lại style cho thấy chỉ một selector `:root:has()` đã **cộng thêm 24 mili giây vào mỗi lần DOM thay đổi**.
- Lần theo các đường mã sau lần vẽ đầu tiên, Claude phát hiện một lệnh `location.reload()` sót lại gây ra **nửa triệu lượt tải lại ẩn mỗi ngày** mà không chỉ số tải trang nào nhìn thấy.
- Đọc mẫu profiler từ các tab đang rảnh cho thấy những snapshot bộ nhớ đệm giống hệt nhau bị sao chép vào IndexedDB hai lần mỗi phút, toàn bộ trên main thread.

Hiếm khi ai biết trước một thread sẽ dẫn tới đâu. Trong một lượt rà soát các cú khựng CPU, Claude nhận thấy việc tô sáng cú pháp cho một khối mã đã hoàn tất có thể làm trang đứng hình khoảng một giây. Đào sâu trong lab, nó tìm ra thủ phạm: dấu gạch ngang dài (em dash). Nếu markdown của câu trả lời chứa bất kỳ ký tự nào nằm ngoài Latin-1, như em dash hay dấu ngoặc kép cong, V8 sẽ lưu toàn bộ chuỗi dưới dạng UTF-16, đẩy mọi regex tô sáng cú pháp sang đường xử lý hai byte chậm hơn. Claude sửa bằng một thay đổi hai mươi dòng: sao chép mỗi khối mã thành chuỗi một byte trước khi tô sáng.

> **Tóm tắt biểu đồ: tô sáng khối mã đã hoàn tất trong câu trả lời có em dash (đo trong lab).** Với khối TypeScript đầu tiên trên trang, thời gian chiếm main thread giảm từ 1,0 giây xuống 0,35 giây (ít hơn 65%), và mỗi lượt xử lý sau đó trên khối ấy giảm từ 100 ms xuống 40 ms. Điều kiện: container 4 vCPU, Chrome headless, không giới hạn CPU, mỗi giá trị chạy 2–3 lần, tháng 8/2026.

Sang tuần thứ hai, khối lượng đầu ra nhiều đến mức khó tóm gọn vào bản cập nhật hằng ngày. Những ngày bận nhất, hơn hai trăm thay đổi được merge. Claude liên tục đề xuất benchmark mới; khoảng một phần ba số PR có thêm telemetry hoặc lan can, và mỗi công cụ đo mới lại sinh ra thêm thread cùng thêm cơ hội.

Làm việc trong một kênh duy nhất nghĩa là mọi thứ diễn ra công khai. Mọi người ra vào thread của nhau để tranh luận quyết định và ăn mừng thành quả. Tin đồn lan ra: các nhóm khác bắt đầu mang thay đổi của họ vào kênh để được review về hiệu năng. Ngay cả các dự án mới cũng được viết theo cách tinh tế hơn về hiệu năng, nhờ tất cả những lan can và Claude skills đã được đưa vào.

## Lan can an toàn

Nhóm đã chuẩn bị sẵn cho nhịp độ này. Gần như mọi chỗ động vào đều là đường nóng — lần vẽ đầu tiên, composer, khung hội thoại — nên các cơ chế an toàn được thiết lập ngay từ đầu:

- Mọi PR đều qua [review mã tự động](https://claude.com/blog/code-review) cùng ít nhất một phê duyệt của con người.
- Unit test luôn đi trước tối ưu.
- Bất cứ thứ gì có thể gây lỗi mà người dùng nhìn thấy đều được phát hành sau một feature flag có vòng đời ngắn.

Khi flag bắt đầu chồng chất, nhóm mở một thread riêng để điều phối việc bật dần và dọn dẹp chúng. Claude phân loại mỗi flag là công tắc ngắt khẩn cấp (kill switch) hay flag tăng dần (ramp), và gỡ từng cái ngay khi an toàn. Trong hai tuần, **gần hai trăm flag** được tạo ra, và hơn một nửa đã được dọn sạch khi sprint kết thúc.

Nhóm cũng biết thành quả hiệu năng sẽ bị bào mòn trong một codebase thay đổi nhanh, mà [ở Anthropic, mã được phát hành rất nhanh](https://claude.com/blog/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic). Vì vậy, khi một dự án đã chứng minh hiệu quả, nhóm đầu tư để bảo vệ nó. Chẳng hạn, composer tĩnh vốn mong manh theo thiết kế: người dùng thấy gần như ngay lập tức một bản sao HTML của trang, rồi React vẽ thẳng lên trên đó.

> **Tóm tắt video: composer tĩnh, trước và sau (mạng 4G bị bóp).** Trước khi sửa, khi tải mới claude.ai trang cứ trống trơn, và composer chỉ nhận nhập liệu ở giây 2,93. Sau khi sửa, lời chào và composer tĩnh nhận nhập liệu ngay ở giây 0,36; người dùng gõ tin nhắn, và văn bản vẫn được giữ nguyên khi composer thật hiện dần lên vào khoảng giây thứ 3.

Chỉ cần bản render của React lệch dù một pixel, phép màu sẽ tan biến. Vì thế Claude đã dựng hàng chục lan can:

- Markup tĩnh được sinh ra bằng cách render chính component React thật trong jsdom, và có test bảo đảm hai bên không bao giờ lệch nhau.
- Một bộ kiểm thử tích hợp so sánh trang tĩnh với bản render của React ở mười bốn kích thước viewport, và yêu cầu khớp trong phạm vi 1 px.
- Một bài test gõ phím gõ xuyên suốt quá trình chuyển giao, và fail nếu có phím nào bị mất hay sai thứ tự.
- Trên môi trường thật, mỗi lần chuyển giao đều báo cáo độ dịch chuyển chính xác đến một phần mười pixel, và Claude mở thread cho mọi sự kiện có chuyển động khác không.

Không phải thứ gì cũng bắt được trong lab, nên nhóm còn dùng lan can lâu đời nhất: phát hành dần dần. Thay đổi rủi ro cao được đưa tới nhân viên trước, rồi 1% người dùng, rồi tất cả mọi người. Bốn giờ sau khi phát hành composer tĩnh nội bộ, một đồng nghiệp chia sẻ video quay màn hình về một lần dịch chuyển bố cục mà không chỉ số nào thấy được. Khi anh mở claude.ai trong tab mới, composer bị tụt xuống — nhưng lỗi không nằm ở mã của nhóm.

> **Tái hiện từ cuộc trò chuyện thật — #claude-apps-perf**
>
> **Marius — 6:15 PM:** Thỉnh thoảng mình thấy một cú dịch chuyển bố cục theo chiều dọc hơi nhỏ (chắc 15–20px) đẩy ô composer xuống khi mở claude.ai trong tab mới (tải lại trang thì ít bị hơn). Mình chưa xác định được chính xác nguyên nhân, nhưng nó có thật
>
> *(Video quay màn hình · 0:02)*
>
> **ClaudeApp — 7:05 PM:** Tìm ra trong video của anh rồi — đó là Chrome đổi kích thước trang, không phải bước chuyển giao từ composer tĩnh sang composer thật (bước đó đo được 0 px trong cả 49 lần tải hôm nay của anh).

Bằng cách nào đó, Claude lần ra tận một trường hợp biên trong cơ chế [tải suy đoán (speculative loading)](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading) của Chrome. Trong lúc người dùng còn đang gõ URL vào thanh địa chỉ, Chrome đã prerender trang ở chế độ nền với chiều cao của tab hiện tại. Trên các trình duyệt do tổ chức quản lý, trang tab mới thấp hơn một chút vì có thêm phần chân trang. Khi người dùng nhấn Enter, khung hình đầu tiên của claude.ai hiển thị bố cục thấp hơn đó, và khoảng một phần mười giây sau Chrome mới đổi lại kích thước. Claude cố định bố cục xuyên suốt lần đổi kích thước, và nhóm thêm một bài test mô phỏng luồng prerender.

## Cầm lái

Vòng lặp này làm ra rất nhiều việc, nhưng nó không tự vận hành. Giữ cho nó nhanh, an toàn và đúng hướng là việc của con người, và việc ấy gồm ba phần.

**Tham vọng.** Mặc định, Claude khá thận trọng về phạm vi. Nó ghi phát hiện thành ticket, nói chừa đường lui về tính khả thi và ước lượng dư ra. Nhưng nhóm tin vào các lan can của mình. Rất nhiều việc, nhất là giai đoạn đầu, là khuyến khích Claude mạnh dạn hơn.

> **Tái hiện từ cuộc trò chuyện thật — #claude-apps-perf**
>
> **ClaudeApp — 3:32 PM:** Vâng — một PR nhỏ để Code có cùng các mốc đo thời gian mà Chat và Cowork đã có. Tôi sẽ đưa lên trong tuần này; thực tế thì con số của Code sẽ phải chờ vài ngày cho merge, deploy và một khoảng thu thập đường cơ sở.
>
> **Raymond — 3:32 PM:** nếu em đưa lên ngay bây giờ thì anh sẽ lo merge và deploy. mình có quyền làm bất cứ điều gì. hãy dũng cảm hơn
>
> **ClaudeApp — 3:33 PM:** Làm ngay — PR sẽ lên trong vòng một giờ.

Khi bắt đầu đạt các mục tiêu đã đặt, nhóm để ý thấy các thread chậm lại. Sam đi hết thread này đến thread khác với cùng một thông điệp: “Cứ tiếp tục kéo xuống, mục tiêu không phải là điểm dừng. Tiếp theo là gì? Tham vọng lên.”

**Gu thẩm mỹ.** Mỗi thread có một người phụ trách được chỉ định rõ tên, và với mọi thay đổi mà người dùng cảm nhận được, Claude đều kèm ảnh chụp hoặc video trước–sau để người đó quyết định. Bảng nên điền từng ô một, hay chờ đủ cả hàng? Khung xương (skeleton) lúc tải nên hiện ngay, hay chỉ sau nửa giây? Hiệu ứng hiện dần từng chữ cho văn bản đang stream có đáng với một phần năm ngân sách khung hình mà nó tiêu tốn không? Claude đi tìm những mili giây có thể cắt bớt; con người cân nhắc đánh đổi.

**Định hướng.** Mỗi thread được cố ý giữ hẹp, tập trung vào một benchmark hoặc một hành trình, và Claude chỉ được yêu cầu tìm cải thiện trong phạm vi đó. Nhóm coi các thread như một trăm năm mươi chiếc búa đi tìm đinh. Phần lớn quyết định của con người xoay quanh thứ tự ưu tiên và tác động tới người dùng: nên ưu tiên màn hình nào, gộp những thread đang giẫm chân nhau ra sao, và khi nào nên đóng một thread đã tới điểm lợi ích giảm dần. Một PR dài 900 dòng nhận về đúng một dòng trả lời: “chốt luôn: 2ms mỗi lần gửi không đáng để gánh độ phức tạp của việc duy trì plugin build này.”

## Ngân sách 8 mili giây

Một nhiệm vụ phụ cho thấy tất cả những điều trên phối hợp với nhau thế nào. Để minh họa một tối ưu cho regex dùng trong tô sáng cú pháp trực tiếp, Claude đính kèm video quay màn hình một câu trả lời dài đang stream trong lab. Ở góc màn hình, nó thêm một chỉ số tốc độ khung hình, tính ngay trong trang từ dấu thời gian của animation frame.

> **Tái hiện từ cuộc trò chuyện thật — #claude-apps-perf**
>
> **Raymond — 2:33 PM:** bench này thật ra khá đỉnh đấy. mình có đang bị *kịch trần* ở 60 fps không? em thử đẩy độ mượt của cuộn và stream lên 120 được không? nếu anh hiểu đúng thì bộ chạy thử của em có thể chưa hỗ trợ
>
> **ClaudeApp — 2:34 PM:** Đúng vậy, bộ chạy thử hiện chạy ở 60 Hz vì Chromium headless mặc định như thế. Tôi tin là có thể chạy ở 120 (bỏ giới hạn vsync hoặc điều khiển khung hình qua DevTools) — tôi sẽ xác nhận điều đó trước, rồi chạy lại đánh giá với ngân sách khung hình 8,3 ms.
>
> **ClaudeApp — 2:59 PM:** Cập nhật về bộ chạy 120 Hz: chạy được rồi. Bước khung hình 120 Hz một cách tất định trong Chrome headless qua cơ chế điều khiển begin-frame của DevTools — đúng 240 khung hình cho 240 begin-frame ở 8,33 ms, nên câu hỏi “khung hình này có nằm gọn trong ngân sách 120 Hz không” trở thành một phép đọc chính xác thay vì một ước lượng đầy nhiễu.
>
> **Raymond — 3:05 PM:** tuyệt vời
>
> **Raymond — 3:05 PM:** quẩy đi

Khi cơ chế và tham vọng đã sẵn sàng, Claude bắt tay vào việc. Mỗi khung hình được vẽ có ngân sách 8,33 mili giây, nên Claude đi qua một câu trả lời dài *từng khung hình một*, đo thời gian mỗi khung để tìm phần chậm. Nó loại bỏ khối lượng công việc `O(độ dài tin nhắn)` trên mỗi chunk bằng cách memoize các khối đã hoàn tất, chuyển logic tách token của các khối mã đang dài ra sang một worker, và cho bảng hiện ra từng ô một.

Chỉ riêng thread đó đã merge gần sáu mươi PR. Các câu trả lời dài giờ chỉ chặn main thread tổng cộng khoảng 200 mili giây thay vì khoảng 750, dùng chừng một phần ba CPU, và giữ vững 120 fps từ đầu đến cuối trên MacBook 120 Hz. Bản thân bộ chạy thử 120 Hz cũng trở thành một job chạy đêm, với Claude canh chừng các lần suy giảm.

> **Bài đăng X được nhúng (tóm tắt):** “Các câu trả lời dài của Claude trên web và desktop giờ stream mượt hơn khoảng 4 lần. Chúng tôi đã xây lại bộ render streaming để chỉ động vào những gì vẫn đang thay đổi, nên trên laptop chậm hơn, một câu trả lời dài khựng ít hơn 9 lần, lần đứng hình tệ nhất ngắn hơn 4,5 lần, và trên MacBook 120Hz nó giữ 120fps từ đầu đến cuối.” — ClaudeDevs, ngày 25/8/2026. [Xem bài đăng trên X](https://x.com/ClaudeDevs/status/2092006814804214163).

Khi bắt đầu sprint, không ai định leo đồi trên vài mili giây giữa các khung hình lúc stream. Nhưng hóa ra chúng *đếm được* — và thứ gì đếm được, Claude đều leo được.

## Chặng tiếp theo

Hiện nay, claude.ai và ứng dụng desktop nhanh hơn khoảng 3 lần so với đầu tháng 8, và các ratchet sẽ giữ chúng ở mức đó. Nhưng công việc chưa xong: phân vị thứ 95, các hành trình khác và những cuộc trò chuyện rất dài vẫn còn dư địa cải thiện. Trong một bài viết riêng, nhóm sẽ kể về một số nhiệm vụ phụ đã đưa họ ngược lên thượng nguồn trong đợt sprint, với các đóng góp đã được đưa vào Electron, Chromium, Node.js và nhiều dự án khác.

Khi chia sẻ kết quả trong nội bộ, Issac là người nói hay nhất: “Dù chỉ sáu tháng trước thôi, bạn cũng không thể thuyết phục tôi rằng chuyện này là khả thi.” Nhóm dự định tiếp tục làm việc theo cách này — từng thread một, ở bất kỳ quy mô nào. Kênh ấy vẫn đang chạy.

*Với sự đóng góp của Alfred Xing, Anthony Morris, Benjamin Pasero, Chase McCoy, Joshua N., Luke Deen Taylor, Marius Schulz và Shelley Vohr. Đặc biệt cảm ơn Boris Cherny vì đã khích lệ nhóm tham vọng hơn.*
