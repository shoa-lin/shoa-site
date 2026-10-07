---
translationKey: "gpt-6-astra-codex-harness"
locale: "vi"
title: "Từ vòng lặp theo lượt đến control plane: GPT-6 Astra viết lại Codex Harness như thế nào"
description: "Gọi công cụ bất đồng bộ, Mid-turn steering, suy luận động và Agents API đang đẩy việc phát triển Agent từ tự xây runtime sang phân tầng lại năng lực và trách nhiệm."
publishedAt: "2026-09-15"
updatedAt: "2026-09-15"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://developers.openai.com/api/docs/guides/latest-model"
sourceAuthor: "OpenAI Developers và tài liệu cộng đồng"
contentType: "adaptation"
translationStatus: "reviewed"
---

## Nói kết luận trước

Thay đổi mà GPT-6 Astra mang lại không chỉ là mô hình mạnh hơn, mà là mô hình thời gian, mô hình điều khiển và ranh giới runtime của Agent đều đang thay đổi.

Gọi công cụ bất đồng bộ cho phép mô hình tiếp tục xử lý những việc độc lập trong lúc công cụ chậm đang chạy; Mid-turn steering cho phép người dùng thay đổi yêu cầu khi mô hình chưa hoàn thành; `configuration_update` cho phép ứng dụng điều chỉnh cường độ suy luận của các bước sau mà không phải viết lại tham số suy luận ở cấp request, đồng thời giữ nguyên tiền tố prompt cache.

Thay đổi lớn hơn đến từ Agents API, được mở thử nghiệm công khai ngày 10 tháng 9 năm 2026. Nó cung cấp Codex Harness do OpenAI quản lý thông qua API: ứng dụng cung cấp chỉ dẫn cho mô hình, công cụ nghiệp vụ và môi trường thực thi; OpenAI quản lý phiên, điều phối, nén ngữ cảnh, khôi phục và luồng sự kiện.

Điều này có nghĩa là việc phát triển Agent đang trải qua một cuộc dịch chuyển trách nhiệm:

> Nền tảng hấp thụ runtime dùng chung, mô hình hấp thụ một phần giao thức tương tác, còn đội ứng dụng dồn sức trở lại cho năng lực nghiệp vụ, ranh giới quyền hạn, môi trường thực thi và xác minh kết quả.

## Vì sao trước đây tôi phải tự xây những thứ này

Thời kỳ đầu làm Agent, gọi công cụ bất đồng bộ và "vừa làm vừa đổi hướng" thường không phải là hai tham số API, mà là cả một cụm bài toán máy trạng thái.

Phải lưu các tác vụ chưa hoàn thành, phân biệt lượt của mô hình với tác vụ nền, xử lý khởi động lại tiến trình, timeout, hủy, callback trùng lặp và kết quả về sai thứ tự; phải chèn chỉ dẫn mới của người dùng vào luồng đang chạy, rồi còn phải phán đoán đầu ra cũ đã vô hiệu chưa, hành động đã thực hiện có rollback được không. Thay đổi cường độ suy luận lại ảnh hưởng đến cấu trúc request, tỷ lệ trúng cache và việc phát lại ngữ cảnh.

Những công việc kỹ thuật này không tạo ra giá trị nghiệp vụ, nhưng lại quyết định Agent có chạy ổn định được hay không. Các đội thường tốn rất nhiều thời gian để duy trì một "tầng bù đắp" dựng lên xung quanh các giới hạn của mô hình.

Astra bắt đầu biến một phần trong đó thành ngữ nghĩa của giao thức.

## Astra giúp mô hình không còn bị công cụ chậm chặn lại

Gọi công cụ bất đồng bộ trong Responses API yêu cầu đặt `async: true` trong định nghĩa function hoặc custom tool. Sau khi phát lệnh gọi, mô hình có thể tiếp tục hoàn thành những việc không phụ thuộc vào kết quả đó, còn ứng dụng trả kết quả về bằng `call_id` ban đầu khi tác vụ hoàn tất.

Thứ được giảm bớt ở đây là thời gian chờ phía mô hình, không phải khối lượng việc phía ứng dụng. OpenAI không chạy tác vụ nền thay ứng dụng, cũng không cung cấp hàng đợi nghiệp vụ. Hệ thống production vẫn phải quyết định ai chịu trách nhiệm cho tác vụ, cấp quyền ra sao, thử lại thế nào, kết quả lưu bao lâu và thất bại được trình bày như thế nào.

Nếu nhiều tác vụ chạy đồng thời, ứng dụng còn có thể định nghĩa một công cụ `wait_for_tasks` thông thường, để mô hình chỉ chờ khi thật sự cần so sánh kết quả. Công cụ wait này thuộc về giao thức riêng của ứng dụng.

