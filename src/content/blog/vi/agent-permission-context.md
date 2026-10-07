---
translationKey: "agent-permission-context"
locale: "vi"
title: "Chạm được gì, biết được gì: vì sao agent cứ liên tục đổi hình thái"
description: "Agent chỉ làm được việc ở chỗ “có thể ra tay” và “nắm được tình hình” chồng lên nhau. Lần theo hai trục này để thấy agent đi từ repo sang máy tính, kênh chat, rồi đến danh tính của chính nó."
publishedAt: "2026-10-05"
updatedAt: "2026-10-05"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/agent-permission-context/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

Hơn một năm qua, các sản phẩm agent thay hình đổi dạng rất nhanh. Đầu tiên là trợ lý lập trình trong terminal và IDE, tiếp đến là ứng dụng desktop và bot trong phần mềm chat; rồi sau nữa, có người cấp cho agent một máy tính trên cloud, có người kéo nó vào kênh của nhóm, lại có người cấp cho nó hẳn một email và số điện thoại riêng.

Thoạt nhìn, cứ như mỗi hãng đang loay hoay với một lớp vỏ mới. Tôi dùng hai câu hỏi để sắp xếp lại những thay đổi này:

- **Quyền hạn**: agent được phép ra tay với cái gì?
- **Ngữ cảnh**: agent biết gì, giữ lại được gì?

Agent chỉ làm được việc ở chỗ hai thứ này chồng lên nhau. Biết tình hình mà không ra tay được, nó chỉ làm được cố vấn; ra tay được mà không biết tình hình, nó là một người lạ đang cầm chìa khóa của bạn. Nên quan điểm của tôi là: **hình thái của agent chính là vùng mà quyền hạn và ngữ cảnh chồng lên nhau**. Mỗi lần sản phẩm đổi hình thái là một lần đẩy vùng chồng lấn này ra ngoài thêm một vòng: một trục lao lên trước, trục kia đuổi theo sau.

## Hãy xem một bức hình trước

![Biểu đồ hai chiều quyền hạn × ngữ cảnh: trục ngang là phạm vi quyền hạn, trục dọc là phạm vi ngữ cảnh, bảy nhóm sản phẩm được đặt trên đó](/assets/blog/agent-permission-context/map-vi.svg)

*Chú thích: càng sang phải trên trục ngang, agent càng động được vào nhiều thứ, và khi làm sai cũng càng khó thu hồi. Mỗi sản phẩm nằm ở đâu đều là phán đoán của tôi, không phải lời của nhà cung cấp.*

Bức hình này chỉ nhìn hai điều: ai nằm trên đường chéo, tức hai trục cùng tiến lên; ai lệch khỏi đường chéo, tức có một trục đã chạy trước. Các phần dưới đây suy diễn nối tiếp nhau, mỗi phần đều được rút ra từ phần trước đó.

## Vì sao lập trình bứt lên trước nhất

Trong khung chat, agent biết bạn đã nói gì, nhưng việc nó làm được chỉ là trả lời; việc thì bạn vẫn phải tự làm.

Kho mã nguồn (repo) thì khác: nó gói cả hai trục vào cùng một thư mục. Mã nguồn, lịch sử commit, test chính là ngữ cảnh mà agent cần; sửa file, chạy lệnh chính là quyền hạn của nó. Quan trọng hơn, những quyền này thu hồi được: sửa hỏng thì git quay lại được, sửa đúng hay chưa thì test nghiệm thu được. Hành động hoàn tác được thì cấp quyền rộng tay hơn một chút cũng không đáng ngại.

Tháng 5 năm 2025, OpenAI ra mắt Codex, chạy song song các tác vụ kỹ thuật trong môi trường cách ly; vài ngày sau, Claude Code chính thức khả dụng, thay đổi hiện thẳng trên file trong VS Code hoặc JetBrains của bạn. Hai hãng, không hẹn mà gặp, đều bắt đầu từ repo.

![Hình so sánh: trong khung chat, ngữ cảnh và quyền hạn gần như không chồng lên nhau; trong repo, hai thứ chồng lấn trên diện rộng](/assets/blog/agent-permission-context/repo-vi.svg)

*Chú thích: repo là nơi đầu tiên “tình hình có đủ, làm sai hoàn tác được”.*

Vì vậy, muốn phán đoán một lĩnh vực khi nào giao được cho agent, hãy xem ở đó đã có một nơi như thế chưa: ngữ cảnh đầy đủ, và hành động vẫn hoàn tác được.

## Rời khỏi repo, đường rẽ làm hai

