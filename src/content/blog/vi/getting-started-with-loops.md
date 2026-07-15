---
translationKey: "getting-started-with-loops"
locale: "vi"
title: "Bắt đầu với vòng lặp Claude Code: Từ lượt thủ công đến vòng lặp chủ động"
description: "Tìm hiểu cách kích hoạt và dừng vòng lặp theo lượt, mục tiêu, thời gian và chủ động, cùng thời điểm nên dùng từng loại."
publishedAt: "2026-07-07"
updatedAt: "2026-07-16"
category: "development"
sourceLocale: "en"
sourceUrl: "https://claude.com/blog/getting-started-with-loops"
sourceAuthor: "Delba de Oliveira, Michael Segner"
contentType: "adaptation"
translationStatus: "reviewed"
---

![Ảnh bìa hướng dẫn bắt đầu với vòng lặp](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6903d229e73ca2d0d73d78f7_682ac293884c9d4ee4ebe2355a2f6c4ecfdd9c1b-1000x1000.svg)

---

Hiện có rất nhiều thảo luận về việc “thiết kế vòng lặp” thay vì chỉ đưa prompt cho coding agent. Chỉ cần dành một chút thời gian trên X để tìm định nghĩa chính xác, bạn sẽ gặp nhiều câu trả lời khác nhau.

Đối với nhóm Claude Code, vòng lặp là quá trình agent lặp lại các chu kỳ công việc cho đến khi đạt điều kiện dừng. Nhóm phân biệt các loại vòng lặp theo một số chiều:

1. Vòng lặp được kích hoạt như thế nào.
2. Nó dừng như thế nào.
3. Nó sử dụng primitive nào của Claude Code.
4. Nó phù hợp nhất với loại nhiệm vụ nào.

Bài viết này trình bày các loại vòng lặp chính, thời điểm sử dụng và cách duy trì chất lượng mã trong khi kiểm soát token. Không phải nhiệm vụ nào cũng cần vòng lặp phức tạp. Hãy bắt đầu bằng giải pháp đơn giản nhất rồi áp dụng các mẫu này có chọn lọc.

## Bốn loại vòng lặp

Bài gốc mô tả bốn nhóm: vòng lặp theo lượt, theo mục tiêu, theo thời gian và chủ động. Chúng không chỉ khác nhau về mức độ tự động hóa. Mỗi loại có tác nhân kích hoạt, điều kiện dừng và ranh giới nhiệm vụ riêng.

### Vòng lặp theo lượt

![Sơ đồ vòng lặp theo lượt](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98c_8ace2295.png)

- **Kích hoạt bởi**: prompt của người dùng.
- **Điều kiện dừng**: Claude cho rằng đã hoàn thành nhiệm vụ hoặc cần thêm context.
- **Phù hợp nhất với**: nhiệm vụ ngắn, thực hiện một lần, không thuộc quy trình hay lịch định kỳ.
- **Kiểm soát mức dùng bằng**: prompt cụ thể và cải thiện xác minh bằng skill để giảm số lượt.

Mỗi prompt bạn gửi đều bắt đầu một vòng lặp thủ công, trong đó bạn chỉ đạo từng lượt. Claude thu thập context, hành động, kiểm tra công việc, lặp lại nếu cần rồi phản hồi. Đây là vòng lặp agent được mô tả trong bài gốc.

Ví dụ, hãy yêu cầu Claude tạo nút thích. Nó đọc mã, chỉnh sửa, chạy test và trả lại kết quả mà nó tin rằng hoạt động. Sau đó bạn kiểm tra và viết prompt tiếp theo.

Bạn có thể cải thiện bước xác minh bằng cách mã hóa các kiểm tra thủ công trong `SKILL.md`, cho phép Claude tự kiểm tra nhiều hơn từ đầu đến cuối. Hướng dẫn chọn giữa skill, hook và subagent cho dạng tự động hóa này có trong bài [Steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more). Skill nên cung cấp công cụ hoặc connector giúp Claude nhìn, đo hoặc tương tác với kết quả. Kiểm tra càng định lượng thì Claude càng dễ xác minh công việc của chính nó.

Ví dụ, skill xác minh frontend có thể như sau:

```markdown
---
name: verify-frontend-change
description: Verify any UI change end-to-end before declaring it done.
---

# Verifying frontend changes

Never report a UI change as complete based on a successful edit alone. Verify it the way a human reviewer would:

1. Start the dev server and open the edited page in the browser.
2. Interact with the change directly. For a new control (button, input, toggle): click it, confirm the expected state change, and screenshot before/after.
3. Check the browser console: zero new errors or warnings.
4. Use the Chrome DevTools MCP, run a performance trace and audit Core Web Vitals.

If any step fails, fix the issue and rerun from step 1 — do not hand back partially verified work.
```

Mục tiêu không phải viết một skill dùng cho mọi trường hợp, mà là diễn đạt rõ định nghĩa “hoàn thành” thực tế của bạn. Nếu không, Claude phải dựa vào phán đoán riêng để quyết định khi nào dừng.

