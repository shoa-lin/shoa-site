---
translationKey: "harness-engineering"
locale: "vi"
title: "Kỹ thuật harness dành cho người dùng coding agent"
description: "Mô hình thực tiễn gồm guide, sensor, vòng phản hồi và ràng buộc kiến trúc để coding agent đáng tin cậy hơn."
publishedAt: "2026-04-02"
updatedAt: "2026-07-16"
category: "architecture"
sourceLocale: "en"
sourceUrl: "https://martinfowler.com/articles/harness-engineering.html"
sourceAuthor: "Birgitta Böckeler"
contentType: "adaptation"
translationStatus: "reviewed"
---

> **Thuật ngữ**
>
> **Harness** chỉ mọi phần của AI agent ngoài bản thân mô hình: Agent = Model + Harness. Với coding agent, nó gồm system prompt, truy xuất mã và điều phối do nhà phát triển xây dựng, cùng lớp bên ngoài gồm rule, skill, script và kiểm tra do người dùng kiểm soát.
>
> **Guide / Sensor**: Guide là điều khiển feedforward định hướng agent trước khi hành động. Sensor là điều khiển feedback quan sát kết quả và kích hoạt tự sửa sau khi hành động.
>
> **Computational / Inferential**: Điều khiển computational là công cụ xác định như test, linter và type checker. Điều khiển inferential dùng phán đoán ngữ nghĩa như AI code review hoặc LLM-as-a-judge.

---

