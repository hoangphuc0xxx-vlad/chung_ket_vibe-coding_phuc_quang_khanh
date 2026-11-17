// Đồng bộ giữa các thiết bị. localStorage vẫn là nơi lưu chính; có mạng thì gộp với bản trên máy chủ.
import type { State, Voucher } from './loyalty';

function hop<T>(a: T[], b: T[], khoa: (x: T) => string): T[] {
  const m = new Map<string, T>();
  for (const x of b) m.set(khoa(x), x);
  for (const x of a) m.set(khoa(x), x);
  return [...m.values()];
}

const moiTruoc = <T extends { thoiGian: string }>(a: T[], phu?: (x: T, y: T) => number): T[] =>
  [...a].sort((x, y) => y.thoiGian.localeCompare(x.thoiGian) || (phu ? phu(x, y) : 0));

// Gộp dữ liệu của hai máy. Hàm thuần, có test.
// - Sổ giao dịch, lịch sử điểm, hóa đơn, ví: chỉ thêm, không sửa, nên lấy hợp theo mã.
// - Điểm của thành viên = số dư ghi ở biến động mới nhất của người đó.
// - "Xóa toàn bộ dữ liệu" tăng số `dot`; bên nào có `dot` lớn hơn thì thắng toàn bộ.
export function gop(a: State, b: State): State {
  const da = a.dot ?? 0;
  const db = b.dot ?? 0;
  if (da !== db) return da > db ? a : b;

  const thuTuLoai = (l: string) => (l === 'Cộng điểm' ? 0 : 1); // cùng một hóa đơn: dòng cộng điểm xảy ra sau dòng tiêu điểm
  const bienDong = moiTruoc(
    hop(a.bienDong, b.bienDong, (x) => x.id),
    (x, y) => thuTuLoai(x.loai) - thuTuLoai(y.loai),
  );
  const giaoDich = moiTruoc(hop(a.giaoDich, b.giaoDich, (x) => x.ma));
  const hoaDon = moiTruoc(hop(a.hoaDon ?? [], b.hoaDon ?? [], (x) => x.ma));

  const viB = new Map(b.vi.map((v) => [v.id, v]));
  const viA = new Map(a.vi.map((v) => [v.id, v]));
  const vi: Voucher[] = moiTruoc(hop(a.vi, b.vi, (x) => x.id)).map((v) => ({
    ...v,
    daDung: Boolean(viA.get(v.id)?.daDung || viB.get(v.id)?.daDung), // đã dùng ở một máy là đã dùng
  }));

  const thanhVien = hop(a.thanhVien, b.thanhVien, (x) => x.ma)
    .map((m) => {
      const moiNhat = bienDong.find((x) => x.maTV === m.ma);
      return moiNhat ? { ...m, diem: moiNhat.soDu } : m;
    })
    .sort((x, y) => x.ma.localeCompare(y.ma));

  return { thanhVien, giaoDich, bienDong, vi, hoaDon, ...(da ? { dot: da } : {}) };
}

// Chuỗi chuẩn để so sánh hai trạng thái mà không phụ thuộc thứ tự lưu
export const chuan = (s: State): string => JSON.stringify(gop(s, s));

function chuanHoa(d: unknown): State | null {
  const x = d as Partial<State> | null;
  if (!x || !Array.isArray(x.thanhVien) || !Array.isArray(x.giaoDich) || !Array.isArray(x.bienDong) || !Array.isArray(x.vi)) return null;
  return { ...(x as State), hoaDon: Array.isArray(x.hoaDon) ? x.hoaDon : [] };
}

export type KetQuaKeo = { chuaCauHinh: true } | { chuaCauHinh: false; phienBan: number; duLieu: State | null };

export async function keoVe(): Promise<KetQuaKeo> {
  const r = await fetch('/api/sync', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  const d = await r.json();
  if (d?.chuaCauHinh) return { chuaCauHinh: true };
  if (!r.ok || !d?.ok) throw new Error('sync-get');
  return { chuaCauHinh: false, phienBan: Number(d.phienBan) || 0, duLieu: d.duLieu ? chuanHoa(d.duLieu) : null };
}

// Đẩy lên kèm phiên bản đã biết. Máy chủ từ chối nếu đã có máy khác ghi trước (xung đột) để không ghi đè mất dữ liệu.
export async function dayLen(phienBan: number, duLieu: State): Promise<{ ok: true; phienBan: number } | { ok: false }> {
  const r = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phienBan, duLieu }),
    signal: AbortSignal.timeout(8000),
  });
  const d = await r.json();
  if (r.ok && d?.ok) return { ok: true, phienBan: Number(d.phienBan) || phienBan + 1 };
  if (d?.xungDot) return { ok: false };
  throw new Error('sync-post');
}