### Vòng lặp theo mục tiêu

![Sơ đồ vòng lặp theo mục tiêu](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d98f_c6fa9ae5.png)

- **Kích hoạt bởi**: prompt thủ công theo thời gian thực.
- **Điều kiện dừng**: đạt mục tiêu hoặc chạm số lượt tối đa.
- **Phù hợp nhất với**: nhiệm vụ có tiêu chí thoát có thể xác minh.
- **Kiểm soát mức dùng bằng**: tiêu chí hoàn thành cụ thể và giới hạn lượt rõ ràng, chẳng hạn “dừng sau năm lần thử”.

Đôi khi một lượt không đủ, đặc biệt với nhiệm vụ phức tạp. Agent thường hoạt động tốt hơn khi được lặp. Với `/goal`, bạn định nghĩa trạng thái hoàn thành và cho Claude thêm không gian để tiếp tục hướng tới đó.

Khi tiêu chí thành công đã rõ, Claude không phải tự quyết định mức nào là “đủ tốt”, nên ít dừng quá sớm. Mỗi lần Claude muốn kết thúc, một mô hình đánh giá sẽ kiểm tra điều kiện. Nếu chưa đạt, nó đưa Claude trở lại làm việc cho đến khi hoàn thành mục tiêu hoặc hết giới hạn lượt.

Đó là lý do tiêu chí xác định hoạt động đặc biệt tốt: số test đã qua, ngưỡng điểm hoặc danh sách lỗi rỗng.

Ví dụ:

```text
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries.
```

Ý tưởng cốt lõi là chuyển quyền quyết định dừng từ cảm giác chủ quan của agent sang một điều kiện có thể kiểm tra.

### Vòng lặp theo thời gian

- **Kích hoạt bởi**: khoảng thời gian xác định.
- **Điều kiện dừng**: bạn hủy, hoặc công việc hoàn thành, chẳng hạn PR được merge hay hàng đợi trống.
- **Phù hợp nhất với**: công việc lặp lại hoặc nhiệm vụ tương tác với môi trường và hệ thống bên ngoài.
- **Kiểm soát mức dùng bằng**: khoảng thời gian dài hơn hoặc phản ứng theo sự kiện thay vì polling cố định.

Một số công việc agent mang tính lặp lại: nhiệm vụ không đổi nhưng đầu vào thay đổi. Tóm tắt tin nhắn Slack mỗi sáng là một ví dụ. Công việc khác phụ thuộc vào hệ thống bên ngoài, nơi mô hình tương tác đơn giản là kiểm tra định kỳ rồi phản ứng với thay đổi. Chẳng hạn PR có thể nhận comment review mới hoặc thất bại ở CI.

Trong các trường hợp này, `/loop` có thể chạy lại prompt theo chu kỳ. Ví dụ:

```text
/loop 5m check my PR, address review comments, and fix failing CI
```

`/loop` chạy trên máy của bạn nên sẽ dừng khi máy tắt. Để đưa vòng lặp lên cloud, dùng `/schedule` tạo routine.

Điều quan trọng là không chạy routine thường xuyên hơn tốc độ thay đổi thực của hệ thống. Một hàng đợi chỉ thay đổi mỗi giờ không nên tiêu tốn token vì bị quét mỗi phút.

### Vòng lặp chủ động

