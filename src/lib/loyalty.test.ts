import { describe, expect, it } from 'vitest';
import { napMau } from '../data/mau';
import { goiYTheoQuyTac, kiemTraGoiY } from './goiY';
import { congDiem, dangKy, diemToiDa, doiUuDai, rong, thanhToan, thongKe, timThanhVien, tinhDiem, xepHang } from './loyalty';

const now = new Date('2026-11-17T09:00:00+07:00');
const mau = () => napMau(rong()).state;
const diem = (s: ReturnType<typeof mau>, ma: string) => s.thanhVien.find((m) => m.ma === ma)!.diem;

describe('Quy tắc điểm và hạng', () => {
  it('10.000đ = 1 điểm, làm tròn xuống', () => {
    expect(tinhDiem(1_000_000)).toBe(100);
    expect(tinhDiem(19_999)).toBe(1);
    expect(tinhDiem(9_999)).toBe(0);
    expect(tinhDiem(-5)).toBe(0);
    expect(tinhDiem(Number.NaN)).toBe(0);
  });
  it('mốc hạng: Đồng dưới 1.000, Bạc 1.000–4.999, Vàng từ 5.000', () => {
    expect(xepHang(0)).toBe('Đồng');
    expect(xepHang(999)).toBe('Đồng');
    expect(xepHang(1000)).toBe('Bạc');
    expect(xepHang(4999)).toBe('Bạc');
    expect(xepHang(5000)).toBe('Vàng');
  });
});

describe('Ca kiểm tra của BTC (sheet KT_CaKiemTra)', () => {
  it('TC-KT-01: cộng điểm mới cho KT-008, 1.000.000đ → +100, số dư 0 lên 100', () => {
    const r = congDiem(mau(), 'KT-008', 1_000_000, 'TX-NEW-001', now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.thayDoi).toBe(100);
    expect(diem(r.state, 'KT-008')).toBe(100);
    // nhập lại đúng mã vừa cộng cũng bị chặn
    const r2 = congDiem(r.state, 'KT-008', 1_000_000, 'tx-new-001', now);
    expect(r2.ok).toBe(false);
  });
  it('TC-KT-02: nhập lại TX-KT-002 → báo trùng, không cộng thêm 150 điểm', () => {
    const s = mau();
    const r = congDiem(s, 'KT-002', 1_500_000, 'TX-KT-002', now);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.loi).toContain('Trùng mã giao dịch');
    expect(diem(s, 'KT-002')).toBe(1450);
  });
  it('TC-KT-03: KT-005 đổi KT-VCH-01 → có voucher trong ví, 5800 còn 5300', () => {
    const r = doiUuDai(mau(), 'KT-005', 'KT-VCH-01', now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(diem(r.state, 'KT-005')).toBe(5300);
    expect(r.state.vi.filter((v) => v.maTV === 'KT-005')).toHaveLength(1);
    expect(r.state.bienDong[0]).toMatchObject({ loai: 'Đổi điểm', diem: -500, soDu: 5300 });
  });
  it('TC-KT-04: KT-008 đổi KT-VCH-01 khi thiếu điểm → từ chối, số dư vẫn 0', () => {
    const s = mau();
    const r = doiUuDai(s, 'KT-008', 'KT-VCH-01', now);
    expect(r.ok).toBe(false);
    expect(diem(s, 'KT-008')).toBe(0);
    expect(s.vi).toHaveLength(0);
  });
  it('TC-KT-05: nội dung QR "KT-004" mở đúng hồ sơ Dũng Phạm', () => {
    expect(timThanhVien(mau(), ' kt-004 ')?.ten).toBe('Dũng Phạm');
    expect(timThanhVien(mau(), 'KT-999')).toBeUndefined();
  });
});

describe('Nạp dữ liệu mẫu', () => {
  it('nạp 8 thành viên, 7 giao dịch, không cộng lại điểm; bấm lần hai không nhân đôi', () => {
    const a = napMau(rong());
    expect(a.state.thanhVien).toHaveLength(8);
    expect(a.state.giaoDich).toHaveLength(7);
    expect(diem(a.state, 'KT-004')).toBe(3200);
    const b = napMau(a.state);
    expect(b.them).toBe(0);
    expect(b.state.thanhVien).toHaveLength(8);
    expect(diem(b.state, 'KT-004')).toBe(3200);
  });
  it('thống kê bộ mẫu: 8 thành viên, tổng điểm đã phát 28.900', () => {
    const t = thongKe(mau());
    expect(t.tongThanhVien).toBe(8);
    expect(t.tongDiemDaPhat).toBe(28900);
    expect(t.theoHang).toEqual({ Đồng: 3, Bạc: 3, Vàng: 2 });
  });
});

describe('Đăng ký và các trường hợp sai', () => {
  it('sinh mã duy nhất nối tiếp, từ chối số điện thoại trùng hoặc sai dạng', () => {
    const a = dangKy(mau(), '  Lan   Phạm ', '0900 001 009', now);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.thanhVien).toMatchObject({ ma: 'KT-009', ten: 'Lan Phạm', sdt: '0900001009', diem: 0 });
    expect(dangKy(a.state, 'Người Khác', '0900001009', now).ok).toBe(false);
    expect(dangKy(a.state, 'Người Khác', '12345', now).ok).toBe(false);
    expect(dangKy(a.state, ' ', '0900001010', now).ok).toBe(false);
    const b = dangKy(a.state, 'Người Khác', '0900001010', now);
    expect(b.ok && b.thanhVien.ma).toBe('KT-010');
  });
  it('cộng điểm làm lên hạng ngay: KT-003 800 + 2.000.000đ → 1.000 điểm, Bạc', () => {
    const r = congDiem(mau(), 'KT-003', 2_000_000, 'TX-NEW-002', now);
    expect(r.ok && r.hangTruoc).toBe('Đồng');
    expect(r.ok && r.hangSau).toBe('Bạc');
  });
  it('từ chối: sai mã thành viên, số tiền không hợp lệ, thiếu mã giao dịch, dưới 10.000đ', () => {
    const s = mau();
    expect(congDiem(s, 'KT-999', 100000, 'TX-A01', now).ok).toBe(false);
    expect(congDiem(s, 'KT-001', 0, 'TX-A01', now).ok).toBe(false);
    expect(congDiem(s, 'KT-001', Number.NaN, 'TX-A01', now).ok).toBe(false);
    expect(congDiem(s, 'KT-001', 100000, '  ', now).ok).toBe(false);
    expect(congDiem(s, 'KT-001', 5000, 'TX-A01', now).ok).toBe(false);
  });
});

