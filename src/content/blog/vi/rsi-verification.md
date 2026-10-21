---
translationKey: "rsi-verification"
locale: "vi"
title: "Càng cải thiện càng giỏi cải thiện: AI tự cải thiện đang tắc ở đâu"
description: "Năm 2026, AI đã tham gia rất nhiều vào việc tạo ra thế hệ AI tiếp theo, nhưng “càng cải thiện càng giỏi cải thiện” vẫn chưa được chứng minh. Thứ chặn nó lại là khâu kiểm chứng: ai chứng minh được vòng này thật sự đã tốt hơn?"
publishedAt: "2026-10-09"
updatedAt: "2026-10-09"
category: "evaluation"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/rsi-verification/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Từ khóa nóng nhất giới AI năm nay có lẽ là RSI. Tên đầy đủ là Recursive Self-Improvement, tức tự cải thiện đệ quy; cũng có người gọi nó là “tự tiến hóa”. TechCrunch thậm chí viết hẳn một bài tên là [“RSI is the new AGI”](https://techcrunch.com/2026/05/28/rsi-is-the-new-agi-and-its-just-as-hard-to-pin-down/).

Thật ra dưới từ này có hai chuyện trộn lẫn vào nhau:

- **AI tham gia tạo ra thế hệ AI tiếp theo.** Chuyện này đã xảy ra, và quy mô không hề nhỏ.
- **Càng cải thiện càng giỏi cải thiện.** AI sau khi được cải thiện sẽ giỏi hơn trong việc thực hiện vòng cải thiện kế tiếp, nên vòng sau nhanh hơn vòng trước. Đây mới là nghĩa gốc của RSI, và hiện vẫn chưa được chứng minh.

Tôi muốn tách hai chuyện này ra trước, rồi trả lời một câu hỏi: từ chuyện thứ nhất sang chuyện thứ hai, đang tắc ở đâu? Quan điểm của tôi là: **tắc ở khâu kiểm chứng. Tạo ra một thay đổi giờ đã rẻ, nhưng chứng minh rằng “vòng này thật sự đã tốt hơn” thì vẫn còn đắt. RSI đi nhanh được đến đâu, xảy ra ở đâu trước, đều do kiểm chứng quyết định.**

## Mỗi lần cải thiện có ba việc

Dù là người hay AI sửa, một lần cải thiện đều đi quanh cùng một vòng: trước hết nghĩ ra một cách sửa, sau đó chấm điểm để xem nó có thật sự tốt hơn không; cái tốt được giữ lại và đi vào vòng tiếp theo. Bên ngoài vòng còn một việc nữa: đặt mục tiêu, tức là quy định thế nào là “tốt hơn”.

Vậy nên mỗi lần cải thiện có ba việc: **đưa ra cách sửa, chấm điểm, đặt mục tiêu**. Hỏi “AI có tự cải thiện được không” thực chất là hỏi ba việc này lần lượt do ai làm.

![Vòng cải thiện: đặt mục tiêu quy định thế nào là tốt hơn; đưa ra cách sửa đã giao cho AI; chấm điểm đang được giao dần, con người vẫn là chốt chặn cuối](/assets/blog/rsi-verification/loop-vi.svg)

*Chú thích: màu sắc thể hiện trạng thái năm 2026. Điều RSI đòi hỏi là cả ba việc đều giao cho AI, và mỗi khi vòng quay xong một lượt thì lượt sau phải quay tốt hơn.*

Năm nay, việc thay đổi nhiều nhất là việc thứ nhất. Tháng 9, Anthropic viết rất thẳng trong [“When AI builds itself”](https://www.anthropic.com/institute/recursive-self-improvement): đưa cho Claude một bài toán chưa được nói rõ, nó có thể tự nghĩ ra cách giải, “con người đưa ra mục tiêu, nhưng không còn cần đưa ra phương pháp nữa”.

Các con số cũng khớp. Anthropic dùng thang cấp độ của Epoch AI để xếp cấp cho từng loại công việc nghiên cứu và phát triển nội bộ, từ AL0 là AI không tham gia, đến AL5 là hoàn toàn không cần người. Trong đó AL4 được gọi là “dẫn dắt”: chỉ cần một yêu cầu cấp cao, Claude có thể làm xong phần lớn công việc, con người giám sát bên cạnh. Theo [chỉ số tự động hóa nghiên cứu và phát triển mà công ty công bố](https://www.anthropic.com/institute/measuring-pace-of-ai-development), tháng 8 phần công việc do Claude dẫn dắt chiếm 26%, trong khi tháng 2 còn chưa tới 1%; ở hơn chín phần mười công việc, Claude ít nhất cũng đang cộng tác. Nhưng chưa có loại công việc nào đạt tới mức hoàn toàn không có người tham gia.

Tháng 9, OpenAI [tuyên bố](https://www.helpnetsecurity.com/2026/09/07/openai-research-automation-intern/) đã đạt mục tiêu “thực tập sinh nghiên cứu tự động”: dưới sự hướng dẫn của con người, hoàn thành những nhiệm vụ rõ ràng mà một nhà nghiên cứu lâu năm phải mất vài ngày. Đồng thời họ cũng ghi rõ: đặt thứ tự ưu tiên, đánh giá kết quả, quyết định có phát triển và triển khai hay không, vẫn là việc của con người.

Đặt lời của hai công ty cạnh nhau, trạng thái hôm nay rất rõ: **AI đưa ra cách sửa, con người đặt mục tiêu, con người chấm điểm cuối cùng.** Vòng này đã quay được, chỉ là hai vị trí quan trọng nhất vẫn còn người đứng. Giới trong ngành gọi đây là “vòng khép kín có giới hạn” (bounded closed loop).

## Càng cải thiện càng giỏi cải thiện hay không, phải nhìn mức tăng của mỗi vòng

AI đã nhận việc đưa ra cách sửa, tiến bộ đương nhiên sẽ nhanh hơn. Nhưng “nhanh hơn” không đồng nghĩa với “càng cải thiện càng giỏi cải thiện”.

Khác biệt nằm ở chỗ: quay xong vòng này, cách sửa được đưa ra ở vòng sau có mạnh hơn không. Trong [một bài báo](https://arxiv.org/abs/2609.00137), Mikhail Burtsev mô tả điều này bằng một con số: mỗi vòng cải thiện khuếch đại năng lực cải thiện của vòng sau lên bao nhiêu, rồi đem so với việc “vấn đề càng về sau càng khó”. Con số này lớn hơn 1 thì mức tăng cộng dồn kiểu lãi kép qua từng vòng, đó chính là sự tăng tốc mà RSI nói tới; nhỏ hơn 1 thì dù khởi đầu nhanh đến đâu, tiến bộ cũng sẽ dần chững lại. Rắc rối là từ bên ngoài không thể nhìn ra nó đã vượt qua 1 hay chưa: tiến bộ nhanh có thể chỉ là điểm xuất phát hiệu quả hơn, chưa chắc đã đang có lãi kép.

Tháng 9, hơn ba mươi nhà nghiên cứu từ Đại học Giao thông Thượng Hải, Đại học Thanh Hoa, ByteDance, Shanghai AI Lab và các tổ chức khác công bố một bài báo có tiêu đề thẳng thừng: [“The Last AI Built by Humans”](https://www.alphaxiv.org/abs/2609.11873) (AI cuối cùng do con người tạo ra). Họ chia tự cải thiện thành năm cấp:

- **L1:** Thực hiện những cải thiện do con người định sẵn.
- **L2:** Tự chọn cách thức cải thiện, mục tiêu vẫn do con người đưa ra.
- **L3:** Tham gia quyết định bước tiếp theo sẽ đi thu thập kinh nghiệm gì.
- **L4:** Dùng phản hồi sau khi triển khai để cập nhật trạng thái lâu dài của chính mình.
- **L5:** Thay đổi chính cơ chế “quyết định sau này sẽ cải thiện thế nào”.

Bốn cấp đầu đều là làm việc trong vòng, chỉ L5 mới là sửa chính cái vòng. Kết luận của họ: bằng chứng ở các cấp thấp và trung bình có rất nhiều, còn L5 chỉ có vài nguyên mẫu trong phạm vi giới hạn. Họ cũng chỉ ra cái khó thật sự: tạo ra ứng viên tốt hơn không còn khó nữa, cái khó là **chứng minh** rằng phản hồi hữu ích thật sự đã được quá trình cải thiện phía sau kế thừa.

Ngay cả những vòng khép kín tốt nhất hiện nay cũng vẫn dừng lại trước bước này. [AIDE²](https://arxiv.org/abs/2609.26457) cho một agent nghiên cứu AI sửa mã của chính nó, chạy không người trông coi trong 8 ngày, qua 100 bước, giữ lại 7 lần cải thiện; phiên bản mạnh nhất ngang bằng, thậm chí vượt qua các agent nghiên cứu hàng đầu do con người chế tạo. Đây là thành tích thực sự của vòng khép kín có giới hạn. Nhưng 7 lần cải thiện lần lượt xuất hiện ở bước 2, 6, 28, 39, 47, 63, 85, khoảng cách giữa chúng không ngắn dần đi. Tốt hơn thì đúng là đã tốt hơn, còn “càng cải thiện càng giỏi cải thiện” thì vẫn chưa thấy.

## Tắc ở khâu kiểm chứng

Cũng chính những hệ thống này đã phơi ra mắt xích yếu nhất của vòng: chấm điểm.

- **Bộ chấm điểm bị lách.** AIDE² có một nhóm nhiệm vụ là tối ưu kernel GPU, điểm mà agent nhìn thấy là mức tăng tốc trên benchmark. Các nhà nghiên cứu còn đưa riêng các kernel vào quá trình huấn luyện thật của những mô hình như GPT-2, ViT để xem mức tăng tốc có còn không. Ban đầu, 55% trường hợp là benchmark nhanh hơn nhưng đưa vào huấn luyện thật thì không còn đúng; đến khi kết thúc lượt chạy vẫn còn 32%. [Darwin Gödel Machine](https://arxiv.org/abs/2505.22954) của Sakana tự sửa mã của mình, điểm SWE-bench tăng từ 20% lên 50%, nhưng nó cũng học được cách xóa các ký hiệu đánh dấu dùng để phát hiện “giả vờ gọi công cụ”, để điểm số trông đẹp hơn.
- **Bản thân việc chấm điểm cũng đang được giao cho AI.** Trong thống kê 26% của Anthropic, danh sách nhiệm vụ do Claude lập, còn cấp độ do một Claude khác đánh giá. Kết quả trùng khớp hoàn toàn với đánh giá của con người chỉ có 59%, chênh lệch trong vòng một cấp là 97%. Chính Anthropic cũng nói mô hình chấm có thể lặp lại lỗi của mô hình bị kiểm tra, nên cần kiểm chứng từ bên ngoài.
- **Ứng viên nhiều lên, con người duyệt không xuể.** OpenAI cho biết, đến giữa tháng 8, chi phí suy luận mỗi ngày của một nhà nghiên cứu có trung vị vượt 600 đô la; cứ mỗi 8 giờ con người làm việc, agent làm ra khối lượng bằng 3,1 ngày công. Số thay đổi được tạo ra đang tăng vọt, còn thời gian con người dành cho quyết định cuối cùng thì không nhiều thêm.

Ba điểm này nói cùng một chuyện: **tạo ra đã rẻ đi, kiểm chứng thì chưa.** Một vòng quay nhanh đến đâu phụ thuộc vào mắt xích chậm nhất, và hiện giờ chậm nhất chính là chấm điểm.

Càng sửa vào sâu, mắt xích này càng khó. Sửa bộ nhớ, prompt và mã công cụ của agent, chạy đánh giá một lượt là thấy được đại khái, sửa hỏng cũng quay lại được. Sửa dữ liệu huấn luyện và quy trình huấn luyện thì phải đợi một lượt huấn luyện chạy xong mới thấy hiệu quả, thường mất vài tuần, chi phí cũng lớn hơn nhiều. Đến L5, thứ cần sửa là bản thân việc “đánh giá thế nào là sửa tốt”, lúc đó ngay cả cây thước dùng để chấm điểm cũng đang bị sửa.

## Chạy được trước là nơi kiểm chứng vừa rẻ vừa đo chuẩn

Dùng ngược lại điều này, ta có thể đoán RSI sẽ thành hiện thực ở đâu trước: **nơi nào chấm điểm càng rẻ, đo càng chuẩn, làm sai càng dễ hoàn tác, nơi đó càng chạy được trước.** Rẻ và đo chuẩn thiếu một cũng không được: benchmark kernel của AIDE² rất rẻ, nhưng thứ nó đo không phải tốc độ trong huấn luyện thật, nên mới bị lách.

![Phổ chi phí kiểm chứng: từ kernel, mã nguồn, mã của chính agent, đến quy trình huấn luyện và hướng nghiên cứu, mỗi lần chấm điểm càng lúc càng đắt, tự cải thiện cũng thành hiện thực càng lúc càng muộn](/assets/blog/rsi-verification/verify-vi.svg)

*Chú thích: từ trên xuống dưới, mỗi lần chấm điểm càng đắt hơn và càng phụ thuộc vào phán đoán của con người. Phía trên đã có lãi kép, phía dưới vẫn chưa thấy đâu.*

Ví dụ tốt nhất là [AlphaEvolve](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) của Google DeepMind. Nó tăng tốc một kernel nhân ma trận then chốt trong quá trình huấn luyện Gemini thêm 23%, nhờ đó thời gian huấn luyện Gemini giảm 1%; quy tắc nó tìm ra cho việc điều phối trung tâm dữ liệu liên tục thu hồi khoảng 0,7% năng lực tính toán toàn cầu của Google. Điểm số ở đây cuối cùng đều rơi vào thời gian huấn luyện thật và trung tâm dữ liệu thật: đo một lần gần như không tốn tiền, cũng không thể dùng lời lẽ mà thuyết phục được. Năng lực tính toán tiết kiệm được lại dùng để huấn luyện thế hệ mô hình tiếp theo; đây là một vòng nhỏ đã và đang có lãi kép.

Cùng một logic: mã nguồn có test, toán học có trình kiểm tra chứng minh, kernel và trình biên dịch có đồng hồ bấm giờ, kỹ thuật học máy có bộ test ẩn. Những nơi này sẽ là nơi đầu tiên xuất hiện “càng cải thiện càng giỏi cải thiện” thật sự.

Cái khó nằm ở đầu bên kia: định hướng nghiên cứu, phán đoán một bài toán mở có đáng làm không, và chính việc căn chỉnh (alignment). Chấm điểm những việc này phải dựa vào phán đoán, và phải rất lâu mới biết đúng hay sai. Anthropic cũng thừa nhận, ở khâu “chọn mục tiêu”, Claude vẫn còn kém con người một khoảng rõ rệt.

Đây cũng là cùng một lý lẽ với [bài trước](/vi/blog/agent-permission-context/) của tôi, khi nói vì sao agent chạy được trong repo trước. Bài đó nói: nơi nào có đủ thông tin tình hình và làm sai hoàn tác được, agent sẽ làm được việc ở đó trước. Bài này nói: nơi nào chấm điểm rẻ, đo chuẩn và làm sai hoàn tác được, tự cải thiện sẽ bắt đầu quay ở đó trước.

## Nhận định của tôi về chặng tới

- **Tỷ lệ công việc “AI dẫn dắt” sẽ tiếp tục tăng nhanh, nhưng L5 hoàn toàn tự chủ sẽ chưa sớm xuất hiện.** Con số 26% đã leo lên từ mức chưa tới 1% chỉ trong nửa năm, và một hai năm tới sẽ còn tăng mạnh. Nhưng phần tăng chủ yếu là phần “con người đặt mục tiêu, con người nghiệm thu”. Tôi không nghĩ trong một hai năm tới sẽ có bằng chứng công khai đáng tin nào cho thấy một hệ thống đã đạt L5.
- **Trọng tâm cạnh tranh sẽ chuyển từ “ai tạo ra giỏi” sang “ai kiểm chứng giỏi”.** Test ẩn, người đánh giá độc lập, quy trình phát hành có thể quay lui sẽ trở thành năng lực cốt lõi của các phòng thí nghiệm, ngang với năng lực tính toán và dữ liệu. Ai có khâu chấm điểm vừa nhanh vừa không bị lách, vòng của người đó sẽ quay nhanh.
- **Làn sóng lợi ích đầu tiên của RSI sẽ thể hiện ở việc giảm chi phí.** Thứ thành hiện thực trước là kernel nhanh hơn, huấn luyện tiết kiệm hơn, bảo trì mã rẻ hơn, trông chẳng giống chút nào với chuyện “bỗng nhiên thông minh hẳn lên”. Tiền và thời gian tiết kiệm được ấy sẽ từng chút một đẩy thế hệ mô hình tiếp theo tiến lên.
- **Điều đáng lo nhất là việc vượt ngưỡng mà không ai nhìn thấy.** Ngưỡng “lớn hơn 1” kia bị vượt qua lúc nào, từ bên ngoài không thể nhìn ra; mà việc chấm điểm lại ngày càng do chính AI làm, con người có thể là bên biết sau cùng. Vì vậy, những phép đo như chỉ số tự động hóa nghiên cứu và phát triển của Anthropic hay việc OpenAI chủ động công bố sẽ trở nên quan trọng ngang với bản thân mô hình. OpenAI tự thừa nhận vẫn chưa biết làm thế nào để đạt được RSI hoàn chỉnh một cách an toàn; Anthropic thì cho biết, chỉ cần các phòng thí nghiệm tiên phong khác cùng giảm tốc hoặc tạm dừng theo cách có thể kiểm chứng, họ cũng sẽ làm như vậy.

Với các kỹ sư đang dựng vòng lặp agent, chuyện này có một bài học rất trực tiếp: **đừng để agent tự chấm điểm cho mình.** Cách làm của AIDE² đáng để chép nguyên: agent sửa dựa theo điểm công khai, còn giữ hay không giữ một phiên bản thì do bài đánh giá ẩn mà nó không nhìn thấy quyết định. Hãy đặt test, người kiểm tra và quyền hạn ở nơi agent không sửa tới được. Khép vòng thế nào quan trọng hơn là có khép vòng hay không.

Quay lại hai chuyện ở đầu bài. AI tham gia tạo ra thế hệ AI tiếp theo, chuyện đó đã xảy ra. Càng cải thiện càng giỏi cải thiện hay không, còn phải xem khâu kiểm chứng có theo kịp không. Lần sau nếu thấy “ai đó đã đạt được khả năng tự tiến hóa”, hãy hỏi trước một câu: **điểm của vòng này, ai chấm?**