Vì vậy, giá trị của khả năng bất đồng bộ không nằm ở việc gắn async cho mọi công cụ, mà ở việc khởi động sớm những việc thật sự độc lập, đồng thời giữ lại rào chắn phụ thuộc rõ ràng.

## Mid-turn steering biến người dùng thành tín hiệu điều khiển trong lúc chạy

Mid-turn steering của Astra được cung cấp qua chế độ WebSocket của Responses API. Ứng dụng gửi `response.steer`, API xếp yêu cầu mới của người dùng vào phản hồi hiện tại và tự động sinh continuation tiếp theo.

Nó không viết lại đầu ra đã gửi đi, cũng không thu hồi công cụ đã bắt đầu chạy. `accepted` chỉ có nghĩa là đầu vào đã được xếp hàng; mô hình đã thực thi hay chưa thì vẫn phải tiếp tục đọc sự kiện để xác nhận.

Do đó, steering là "bổ sung ràng buộc", không phải "quay ngược thời gian". Harness vẫn phải duy trì:

- quan hệ giữa phản hồi hiện tại và phản hồi successor;
- thứ tự của nhiều lần steering;
- ranh giới quyền hạn cho những tác dụng phụ đã xảy ra;
- xử lý xung đột giữa kết quả công cụ và hướng đi mới;
- chiến lược khôi phục khi đứt kết nối và khi giao nhận trùng lặp.

Cách này đáng tin cậy hơn kiểu viết tay "hủy request rồi dựng lại ngữ cảnh" trước kia, vì giao thức đã biểu đạt vòng đời của continuation; nhưng nó không thay ứng dụng định nghĩa ngữ nghĩa hoàn tác ở cấp nghiệp vụ.

## configuration_update biến cường độ suy luận thành trạng thái phiên

Ứng dụng có thể chèn vào lịch sử:

```json
{
  "type": "configuration_update",
  "reasoning": { "effort": "high" }
}
```

`reasoning.effort` ở cấp request giữ nguyên giá trị cũ; mục cập nhật chỉ ảnh hưởng đến các phản hồi sau đó. Nhờ vậy có thể dùng cường độ suy luận thấp cho tác vụ thông thường, nâng cường độ khi gặp phân tích sự cố hoặc đánh giá rủi ro, đồng thời giữ nguyên tiền tố prompt ban đầu, có lợi cho việc tái sử dụng cache.

Cơ chế này hiện chỉ hỗ trợ chế độ đơn Agent tiêu chuẩn của GPT-6 Astra và chỉ thay đổi reasoning effort; các cập nhật liền kề, compaction tự động và truncation tự động đều có giới hạn rõ ràng.

