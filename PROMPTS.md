# Nhật ký Vibe Coding

Công cụ: Claude Code. Nhóm ra yêu cầu, chốt quy tắc, duyệt kết quả; AI viết code và chạy kiểm thử. Giờ ghi gần đúng.

| Lúc | Nhóm yêu cầu | AI làm | Nhóm quyết định / sửa |
| --- | --- | --- | --- |
| Trước giờ thi | Chuẩn bị: thư mục ngoài OneDrive, Vercel CLI, khóa AI để trong `.env` | Cài Vercel CLI, kiểm tra thư mục, chỉ ra rủi ro OneDrive khóa file | Chuyển thư mục dự án ra ngoài OneDrive |
| Phút 0 | Gửi đề + file dữ liệu mẫu, yêu cầu **phân tích và hỏi lại trước khi làm** | Đọc đề, đọc 7 sheet Excel, liệt kê 7 mục lõi, hỏi 2 câu | Chọn: còn 40 phút; làm thêm QR, hiệu ứng, thống kê, ngoại vi, AI |
| Phút 3 | Chốt thể lệ | Đề xuất 10.000đ = 1 điểm; Đồng/Bạc/Vàng 0 / 1.000 / 5.000; hạng theo điểm hiện có (khớp KT-003 trong mẫu) | Đồng ý, công bố ở mục Thể lệ |
| Phút 5 | Viết phần quy tắc thành hàm thuần + test theo đúng 5 ca của BTC **trước** giao diện | `src/lib/loyalty.ts`, `src/data/mau.ts`, 13 test | Test đạt mới cho làm giao diện |
| Phút 12 | Giao diện 2 vai, thẻ đổi màu, QR, quét camera, ví, lịch sử, thống kê | `src/App.tsx`, `src/styles.css` | Thử tay TC-KT-01 trên trình duyệt: 0 → 100 điểm, đúng |
| Phút 20 | Nối AI thật, có dự phòng | `api/ai.js` (Gemini → NVIDIA → quy tắc) | Xem 3 lỗi bên dưới |
| Phút 30 | README, build, deploy | README, `npm run build`, Vercel | Kiểm tra link bằng tab ẩn danh |

| Sau khi nộp bản đầu | Nhóm yêu cầu thêm: tách lịch sử cộng / tiêu điểm, dùng điểm để thanh toán, hóa đơn ghi rõ điểm trừ | Hàm `thanhToan` + 4 test, hóa đơn tạm tính và hóa đơn đã lập, 2 mục lịch sử | AI đề xuất 1 điểm = 40đ cho khớp voucher; nhóm chốt lại **1 điểm = 10.000đ**. Test: KT-004 dùng 20 điểm cho hóa đơn 1.000.000đ: trừ 200.000đ, số dư 3.200 → 3.260 |

| Tiếp theo | Nhóm nhận ra: không có database nên dữ liệu không đi theo thiết bị. AI đưa 2 phương án (xuất/nhập file, hoặc đồng bộ database) và nêu rủi ro lệch đề | Nhóm chọn đồng bộ database | AI giữ localStorage làm nơi lưu chính, thêm `/api/sync` + quy tắc gộp có 6 test; khóa database chỉ ở máy chủ; chưa cấu hình thì app tự chạy chế độ chỉ lưu trên máy |

## Ba lần AI sai và cách nhóm xử lý

1. **Công cụ xem thử mở nhầm dự án cũ** (SitePulse) thay vì app thi. Phát hiện nhờ đọc tiêu đề trang, tắt đi và chạy lại đúng thư mục.
2. **Tên mô hình AI lỗi thời**: `gemini-2.5-flash` trả 404, `gemini-flash-latest` quá 10 giây. Không đoán tiếp: gọi API liệt kê mô hình, đo thời gian thật, chọn `gemini-flash-lite-latest` (khoảng 1 giây).
3. **AI trả lời sai nghiệp vụ**: Gemini khuyên Hà Võ (5.800 điểm) đổi quà 2.000 điểm và nói "vẫn giữ hạng Vàng", trong khi còn 3.800 điểm là hạng Bạc. Sửa hai lớp:
   - Máy chủ **tính sẵn** số dư và hạng sau khi đổi cho từng ưu đãi, AI chỉ diễn đạt.
   - App **tự kiểm tra lại** câu trả lời (`kiemTraGoiY`): hiện dòng "App đã kiểm tra…", và bỏ hẳn gợi ý nếu AI đề xuất ưu đãi không đủ điểm. Có test cho đúng tình huống này.

## Nguyên tắc nhóm giữ

- Tính năng lõi không phụ thuộc AI và không phụ thuộc mạng.
- Mọi con số (điểm, hạng, số dư) do code tính, không để AI tính.
- Khóa API chỉ ở `.env` phía máy chủ, không commit, không nằm trong mã trình duyệt.
- Nói thật trong README những gì chưa làm.
