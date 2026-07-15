---
translationKey: "lessons-from-building-claude-code-skills"
locale: "vi"
title: "Bài học từ quá trình xây dựng Claude Code: Cách chúng tôi sử dụng Skills"
description: "Những gì đội ngũ Claude Code đã học được từ việc thiết kế, tổ chức và duy trì hàng trăm Skills."
publishedAt: "2026-03-17"
updatedAt: "2026-07-16"
category: "development"
sourceLocale: "en"
sourceUrl: "https://x.com/trq212/status/2033949937936085378"
sourceAuthor: "Thariq Shihipar"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Hình bìa cho Bài học từ việc Xây dựng Claude Code: Cách chúng tôi sử dụng Skills](https://pbs.twimg.com/media/HDl2jn9a0AAZkyz?format=jpg&name=small)

Skills đã trở thành một trong những điểm mở rộng được sử dụng nhiều nhất trong Claude Code. Chúng linh hoạt, dễ tạo và dễ phân phối.

Sự linh hoạt đó cũng khiến việc biết điều gì hoạt động tốt nhất trở nên khó khăn. Những loại Skills nào đáng để tạo? Bí quyết để viết một Skill tốt là gì? Khi nào bạn nên chia sẻ nó với người khác?

Tại Anthropic, chúng tôi sử dụng Skills một cách rộng rãi trong Claude Code, với hàng trăm cái đang được sử dụng tích cực. Đây là những bài học mà chúng tôi đã học được về việc sử dụng Skills để tăng tốc phát triển.

---

## Skills là gì?

Nếu bạn mới làm quen với Skills, hãy bắt đầu bằng [tài liệu](https://code.claude.com/docs/en/skills) hoặc tham gia [khóa học Skilljar về Agent Skills](https://anthropic.skilljar.com/introduction-to-agent-skills) mới nhất. Bài viết này giả định bạn đã có hiểu biết cơ bản về chúng.

Một hiểu lầm phổ biến là Skills chỉ là "các tệp markdown." Phần thú vị là chúng không chỉ đơn thuần là các tệp văn bản: chúng là các thư mục có thể bao gồm các tập lệnh, tài nguyên, dữ liệu và các nguồn khác mà một agent có thể khám phá, tìm hiểu và thao tác.

Trong Claude Code, Skills cũng có một [đa dạng các tùy chọn cấu hình](https://code.claude.com/docs/en/skills#frontmatter-reference), bao gồm các hook động.

Một số Skills thú vị nhất sử dụng các tùy chọn cấu hình này và cấu trúc thư mục của chúng một cách sáng tạo.

---

## Các loại Skills

Sau khi lập danh mục Skills của chúng tôi, chúng tôi nhận thấy rằng chúng tụ tập thành một vài loại lặp lại. Những Skills tốt nhất phù hợp gọn gàng vào một loại; những cái gây nhầm lẫn thì nằm giữa nhiều loại. Đây không phải là danh sách cuối cùng, nhưng là một cách hữu ích để suy nghĩ về những gì có thể đang thiếu bên trong tổ chức của bạn.

![Sơ đồ các loại Skill phổ biến](https://pbs.twimg.com/media/HDlvMmubEAIzF-N?format=jpg&name=small)

---

### 1. Thư viện & Tham chiếu API

Skills giải thích cách sử dụng đúng một thư viện, CLI hoặc SDK. Chúng có thể bao phủ thư viện nội bộ hoặc những công cụ phổ biến mà Claude Code đôi khi gặp khó khăn. Các Skill này thường có đoạn mã tham khảo và danh sách những lỗi dễ mắc mà Claude cần tránh khi viết script.

**Ví dụ:**

- **billing-lib** - Thư viện thanh toán nội bộ của bạn: các trường hợp biên, cạm bẫy, và các chi tiết dễ gây lỗi khác
- **internal-platform-cli** - Mỗi lệnh phụ trong trình bao CLI nội bộ của bạn, cùng với ví dụ khi nào nên sử dụng từng lệnh
- **frontend-design** - Giúp Claude cải thiện khả năng áp dụng hệ thống thiết kế của bạn

---

### 2. Xác minh sản phẩm

Skills giải thích cách kiểm tra hoặc xác minh rằng mã hoạt động. Chúng thường được kết hợp với các công cụ bên ngoài như Playwright hoặc tmux.

Việc xác minh Skills là cực kỳ hữu ích để đảm bảo rằng kết quả đầu ra của Claude là chính xác. Thường đáng để một kỹ sư dành một tuần để làm chúng trở nên xuất sắc.

Hãy cân nhắc các kỹ thuật như quay video để thấy chính xác Claude đã kiểm tra gì, hoặc dùng assertion có thể thực thi để xác nhận trạng thái ở từng bước. Những bước kiểm tra này thường được triển khai bằng script bên trong Skill.

**Ví dụ:**

- **signup-flow-driver** - Chạy quy trình đăng ký -> xác minh email -> hướng dẫn khởi tạo trong trình duyệt không giao diện, với các hook kiểm tra trạng thái ở mỗi bước
- **checkout-verifier** - Điều khiển giao diện thanh toán bằng thẻ thử của Stripe và xác minh rằng hóa đơn được đưa đến trạng thái chính xác
- **tmux-cli-driver** - Kiểm tra các CLI tương tác khi workflow yêu cầu TTY

---

### 3. Truy xuất & Phân tích dữ liệu

Skills kết nối với các ngăn xếp dữ liệu và giám sát. Chúng có thể bao gồm các thư viện lấy dữ liệu đã xác thực, các ID bảng điều khiển cụ thể và hướng dẫn cho các workflows hoặc truy vấn phổ biến.

**Ví dụ:**

- **funnel-query** - Sự kiện nào cần kết hợp cho đăng ký -> kích hoạt -> trả phí, cùng với bảng chứa `user_id` chuẩn
- **cohort-compare** - So sánh giữ chân hoặc chuyển đổi giữa hai nhóm, đánh dấu sự khác biệt có ý nghĩa thống kê, và liên kết đến định nghĩa phân đoạn
- **grafana** - UID nguồn dữ liệu, tên cụm, và bảng tra cứu vấn đề đến bảng điều khiển

---

### 4. Quy trình kinh doanh & Tự động hóa nhóm

Skills biến các workflow lặp lại thành một lệnh duy nhất. Hướng dẫn thường khá đơn giản, nhưng có thể phụ thuộc vào Skills hoặc MCP khác. Lưu kết quả trước đó trong tệp nhật ký có thể giúp mô hình duy trì tính nhất quán và tham chiếu các lần chạy trước.

**Ví dụ:**

- **standup-post** - Tập hợp dữ liệu từ trình theo dõi vé, hoạt động trên GitHub và các bài đăng Slack trước đó thành một bài đăng standup định dạng, chỉ có sự khác biệt
- **create-<ticket-system>-ticket** - Thực thi một schema với các giá trị enum hợp lệ và các trường bắt buộc, sau đó chạy workflow sau khi tạo, như thông báo cho người đánh giá và liên kết vé trong Slack
- **weekly-recap** - Biến các PR đã hợp nhất, vé đã đóng và các triển khai thành một bài đăng tổng kết định dạng

---

### 5. Tạo mã khung & Mẫu

Skills tạo ra mã khung (framework) mẫu cho một chức năng cụ thể trong cơ sở mã. Chúng có thể kết hợp hướng dẫn bằng ngôn ngữ tự nhiên với các script có thể ghép nối, điều này đặc biệt hữu ích khi các yêu cầu scaffolding không thể được mô tả hoàn toàn bằng mã.

**Ví dụ:**

- **new-<framework>-workflow** - Tạo một dịch vụ mới, workflow, hoặc bộ xử lý với các chú thích của bạn
- **new-migration** - Cung cấp mẫu migration của bạn và các vấn đề phổ biến
- **create-app** - Tạo một ứng dụng nội bộ với xác thực, ghi nhật ký và cấu hình triển khai đã được kết nối sẵn

---

### 6. Chất lượng Mã & Xem xét Mã

Skills thực thi chất lượng mã bên trong một tổ chức và giúp xem xét mã. Chúng có thể bao gồm các script hoặc công cụ xác định để tăng tính ổn định và có thể chạy tự động thông qua hook hoặc GitHub Actions.

**Ví dụ:**

- **adversarial-review** - Tạo ra một subagent với cái nhìn mới để phê bình công việc, triển khai các sửa lỗi và lặp đi lặp lại cho đến khi các phát hiện chỉ còn là những chi tiết nhỏ nhặt
- **code-style** - Thực thi các quy tắc viết mã mà Claude không xử lý tốt theo mặc định
- **testing-practices** - Giải thích cách viết các bài kiểm tra và những gì cần kiểm tra

---

### 7. CI/CD & Triển khai

Skills hỗ trợ lấy, đẩy và triển khai mã. Chúng có thể gọi các Skills khác để thu thập dữ liệu.

**Ví dụ:**

- **babysit-pr** - Giám sát một PR -> thử lại CI thất thường -> giải quyết xung đột merge -> bật tự động gộp
- **deploy-<service>** - Xây dựng -> kiểm tra ngắn -> từ từ triển khai lưu lượng trong khi so sánh tỷ lệ lỗi -> tự động quay lại khi có sự cố
- **cherry-pick-prod** - Tạo một worktree riêng biệt -> cherry-pick -> giải quyết xung đột -> mở một PR với mẫu đúng

---

### 8. Runbooks

Skills mà lấy một triệu chứng như chuỗi Slack, cảnh báo hoặc chữ ký lỗi, đi qua một cuộc điều tra nhiều công cụ, và tạo ra một báo cáo có cấu trúc.

**Ví dụ:**

- **<service>-debugging** - Ánh xạ triệu chứng -> công cụ -> mẫu truy vấn cho các dịch vụ có lưu lượng cao
- **oncall-runner** - Lấy cảnh báo -> kiểm tra các nghi ngờ thông thường -> định dạng kết quả
- **log-correlator** - Dựa vào ID yêu cầu, kéo các bản ghi phù hợp từ mọi hệ thống có thể đã chạm tới nó

---

### 9. Hoạt động Hạ tầng

Skills thực hiện các bảo trì định kỳ và các quy trình vận hành. Một số liên quan đến các hành động phá hủy và có lợi khi có những rào cản bảo vệ mạnh mẽ. Chúng giúp các kỹ sư dễ dàng hơn trong việc theo dõi các thực hành tốt nhất trong các hoạt động quan trọng.

**Ví dụ:**

- **<resource>-orphans** - Tìm các pod hoặc volume bị mồ côi -> đăng lên Slack -> chờ qua giai đoạn ngâm -> yêu cầu xác nhận từ người dùng -> thực hiện dọn dẹp theo chuỗi
- **dependency-management** - Triển khai phê duyệt phụ thuộc của tổ chức workflow
- **cost-investigation** - Điều tra lý do tại sao chi phí lưu trữ hoặc xuất dữ liệu tăng vọt, với các bucket và mẫu truy vấn liên quan

---

## Mẹo để Tạo Skills

![Đồ họa tóm tắt các mẹo để tạo Skills](https://pbs.twimg.com/media/HDoKg58bEAAL1bw?format=jpg&name=small)

Khi bạn đã chọn một Skill để xây dựng, bạn nên viết nó như thế nào? Đây là một số thực hành và kỹ thuật đã mang lại hiệu quả tốt nhất cho chúng tôi.

Chúng tôi cũng mới phát hành [Người tạo Skill](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills) để làm cho việc tạo Skills trong Claude Code dễ dàng hơn.

---

### Đừng Nêu Rõ Những Điều Rõ Ràng

Claude Code đã biết rất nhiều về cơ sở mã của bạn, và Claude cũng biết rất nhiều về lập trình, bao gồm nhiều quan điểm mặc định. Nếu một Skill chủ yếu về kiến thức, hãy tập trung vào thông tin giúp Claude vượt ra ngoài cách suy nghĩ bình thường của nó.

[thiết kế giao diện skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) là một ví dụ điển hình. Một kỹ sư của Anthropic đã tạo ra nó bằng cách lặp lại với khách hàng để cải thiện gu thiết kế của Claude và tránh các mặc định quen thuộc như font Inter và gradient màu tím.

---

### Xây dựng Mục Gotchas

![Mục Ví dụ Mắc lỗi](https://pbs.twimg.com/media/HDlwEG1bEAUdmcV?format=jpg&name=small)

Nội dung có tín hiệu cao nhất trong bất kỳ Skill nào thường là mục Gotchas. Xây dựng nó từ những điểm thất bại thường gặp mà Claude gặp phải khi sử dụng Skill, và tiếp tục cập nhật khi xuất hiện Gotchas mới.

---

### Sử dụng Hệ thống Tệp & Tiết lộ Dần dần

![Cấu trúc thư mục Skill được sử dụng cho tiết lộ dần](https://pbs.twimg.com/media/HDlwhSjbEAIJSc9?format=jpg&name=small)

Một Skill là một thư mục, không chỉ là một tệp markdown. Hãy coi toàn bộ hệ thống tệp như một hình thức kỹ thuật ngữ cảnh và tiết lộ dần. Nói với Claude thư mục Skill chứa những tệp nào, và nó có thể đọc chúng khi chúng trở nên liên quan.

Hình thức đơn giản nhất của tiết lộ dần là chỉ dẫn Claude tới các tệp markdown khác. Ví dụ, các chữ ký hàm chi tiết và ví dụ sử dụng có thể nằm trong `references/api.md`.

Nếu đầu ra cuối cùng là một tài liệu markdown, Skill có thể bao gồm một mẫu dưới `assets/` để Claude sao chép và sử dụng.

Các thư mục dành cho tài liệu tham khảo, script, ví dụ và các tài nguyên khác giúp Claude làm việc hiệu quả hơn.

---

### Tránh ép buộc Claude

Claude thường cố gắng tuân theo hướng dẫn một cách chặt chẽ. Bởi vì Skills có thể tái sử dụng cao, những hướng dẫn quá cụ thể có thể làm cho chúng dễ vỡ. Cung cấp cho Claude thông tin cần thiết đồng thời giữ đủ sự linh hoạt để thích nghi với tình huống.

![Ví dụ so sánh hướng dẫn linh hoạt với các hướng dẫn quá sức hạn chế](https://pbs.twimg.com/media/HDlwurvbEAM5ZNu?format=jpg&name=small)

---

### Nghĩ qua Bố cục

![Ví dụ cấu hình thiết lập Skill](https://pbs.twimg.com/media/HDlw1mYbEAY-Bul?format=jpg&name=small)

Một số Skills cần ngữ cảnh từ người dùng trong quá trình thiết lập. Ví dụ, nếu một Skill đăng một bản tổng kết lên Slack, Claude có thể cần hỏi kênh Slack nào sẽ sử dụng.

Một mô hình tốt là lưu thông tin thiết lập trong một tệp `config.json` bên trong thư mục Skill. Nếu cấu hình bị thiếu, agent có thể hỏi người dùng về nó.

Để trình bày các câu hỏi trắc nghiệm có cấu trúc, hướng dẫn Claude sử dụng công cụ AskUserQuestion.

---

### Trường Mô tả Dành cho Mô hình

Khi Claude Code bắt đầu một phiên làm việc, nó tạo ra một danh sách tất cả các Skill có sẵn và mô tả của chúng. Claude quét danh sách đó để trả lời: "Có Skill nào cho yêu cầu này không?" Do đó, mô tả không phải là một bản tóm tắt; nó mô tả khi nào mô hình nên kích hoạt Skill.

![Ví dụ về mô tả Skill được viết để kích hoạt mô hình](https://pbs.twimg.com/media/HDlw5ULbEAQOqtJ?format=jpg&name=small)

---

### Bộ nhớ & Lưu trữ Dữ liệu

![Ví dụ về lưu trữ bộ nhớ và dữ liệu cho Skill](https://pbs.twimg.com/media/HDoImh1bEAU-mMI?format=jpg&name=small)

Một số Skills có thể bao gồm bộ nhớ bằng cách lưu trữ dữ liệu. Điều đó có thể đơn giản như một nhật ký văn bản chỉ thêm hoặc tệp JSON, hoặc phức tạp như một cơ sở dữ liệu SQLite.

Ví dụ, một `standup-post` Skill có thể giữ `standups.log` với mỗi bài đăng mà nó đã viết. Trong lần chạy tiếp theo, Claude có thể đọc lịch sử đó và xác định những gì đã thay đổi kể từ ngày hôm qua.

Dữ liệu bên trong thư mục Skill có thể bị xóa khi Skill được nâng cấp. Lưu dữ liệu bền vững ở một vị trí ổn định; tính đến hôm nay, `${CLAUDE_PLUGIN_DATA}` cung cấp một thư mục ổn định cho mỗi plugin.

---

### Lưu trữ Script & Tạo Mã

Một trong những điều mạnh mẽ nhất mà bạn có thể trao cho Claude là mã nguồn. Các script và thư viện cho phép Claude sử dụng lượt của mình để tạo ra các khả năng và quyết định bước tiếp theo thay vì viết lại mã mẫu.

Ví dụ, một nhà khoa học dữ liệu Skill có thể bao gồm các hàm để lấy dữ liệu từ một nguồn sự kiện. Hãy cung cấp cho Claude một tập hợp các hàm hỗ trợ để nó có thể tạo ra các phân tích phức tạp hơn:

![Thư viện ví dụ các hàm trợ giúp bên trong một Skill](https://pbs.twimg.com/media/HDlxbtkbkAAOse7?format=jpg&name=small)

Claude sau đó có thể tạo script ngay lập tức để kết hợp các hàm đó cho những prompt như "Điều gì đã xảy ra vào Thứ Ba?"

![Ví dụ kịch bản được tạo bởi Claude từ các hàm trợ giúp](https://pbs.twimg.com/media/HDlxfEIb0AA2E7l?format=jpg&name=small)

---

### Hooks theo Yêu cầu

Skills có thể định nghĩa các hook chỉ kích hoạt khi Skill được gọi và vẫn duy trì hoạt động cho cả phiên. Sử dụng điều này cho các biện pháp bảo vệ theo quan điểm riêng mà sẽ gây gián đoạn nếu chạy liên tục nhưng có giá trị trong các tình huống cụ thể.

Ví dụ:

- **/careful** - Sử dụng bộ so khớp PreToolUse trên Bash để chặn `rm -rf`, `DROP TABLE`, force-push và `kubectl delete`. Bật nó khi thao tác trên môi trường sản xuất; để nó bật vĩnh viễn sẽ rất phiền phức.
- **/freeze** - Chặn bất kỳ hành động Chỉnh sửa/Ghi ngoài một thư mục cụ thể. Nó hữu ích khi gỡ lỗi khi bạn muốn thêm log mà không vô tình "sửa" code không liên quan.

---

## Phân phối Skills

Một trong những lợi ích lớn nhất của Skills là chúng có thể được chia sẻ với phần còn lại của nhóm.

Có hai con đường phân phối phổ biến:

- Check Skills vào kho lưu trữ dưới `./.claude/skills`
- Xây dựng một plugin và một marketplace plugin Claude Code nơi người dùng có thể cài đặt nó; xem [Tài liệu về chợ plugin](https://code.claude.com/docs/en/plugin-marketplaces)

Đối với các đội nhỏ làm việc trên tương đối ít kho lưu trữ, việc kiểm tra Skills vào từng kho lưu trữ hoạt động tốt. Mỗi Skill được kiểm tra lại thêm một chút ngữ cảnh cho mô hình. Ở quy mô lớn hơn, một thị trường plugin nội bộ cho phép tổ chức phân phối Skills, trong khi mỗi đội chọn những gì muốn cài đặt.

---

### Quản lý Thị trường

Một đội nên quyết định thế nào Skills nào được đưa vào thị trường, và mọi người nên gửi chúng ra sao?

Tại Anthropic, không có đội trung tâm nào đưa ra mọi quyết định. Những Skills hữu ích xuất hiện một cách tự nhiên. Một chủ sở hữu có thể tải lên Skill vào một thư mục thử nghiệm trên GitHub và hướng mọi người đến nó trên Slack hoặc một diễn đàn khác.

Khi Skill đã nhận được đủ sự quan tâm, theo đánh giá của chủ sở hữu, họ có thể mở một PR để chuyển nó vào thị trường.

Các Skills kém chất lượng hoặc dư thừa rất dễ tạo, vì vậy một số hình thức tuyển chọn là quan trọng trước khi phát hành.

---

### Soạn Skills

Skills có thể phụ thuộc lẫn nhau. Một Skill tải lên tệp có thể tải lên tệp, trong khi Skill tạo CSV tạo ra CSV rồi sau đó gọi Skill tải lên. Các chợ và Skills hiện chưa có quản lý phụ thuộc gốc, nhưng một Skill có thể tham chiếu đến cái khác theo tên và mô hình sẽ gọi nó khi được cài đặt.

---

### Đo lường Skills

Để hiểu cách một Skill hoạt động, chúng tôi sử dụng hook PreToolUse ghi lại việc sử dụng Skill bên trong công ty. [Mã ví dụ](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5) cho thấy phương pháp tiếp cận. Điều này tiết lộ Skills nào phổ biến và những cái nào kích hoạt ít hơn mong đợi.

---

## Kết luận

Skills là các công cụ mạnh mẽ, linh hoạt cho agent, nhưng lĩnh vực vẫn còn non trẻ và mọi người đều đang học cách sử dụng chúng hiệu quả.

Hãy coi những bài học này như một túi các kỹ thuật hữu ích hơn là một hướng dẫn chắc chắn. Cách tốt nhất để hiểu Skills là bắt đầu, thử nghiệm, và quan sát những gì hiệu quả. Hầu hết Skills của chúng tôi bắt đầu chỉ với vài dòng và một Gotcha duy nhất, sau đó được cải thiện khi mọi người thêm các bài học mới bất cứ khi nào Claude gặp một trường hợp đặc biệt khác.

Tôi hy vọng điều này hữu ích. Hãy cho tôi biết nếu bạn có câu hỏi.
