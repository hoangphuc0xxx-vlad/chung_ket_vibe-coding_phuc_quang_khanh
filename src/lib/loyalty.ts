// Toàn bộ quy tắc của thẻ thành viên. Hàm thuần: nhận trạng thái cũ, trả trạng thái mới, không đụng giao diện.

export type Hang = 'Đồng' | 'Bạc' | 'Vàng';
export type LoaiBienDong = 'Cộng điểm' | 'Đổi điểm';

export interface ThanhVien {
  ma: string;
  ten: string;
  sdt: string;
  diem: number;
  ngayThamGia: string;
}
export interface GiaoDich {
  ma: string;
  maTV: string;
  loai: LoaiBienDong;
  thoiGian: string;
  giaTri: number;
  diem: number;
}
export interface BienDong {
  id: string;
  maTV: string;
  loai: LoaiBienDong;
  diem: number;
  thoiGian: string;
  soDu: number;
  thamChieu: string;
}
export interface UuDai {
  ma: string;
  ten: string;
  moTa: string;
  diemCan: number;
}
export interface Voucher {
  id: string;
  maTV: string;
  maUuDai: string;
  ten: string;
  thoiGian: string;
  daDung: boolean;
}
export interface State {
  thanhVien: ThanhVien[];
  giaoDich: GiaoDich[];
  bienDong: BienDong[];
  vi: Voucher[];
}

// ===== Thể lệ (công bố trong app ở mục Thể lệ) =====
export const VND_MOI_DIEM = 10000; // 10.000đ = 1 điểm, làm tròn xuống
export const MOC_BAC = 1000; // từ 1.000 điểm: Bạc
export const MOC_VANG = 5000; // từ 5.000 điểm: Vàng
export const UU_DAI: UuDai[] = [
  { ma: 'KT-VCH-01', ten: 'Voucher 20.000đ', moTa: 'Giảm giá đơn hàng', diemCan: 500 },
  { ma: 'KT-VCH-02', ten: 'Voucher 50.000đ', moTa: 'Giảm giá đơn hàng', diemCan: 1100 },
  { ma: 'KT-VCH-03', ten: 'Quà tặng đặc biệt', moTa: 'Quà tặng mô phỏng', diemCan: 2000 },
];

export const rong = (): State => ({ thanhVien: [], giaoDich: [], bienDong: [], vi: [] });

export function tinhDiem(vnd: number): number {
  if (!Number.isFinite(vnd) || vnd <= 0) return 0;
  return Math.floor(vnd / VND_MOI_DIEM);
}

export function xepHang(diem: number): Hang {
  if (diem >= MOC_VANG) return 'Vàng';
  if (diem >= MOC_BAC) return 'Bạc';
  return 'Đồng';
}

export function hangKeTiep(diem: number): { hang: Hang; thieu: number; moc: number } | null {
  if (diem < MOC_BAC) return { hang: 'Bạc', thieu: MOC_BAC - diem, moc: MOC_BAC };
  if (diem < MOC_VANG) return { hang: 'Vàng', thieu: MOC_VANG - diem, moc: MOC_VANG };
  return null;
}

export const chuanMa = (s: string): string => s.trim().toUpperCase();
export const chuanSdt = (s: string): string => s.replace(/[\s.\-]/g, '');

// Tìm theo mã thành viên (nội dung QR) hoặc số điện thoại
export function timThanhVien(state: State, maHoacSdt: string): ThanhVien | undefined {
  const ma = chuanMa(maHoacSdt);
  const sdt = chuanSdt(maHoacSdt);
  return state.thanhVien.find((m) => m.ma === ma) ?? state.thanhVien.find((m) => m.sdt === sdt);
}

export type KetQua<T> = ({ ok: true; state: State } & T) | { ok: false; loi: string };

function maMoi(state: State): string {
  // 001–008 dành cho bộ dữ liệu mẫu của BTC, thành viên mới bắt đầu từ 009
  let max = 8;
  for (const m of state.thanhVien) {
    const k = /^KT-(\d+)$/.exec(m.ma);
    if (k) max = Math.max(max, Number(k[1]));
  }
  return 'KT-' + String(max + 1).padStart(3, '0');
}

export function dangKy(state: State, ten: string, sdt: string, now: Date): KetQua<{ thanhVien: ThanhVien }> {
  const t = ten.trim().replace(/\s+/g, ' ');
  const s = chuanSdt(sdt);
  if (t.length < 2) return { ok: false, loi: 'Bạn chưa nhập họ tên (ít nhất 2 ký tự).' };
  if (t.length > 60) return { ok: false, loi: 'Họ tên dài tối đa 60 ký tự.' };
  if (!/^0\d{9}$/.test(s)) return { ok: false, loi: 'Số điện thoại gồm 10 số và bắt đầu bằng 0, ví dụ 0900001009.' };
  const trung = state.thanhVien.find((m) => m.sdt === s);
  if (trung) return { ok: false, loi: `Số điện thoại này đã đăng ký thẻ ${trung.ma}. Hãy mở thẻ đó thay vì đăng ký mới.` };
  const thanhVien: ThanhVien = { ma: maMoi(state), ten: t, sdt: s, diem: 0, ngayThamGia: now.toISOString() };
  return { ok: true, state: { ...state, thanhVien: [...state.thanhVien, thanhVien] }, thanhVien };
}

export interface KetQuaDiem {
  thanhVien: ThanhVien;
  thayDoi: number;
  soDu: number;
  hangTruoc: Hang;
  hangSau: Hang;
}

