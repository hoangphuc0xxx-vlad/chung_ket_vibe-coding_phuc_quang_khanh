import { describe, expect, it } from 'vitest';
import { napMau } from '../data/mau';
import { goiYTheoQuyTac, kiemTraGoiY } from './goiY';
import { congDiem, dangKy, doiUuDai, rong, thongKe, timThanhVien, tinhDiem, xepHang } from './loyalty';

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
