# Thẻ Thành Viên: hệ thống thẻ thành viên 2 đầu (Thành viên & Quầy)

Số hóa thẻ thành viên giấy: khách tích điểm khi mua hàng và đổi điểm lấy ưu đãi; nhân viên quầy là người cộng điểm.
Hai đầu là hai chế độ trong cùng một app, chuyển bằng nút **Thành viên / Quầy / Thể lệ** ở đầu trang.

## Tính năng

**Phần lõi (bắt buộc) – đã xong cả 7 mục**

| # | Yêu cầu của đề | Trong app |
| --- | --- | --- |
| 1 | Đăng ký bằng tên + số điện thoại, sinh mã duy nhất, hiện trên thẻ | Chế độ Thành viên → Đăng ký. Mã dạng `KT-009`, nối tiếp số lớn nhất. SĐT trùng bị từ chối. |
| 2 | Điểm và 3 hạng tự đổi theo mốc, thẻ đổi màu, công bố mốc | Thẻ nâu đồng / xám bạc / vàng. Mốc công bố ở mục **Thể lệ**. |
| 3 | Chế độ Quầy: mã thành viên + số tiền, cộng điểm theo tỉ lệ, cập nhật ngay | Chế độ Quầy → Cộng điểm. 10.000đ = 1 điểm. |
| 4 | Chống cộng trùng theo mã giao dịch | Nhập lại mã đã có → báo "Trùng mã giao dịch", không cộng. |
| 5 | Đổi điểm lấy ưu đãi (≥ 2 mức), trừ điểm đúng, có ví ưu đãi | 3 mức theo dữ liệu mẫu (500 / 1.100 / 2.000 điểm). Voucher vào **Ví ưu đãi**. |
| 6 | Lịch sử biến động điểm: loại, số điểm, thời gian | Chế độ Thành viên → Lịch sử; Quầy → Sổ giao dịch. |
| 7 | Nút **Nạp dữ liệu mẫu** | Chế độ Quầy → Dữ liệu (và ở màn hình Thành viên khi chưa có dữ liệu). |

**Thanh toán bằng điểm và hóa đơn – đã xong (làm thêm ngoài đề)**

- Tại Quầy, thành viên dùng điểm trừ thẳng vào hóa đơn: **1 điểm = 40đ**. Không vượt số dư, không vượt giá trị hóa đơn; có nút **Dùng tối đa**.
- **Hóa đơn** (tạm tính trước khi bấm, và bản đã lập sau khi bấm) ghi rõ: tổng tiền hàng, **trừ bằng điểm (số điểm × 40đ)**, khách cần trả, và phép tính điểm: số dư − điểm thanh toán + điểm tích lũy.
- Phần tiền khách thực trả vẫn được tích điểm (10.000đ = 1 điểm).
- Lịch sử của thành viên tách thành **hai mục riêng**: *Lịch sử cộng điểm* và *Lịch sử tiêu điểm* (đổi ưu đãi, thanh toán hóa đơn), mỗi mục có tổng.

**Điểm thưởng QR – đã xong**

- Thẻ hiện mã QR, nội dung đúng bằng mã thành viên (giống QR chuẩn của BTC, ví dụ `KT-004`).
- Quầy quét bằng **camera** (cần HTTPS hoặc localhost), hoặc **Quét từ ảnh** (chọn ảnh QR), rồi mở hồ sơ thành viên.

**Phần mở rộng – đã xong**

- Hiệu ứng: số điểm chạy dần, thông báo khi cộng điểm, màn chúc mừng khi lên hạng, thẻ chuyển màu.
- Thiết bị ngoại vi: camera quét QR; ô mã thành viên nhận **máy quét mã cầm tay** (gõ như bàn phím rồi Enter); nút **In thẻ** ra máy in.
- Thống kê mini: tổng thành viên, tổng điểm đã phát, điểm đã đổi, số voucher, số thành viên theo hạng.
- AI: mục **Gợi ý ưu đãi** (xem dưới).

## Thể lệ đội công bố

- **10.000đ = 1 điểm**, làm tròn xuống.
- **Đồng** dưới 1.000 điểm · **Bạc** 1.000 – 4.999 · **Vàng** từ 5.000.
- Hạng tính theo **điểm hiện có** (khớp bộ mẫu: KT-003 đổi điểm còn 800 thì là Đồng). Đổi nhiều điểm có thể giảm hạng; app báo trước ở từng ưu đãi.
- **Dùng điểm thanh toán: 1 điểm = 40đ** (khớp voucher 500 điểm = 20.000đ). Điểm tích lũy tính trên số tiền khách thực trả sau khi trừ điểm.
- Tổng điểm đã phát = điểm thành viên đang giữ + điểm đã tiêu (đổi ưu đãi, thanh toán).

