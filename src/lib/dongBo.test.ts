import { describe, expect, it } from 'vitest';
import { napMau } from '../data/mau';
import { chuan, gop } from './dongBo';
import { dangKy, doiUuDai, dungVoucher, rong, thanhToan, type State } from './loyalty';

const t = (phut: number) => new Date(`2026-11-17T09:${String(phut).padStart(2, '0')}:00+07:00`);
const mau = () => napMau(rong()).state;
const diem = (s: State, ma: string) => s.thanhVien.find((m) => m.ma === ma)!.diem;
const buoc = <T extends { ok: boolean }>(r: T) => {
  if (!r.ok) throw new Error('thao tác mẫu thất bại');
  return (r as unknown as { state: State }).state;
};

describe('Gộp dữ liệu giữa hai thiết bị', () => {
  it('máy quầy cộng điểm, máy khách đổi ưu đãi cho người khác: gộp lại có đủ cả hai', () => {
    const goc = mau();
    const quay = buoc(thanhToan(goc, 'KT-008', 1_000_000, 0, 'TX-NEW-001', t(1)));
    const khach = buoc(doiUuDai(goc, 'KT-005', 'KT-VCH-01', t(2)));
    const g = gop(quay, khach);
    expect(diem(g, 'KT-008')).toBe(100);
    expect(diem(g, 'KT-005')).toBe(5300);
    expect(g.vi).toHaveLength(1);
    expect(g.giaoDich.some((x) => x.ma === 'TX-NEW-001')).toBe(true);
    expect(g.hoaDon).toHaveLength(1);
    // gộp theo chiều nào cũng ra cùng kết quả, gộp lại lần nữa không đổi
    expect(chuan(gop(khach, quay))).toBe(chuan(g));
    expect(chuan(gop(g, quay))).toBe(chuan(g));
  });
  it('máy mới (chưa có gì) nhận toàn bộ dữ liệu từ máy chủ', () => {
    const xa = buoc(thanhToan(mau(), 'KT-004', 1_000_000, 20, 'TX-PAY-001', t(3)));
    const g = gop(rong(), xa);
    expect(g.thanhVien).toHaveLength(8);
    expect(diem(g, 'KT-004')).toBe(3260);
  });
  it('thành viên đăng ký ở máy này xuất hiện ở máy kia', () => {
    const a = buoc(dangKy(mau(), 'Lan Phạm', '0900001009', t(4)));
    const g = gop(mau(), a);
    expect(g.thanhVien.map((m) => m.ma)).toContain('KT-009');
  });
  it('voucher đã dùng ở một máy thì gộp xong vẫn là đã dùng', () => {
    const a = buoc(doiUuDai(mau(), 'KT-005', 'KT-VCH-01', t(5)));
    const b = dungVoucher(a, a.vi[0].id);
    expect(gop(a, b).vi[0].daDung).toBe(true);
    expect(gop(b, a).vi[0].daDung).toBe(true);
  });
  it('lệnh "Xóa toàn bộ dữ liệu" thắng dữ liệu cũ ở máy khác', () => {
    const cu = buoc(thanhToan(mau(), 'KT-008', 1_000_000, 0, 'TX-NEW-001', t(6)));
    const daXoa: State = { ...rong(), dot: 1763350000000 };
    expect(gop(cu, daXoa).thanhVien).toHaveLength(0);
    expect(gop(daXoa, cu).thanhVien).toHaveLength(0);
  });
  it('chuỗi chuẩn không đổi khi gộp một trạng thái với chính nó', () => {
    const s = buoc(thanhToan(mau(), 'KT-004', 1_000_000, 20, 'TX-PAY-001', t(7)));
    expect(chuan(gop(s, s))).toBe(chuan(s));
    // dòng cộng điểm của cùng hóa đơn đứng trước dòng tiêu điểm, số dư cuối đúng
    expect(gop(s, s).bienDong.slice(0, 2).map((b) => b.loai)).toEqual(['Cộng điểm', 'Tiêu điểm']);
  });
});