export function congDiem(state: State, maTV: string, giaTri: number, maGD: string, now: Date): KetQua<KetQuaDiem> {
  const ma = chuanMa(maTV);
  const gd = chuanMa(maGD);
  if (!ma) return { ok: false, loi: 'Bạn chưa nhập mã thành viên.' };
  const tv = state.thanhVien.find((m) => m.ma === ma);
  if (!tv) return { ok: false, loi: `Không tìm thấy thành viên ${ma}. Kiểm tra lại mã trên thẻ.` };
  if (!Number.isFinite(giaTri) || giaTri <= 0) return { ok: false, loi: 'Số tiền giao dịch phải là số lớn hơn 0.' };
  if (giaTri > 1_000_000_000) return { ok: false, loi: 'Số tiền quá lớn (tối đa 1 tỷ đồng mỗi giao dịch).' };
  if (!gd) return { ok: false, loi: 'Bạn chưa nhập mã giao dịch (mã trên hóa đơn).' };
  if (!/^[A-Z0-9][A-Z0-9\-_]{2,39}$/.test(gd)) {
    return { ok: false, loi: 'Mã giao dịch chỉ gồm chữ, số, dấu gạch và dài 3–40 ký tự.' };
  }
  // Chống cộng trùng: mỗi mã giao dịch chỉ được ghi 1 lần
  const cu = state.giaoDich.find((g) => g.ma === gd);
  if (cu) {
    return {
      ok: false,
      loi: `Trùng mã giao dịch: ${gd} đã có trong sổ (thành viên ${cu.maTV}, ${cu.diem > 0 ? '+' : ''}${cu.diem} điểm). Không cộng thêm điểm.`,
    };
  }
  const diem = tinhDiem(giaTri);
  if (diem < 1) return { ok: false, loi: 'Giao dịch dưới 10.000đ chưa đủ 1 điểm.' };
  const soDu = tv.diem + diem;
  const thoiGian = now.toISOString();
  const moi: ThanhVien = { ...tv, diem: soDu };
  return {
    ok: true,
    state: {
      ...state,
      thanhVien: state.thanhVien.map((m) => (m.ma === ma ? moi : m)),
      giaoDich: [{ ma: gd, maTV: ma, loai: 'Cộng điểm', thoiGian, giaTri, diem }, ...state.giaoDich],
      bienDong: [
        { id: `LS-${now.getTime()}-${state.bienDong.length + 1}`, maTV: ma, loai: 'Cộng điểm', diem, thoiGian, soDu, thamChieu: gd },
        ...state.bienDong,
      ],
    },
    thanhVien: moi,
    thayDoi: diem,
    soDu,
    hangTruoc: xepHang(tv.diem),
    hangSau: xepHang(soDu),
  };
}

export function doiUuDai(state: State, maTV: string, maUuDai: string, now: Date): KetQua<KetQuaDiem & { voucher: Voucher }> {
  const ma = chuanMa(maTV);
  const tv = state.thanhVien.find((m) => m.ma === ma);
  if (!tv) return { ok: false, loi: `Không tìm thấy thành viên ${ma}.` };
  const ud = UU_DAI.find((u) => u.ma === chuanMa(maUuDai));
  if (!ud) return { ok: false, loi: 'Ưu đãi này không còn áp dụng.' };
  if (tv.diem < ud.diemCan) {
    return {
      ok: false,
      loi: `Từ chối đổi: ${ud.ten} cần ${ud.diemCan} điểm, bạn đang có ${tv.diem} điểm (thiếu ${ud.diemCan - tv.diem}). Số dư giữ nguyên.`,
    };
  }
  const soDu = tv.diem - ud.diemCan;
  const thoiGian = now.toISOString();
  const voucher: Voucher = {
    id: `VC-${(now.getTime() % 1_000_000_000).toString(36).toUpperCase()}${state.vi.length + 1}`,
    maTV: ma,
    maUuDai: ud.ma,
    ten: ud.ten,
    thoiGian,
    daDung: false,
  };
  const moi: ThanhVien = { ...tv, diem: soDu };
  return {
    ok: true,
    state: {
      ...state,
      thanhVien: state.thanhVien.map((m) => (m.ma === ma ? moi : m)),
      vi: [voucher, ...state.vi],
      bienDong: [
        { id: `LS-${now.getTime()}-${state.bienDong.length + 1}`, maTV: ma, loai: 'Đổi điểm', diem: -ud.diemCan, thoiGian, soDu, thamChieu: ud.ma },
        ...state.bienDong,
      ],
    },
    thanhVien: moi,
    thayDoi: -ud.diemCan,
    soDu,
    hangTruoc: xepHang(tv.diem),
    hangSau: xepHang(soDu),
    voucher,
  };
}

export function dungVoucher(state: State, id: string): State {
  return { ...state, vi: state.vi.map((v) => (v.id === id ? { ...v, daDung: true } : v)) };
}

export function thongKe(state: State) {
  const diemLuuHanh = state.thanhVien.reduce((s, m) => s + m.diem, 0);
  const diemDaDoi = state.bienDong.reduce((s, b) => s + (b.diem < 0 ? -b.diem : 0), 0);
  const theoHang: Record<Hang, number> = { Đồng: 0, Bạc: 0, Vàng: 0 };
  for (const m of state.thanhVien) theoHang[xepHang(m.diem)] += 1;
  return {
    tongThanhVien: state.thanhVien.length,
    // Tổng điểm đã phát = điểm thành viên đang giữ + điểm đã đổi lấy ưu đãi
    tongDiemDaPhat: diemLuuHanh + diemDaDoi,
    diemLuuHanh,
    diemDaDoi,
    soVoucher: state.vi.length,
    soGiaoDich: state.giaoDich.length,
    theoHang,
  };
}