Vừa rời khỏi repo, mọi chuyện khó lên ngay. Ngữ cảnh của bạn rải rác trong lịch sử chat, file và đủ loại tài khoản; những chỗ ra tay được thì nằm rải rác trong một đống website và ứng dụng không có API. Không tìm được một nơi có sẵn chứa được cả hai cùng lúc, lộ trình liền rẽ nhánh.

Một đường làm dày ngữ cảnh trước: đặt agent vào phần mềm chat bạn đang dùng sẵn, để bộ nhớ (memory) và phiên hội thoại ở lại phía bạn. OpenClaw dùng một gateway nối vào các kênh như WhatsApp, Telegram, Slack; workspace, file bộ nhớ, phiên, khóa bí mật đều nằm trong tay người dùng. Dòng lệnh, ứng dụng desktop và gateway tin nhắn của Hermes dùng chung một bộ phiên và cấu hình.

Đường kia mở rộng quyền hạn trước: cấp thẳng cho agent một chiếc máy tính. Giao diện đồ họa cộng với một trình duyệt đã đăng nhập sẵn là cách phổ quát nhất khi gặp “những thứ không có API”. Grok Bot làm việc trên một máy tính cloud luôn duy trì, có trình duyệt, hệ thống file và terminal, đăng nhập vào các công cụ và website bạn đang có; Muse cấp cho mỗi người một máy ảo an toàn kèm trình duyệt, bạn tắt app rồi nó vẫn tiếp tục làm.

![Hình rẽ nhánh: sau khi rời repo, một đường làm dày ngữ cảnh trước, một đường mở rộng quyền hạn trước, cuối cùng đều phải bù trục còn lại](/assets/blog/agent-permission-context/fork-vi.svg)

*Chú thích: trục nào chạy trước, trục kia chính là món nợ phải trả tiếp theo.*

## Phê duyệt là con người đang bù ngữ cảnh

Đi đường quyền hạn trước, sẽ đụng ngay một vấn đề. Một chiếc máy tính đã đăng nhập tài khoản của bạn thì nút nào cũng bấm được, nhưng nó không biết hành động nào bạn sẽ chấp nhận: ngân sách của bạn là bao nhiêu, bạn với người nhận quan hệ thế nào, giới hạn của bạn nằm ở đâu.

Lúc này, mỗi lời nhắc phê duyệt bật lên thực ra đều là agent đang xin bạn mảnh ngữ cảnh mà nó thiếu. Viết sẵn quy tắc từ trước chính là giao mảnh ngữ cảnh đó cho nó một lần cho xong. Cách của Dots là để bạn chia hành động thành ba mức: cho phép, cần phê duyệt, cấm. Muse sẽ hỏi bạn trước khi gửi thư hay mua sắm, và còn lưu lại bản ghi.

![Hình minh họa: quyền hạn dài hơn ngữ cảnh một đoạn, khoảng cách được bù bằng hộp thoại phê duyệt, quy tắc viết sẵn, và bộ nhớ cùng sở thích tích lũy dần](/assets/blog/agent-permission-context/approval-vi.svg)

*Chú thích: phê duyệt bật lên càng nhiều, nghĩa là hai trục càng cách xa nhau.*

Vì vậy, “mỗi việc phải xin bạn duyệt mấy lần” có thể xem như một chỉ số đo, đo khoảng cách giữa quyền hạn và ngữ cảnh. Muốn nó giảm xuống, việc nên làm là bù ngữ cảnh: quy tắc, bộ nhớ, sở thích, chứ không phải tháo bỏ cánh cổng chặn.

Có một mảnh ngữ cảnh được cố ý không trao: mật khẩu. Muse đặt thông tin xác thực vào kho lưu trữ an toàn, mô hình không nhìn thấy mật khẩu và phương thức thanh toán của bạn. Agent dùng được, nhưng không nhìn thấy.

## Ngữ cảnh tích ở đâu, cửa vào gom về đó

Nhìn lại con đường làm dày ngữ cảnh trước, nó cho thấy một điều khác.

Cửa vào là terminal, phần mềm chat, desktop hay WhatsApp không làm thay đổi việc agent chạm được gì, biết được gì, nên cửa vào có thể mở tùy ý, cũng có thể đóng tùy ý. Thứ thực sự tích lũy dần từng chút là ngữ cảnh: bộ nhớ, kỹ năng (skill), phiên, luồng hội thoại. Khi bạn đổi sản phẩm, thứ mất đi cũng chính là những cái này.

Thế là các nhà cung cấp gom cửa vào về nơi ngữ cảnh được tích lũy, còn môi trường thực thi thật sự làm việc lùi ra phía sau, trở thành backend có thể thay bất cứ lúc nào. ChatGPT desktop bản mới gom Chat, Work, Codex vào một lớp vỏ; Dots sang Codex hoặc Work để khởi tạo tác vụ, và các tác vụ đó vẫn tính mức sử dụng theo cách cũ. Bot Mode của Hermes chỉ là một plugin trên desktop, tắt nó đi thì profile và phiên vẫn còn: giao diện có thể tháo, trạng thái luôn được giữ lại.