Ở đây cần phân biệt ba tầng: API đã hỗ trợ giao thức này, tầng dưới của Codex có thể đã có một phần cấu trúc dữ liệu, còn client Codex hiện tại có dùng nó đúng cách khi thay đổi cài đặt thông thường hay không thì cần kiểm chứng theo từng phiên bản cụ thể. Issue công khai [Codex Issue #42996](https://github.com/openai/codex/issues/42996) vẫn đang báo cáo vấn đề trúng cache sau khi chuyển cường độ suy luận, vì vậy không thể lấy thẳng tài liệu API làm bằng chứng rằng client đã tích hợp xong.

## Từ Responses API đến Codex Harness, rồi đến Agents API

OpenAI hiện nói rất rõ về ba loại ranh giới runtime:

| Cách tiếp cận | Ai quản lý runtime | Phù hợp với gì |
| --- | --- | --- |
| Responses API | Ứng dụng tự quản lý | Cần kiểm soát hoàn toàn vòng lặp Agent |
| Codex SDK / App Server | Tái sử dụng runtime Codex cục bộ | Tích hợp Codex vào công cụ và sản phẩm của mình |
| Agents API | Codex Harness do OpenAI quản lý | Muốn nền tảng quản lý phiên, điều phối, nén và khôi phục |

Ý nghĩa của Agents API là nó biến Harness dùng chung mà trước đây mỗi đội đều phải triển khai lại thành năng lực của nền tảng. Các năng lực được quản lý sẵn mà tài liệu chính thức liệt kê gồm sandbox, Skills, MCP, steering, quản lý ngữ cảnh, Agent con và khôi phục phiên.

Đội ứng dụng vẫn phải cung cấp công cụ và chọn môi trường thực thi, nhưng không cần triển khai từ đầu toàn bộ agent loop dùng chung.

Đây không phải là "giao hết mọi việc cho nền tảng". Nền tảng lo cơ chế vận hành dùng chung, ứng dụng lo sự thật nghiệp vụ. Ví dụ:

- tenant nào có quyền đọc dữ liệu này;
- lệnh gọi công cụ có được phép tạo tác dụng phụ ra bên ngoài không;
- thử lại có trừ tiền hoặc triển khai trùng lặp không;
- bằng chứng nào đủ để nói tác vụ đã hoàn thành;
- kết quả nào bắt buộc phải qua con người phê duyệt.

## Độ phức tạp của Harness không biến mất, mà được phân tầng lại

Có thể chia độ phức tạp kỹ thuật trước đây thành ba loại:

1. **Độ phức tạp bù đắp cho mô hình**: chờ đợi, dựng lại ngữ cảnh, giả lập việc ngắt giữa chừng, viết tay giao thức bất đồng bộ. Astra đang hấp thụ một phần trong đó.
2. **Độ phức tạp của runtime dùng chung**: phiên, luồng sự kiện, nén, khôi phục, Agent con và sandbox. Codex Harness và Agents API đang hấp thụ một phần trong đó.
3. **Độ phức tạp về tính đúng đắn nghiệp vụ**: quyền hạn, nhất quán dữ liệu, phê duyệt, idempotency, nghiệm thu và kiểm toán. Những thứ này vẫn thuộc về bản thân ứng dụng.

Vì vậy, thay đổi thật sự không phải là "sau này không cần làm kỹ thuật nữa", mà là trọng tâm kỹ thuật đã dịch chuyển:

```text
Trước đây: tự xây Agent Runtime
Bây giờ:   kết nối năng lực, khai báo ranh giới, xác minh kết quả
```

## Hàm ý đối với Codex

Nếu Codex Harness tiếp tục tiến hóa, phần lõi sẽ chuyển từ vòng lặp theo lượt sang control plane:

```text
Luồng sự kiện
  ├─ Phản hồi của mô hình
  ├─ Công cụ khởi động và hoàn thành
  ├─ Steering từ người dùng
  ├─ Cập nhật cấu hình suy luận
  └─ continuation

Control plane
  ├─ conversation head hiện tại
  ├─ pending task registry
  ├─ Quyền hạn và phê duyệt
  ├─ Bất biến của cache
  ├─ Khôi phục và idempotency
  └─ Xác minh kết quả
```

Các thảo luận trong cộng đồng về LangChain, Hermes, ZeroClaw và những gateway khác cũng cho thấy: sau khi giao thức xuất hiện, hệ sinh thái vẫn cần thời gian để thích nghi. Vấn đề thường gặp không phải là "có phát được trường async hay không", mà là chuyển đổi streaming, phát lại thông điệp, hoàn thành sai thứ tự, khôi phục sau đứt kết nối và giao nhận trùng lặp có giữ được ngữ nghĩa ban đầu hay không.

## Nhận định cuối cùng

Astra và Agents API cùng chỉ về một cách phân công mới cho Agent:

> Mô hình lo suy nghĩ linh hoạt hơn, giao thức lo biểu đạt điều khiển trong lúc chạy, Harness lo điều phối dùng chung, ứng dụng lo những ràng buộc thật trong thế giới nghiệp vụ.

Điều này sẽ giảm mạnh chi phí khởi đầu của một Agent mới. Vòng lặp bất đồng bộ, khôi phục trạng thái và can thiệp giữa chừng trước đây cần hàng tuần để dựng, trong tương lai có thể chỉ còn là cấu hình runtime và tích hợp công cụ.

Nhưng nó cũng nâng cao yêu cầu đối với đội ứng dụng về việc "định nghĩa vấn đề". Càng nhiều cơ chế dùng chung được nền tảng tiếp quản, phần thật sự tạo khác biệt càng dồn vào thiết kế công cụ, mô hình quyền hạn, ranh giới môi trường, bộ xác minh và vòng phản hồi khép kín.

Câu hỏi cốt lõi của việc phát triển Agent đang chuyển từ "làm sao để mô hình chạy được" sang "làm sao để nó được dùng một cách đáng tin cậy trong thế giới thật".

## Tài liệu tham khảo

- [OpenAI: Using GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI: Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling)
- [OpenAI: Mid-turn steering](https://developers.openai.com/api/docs/guides/steering)
- [OpenAI: Change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation)
- [OpenAI: Agents API overview](https://developers.openai.com/api/docs/guides/agents-api/overview)
- [OpenAI: Agents runtime comparison](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI: Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [OpenAI: Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Chasing Next: Async Tool Calling in the Responses API](https://chasingnext.com/updates/async-tool-calling-in-the-responses-api)
- [The Syntax Diaries: OpenAI Async Tool Calling Without Lost Results](https://thesyntaxdiaries.com/openai-async-tool-calling)
- [LangChain Issue #40204](https://github.com/langchain-ai/langchain/issues/40204)
