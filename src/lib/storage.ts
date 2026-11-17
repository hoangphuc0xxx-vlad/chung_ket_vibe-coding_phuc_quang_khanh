// Lưu toàn bộ dữ liệu ở localStorage: app chạy được khi mất mạng.
import { rong, type State } from './loyalty';

const KHOA = 'thethanhvien.state.v1';

export function docState(): State {
  try {
    const tho = localStorage.getItem(KHOA);
    if (!tho) return rong();
    const d = JSON.parse(tho);
    if (!d || !Array.isArray(d.thanhVien) || !Array.isArray(d.giaoDich) || !Array.isArray(d.bienDong) || !Array.isArray(d.vi)) {
      return rong(); // dữ liệu hỏng thì coi như rỗng, không sập app
    }
    // Bản lưu cũ chưa có sổ hóa đơn: bổ sung mảng rỗng
    return { ...d, hoaDon: Array.isArray(d.hoaDon) ? d.hoaDon : [] } as State;
  } catch {
    return rong();
  }
}

export function ghiState(s: State): boolean {
  try {
    localStorage.setItem(KHOA, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function docChuoi(khoa: string, macDinh = ''): string {
  try {
    return localStorage.getItem(khoa) ?? macDinh;
  } catch {
    return macDinh;
  }
}

export function ghiChuoi(khoa: string, v: string): void {
  try {
    localStorage.setItem(khoa, v);
  } catch {
    /* bỏ qua */
  }
}