Vì vậy, con hào bảo vệ thực sự của agent là trạng thái nó tích lũy thay bạn. Xuất ra, quên đi, đặt lại, cách ly: mấy việc này phải được làm như phần lõi của sản phẩm.

## Việc của nhóm: kênh cắt hai trục vào cùng một chỗ

Một khi ngữ cảnh thuộc về nhiều người, vấn đề mới xuất hiện. Tình hình của nhóm phân tán trên từng người, còn agent dùng cho một người chỉ thấy được ngữ cảnh của một người, và cũng chỉ dùng được quyền hạn của một người.

Kênh giải quyết cả hai đầu trong một lần. Claude Tag là Claude dành cho nhóm trong Slack: quản trị viên mở công cụ, dữ liệu và codebase cho nó theo từng kênh, ai trong kênh cũng có thể @ nó để giao việc; mỗi kênh một Claude, việc nó làm cả kênh đều thấy, quản trị viên còn đặt được trần chi tiêu và xem nhật ký thao tác. Ranh giới của quyền hạn và ranh giới của ngữ cảnh rơi vào cùng một kênh. Đó là lý do nó đứng được ở góc trên bên phải trên biểu đồ.

So với Bot Mode của Hermes: vài bot có tên, mỗi bot có vai trò, mô hình, bộ nhớ và kỹ năng riêng, chat nhóm được, nhắn cho nhau được, nhưng tất cả đều thuộc về cùng một người dùng. Đây là chia ngữ cảnh của một người thành vài phần, chứ chưa chạm tới ngữ cảnh của người khác.

Vì vậy, làm agent cho nhóm thì trước hết hãy tìm xem ngữ cảnh của nhóm đã tích ở đâu (kênh, dự án, repo), rồi gắn quyền hạn vào đó, đừng gắn vào một cá nhân nào.

## Danh tính: cắt quyền hạn mịn như ngữ cảnh

Vòng cuối cùng, vấn đề nằm ở chuyện “agent đăng nhập thành bạn”. Nó thao tác bằng danh tính của bạn, thứ nó nhận được là toàn bộ quyền hạn của bạn: không cắt nhỏ được, cũng không thu hồi riêng được; muốn thu thì phải thu luôn cả bạn.

Agent càng nhiều, vấn đề này càng bị phóng đại. Grok Bot là một ví dụ rất điển hình: vài Bot dùng chung một máy tính cloud, mỗi Bot có màn hình riêng; hội thoại và những gì học được tách theo từng Bot, nhưng file và trạng thái đăng nhập trình duyệt lại dùng chung. Ngữ cảnh đã cắt theo Bot, quyền hạn vẫn là một bộ duy nhất của cả tài khoản.

![Hình minh họa: vài Bot, mỗi Bot có ngữ cảnh riêng nhưng dùng chung quyền hạn của cả tài khoản; khi đổi sang mỗi agent có danh tính riêng, ngữ cảnh và quyền hạn đều được cắt theo từng agent](/assets/blog/agent-permission-context/identity-vi.svg)

*Chú thích: Bot nào cũng nắm toàn bộ quyền hạn, nhưng chỉ biết một phần tình hình.*

Cấp cho agent một danh tính của riêng nó là cách trực tiếp nhất để cắt quyền hạn mịn như ngữ cảnh. Cue cấp cho mỗi agent email, số điện thoại, ví và máy tính riêng, chỉ được thanh toán trong ngân sách bạn đặt; dot chuyên trách của Dots có danh tính riêng và phần cứng do IT cấu hình sẵn, nối được vào hệ thống công ty, nhưng hiện vẫn là preview. Như vậy, quyền hạn trở thành một thứ có thể cấp phát riêng, đặt hạn mức, thu hồi, không còn là một đoạn trạng thái đăng nhập cho agent mượn.

Có người sẽ hỏi, danh tính có tính là trục thứ ba không. Quan điểm của tôi là, thay vì nói nó tiến thêm một nấc sang phải trên trục ngang, đúng hơn là nó đang hỏi một câu khác: phần quyền hạn này thuộc về ai.

## Lời cuối

Mỗi lần đổi hình thái, suy cho cùng đều là cùng một chuyện: một trục lao lên trước, trục kia đuổi theo, và sản phẩm mới mọc lên ở chỗ hai trục chồng lấn. Lần tới gặp một agent mới, đừng vội nhìn cửa vào trông thế nào; hỏi nó hai câu là đủ: nó chạm được gì, nó biết được gì.