“Harness” đã trở thành cách gọi tắt mọi phần của AI agent ngoài mô hình: [Agent = Model + Harness](https://blog.langchain.com/the-anatomy-of-an-agent-harness/). Định nghĩa này rất rộng, nên với coding agent cần thu hẹp nó trong một bounded context rõ ràng.

Một phần harness của coding agent được nhà sản xuất xây qua system prompt, truy xuất mã và đôi khi là [hệ thống điều phối tinh vi](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents). Coding agent cũng cung cấp công cụ để người dùng xây lớp harness bên ngoài cho hệ thống và trường hợp sử dụng riêng.

![Ba vòng tròn đồng tâm: mô hình ở giữa, harness của nhà phát triển coding agent bao quanh và harness người dùng ở ngoài cùng](/assets/blog/harness-engineering/harness-bounded-contexts.png)

Hình 1: “Harness” mang nghĩa khác nhau trong các bounded context khác nhau.

Một harness bên ngoài tốt có hai mục tiêu: tăng xác suất agent làm đúng ngay lần đầu và tạo vòng phản hồi sửa càng nhiều vấn đề càng tốt trước khi chúng đến tay con người. Kết quả mong muốn là ít công sức review hơn, chất lượng hệ thống cao hơn và giảm token lãng phí.

![Tổng quan guide đưa tín hiệu vào coding agent và sensor đưa kết quả trở lại vòng tự sửa, trong khi con người điều khiển cả hai](/assets/blog/harness-engineering/harness-overview.png)

## Feedforward và Feedback

Kỹ thuật harness kết hợp hai dạng điều khiển:

- **Guide (điều khiển feedforward)** dự đoán hành vi không mong muốn và định hướng agent **trước** khi hành động, tăng cơ hội có kết quả tốt ngay lần đầu.
- **Sensor (điều khiển feedback)** quan sát kết quả **sau** khi agent hành động và giúp nó tự sửa. Tín hiệu được thiết kế cho LLM đặc biệt mạnh, chẳng hạn thông báo linter tùy chỉnh kèm hướng dẫn sửa – một dạng prompt injection tích cực.

Mỗi dạng riêng lẻ đều chưa đủ. Feedback không có feedforward khiến agent lặp lại cùng lỗi; feedforward không có feedback mã hóa quy tắc nhưng không cho biết chúng có hiệu quả hay không.

## Computational và Inferential

Guide và sensor có thể dùng hai kiểu thực thi:

- **Computational**: xác định và nhanh, thường chạy trên CPU. Test, linter, type checker và phân tích cấu trúc hoàn thành trong mili giây đến vài giây với kết quả đáng tin cậy.
- **Inferential**: phân tích ngữ nghĩa, AI code review và đánh giá LLM-as-a-judge, thường chạy trên GPU hoặc NPU. Chúng chậm, tốn kém và không xác định.

Guide computational cải thiện kết quả đầu bằng công cụ xác định. Sensor computational đủ rẻ và nhanh để chạy cùng agent trên mọi thay đổi. Điều khiển inferential đắt hơn và biến động giữa các lần chạy, nhưng cung cấp hướng dẫn phong phú và phán đoán ngữ nghĩa. Với mô hình mạnh – chính xác hơn là mô hình phù hợp nhiệm vụ – sensor inferential vẫn có thể tăng mức tin cậy.

**Ví dụ**

| Tình huống | Hướng | Loại | Cách triển khai mẫu |
| --- | --- | --- | --- |
| Quy ước coding | Feedforward | Inferential | AGENTS.md, Skills |
| Khởi tạo dự án mới | Feedforward | Cả hai | Skill có hướng dẫn và bootstrap script |
| Codemod | Feedforward | Computational | Công cụ truy cập OpenRewrite recipe |
| Test cấu trúc | Feedback | Computational | Pre-commit hoặc hook coding-agent chạy ArchUnit test với ranh giới module |
| Hướng dẫn review | Feedback | Inferential | Skills |

### Quan hệ với context engineering

[Context engineering](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html) cung cấp phương tiện để đưa guide và sensor tới agent. Xây harness người dùng cho coding agent là một dạng cụ thể của context engineering.

## Vòng điều khiển

Vai trò của con người là **điều khiển** agent bằng cách lặp trên harness. Khi một vấn đề tái diễn, hãy cải thiện điều khiển feedforward và feedback để nó ít xảy ra hơn hoặc bị ngăn hoàn toàn.

AI có thể giúp cải thiện chính harness. Coding agent đã làm cho việc xây điều khiển tùy chỉnh và phân tích tĩnh rẻ hơn nhiều. Chúng có thể viết test cấu trúc, suy ra rule nháp từ mẫu quan sát được, dựng linter tùy chỉnh và tạo hướng dẫn thông qua khảo cổ codebase.

## Thời điểm: đưa chất lượng sang trái

Các nhóm thực hành [continuous integration](https://martinfowler.com/articles/continuousIntegration.html) từ lâu đã phân phối test, kiểm tra và review của con người theo chi phí, tốc độ và độ quan trọng trong suốt vòng đời phát triển. Nhóm theo [continuous delivery](https://martinfowler.com/bliki/ContinuousDelivery.html) lý tưởng muốn mọi trạng thái commit đều deploy được. Kiểm tra nên nằm càng xa về bên trái trên đường đến production càng tốt, vì lỗi sớm rẻ hơn để sửa.

Sensor feedback, kể cả inferential, nên được phân bố tương ứng trong vòng đời.

**Feedforward và feedback trong vòng đời thay đổi**

- Điều khiển nào đủ nhanh để chạy trước tích hợp hoặc trước cả khi tạo commit? Ví dụ: linter, test suite nhanh và agent code review cơ bản.
- Điều khiển nào đủ đắt để chỉ chạy sau tích hợp trong pipeline, cùng một lượt lặp lại kiểm tra nhanh? Ví dụ: mutation testing và code review rộng cần toàn cảnh.

![Ví dụ guide feedforward và sensor feedback trước và sau tích hợp trong vòng đời thay đổi](/assets/blog/harness-engineering/harness-change-lifecycle-examples.png)

**Sensor drift và sức khỏe liên tục**

- **Sensor drift codebase** chạy ngoài vòng đời thay đổi để phát hiện suy giảm tích lũy như mã chết, coverage yếu và vấn đề dependency.
- **Sensor sức khỏe runtime** cho phép agent giám sát tín hiệu production như SLO suy giảm, chất lượng phản hồi lấy mẫu hoặc log bất thường, rồi đề xuất cải thiện.

![Ví dụ phát hiện drift codebase liên tục và sensor feedback runtime sau tích hợp](/assets/blog/harness-engineering/harness-continuous-feedback-examples.png)

## Các nhóm điều tiết

Harness agent hoạt động như bộ điều tốc [điều khiển học](https://en.wikipedia.org/wiki/Cybernetics), kết hợp feedforward và feedback để điều tiết codebase hướng tới trạng thái mong muốn. Trạng thái này có nhiều chiều, mỗi chiều cần harness khác nhau. Sự phân biệt quan trọng vì khả năng harness hóa và độ phức tạp khác nhau đáng kể.

Ba nhóm hữu ích hiện nay:

### Harness khả năng bảo trì

Phần lớn ví dụ điều tiết chất lượng mã nội bộ và khả năng bảo trì. Đây là loại harness dễ xây nhất hiện nay vì đã có công cụ trưởng thành.

Để đánh giá mức tăng tin cậy, hãy so sánh chúng với [các kiểu thất bại phổ biến của coding agent](https://martinfowler.com/articles/exploring-gen-ai/13-role-of-developer-skills.html):

- **Sensor computational bắt vấn đề cấu trúc đáng tin cậy** như mã trùng lặp, độ phức tạp cyclomatic, thiếu coverage, drift kiến trúc và vi phạm style. Chúng rẻ, đã được chứng minh và xác định.
- **LLM có thể xử lý một phần vấn đề ngữ nghĩa** như mã trùng về nghĩa, test dư thừa, bản sửa brute-force và giải pháp over-engineered, nhưng tốn kém và theo xác suất. Không nên chạy chúng trên mọi commit.
- **Một số vấn đề tác động cao không được bên nào bắt đáng tin cậy**, gồm chẩn đoán sai, tính năng không cần thiết, over-engineering và hiểu nhầm hướng dẫn. Nếu con người chưa nêu rõ kết quả mong muốn, tính đúng đắn nằm ngoài phạm vi của mọi sensor.

### Harness fitness kiến trúc

Nhóm này gồm guide và sensor định nghĩa, kiểm tra đặc tính kiến trúc của ứng dụng – tức [Fitness Function](https://www.thoughtworks.com/en-de/radar/techniques/architectural-fitness-function).

Ví dụ:

- Skill truyền yêu cầu hiệu năng về phía trước; test hiệu năng báo agent đã cải thiện hay làm suy giảm chúng.
- Skill mô tả quy ước observability như chuẩn logging; hướng dẫn debug yêu cầu agent phản tư về chất lượng log hiện có.

### Harness hành vi

Đây là nhóm khó nhất: làm sao định hướng và phát hiện ứng dụng có hành xử như người dùng cần không?

- **Feedforward**: đặc tả chức năng, từ prompt ngắn đến mô tả nhiều tệp.
- **Feedback**: test suite do AI tạo, vượt qua với coverage hợp lý, đôi khi giám sát bằng mutation testing, cộng với kiểm thử thủ công.

Cách này đặt quá nhiều niềm tin vào test do AI tạo. Một số nhóm có kết quả tốt với mẫu [approved fixtures](https://lexler.github.io/augmented-coding-patterns/patterns/approved-fixtures/), nhưng nó phù hợp với một số khu vực hơn khu vực khác. Đây là công cụ chọn lọc, không phải câu trả lời hoàn chỉnh cho chất lượng test.

Chúng ta vẫn cần harness hành vi tốt hơn trước khi có thể tự tin giảm giám sát và kiểm thử thủ công.

![Mô hình harness đơn giản với guide và sensor trên các chiều bảo trì, fitness kiến trúc và hành vi](/assets/blog/harness-engineering/harness-types.png)

## Khả năng harness hóa

Không phải codebase nào cũng phù hợp với harness như nhau. Ngôn ngữ strongly typed cung cấp type checking như sensor. Ranh giới module rõ cho phép ràng buộc kiến trúc. Framework như Spring che giấu chi tiết agent không cần quản lý, gián tiếp tăng cơ hội thành công. Không có các thuộc tính đó, điều khiển tương ứng không thể được xây.

Hệ thống greenfield và legacy đối mặt với ràng buộc khác nhau:

- **Nhóm greenfield** có thể thiết kế cho khả năng harness hóa từ ngày đầu. Lựa chọn công nghệ và kiến trúc quyết định codebase dễ quản trị đến đâu.
- **Nhóm legacy**, nhất là nơi có nợ kỹ thuật nặng, gặp vấn đề khó hơn: harness cần nhất ở nơi khó xây nhất.

## Template harness

Phần lớn doanh nghiệp dựa vào vài topology dịch vụ phổ biến: dịch vụ nghiệp vụ có API, bộ xử lý sự kiện và dashboard dữ liệu. Tổ chức trưởng thành thường đã mã hóa chúng thành template dịch vụ.

Các template đó có thể phát triển thành **template harness**: gói guide và sensor ràng buộc coding agent theo cấu trúc, quy ước và stack công nghệ của topology. Nhóm có thể dần chọn công nghệ dựa một phần vào harness sẵn có.

![Ví dụ topology dịch vụ với template harness gồm guide và sensor cho từng topology](/assets/blog/harness-engineering/harness-templates.png)

### Định luật Ashby

[Định luật đa dạng cần thiết của Ashby](https://en.wikipedia.org/wiki/Variety_%28cybernetics%29#Law_of_requisite_variety) củng cố lý do dùng topology định trước. Bộ điều tiết phải có độ đa dạng ít nhất bằng hệ thống nó quản lý và chỉ điều tiết được thứ mà nó có mô hình. Coding agent dựa trên LLM có thể tạo gần như mọi thứ; cam kết với một topology thu hẹp không gian khả năng và làm harness toàn diện khả thi hơn.

Template harness thừa hưởng vấn đề bảo trì của template dịch vụ: sau khi khởi tạo, chúng drift khỏi cải tiến upstream. Versioning và đóng góp còn khó hơn khi guide và sensor không xác định và khó kiểm thử.

## Vai trò của con người

Nhà phát triển mang kỹ năng và kinh nghiệm vào mỗi codebase như một harness ngầm. Chúng ta đã hấp thụ quy ước, thực hành tốt, cảm nhận chi phí nhận thức của độ phức tạp và biết tên mình gắn với commit. Chúng ta cũng có context tổ chức: mục tiêu của nhóm, nợ kỹ thuật nào được chấp nhận vì kinh doanh và “tốt” nghĩa là gì tại đây. Làm việc theo bước nhỏ ở nhịp độ con người tạo không gian cho kinh nghiệm đó xuất hiện.

Coding agent không có những điều này. Nó không chịu trách nhiệm xã hội, không có phản xạ tránh hàm 300 dòng, không có trực giác “ở đây chúng ta không làm vậy” và không có ký ức tổ chức. Nó không biết quy ước nào mang tải trọng, quy ước nào chỉ là thói quen, hay giải pháp đúng về kỹ thuật có phù hợp ý định nhóm hay không.

Harness đưa một phần đóng góp của kinh nghiệm con người ra ngoài và làm rõ, nhưng chỉ đến một giới hạn. Hệ thống guide, sensor và vòng tự sửa mạch lạc rất tốn kém. Mục tiêu của harness tốt không nhất thiết loại bỏ con người, mà hướng sự chú ý của họ đến nơi quan trọng nhất.

## Điểm bắt đầu và câu hỏi mở

Mô hình tư duy này kết nối các kỹ thuật đã xuất hiện trong thực tế và đóng khung phần chưa giải quyết. Nó nâng cuộc thảo luận khỏi tính năng riêng như Skill hay MCP server lên thiết kế chiến lược của hệ thống điều khiển tạo niềm tin thực vào đầu ra agent.

Ví dụ hiện tại:

- [Một nhóm OpenAI đã ghi lại harness của họ](https://openai.com/index/harness-engineering/): kiến trúc phân lớp được thực thi bằng linter tùy chỉnh và test cấu trúc, cùng “garbage collection” định kỳ quét drift và yêu cầu agent đề xuất sửa. Kết luận là thách thức khó nhất giờ nằm ở thiết kế môi trường, vòng phản hồi và hệ thống điều khiển.
- [Bài viết của Stripe về minion](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents) mô tả hook pre-push chọn linter liên quan theo heuristic, nhấn mạnh đưa feedback sang trái và dùng “blueprint” tích hợp sensor feedback vào workflow agent.
- Mutation testing và test cấu trúc là sensor feedback computational từng ít được dùng nhưng đang được quan tâm trở lại.
- Tích hợp LSP và code intelligence là ví dụ guide feedforward computational.
- Các nhóm Thoughtworks kết hợp sensor computational và inferential để xử lý drift kiến trúc, gồm agent đi cùng linter tùy chỉnh và cách tiếp cận “janitor army”.

Nhiều câu hỏi vẫn còn. Guide và sensor giữ nhất quán thế nào khi harness lớn lên? Có thể tin agent cân bằng hướng dẫn và tín hiệu feedback xung đột đến đâu? Nếu sensor không bao giờ kích hoạt, chất lượng cao hay khả năng phát hiện yếu? Chúng ta cần cách đánh giá coverage và chất lượng harness tương tự code coverage và mutation testing. Feedforward và feedback vẫn phân tán trong các bước delivery, tạo cơ hội cho công cụ cấu hình, đồng bộ và suy luận về chúng như một hệ thống.

Xây harness bên ngoài đang trở thành một thực hành kỹ thuật liên tục, không phải cấu hình một lần.
