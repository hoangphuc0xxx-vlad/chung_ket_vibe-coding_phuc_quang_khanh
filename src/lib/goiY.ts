// Gợi ý ưu đãi: hỏi AI khi có mạng, mất mạng hoặc AI lỗi thì dùng quy tắc. Luôn ghi rõ nguồn.
import { UU_DAI, VND_MOI_DIEM, hangKeTiep, xepHang, type ThanhVien } from './loyalty';

export interface GoiY {
  nguon: 'AI' | 'Quy tắc';
  loiChao: string;
  goiY: string;
  lyDo: string;
  kiemTra?: string;
}

const so = (n: number) => n.toLocaleString('vi-VN');

export function goiYTheoQuyTac(tv: ThanhVien): GoiY {
  const hang = xepHang(tv.diem);
  const loiChao = `Chào ${tv.ten}, bạn đang có ${so(tv.diem)} điểm, hạng ${hang}.`;
  const du = UU_DAI.filter((u) => u.diemCan <= tv.diem).sort((a, b) => b.diemCan - a.diemCan);
  if (du.length === 0) {
    const reNhat = [...UU_DAI].sort((a, b) => a.diemCan - b.diemCan)[0];
    const thieu = reNhat.diemCan - tv.diem;
    return {
      nguon: 'Quy tắc',
      loiChao,
      goiY: `Chưa đủ điểm đổi ưu đãi. Còn thiếu ${so(thieu)} điểm để đổi ${reNhat.ten}.`,
      lyDo: `Mua thêm khoảng ${so(thieu * VND_MOI_DIEM)}đ là đủ (10.000đ = 1 điểm).`,
    };
  }
  // Ưu tiên ưu đãi giá trị cao nhất mà đổi xong vẫn giữ được hạng hiện tại
  const giuHang = du.find((u) => xepHang(tv.diem - u.diemCan) === hang);
  const chon = giuHang ?? du[du.length - 1];
  const con = tv.diem - chon.diemCan;
  const ke = hangKeTiep(con);
  return {
    nguon: 'Quy tắc',
    loiChao,
    goiY: `Nên đổi ${chon.ten} (${so(chon.diemCan)} điểm).`,
    lyDo: giuHang
      ? `Đổi xong còn ${so(con)} điểm và vẫn giữ hạng ${hang}${ke ? `, cách hạng ${ke.hang} ${so(ke.thieu)} điểm` : ''}.`
      : `Mọi ưu đãi đủ điểm đều làm bạn xuống hạng ${xepHang(con)}; đây là mức trừ ít điểm nhất.`,
  };
}

// Kiểm soát đầu ra AI: app tự tính lại con số cho ưu đãi mà AI nhắc tới.
// Trả null nếu AI gợi ý ưu đãi không đủ điểm; trả '' nếu AI không nhắc ưu đãi nào.
export function kiemTraGoiY(tv: ThanhVien, cauGoiY: string): string | null {
  const ud = UU_DAI.find((u) => cauGoiY.includes(u.ten));
  if (!ud) return '';
  if (tv.diem < ud.diemCan) return null;
  const con = tv.diem - ud.diemCan;
  const truoc = xepHang(tv.diem);
  const sau = xepHang(con);
  return `App đã kiểm tra: đổi ${ud.ten} còn ${so(con)} điểm, ${sau === truoc ? `vẫn hạng ${sau}` : `hạng sẽ từ ${truoc} về ${sau}`}.`;
}

export async function layGoiY(tv: ThanhVien): Promise<GoiY> {
  const duPhong = goiYTheoQuyTac(tv);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return duPhong;
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Không gửi số điện thoại hay mã thẻ cho AI
      body: JSON.stringify({ ten: tv.ten, diem: tv.diem, hang: xepHang(tv.diem), uuDai: UU_DAI, goiYQuyTac: duPhong.goiY }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return duPhong;
    const d = await res.json();
    const k = d?.ketQua;
    if (!d?.ok || typeof k?.loiChao !== 'string' || typeof k?.goiY !== 'string' || typeof k?.lyDo !== 'string') return duPhong;
    if (!k.goiY.trim()) return duPhong;
    const kiemTra = kiemTraGoiY(tv, k.goiY);
    if (kiemTra === null) return duPhong; // AI gợi ý ưu đãi mà thành viên không đủ điểm: bỏ, dùng quy tắc
    return { nguon: 'AI', loiChao: k.loiChao.slice(0, 300), goiY: k.goiY.slice(0, 300), lyDo: k.lyDo.slice(0, 300), kiemTra };
  } catch {
    return duPhong;
  }
}