describe('Thanh toán bằng điểm (1 điểm = 40đ)', () => {
  it('KT-004 dùng 200 điểm cho hóa đơn 1.000.000đ: trừ 8.000đ, trả 992.000đ, cộng 99 điểm, số dư 3.099', () => {
    const r = thanhToan(mau(), 'KT-004', 1_000_000, 200, 'TX-PAY-001', now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hoaDon).toMatchObject({ tongTien: 1_000_000, diemDung: 200, giamTru: 8000, conPhaiTra: 992_000, diemCong: 99, soDuTruoc: 3200, soDuSau: 3099 });
    expect(diem(r.state, 'KT-004')).toBe(3099);
    // lịch sử có 2 dòng riêng: tiêu điểm và cộng điểm
    const ls = r.state.bienDong.filter((b) => b.thamChieu === 'TX-PAY-001');
    expect(ls.map((b) => [b.loai, b.diem, b.soDu])).toEqual([
      ['Cộng điểm', 99, 3099],
      ['Tiêu điểm', -200, 3000],
    ]);
    // nhập lại cùng mã: không trừ, không cộng lần nữa
    expect(thanhToan(r.state, 'KT-004', 1_000_000, 200, 'TX-PAY-001', now).ok).toBe(false);
  });
  it('từ chối khi dùng quá số dư hoặc quá giá trị hóa đơn; số dư giữ nguyên', () => {
    const s = mau();
    expect(thanhToan(s, 'KT-001', 1_000_000, 300, 'TX-PAY-002', now).ok).toBe(false); // KT-001 chỉ có 250
    expect(thanhToan(s, 'KT-006', 100_000, 3000, 'TX-PAY-003', now).ok).toBe(false); // 3.000 điểm = 120.000đ > 100.000đ
    expect(diemToiDa(12500, 100_000)).toBe(2500);
    expect(thanhToan(s, 'KT-006', 100_000, 1.5, 'TX-PAY-004', now).ok).toBe(false);
    expect(diem(s, 'KT-001')).toBe(250);
  });
  it('trả toàn bộ bằng điểm: khách trả 0đ, không cộng điểm', () => {
    const r = thanhToan(mau(), 'KT-006', 100_000, 2500, 'TX-PAY-005', now);
    expect(r.ok && r.hoaDon.conPhaiTra).toBe(0);
    expect(r.ok && r.hoaDon.diemCong).toBe(0);
    expect(r.ok && r.soDu).toBe(10000);
  });
  it('không dùng điểm thì giống cộng điểm thường và vẫn lập hóa đơn (TC-KT-01)', () => {
    const r = thanhToan(mau(), 'KT-008', 1_000_000, 0, 'TX-NEW-001', now);
    expect(r.ok && r.hoaDon).toMatchObject({ diemDung: 0, giamTru: 0, conPhaiTra: 1_000_000, diemCong: 100, soDuSau: 100 });
  });
});

describe('Gợi ý ưu đãi theo quy tắc (dự phòng khi AI không chạy)', () => {
  it('thiếu điểm thì nói còn thiếu bao nhiêu; đủ điểm thì ưu tiên giữ hạng', () => {
    const s = mau();
    expect(goiYTheoQuyTac(s.thanhVien.find((m) => m.ma === 'KT-008')!).goiY).toContain('thiếu 500');
    // KT-005 có 5.800: đổi 2.000 hay 1.100 đều rớt Vàng, chỉ đổi 500 là giữ hạng
    expect(goiYTheoQuyTac(s.thanhVien.find((m) => m.ma === 'KT-005')!).goiY).toContain('Voucher 20.000đ');
    // KT-006 có 12.500: đổi mức cao nhất vẫn Vàng
    expect(goiYTheoQuyTac(s.thanhVien.find((m) => m.ma === 'KT-006')!).goiY).toContain('Quà tặng đặc biệt');
  });
  it('kiểm soát đầu ra AI: tự tính lại hạng sau khi đổi, bỏ gợi ý khi không đủ điểm', () => {
    const s = mau();
    const ha = s.thanhVien.find((m) => m.ma === 'KT-005')!;
    // AI từng nói sai "đổi 2.000 vẫn giữ Vàng": app phải tự nói đúng là về Bạc
    expect(kiemTraGoiY(ha, 'Bạn nên đổi Quà tặng đặc biệt.')).toContain('từ Vàng về Bạc');
    expect(kiemTraGoiY(ha, 'Bạn nên đổi Voucher 20.000đ.')).toContain('vẫn hạng Vàng');
    const phuc = s.thanhVien.find((m) => m.ma === 'KT-008')!;
    expect(kiemTraGoiY(phuc, 'Hãy đổi Voucher 20.000đ ngay.')).toBeNull();
    expect(kiemTraGoiY(phuc, 'Bạn hãy tích thêm điểm nhé.')).toBe('');
  });
});