## Cách chạy

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra (mặc định http://localhost:5173). Kiểm thử: `npm test`. Bản phát hành: `npm run build`.

Muốn dùng AI thật: sao chép `.env.example` thành `.env`, điền `GEMINI_API_KEY` (hoặc `NVIDIA_API_KEY`). Không có khóa app vẫn chạy đủ.

## Dữ liệu

- Toàn bộ dữ liệu lưu ở **localStorage** của trình duyệt (khóa `thethanhvien.state.v1`). App **chạy được khi mất mạng**; bản triển khai có service worker để mở lại được khi offline.
- **Dữ liệu mẫu** lấy từ file `Du_lieu_mau_Vibe_Coding_bangA.xlsx` của BTC (8 thành viên, 7 giao dịch, 3 ưu đãi), chép vào `src/data/mau.ts`. Là dữ liệu hư cấu.
- Nạp mẫu **không cộng lại điểm** (điểm hiện tại đã gồm giao dịch mẫu) và bấm nhiều lần **không nhân đôi**.
- Voucher, quà tặng là **mô phỏng**.

## Đồng bộ giữa các thiết bị (làm thêm, tùy chọn)

Đề yêu cầu lưu localStorage và chạy khi mất mạng, nên **localStorage vẫn là nơi lưu chính**. Phần đồng bộ là lớp thêm bên trên, tắt đi app vẫn chạy đủ.

- **Mặc định tắt**: mỗi trình duyệt có dữ liệu riêng, đúng như đề (nhờ vậy mỗi giám khảo chạy 5 ca kiểm tra trên dữ liệu sạch của mình).
- Bật ở **Quầy → Đồng bộ nhiều thiết bị**: nhập một **mã đồng bộ** (ví dụ `QUAY01`). Thiết bị nào nhập cùng mã thì dùng chung dữ liệu. Có thể mở nhanh bằng link `/?dongbo=QUAY01`.
- Khi đã bật và có mạng, app gọi `/api/sync` (hàm máy chủ) để kéo bản dữ liệu chung về, **gộp** với dữ liệu trên máy rồi đẩy lên. Cứ 5 giây kiểm tra một lần, nên quầy cộng điểm trên máy tính thì thẻ trên điện thoại tự cập nhật.
- Mất mạng: mọi thao tác vẫn ghi vào localStorage; có mạng lại app tự gộp và đẩy lên. Dòng trạng thái dưới tiêu đề cho biết đang đồng bộ, đã đồng bộ, hay chỉ lưu trên máy.
- Quy tắc gộp (`src/lib/dongBo.ts`, có test): sổ giao dịch, lịch sử điểm, hóa đơn, ví là dữ liệu chỉ thêm nên lấy hợp theo mã; điểm của thành viên lấy theo biến động mới nhất; "Xóa toàn bộ dữ liệu" cũng được đồng bộ.
- Máy chủ chỉ ghi khi phiên bản còn khớp (khóa lạc quan), nên hai máy ghi cùng lúc không đè mất dữ liệu của nhau.
- Database: Supabase, một bảng `trang_thai`, mỗi mã đồng bộ là một dòng. Bảng bật RLS và **không có policy**, khóa secret chỉ nằm ở biến môi trường máy chủ, trình duyệt không bao giờ thấy.

Bật đồng bộ: tạo bảng bằng SQL dưới đây, rồi điền `SUPABASE_URL` và `SUPABASE_SECRET_KEY` vào `.env` (và vào biến môi trường của Vercel).

```sql
create table trang_thai (
  id text primary key,
  du_lieu jsonb not null,
  phien_ban bigint not null default 1,
  cap_nhat timestamptz not null default now()
);
alter table trang_thai enable row level security;
```

Hạn chế của phần đồng bộ: app không có đăng nhập (đề cho phép), nên ai biết mã đồng bộ cũng xem và sửa được dữ liệu của mã đó; hai máy **cùng mất mạng** mà cùng đăng ký thành viên mới, hoặc cùng giao dịch cho một thành viên, thì khi gộp có thể trùng mã hoặc lệch số dư.

## AI trong app

- AI dùng cho một việc: **gợi ý nên đổi ưu đãi nào** với số điểm hiện có (chế độ Thành viên → Gợi ý ưu đãi).
- Trình duyệt gọi `/api/ai`; hàm phía máy chủ gọi Gemini (`gemini-flash-lite-latest`), lỗi thì thử NVIDIA NIM. **Khóa API chỉ nằm ở biến môi trường phía máy chủ.**
- Chỉ gửi cho AI: tên, số điểm, hạng, danh sách ưu đãi. **Không gửi số điện thoại.**
- AI phải trả JSON đúng mẫu; app kiểm tra đủ trường, cắt độ dài. Sai định dạng, quá 15 giây, mất mạng hoặc không có khóa → dùng **gợi ý theo quy tắc trên máy** (ưu tiên ưu đãi cao nhất mà vẫn giữ hạng).
- Kết quả luôn ghi nguồn: **"Nguồn: AI"** hoặc **"Nguồn: quy tắc trên máy (không dùng AI)"**.
- Các tính năng lõi (điểm, hạng, đổi ưu đãi) **không phụ thuộc AI**.

## Kiểm thử

`npm test`: 25 test Vitest đạt (`src/lib/loyalty.test.ts`, `src/lib/qr.test.ts`, `src/lib/dongBo.test.ts`), gồm 5 ca của BTC trong sheet `KT_CaKiemTra`.
Test QR vẽ mã `KT-004` thành điểm ảnh rồi giải mã lại, giống camera chụp thẻ.

| Mã | Tình huống | Đầu vào | Kết quả mong đợi | Kết quả |
| --- | --- | --- | --- | --- |
| TC-KT-01 | Cộng điểm mới | KT-008, TX-NEW-001, 1.000.000đ | +100 điểm một lần, số dư 0 → 100 | Đạt (test tự động + thử tay) |
| TC-KT-02 | Nhập lại giao dịch | KT-002, TX-KT-002 | Báo trùng, không cộng 150 điểm | Đạt (test tự động) |
| TC-KT-03 | Đổi ưu đãi đủ điểm | KT-005 đổi KT-VCH-01 | Voucher vào ví, 5.800 → 5.300 | Đạt (test tự động) |
| TC-KT-04 | Đổi ưu đãi thiếu điểm | KT-008 đổi KT-VCH-01 | Từ chối, số dư vẫn 0 | Đạt (test tự động) |
| TC-KT-05 | Quét QR chuẩn | Nội dung QR: KT-004 | Mở đúng hồ sơ Dũng Phạm | Đạt phần tra mã (test tự động); quét camera thử tay |
| TC-06 | Nạp mẫu hai lần | Bấm Nạp dữ liệu mẫu 2 lần | Vẫn 8 thành viên, điểm không đổi | Đạt (test tự động) |
| TC-07 | Đăng ký | Tên + SĐT hợp lệ / SĐT trùng / SĐT sai | Sinh KT-009 / từ chối / từ chối | Đạt (test tự động) |
| TC-08 | Lên hạng ngay | KT-003 800 điểm + 2.000.000đ | 1.000 điểm, Đồng → Bạc | Đạt (test tự động) |
| TC-09 | Dữ liệu sai ở Quầy | Sai mã, tiền 0, thiếu mã GD, dưới 10.000đ | Báo lỗi cụ thể, không cộng | Đạt (test tự động) |
| TC-11 | Thanh toán bằng điểm | KT-004, hóa đơn 1.000.000đ, dùng 200 điểm | Trừ 8.000đ, trả 992.000đ, +99 điểm, số dư 3.200 → 3.099 | Đạt (test tự động + thử tay) |
| TC-12 | Dùng điểm quá mức | Quá số dư; quá giá trị hóa đơn; số lẻ | Từ chối, số dư giữ nguyên | Đạt (test tự động) |
| TC-13 | Trả toàn bộ bằng điểm | KT-006, hóa đơn 100.000đ, dùng 2.500 điểm | Khách trả 0đ, không cộng điểm | Đạt (test tự động) |
| TC-10 | AI hỏng hoặc mất mạng | Tắt mạng rồi bấm Gợi ý | Ra gợi ý theo quy tắc, ghi rõ nguồn | Đạt (test tự động cho quy tắc) |

## Cấu trúc

```
src/lib/loyalty.ts     quy tắc điểm, hạng, đăng ký, cộng, đổi (hàm thuần, có test)
src/lib/goiY.ts        gợi ý ưu đãi: AI + dự phòng theo quy tắc
src/lib/storage.ts     đọc ghi localStorage an toàn
src/data/mau.ts        dữ liệu mẫu của BTC và hàm nạp
src/App.tsx            giao diện 3 chế độ, thẻ, QR, quét camera
src/lib/dongBo.ts      gộp dữ liệu giữa các thiết bị, gọi /api/sync
api/ai.js              hàm máy chủ gọi AI (Vercel Function)
api/sync.js            hàm máy chủ đồng bộ với Supabase (Vercel Function)
public/sw.js           service worker cho chế độ offline
```

## Hạn chế và hướng phát triển

- Khi chưa bật đồng bộ, dữ liệu nằm trên một trình duyệt: quầy và khách phải dùng chung máy. Bật đồng bộ (mục trên) thì nhiều thiết bị dùng chung dữ liệu. Hướng tiếp: đăng nhập thật cho nhân viên và tách bảng theo từng loại dữ liệu.
- Không có phân quyền thật (đề cho phép): ai cũng chuyển được sang chế độ Quầy.
- Quét QR phụ thuộc quyền camera của trình duyệt; đã có phương án quét từ ảnh và gõ tay.
- Chưa có hạn dùng voucher và chưa hoàn điểm khi hủy giao dịch.

## Làm bằng Vibe Coding

Sản phẩm dựng trong 60 phút cùng Claude Code. Nhóm đọc đề, chốt thể lệ và phạm vi, duyệt từng phần, yêu cầu viết test theo đúng 5 ca của BTC trước khi làm giao diện. Xem `PROMPTS.md`.
