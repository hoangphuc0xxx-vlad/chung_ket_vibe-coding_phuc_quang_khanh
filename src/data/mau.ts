// Bộ dữ liệu mẫu của Ban tổ chức (file Du_lieu_mau_Vibe_Coding_bangA.xlsx, các sheet KT_*).
// Dữ liệu hư cấu để thi. Điểm hiện tại ĐÃ gồm các giao dịch mẫu: nạp như lịch sử, không cộng lại.
import type { BienDong, GiaoDich, State, ThanhVien } from '../lib/loyalty';

const gio = (s: string) => `${s.replace(' ', 'T')}:00+07:00`;

export const THANH_VIEN_MAU: ThanhVien[] = [
  { ma: 'KT-001', ten: 'An Nguyễn', sdt: '0900001001', diem: 250, ngayThamGia: '2026-09-05T00:00:00+07:00' },
  { ma: 'KT-002', ten: 'Bình Trần', sdt: '0900001002', diem: 1450, ngayThamGia: '2026-08-17T00:00:00+07:00' },
  { ma: 'KT-003', ten: 'Chi Lê', sdt: '0900001003', diem: 800, ngayThamGia: '2026-07-22T00:00:00+07:00' },
  { ma: 'KT-004', ten: 'Dũng Phạm', sdt: '0900001004', diem: 3200, ngayThamGia: '2026-06-14T00:00:00+07:00' },
  { ma: 'KT-005', ten: 'Hà Võ', sdt: '0900001005', diem: 5800, ngayThamGia: '2026-04-09T00:00:00+07:00' },
  { ma: 'KT-006', ten: 'Minh Đỗ', sdt: '0900001006', diem: 12500, ngayThamGia: '2026-02-28T00:00:00+07:00' },
  { ma: 'KT-007', ten: 'Ngọc Bùi', sdt: '0900001007', diem: 4700, ngayThamGia: '2026-03-11T00:00:00+07:00' },
  { ma: 'KT-008', ten: 'Phúc Hoàng', sdt: '0900001008', diem: 0, ngayThamGia: '2026-10-10T00:00:00+07:00' },
];

// [mã GD, loại, mã TV, thời gian, giá trị VND, thay đổi điểm, số dư sau]
const SO: [string, 'Cộng điểm' | 'Đổi điểm', string, string, number, number, number][] = [
  ['TX-KT-001', 'Cộng điểm', 'KT-001', '2026-10-03 09:15', 500000, 50, 250],
  ['TX-KT-002', 'Cộng điểm', 'KT-002', '2026-10-04 11:40', 1500000, 150, 1450],
  ['TX-KT-003', 'Đổi điểm', 'KT-003', '2026-10-05 14:05', 0, -200, 800],
  ['TX-KT-004', 'Cộng điểm', 'KT-004', '2026-10-06 18:20', 2000000, 200, 3200],
  ['TX-KT-005', 'Cộng điểm', 'KT-005', '2026-10-08 10:30', 8000000, 800, 5800],
  ['TX-KT-006', 'Cộng điểm', 'KT-006', '2026-10-09 16:10', 5000000, 500, 12500],
  ['TX-KT-007', 'Cộng điểm', 'KT-007', '2026-10-11 12:55', 7000000, 700, 4700],
];

export const GIAO_DICH_MAU: GiaoDich[] = SO.map(([ma, loai, maTV, t, giaTri, diem]) => ({
  ma,
  maTV,
  loai,
  thoiGian: gio(t),
  giaTri,
  diem,
}));

export const BIEN_DONG_MAU: BienDong[] = SO.map(([ma, loai, maTV, t, , diem, soDu], i) => ({
  id: `KT-LS-00${i + 1}`,
  maTV,
  loai,
  diem,
  thoiGian: gio(t),
  soDu,
  thamChieu: ma,
}));

// Nạp dữ liệu mẫu: chỉ thêm bản ghi chưa có (theo mã), bấm nhiều lần không nhân đôi và không cộng lại điểm.
export function napMau(state: State): { state: State; them: number } {
  const tv = THANH_VIEN_MAU.filter((m) => !state.thanhVien.some((x) => x.ma === m.ma));
  const gd = GIAO_DICH_MAU.filter((g) => !state.giaoDich.some((x) => x.ma === g.ma));
  const bd = BIEN_DONG_MAU.filter((b) => !state.bienDong.some((x) => x.id === b.id));
  const theoGio = <T extends { thoiGian: string }>(a: T[]) => [...a].sort((x, y) => y.thoiGian.localeCompare(x.thoiGian));
  return {
    state: {
      ...state,
      thanhVien: [...state.thanhVien, ...tv].sort((a, b) => a.ma.localeCompare(b.ma)),
      giaoDich: theoGio([...state.giaoDich, ...gd]),
      bienDong: theoGio([...state.bienDong, ...bd]),
    },
    them: tv.length + gd.length + bd.length,
  };
}