![Sơ đồ vòng lặp chủ động](https://cdn.prod.website-files.com/68a44d4040f98a4adf2207b6/6a43eb603762e725a739d989_eb9e496a.png)

- **Kích hoạt bởi**: sự kiện hoặc lịch, không có con người hiện diện theo thời gian thực.
- **Điều kiện dừng**: mỗi nhiệm vụ kết thúc khi đạt mục tiêu; routine tiếp tục đến khi bạn tắt.
- **Phù hợp nhất với**: luồng công việc lặp lại và được xác định rõ như bug report, triage issue, migration và nâng cấp dependency.
- **Kiểm soát mức dùng bằng**: chuyển routine sang mô hình nhỏ, nhanh và dành mô hình mạnh nhất cho quyết định cần phán đoán.

Các primitive trên, kết hợp với năng lực Claude Code khác như auto mode và dynamic workflows (research preview), có thể tạo vòng lặp cho công việc chạy dài hạn.

Ví dụ, để xử lý luồng phản hồi liên tục, bạn có thể kết hợp:

1. Dùng `/schedule` (research preview) chạy routine kiểm tra báo cáo mới.
2. Dùng `/goal` định nghĩa trạng thái hoàn thành và dùng skill ghi lại cách xác minh.
3. Dùng dynamic workflows điều phối agent triage từng báo cáo, sửa lỗi và review bản sửa.
4. Dùng auto mode để routine chạy mà không dừng ở mỗi bước để xin quyền.

Khi ghép lại, prompt có thể như sau:

```text
/schedule every hour: check #project-feedback for bug reports. /goal: don't stop until every report found this run is triaged, actioned, and responded to. When fixing a bug, use a workflow to explore three solutions in parallel worktrees and have a judge adversarially review them.
```

Đây không phải việc viết prompt dài hơn. Đó là đưa tác nhân kích hoạt, điều kiện dừng, khám phá song song, review và ranh giới quyền vào cùng một hệ thống chạy.

## Duy trì chất lượng mã

Chất lượng đầu ra của vòng lặp phụ thuộc vào hệ thống xung quanh. Bài gốc nhấn mạnh một số nguyên tắc thiết kế:

1. **Giữ codebase sạch**: Claude làm theo mẫu và quy ước đã có. Codebase lộn xộn cung cấp cho vòng lặp những mẫu lộn xộn để khuếch đại.
2. **Cho Claude cách xác minh công việc**: dùng [skill](https://code.claude.com/docs/en/skills) để mã hóa tiêu chuẩn tốt của bạn và nhóm.
3. **Giúp tài liệu dễ tiếp cận**: tài liệu framework và thư viện chứa best practice hiện tại, Claude cần truy cập được.
4. **Dùng agent thứ hai để code review**: reviewer có context mới ít thiên lệch hơn và không bị ảnh hưởng bởi suy luận của agent chính. Có thể dùng skill `/code-review` tích hợp hoặc GitHub [Code Review](https://code.claude.com/docs/en/code-review).

Khi một kết quả chưa đạt, đừng dừng sau khi sửa riêng vấn đề đó. Hãy mã hóa thất bại trở lại hệ thống để mọi lần lặp tương lai đều hưởng lợi. Thất bại nên trở thành skill, test, script, rule hoặc rubric review, không chỉ là patch dùng một lần.

## Quản lý token

Vòng lặp cần ranh giới rõ để kiểm soát token. Lời khuyên của bài gốc có thể tóm tắt như sau:

1. **Chọn đúng primitive và mô hình**: nhiệm vụ nhỏ không cần nhiều agent hay vòng lặp phức tạp. Một số có thể dùng mô hình rẻ và nhanh hơn.
2. **Định nghĩa tiêu chí thành công và dừng rõ ràng**: càng cụ thể, Claude càng nhanh đạt lời giải mà không dừng sớm.
3. **Thử nghiệm trước lần chạy lớn**: dynamic workflow có thể tạo nhiều agent. Hãy ước tính mức dùng trên phần nhỏ trước.
4. **Dùng script cho công việc xác định**: chạy script rẻ hơn yêu cầu mô hình suy luận lại cùng các bước mỗi lần. Ví dụ skill PDF có thể chứa script điền biểu mẫu để Claude chạy trực tiếp thay vì viết lại mã.
5. **Không chạy routine thường xuyên hơn cần thiết**: khớp khoảng thời gian với tốc độ thay đổi thực của hệ thống được quan sát.
6. **Xem lại mức dùng**: `/usage` phân tích mức dùng gần đây theo skill, subagent và MCP; `/goal` không tham số hiển thị số lượt và token hiện tại; `/workflows` cho thấy token của từng agent và cho phép dừng bất cứ lúc nào.

Lựa chọn [mô hình và mức effort](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) cũng là một trong những đòn bẩy lớn nhất đối với chi phí vòng lặp.

Tóm lại, vòng lặp không phải cách để agent chạy mãi mãi. Nó cho phép agent lặp công việc trong ranh giới rõ ràng.

## Bắt đầu

Bài gốc kết thúc bằng bảng so sánh phần công việc bạn giao cho từng vòng lặp:

| Vòng lặp | Phần bạn giao | Dùng khi | Công cụ phù hợp |
| --- | --- | --- | --- |
| Theo lượt | Bước kiểm tra | Bạn đang khám phá hoặc quyết định | Skill xác minh tùy chỉnh |
| Theo mục tiêu | Điều kiện dừng | Bạn biết trạng thái hoàn thành | `/goal` |
| Theo thời gian | Tác nhân kích hoạt | Công việc diễn ra bên ngoài dự án theo lịch | `/loop`, `/schedule` |
| Chủ động | Prompt | Công việc lặp lại và xác định rõ | Tất cả mục trên, cộng dynamic workflows |

Để bắt đầu với vòng lặp, hãy nhìn vào công việc bạn đang làm. Chọn một nhiệm vụ mà bạn là nút thắt và hỏi: bạn có viết được bước xác minh không? Mục tiêu có đủ rõ để đánh giá hoàn thành không? Công việc đến theo lịch hay qua sự kiện bên ngoài?

Khi có ý tưởng, hãy chạy vòng lặp. Quan sát nơi nó mắc kẹt hoặc vượt quá phạm vi rồi tiếp tục cải tiến hệ thống.

Để biết thêm, xem tài liệu Claude Code về [agent song song](https://code.claude.com/docs/en/agents), [loop](https://code.claude.com/docs/en/goal), [schedule](https://code.claude.com/docs/en/routines), [goal](https://code.claude.com/docs/en/goal) và [dynamic workflows](https://code.claude.com/docs/en/workflows#orchestrate-subagents-at-scale-with-dynamic-workflows).
