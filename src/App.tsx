import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { napMau } from './data/mau';
import { chuan, dayLen, gop, keoVe } from './lib/dongBo';
import { layGoiY, type GoiY } from './lib/goiY';
import {
  MOC_BAC,
  MOC_VANG,
  UU_DAI,
  VND_MOI_DIEM,
  VND_MOI_DIEM_TIEU,
  chuanMa,
  dangKy,
  diemToiDa,
  doiUuDai,
  dungVoucher,
  hangKeTiep,
  rong,
  thanhToan,
  thongKe,
  timThanhVien,
  tinhDiem,
  xepHang,
  type Hang,
  type HoaDon,
  type KetQuaDiem,
  type State,
  type ThanhVien,
} from './lib/loyalty';
import { docChuoi, docState, ghiChuoi, ghiState } from './lib/storage';

type Vai = 'thanhvien' | 'quay' | 'thele';
interface ThongBao {
  kieu: 'ok' | 'loi' | 'lenhang';
  tieuDe: string;
  chiTiet?: string;
  id: number;
}

const K_VAI = 'thethanhvien.vai.v1';
const K_MA = 'thethanhvien.ma.v1';

const so = (n: number) => n.toLocaleString('vi-VN');
const gio = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const lopHang = (h: Hang) => (h === 'Vàng' ? 'vang' : h === 'Bạc' ? 'bac' : 'dong');

// Số điểm chạy dần từ giá trị cũ sang giá trị mới
function useDemSo(dich: number): number {
  const [v, setV] = useState(dich);
  const tu = useRef(dich);
  useEffect(() => {
    const dau = tu.current;
    if (dau === dich) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      tu.current = dich;
      setV(dich);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const buoc = (t: number) => {
      const p = Math.min(1, (t - t0) / 800);
      setV(Math.round(dau + (dich - dau) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(buoc);
      else tu.current = dich;
    };
    raf = requestAnimationFrame(buoc);
    return () => {
      cancelAnimationFrame(raf);
      tu.current = dich;
    };
  }, [dich]);
  return v;
}

type TrangThaiDB = 'dang' | 'ok' | 'offline' | 'tat';

// Đồng bộ với máy chủ: kéo về, gộp với dữ liệu trên máy, đẩy lên nếu máy này có gì mới.
// Lỗi mạng không ảnh hưởng app: dữ liệu vẫn ở localStorage, có mạng lại sẽ tự đồng bộ.
function useDongBo(state: State, setState: Dispatch<SetStateAction<State>>) {
  const [tt, setTt] = useState<TrangThaiDB>('dang');
  const [luc, setLuc] = useState('');
  const stateRef = useRef(state);
  stateRef.current = state;
  const daKhop = useRef('');
  const ban = useRef(false);
  const tat = useRef(false);
  const chay = useRef<() => Promise<void>>(async () => undefined);

  chay.current = async () => {
    if (ban.current || tat.current) return;
    ban.current = true;
    try {
      for (let i = 0; i < 4; i++) {
        const r = await keoVe();
        if (r.chuaCauHinh) {
          tat.current = true;
          setTt('tat');
          return;
        }
        const local = stateRef.current;
        const muc = r.duLieu ? gop(local, r.duLieu) : local;
        const cMuc = chuan(muc);
        if (cMuc !== chuan(local)) {
          stateRef.current = muc;
          setState(muc);
        }
        const xong = () => {
          daKhop.current = cMuc;
          setTt('ok');
          setLuc(new Date().toLocaleTimeString('vi-VN'));
        };
        if (r.duLieu && cMuc === chuan(r.duLieu)) return xong(); // máy chủ đã có đủ, không cần đẩy
        const p = await dayLen(r.phienBan, muc);
        if (p.ok && chuan(stateRef.current) === cMuc) return xong();
        // xung đột (máy khác vừa ghi) hoặc máy này vừa có thay đổi mới: lặp lại kéo, gộp, đẩy
      }
    } catch {
      setTt('offline');
    } finally {
      ban.current = false;
    }
  };

  useEffect(() => {
    void chay.current();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) void chay.current();
    }, 5000);
    const on = () => void chay.current();
    window.addEventListener('online', on);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', on);
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!tat.current && chuan(state) !== daKhop.current) void chay.current();
    }, 500);
    return () => clearTimeout(id);
  }, [state]);

  return { tt, luc };
}

export default function App() {
  const [state, setState] = useState<State>(docState);
  const db = useDongBo(state, setState);
  const [vai, setVai] = useState<Vai>(() => {
    const v = docChuoi(K_VAI, 'thanhvien');
    return v === 'quay' || v === 'thele' ? v : 'thanhvien';
  });
  const [maHienTai, setMaHienTai] = useState(() => docChuoi(K_MA));
  const [tb, setTb] = useState<ThongBao | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    ghiState(state);
  }, [state]);
  useEffect(() => ghiChuoi(K_VAI, vai), [vai]);
  useEffect(() => ghiChuoi(K_MA, maHienTai), [maHienTai]);
  useEffect(() => {
    const a = () => setOnline(true);
    const b = () => setOnline(false);
    window.addEventListener('online', a);
    window.addEventListener('offline', b);
    return () => {
      window.removeEventListener('online', a);
      window.removeEventListener('offline', b);
    };
  }, []);
  useEffect(() => {
    if (!tb) return;
    const t = setTimeout(() => setTb(null), tb.kieu === 'lenhang' ? 5200 : 3800);
    return () => clearTimeout(t);
  }, [tb]);

  const bao = (kieu: ThongBao['kieu'], tieuDe: string, chiTiet?: string) => setTb({ kieu, tieuDe, chiTiet, id: Date.now() });

  const baoDiem = (r: KetQuaDiem) => {
    const dong2 = `Số dư ${so(r.soDu)} điểm · hạng ${r.hangSau}`;
    if (r.hangSau !== r.hangTruoc && r.thayDoi > 0) {
      bao('lenhang', `${r.thanhVien.ten} lên hạng ${r.hangSau}!`, `+${so(r.thayDoi)} điểm · ${dong2}`);
    } else if (r.thayDoi > 0) {
      bao('ok', `+${so(r.thayDoi)} điểm cho ${r.thanhVien.ten}`, dong2);
    } else {
      bao('ok', `Đã đổi ưu đãi, trừ ${so(-r.thayDoi)} điểm`, dong2 + (r.hangSau !== r.hangTruoc ? ` (trước đó ${r.hangTruoc})` : ''));
    }
  };

  // Lập hóa đơn ở quầy: có thể dùng điểm trừ vào tiền, phần còn lại được cộng điểm
  const xuLyThanhToan = (ma: string, tien: number, diemDung: number, gd: string): { loi: string } | { hoaDon: HoaDon } => {
    const r = thanhToan(state, ma, tien, diemDung, gd, new Date());
    if (!r.ok) {
      bao('loi', diemDung > 0 ? 'Không thanh toán được' : 'Không cộng điểm', r.loi);
      return { loi: r.loi };
    }
    setState(r.state);
    if (diemDung > 0) {
      bao(
        'ok',
        `Đã trừ ${so(diemDung)} điểm vào hóa đơn (−${so(r.hoaDon.giamTru)}đ)`,
        `Khách trả ${so(r.hoaDon.conPhaiTra)}đ · cộng +${so(r.hoaDon.diemCong)} điểm · số dư ${so(r.soDu)} · hạng ${r.hangSau}`,
      );
    } else baoDiem(r);
    return { hoaDon: r.hoaDon };
  };

  const xuLyDoi = (ma: string, maUuDai: string): string | null => {
    const r = doiUuDai(state, ma, maUuDai, new Date());
    if (!r.ok) {
      bao('loi', 'Không đổi được ưu đãi', r.loi);
      return r.loi;
    }
    setState(r.state);
    baoDiem(r);
    return null;
  };

  const xuLyDangKy = (ten: string, sdt: string): string | null => {
    const r = dangKy(state, ten, sdt, new Date());
    if (!r.ok) return r.loi;
    setState(r.state);
    setMaHienTai(r.thanhVien.ma);
    bao('ok', `Chào mừng ${r.thanhVien.ten}!`, `Mã thành viên của bạn là ${r.thanhVien.ma}`);
    return null;
  };

  const xuLyNapMau = () => {
    const r = napMau(state);
    setState(r.state);
    bao(
      'ok',
      r.them > 0 ? 'Đã nạp dữ liệu mẫu của BTC' : 'Dữ liệu mẫu đã có sẵn',
      r.them > 0 ? '8 thành viên, 7 giao dịch, 3 ưu đãi. Điểm giữ nguyên, không cộng lại.' : 'Không thêm bản ghi nào, điểm không đổi.',
    );
  };

  const xuLyXoa = () => {
    if (!window.confirm('Xóa toàn bộ thành viên, giao dịch và ví ưu đãi trên máy này? Không hoàn tác được.')) return;
    setState({ ...rong(), dot: Date.now() }); // `dot` mới để lệnh xóa cũng áp dụng cho các máy khác khi đồng bộ
    setMaHienTai('');
    bao('ok', 'Đã xóa toàn bộ dữ liệu');
  };

  const tv = state.thanhVien.find((m) => m.ma === maHienTai);
  const moThe = (ma: string) => {
    setMaHienTai(ma);
    setVai('thanhvien');
  };

  return (
    <div className="khung">
      <header className="dau">
        <div className="thuong-hieu">
          <span className="logo" aria-hidden="true">
            ★
          </span>
          <span>Thẻ Thành Viên</span>
        </div>
        <nav className="vai" aria-label="Chuyển vai">
          {(
            [
              ['thanhvien', 'Thành viên'],
              ['quay', 'Quầy'],
              ['thele', 'Thể lệ'],
            ] as const
          ).map(([k, nhan]) => (
            <button key={k} type="button" className={vai === k ? 'chon' : ''} aria-pressed={vai === k} onClick={() => setVai(k)}>
              {nhan}
            </button>
          ))}
        </nav>
      </header>

      {!online ? (
        <p className="offline" role="status">
          Đang mất mạng. App vẫn chạy bình thường, mọi dữ liệu lưu trên máy này{db.tt === 'tat' ? '' : ' và sẽ tự đồng bộ khi có mạng lại'}.
        </p>
      ) : null}
      <p className={`dongbo dongbo-${db.tt}`} role="status">
        <span className="cham" aria-hidden="true" />
        {db.tt === 'ok'
          ? `Đã đồng bộ với máy chủ lúc ${db.luc}. Mở app trên thiết bị khác sẽ thấy cùng dữ liệu.`
          : db.tt === 'dang'
            ? 'Đang đồng bộ với máy chủ…'
            : db.tt === 'offline'
              ? 'Chưa đồng bộ được với máy chủ. Dữ liệu vẫn lưu trên máy này, app sẽ tự thử lại.'
              : 'Dữ liệu chỉ lưu trên máy này (chưa nối database đồng bộ).'}
      </p>

      <main>
        {vai === 'thanhvien' ? (
          <ThanhVienView
            state={state}
            tv={tv}
            onChon={setMaHienTai}
            onDangKy={xuLyDangKy}
            onDoi={xuLyDoi}
            onDung={(id) => setState((s) => dungVoucher(s, id))}
            onNapMau={xuLyNapMau}
          />
        ) : null}
        {vai === 'quay' ? (
          <QuayView state={state} onThanhToan={xuLyThanhToan} onMoThe={moThe} onNapMau={xuLyNapMau} onXoa={xuLyXoa} onBao={bao} />
        ) : null}
        {vai === 'thele' ? <TheLe /> : null}
      </main>

      <footer className="chan">
        Dữ liệu lưu trên trình duyệt này (localStorage). Bộ dữ liệu mẫu là dữ liệu hư cấu do Ban tổ chức cung cấp.
      </footer>

      {tb ? (
        <div key={tb.id} className={`toast toast-${tb.kieu}`} role="status" aria-live="polite">
          {tb.kieu === 'lenhang' ? (
            <span className="phao" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : null}
          <strong>{tb.tieuDe}</strong>
          {tb.chiTiet ? <span>{tb.chiTiet}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ================= THẺ ================= */

function The({ tv }: { tv: ThanhVien }) {
  const hang = xepHang(tv.diem);
  const ke = hangKeTiep(tv.diem);
  const diemHien = useDemSo(tv.diem);
  const [qr, setQr] = useState('');
  useEffect(() => {
    let song = true;
    // Nội dung QR đúng bằng mã thành viên, giống QR chuẩn của BTC
    QRCode.toDataURL(tv.ma, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
      .then((u) => {
        if (song) setQr(u);
      })
      .catch(() => undefined);
    return () => {
      song = false;
    };
  }, [tv.ma]);
  const dau = hang === 'Đồng' ? 0 : hang === 'Bạc' ? MOC_BAC : MOC_VANG;
  const pt = ke ? Math.max(3, Math.round(((tv.diem - dau) / (ke.moc - dau)) * 100)) : 100;
  return (
    <section className={`the the-${lopHang(hang)}`} aria-label={`Thẻ thành viên hạng ${hang}`}>
      <div className="the-tren">
        <span className="the-nhan">THẺ THÀNH VIÊN</span>
        <span className="the-hang" key={hang}>
          Hạng {hang}
        </span>
      </div>
      <div className="the-giua">
        <div className="the-tt">
          <p className="the-ten">{tv.ten}</p>
          <p className="the-ma">{tv.ma}</p>
          <p className="the-diem" key={tv.diem}>
            <strong>{so(diemHien)}</strong> điểm
          </p>
        </div>
        {qr ? <img className="the-qr" src={qr} alt={`Mã QR của thẻ ${tv.ma}`} width={112} height={112} /> : <div className="the-qr" />}
      </div>
      <div className="the-duoi">
        <div className="thanh" role="progressbar" aria-valuenow={pt} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ lên hạng">
          <span style={{ width: `${pt}%` }} />
        </div>
        <p>{ke ? `Còn ${so(ke.thieu)} điểm nữa lên hạng ${ke.hang}` : 'Bạn đang ở hạng cao nhất'}</p>
      </div>
    </section>
  );
}

/* ================= CHẾ ĐỘ THÀNH VIÊN ================= */

function ThanhVienView(p: {
  state: State;
  tv: ThanhVien | undefined;
  onChon: (ma: string) => void;
  onDangKy: (ten: string, sdt: string) => string | null;
  onDoi: (ma: string, maUuDai: string) => string | null;
  onDung: (id: string) => void;
  onNapMau: () => void;
}) {
  const { state, tv } = p;
  const [ten, setTen] = useState('');
  const [sdt, setSdt] = useState('');
  const [loiDK, setLoiDK] = useState('');
  const [tim, setTim] = useState('');
  const [loiTim, setLoiTim] = useState('');
  const [loiDoi, setLoiDoi] = useState('');
  const [goiY, setGoiY] = useState<GoiY | null>(null);
  const [dangHoi, setDangHoi] = useState(false);

  useEffect(() => {
    setGoiY(null);
    setLoiDoi('');
  }, [tv?.ma]);

  if (!tv) {
    const guiDK = (e: FormEvent) => {
      e.preventDefault();
      const loi = p.onDangKy(ten, sdt);
      setLoiDK(loi ?? '');
      if (!loi) {
        setTen('');
        setSdt('');
      }
    };
    const guiTim = (e: FormEvent) => {
      e.preventDefault();
      const m = timThanhVien(state, tim);
      if (!m) setLoiTim('Không tìm thấy thẻ với mã hoặc số điện thoại này.');
      else {
        setLoiTim('');
        p.onChon(m.ma);
      }
    };
    return (
      <div className="luoi">
        <section className="hop">
          <h1>Đăng ký thẻ thành viên</h1>
          <p className="phu">Nhập tên và số điện thoại, bạn nhận mã thành viên và thẻ ngay.</p>
          <form onSubmit={guiDK} noValidate>
            <label htmlFor="dk-ten">Họ tên</label>
            <input id="dk-ten" value={ten} onChange={(e) => setTen(e.target.value)} autoComplete="name" placeholder="Ví dụ: Lan Phạm" />
            <label htmlFor="dk-sdt">Số điện thoại</label>
            <input
              id="dk-sdt"
              value={sdt}
              onChange={(e) => setSdt(e.target.value)}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="Ví dụ: 0900001009"
              aria-describedby={loiDK ? 'dk-loi' : undefined}
            />
            {loiDK ? (
              <p className="loi" id="dk-loi" role="alert">
                {loiDK}
              </p>
            ) : null}
            <button className="nut" type="submit">
              Đăng ký và nhận thẻ
            </button>
          </form>
        </section>
        <section className="hop">
          <h2>Đã có thẻ?</h2>
          <form onSubmit={guiTim} noValidate className="hang-ngang">
            <div className="gian">
              <label htmlFor="tim-ma">Mã thẻ hoặc số điện thoại</label>
              <input id="tim-ma" value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Ví dụ: KT-004" />
            </div>
            <button className="nut nut-phu" type="submit">
              Mở thẻ
            </button>
          </form>
          {loiTim ? (
            <p className="loi" role="alert">
              {loiTim}
            </p>
          ) : null}
          {state.thanhVien.length > 0 ? (
            <>
              <p className="phu">Bản thi không có đăng nhập thật, bạn chọn nhanh một thành viên để xem thẻ:</p>
              <div className="chip-ds">
                {state.thanhVien.map((m) => (
                  <button key={m.ma} type="button" className={`chip chip-${lopHang(xepHang(m.diem))}`} onClick={() => p.onChon(m.ma)}>
                    {m.ma} · {m.ten}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="trong">
              <p>Chưa có thành viên nào trên máy này.</p>
              <button type="button" className="nut nut-phu" onClick={p.onNapMau}>
                Nạp dữ liệu mẫu
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  const lichSu = state.bienDong.filter((b) => b.maTV === tv.ma);
  const lsCong = lichSu.filter((b) => b.diem > 0);
  const lsTieu = lichSu.filter((b) => b.diem < 0);
  const tongCong = lsCong.reduce((s, b) => s + b.diem, 0);
  const tongTieu = lsTieu.reduce((s, b) => s - b.diem, 0);
  const vi = state.vi.filter((v) => v.maTV === tv.ma);
  const hang = xepHang(tv.diem);

  const hoiGoiY = async () => {
    setDangHoi(true);
    setGoiY(await layGoiY(tv));
    setDangHoi(false);
  };

  return (
    <div className="luoi">
      <div className="cot">
        <The tv={tv} />
        <div className="hang-nut khong-in">
          <button type="button" className="nut nut-phu" onClick={() => window.print()}>
            In thẻ
          </button>
          <button type="button" className="nut nut-phu" onClick={() => p.onChon('')}>
            Đổi thành viên / Đăng ký mới
          </button>
        </div>

        <section className="hop khong-in">
          <h2>Gợi ý ưu đãi</h2>
          {goiY ? (
            <div className="goiy">
              <span className={`nhan ${goiY.nguon === 'AI' ? 'nhan-ai' : ''}`}>
                {goiY.nguon === 'AI' ? 'Nguồn: AI' : 'Nguồn: quy tắc trên máy (không dùng AI)'}
              </span>
              <p>{goiY.loiChao}</p>
              <p>
                <strong>{goiY.goiY}</strong>
              </p>
              <p className="phu">{goiY.lyDo}</p>
              {goiY.kiemTra ? <p className="kiem-tra">{goiY.kiemTra}</p> : null}
            </div>
          ) : (
            <p className="phu">Hỏi xem nên đổi ưu đãi nào với số điểm hiện có. Mất mạng thì app tự gợi ý theo quy tắc.</p>
          )}
          <button type="button" className="nut nut-phu" onClick={hoiGoiY} disabled={dangHoi}>
            {dangHoi ? 'Đang hỏi…' : goiY ? 'Hỏi lại' : 'Gợi ý cho tôi'}
          </button>
        </section>
      </div>

      <div className="cot khong-in">
        <section className="hop">
          <h2>Đổi điểm lấy ưu đãi</h2>
          <ul className="ds">
            {UU_DAI.map((u) => {
              const du = tv.diem >= u.diemCan;
              const con = tv.diem - u.diemCan;
              return (
                <li key={u.ma} className="dong">
                  <div className="gian">
                    <p className="dam">{u.ten}</p>
                    <p className="phu">
                      {u.moTa} · {so(u.diemCan)} điểm
                    </p>
                    <p className={du ? 'phu' : 'phu canh-bao'}>
                      {du
                        ? `Đổi xong còn ${so(con)} điểm${xepHang(con) !== hang ? `, về hạng ${xepHang(con)}` : ''}`
                        : `Thiếu ${so(-con)} điểm`}
                    </p>
                  </div>
                  <button type="button" className={du ? 'nut' : 'nut nut-phu'} onClick={() => setLoiDoi(p.onDoi(tv.ma, u.ma) ?? '')}>
                    Đổi
                  </button>
                </li>
              );
            })}
          </ul>
          {loiDoi ? (
            <p className="loi" role="alert">
              {loiDoi}
            </p>
          ) : null}
        </section>

        <section className="hop">
          <h2>Ví ưu đãi ({vi.length})</h2>
          {vi.length === 0 ? (
            <p className="phu">Chưa có ưu đãi nào. Đổi điểm ở trên, voucher sẽ nằm ở đây.</p>
          ) : (
            <ul className="ds">
              {vi.map((v) => (
                <li key={v.id} className={`dong ve ${v.daDung ? 've-dung' : ''}`}>
                  <div className="gian">
                    <p className="dam">{v.ten}</p>
                    <p className="phu">
                      Mã {v.id} · đổi lúc {gio(v.thoiGian)}
                    </p>
                  </div>
                  {v.daDung ? (
                    <span className="nhan">Đã dùng</span>
                  ) : (
                    <button type="button" className="nut nut-phu" onClick={() => p.onDung(v.id)}>
                      Dùng
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="hop">
          <div className="dau-muc">
            <h2>Lịch sử cộng điểm</h2>
            <span className="nhan nhan-cong">Tổng đã cộng: +{so(tongCong)}</span>
          </div>
          {lsCong.length === 0 ? (
            <p className="phu">Chưa có lần cộng điểm nào. Đưa mã thẻ cho nhân viên quầy khi thanh toán để được cộng điểm.</p>
          ) : (
            <div className="bang-cuon">
              <table>
                <thead>
                  <tr>
                    <th>Hóa đơn</th>
                    <th className="phai">Điểm cộng</th>
                    <th>Thời gian</th>
                    <th className="phai">Số dư</th>
                  </tr>
                </thead>
                <tbody>
                  {lsCong.map((b) => (
                    <tr key={b.id}>
                      <td>{b.thamChieu}</td>
                      <td className="phai dam cong">+{so(b.diem)}</td>
                      <td>{gio(b.thoiGian)}</td>
                      <td className="phai">{so(b.soDu)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="hop">
          <div className="dau-muc">
            <h2>Lịch sử tiêu điểm</h2>
            <span className="nhan nhan-tru">Tổng đã tiêu: −{so(tongTieu)}</span>
          </div>
          {lsTieu.length === 0 ? (
            <p className="phu">Chưa tiêu điểm lần nào. Bạn có thể đổi ưu đãi ở trên, hoặc dùng điểm trừ thẳng vào hóa đơn tại quầy (1 điểm = {so(VND_MOI_DIEM_TIEU)}đ).</p>
          ) : (
            <div className="bang-cuon">
              <table>
                <thead>
                  <tr>
                    <th>Dùng vào</th>
                    <th className="phai">Điểm trừ</th>
                    <th>Thời gian</th>
                    <th className="phai">Số dư</th>
                  </tr>
                </thead>
                <tbody>
                  {lsTieu.map((b) => {
                    const hd = b.loai === 'Tiêu điểm' ? state.hoaDon.find((h) => h.ma === b.thamChieu) : undefined;
                    const ud = UU_DAI.find((u) => u.ma === b.thamChieu);
                    return (
                      <tr key={b.id}>
                        <td>
                          {b.loai === 'Tiêu điểm' ? 'Thanh toán hóa đơn' : 'Đổi ưu đãi'}
                          <span className="phu nho">
                            {' '}
                            · {hd ? `${b.thamChieu}: giảm ${so(hd.giamTru)}đ trên ${so(hd.tongTien)}đ` : ud ? ud.ten : b.thamChieu}
                          </span>
                        </td>
                        <td className="phai dam tru">−{so(-b.diem)}</td>
                        <td>{gio(b.thoiGian)}</td>
                        <td className="phai">{so(b.soDu)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ================= QUÉT QR (camera, ảnh) ================= */

function QuetQR({ onMa }: { onMa: (ma: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const goi = useRef(onMa);
  goi.current = onMa;
  const [bat, setBat] = useState(false);
  const [loi, setLoi] = useState('');

  useEffect(() => {
    if (!bat) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let huy = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-camera');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (huy) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        const quet = () => {
          if (huy) return;
          if (ctx && v.readyState >= 2 && v.videoWidth > 0) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const kq = jsQR(d.data, d.width, d.height);
            if (kq && kq.data.trim()) {
              goi.current(kq.data.trim());
              setBat(false);
              return;
            }
          }
          raf = requestAnimationFrame(quet);
        };
        raf = requestAnimationFrame(quet);
      } catch {
        setLoi('Không mở được camera. Hãy cho phép quyền camera, hoặc dùng "Quét từ ảnh", hoặc gõ mã thành viên.');
        setBat(false);
      }
    })();
    return () => {
      huy = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [bat]);

  const tuAnh = async (f: File) => {
    try {
      const bmp = await createImageBitmap(f);
      const tiLe = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(bmp.width * tiLe));
      c.height = Math.max(1, Math.round(bmp.height * tiLe));
      const x = c.getContext('2d');
      if (!x) throw new Error('no-canvas');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(bmp, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height);
      const kq = jsQR(d.data, d.width, d.height);
      if (kq && kq.data.trim()) {
        setLoi('');
        goi.current(kq.data.trim());
      } else setLoi('Không đọc được mã QR trong ảnh này. Thử ảnh rõ hơn.');
    } catch {
      setLoi('Không mở được ảnh này.');
    }
  };

  return (
    <div className="quet">
      <div className="hang-nut">
        <button
          type="button"
          className="nut nut-phu"
          onClick={() => {
            setLoi('');
            setBat((b) => !b);
          }}
        >
          {bat ? 'Tắt camera' : 'Quét QR bằng camera'}
        </button>
        <label className="nut nut-phu nut-file">
          Quét từ ảnh
          <input
            type="file"
            accept="image/*"
            className="an"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void tuAnh(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {bat ? (
        <div className="khung-cam">
          <video ref={videoRef} muted playsInline aria-label="Hình từ camera để quét mã QR" />
          <p className="phu">Đưa mã QR trên thẻ vào giữa khung hình.</p>
        </div>
      ) : null}
      {loi ? (
        <p className="loi" role="alert">
          {loi}
        </p>
      ) : null}
    </div>
  );
}

/* ================= CHẾ ĐỘ QUẦY ================= */

// Hóa đơn: ghi rõ số điểm trừ vào tiền. Dùng cho cả bản tạm tính và bản đã lập.
function HoaDonView({ hd, tam }: { hd: HoaDon; tam?: boolean }) {
  return (
    <div className={`hoadon ${tam ? 'hoadon-tam' : ''}`} role={tam ? undefined : 'status'}>
      <div className="hoadon-dau">
        <strong>{tam ? 'Hóa đơn tạm tính' : `Hóa đơn ${hd.ma}`}</strong>
        <span className="phu nho">
          {hd.tenTV} · {hd.maTV}
          {tam ? '' : ` · ${gio(hd.thoiGian)}`}
        </span>
      </div>
      <dl>
        <div>
          <dt>Tổng tiền hàng</dt>
          <dd>{so(hd.tongTien)}đ</dd>
        </div>
        <div className={hd.diemDung > 0 ? 'hd-tru' : 'hd-mo'}>
          <dt>
            Trừ bằng điểm{hd.diemDung > 0 ? ` (${so(hd.diemDung)} điểm × ${so(VND_MOI_DIEM_TIEU)}đ)` : ''}
          </dt>
          <dd>{hd.diemDung > 0 ? `−${so(hd.giamTru)}đ` : '0đ'}</dd>
        </div>
        <div className="hd-tong">
          <dt>Khách cần trả</dt>
          <dd>{so(hd.conPhaiTra)}đ</dd>
        </div>
      </dl>
      <p className="hd-diem">
        Điểm: {so(hd.soDuTruoc)}
        {hd.diemDung > 0 ? <span className="tru"> − {so(hd.diemDung)} (thanh toán)</span> : null}
        <span className="cong"> + {so(hd.diemCong)} (tích lũy)</span> = <strong>{so(hd.soDuSau)} điểm</strong> · hạng {xepHang(hd.soDuSau)}
      </p>
    </div>
  );
}

function QuayView(p: {
  state: State;
  onThanhToan: (ma: string, tien: number, diemDung: number, gd: string) => { loi: string } | { hoaDon: HoaDon };
  onMoThe: (ma: string) => void;
  onNapMau: () => void;
  onXoa: () => void;
  onBao: (kieu: ThongBao['kieu'], tieuDe: string, chiTiet?: string) => void;
}) {
  const { state } = p;
  const [ma, setMa] = useState('');
  const [tien, setTien] = useState('');
  const [gd, setGd] = useState('');
  const [loi, setLoi] = useState('');
  const [dung, setDung] = useState('');
  const [hdMoi, setHdMoi] = useState<HoaDon | null>(null);
  const tienRef = useRef<HTMLInputElement>(null);

  const tv = ma.trim() ? timThanhVien(state, ma) : undefined;
  const soTien = Number(tien.replace(/[^\d]/g, ''));
  const diemDung = Number(dung.replace(/[^\d]/g, '')) || 0;
  const toiDa = tv ? diemToiDa(tv.diem, soTien) : 0;
  const giamTru = diemDung * VND_MOI_DIEM_TIEU;
  const conTra = Math.max(0, soTien - giamTru);
  const diemSe = tinhDiem(conTra);
  const tk = thongKe(state);
  const tamTinh: HoaDon | null =
    tv && soTien > 0
      ? {
          ma: '',
          maTV: tv.ma,
          tenTV: tv.ten,
          thoiGian: '',
          tongTien: soTien,
          diemDung,
          giamTru,
          conPhaiTra: conTra,
          diemCong: diemSe,
          soDuTruoc: tv.diem,
          soDuSau: tv.diem - diemDung + diemSe,
        }
      : null;

  const nhanMa = (text: string) => {
    const m = timThanhVien(state, text);
    setMa(chuanMa(text));
    setLoi('');
    if (m) {
      p.onBao('ok', `Đã quét: ${m.ma}`, `${m.ten} · ${so(m.diem)} điểm · hạng ${xepHang(m.diem)}`);
      tienRef.current?.focus();
    } else {
      p.onBao('loi', 'Mã QR không thuộc thành viên nào', `Nội dung đọc được: ${text.slice(0, 40)}`);
    }
  };

  const taoMaGD = () => {
    const d = new Date();
    const hai = (n: number) => String(n).padStart(2, '0');
    setGd(`TX-${d.getFullYear()}${hai(d.getMonth() + 1)}${hai(d.getDate())}-${hai(d.getHours())}${hai(d.getMinutes())}${hai(d.getSeconds())}`);
  };

  const gui = (e: FormEvent) => {
    e.preventDefault();
    const r = p.onThanhToan(tv?.ma ?? ma, soTien, diemDung, gd);
    if ('loi' in r) {
      setLoi(r.loi);
      return;
    }
    setLoi('');
    setHdMoi(r.hoaDon);
    setTien('');
    setGd('');
    setDung('');
  };

  const lichSuTV = tv ? state.bienDong.filter((b) => b.maTV === tv.ma).slice(0, 4) : [];

  return (
    <div className="luoi">
      <div className="cot">
        <section className="hop">
          <h1>Quầy: thanh toán và cộng điểm</h1>
          <p className="phu">
            Tích điểm: {so(VND_MOI_DIEM)}đ = 1 điểm. Dùng điểm thanh toán: 1 điểm = {so(VND_MOI_DIEM_TIEU)}đ. Mỗi mã giao dịch chỉ được ghi một lần.
          </p>
          <QuetQR onMa={nhanMa} />
          <form onSubmit={gui} noValidate>
            <label htmlFor="q-ma">Mã thành viên</label>
            <input
              id="q-ma"
              value={ma}
              onChange={(e) => setMa(e.target.value)}
              onKeyDown={(e) => {
                // Máy quét mã cầm tay gõ mã rồi tự nhấn Enter: chuyển sang ô số tiền thay vì gửi form
                if (e.key === 'Enter' && !tien) {
                  e.preventDefault();
                  tienRef.current?.focus();
                }
              }}
              placeholder="Ví dụ: KT-004"
              autoComplete="off"
              autoFocus
            />
            <p className="goi-y-o">Gõ tay, quét QR, hoặc dùng máy quét mã cầm tay (mã tự điền vào ô này).</p>

            {ma.trim() ? (
              tv ? (
                <div className={`hoso hoso-${lopHang(xepHang(tv.diem))}`} role="status">
                  <div className="gian">
                    <p className="dam">
                      {tv.ten} · {tv.ma}
                    </p>
                    <p className="phu">
                      {so(tv.diem)} điểm · hạng {xepHang(tv.diem)} · SĐT {tv.sdt} · tham gia {gio(tv.ngayThamGia).slice(-10)}
                    </p>
                    {lichSuTV.length > 0 ? (
                      <p className="phu nho">
                        Gần đây:{' '}
                        {lichSuTV.map((b) => `${b.diem > 0 ? '+' : '−'}${so(Math.abs(b.diem))} (${b.thamChieu})`).join(', ')}
                      </p>
                    ) : null}
                  </div>
                  <button type="button" className="nut nut-phu" onClick={() => p.onMoThe(tv.ma)}>
                    Mở thẻ
                  </button>
                </div>
              ) : (
                <p className="loi" role="alert">
                  Không tìm thấy thành viên với mã này.
                </p>
              )
            ) : null}

            <label htmlFor="q-tien">Số tiền giao dịch (VND)</label>
            <input
              id="q-tien"
              ref={tienRef}
              value={tien}
              onChange={(e) => {
                const n = e.target.value.replace(/[^\d]/g, '').slice(0, 12);
                setTien(n ? Number(n).toLocaleString('vi-VN') : '');
              }}
              inputMode="numeric"
              placeholder="Ví dụ: 1.000.000"
              autoComplete="off"
            />
            <p className="goi-y-o">{soTien > 0 ? `Khách trả ${so(conTra)}đ → cộng ${so(diemSe)} điểm` : 'Nhập tổng tiền trên hóa đơn.'}</p>

            <label htmlFor="q-dung">Dùng điểm để thanh toán (không bắt buộc)</label>
            <div className="hang-ngang">
              <input
                id="q-dung"
                className="gian"
                value={dung}
                onChange={(e) => {
                  const n = e.target.value.replace(/[^\d]/g, '').slice(0, 9);
                  setDung(n ? Number(n).toLocaleString('vi-VN') : '');
                }}
                inputMode="numeric"
                placeholder="Ví dụ: 200"
                autoComplete="off"
              />
              <button type="button" className="nut nut-phu" disabled={toiDa < 1} onClick={() => setDung(toiDa.toLocaleString('vi-VN'))}>
                Dùng tối đa
              </button>
            </div>
            <p className={diemDung > toiDa && tv && soTien > 0 ? 'goi-y-o canh-bao' : 'goi-y-o'}>
              {tv && soTien > 0
                ? diemDung > toiDa
                  ? `Vượt mức: hóa đơn này dùng tối đa ${so(toiDa)} điểm (thẻ có ${so(tv.diem)} điểm).`
                  : `Thẻ có ${so(tv.diem)} điểm, hóa đơn này dùng tối đa ${so(toiDa)} điểm (= ${so(toiDa * VND_MOI_DIEM_TIEU)}đ).`
                : `1 điểm = ${so(VND_MOI_DIEM_TIEU)}đ. Để trống nếu khách không dùng điểm.`}
            </p>

            {tamTinh ? <HoaDonView hd={tamTinh} tam /> : null}

            <label htmlFor="q-gd">Mã giao dịch (mã hóa đơn)</label>
            <div className="hang-ngang">
              <input id="q-gd" className="gian" value={gd} onChange={(e) => setGd(e.target.value)} placeholder="Ví dụ: TX-NEW-001" autoComplete="off" />
              <button type="button" className="nut nut-phu" onClick={taoMaGD}>
                Tạo mã
              </button>
            </div>

            {loi ? (
              <p className="loi" role="alert">
                {loi}
              </p>
            ) : null}
            <button className="nut nut-to" type="submit">
              {diemDung > 0 ? 'Thanh toán bằng điểm và cộng điểm' : 'Cộng điểm'}
            </button>
          </form>
          {hdMoi ? (
            <div className="hd-moi">
              <p className="dam">Đã lập hóa đơn:</p>
              <HoaDonView hd={hdMoi} />
            </div>
          ) : null}
        </section>

        <section className="hop">
          <h2>Dữ liệu</h2>
          <p className="phu">Nạp bộ dữ liệu mẫu của Ban tổ chức (8 thành viên, 7 giao dịch). Bấm nhiều lần không nhân đôi, không cộng lại điểm.</p>
          <div className="hang-nut">
            <button type="button" className="nut" onClick={p.onNapMau}>
              Nạp dữ liệu mẫu
            </button>
            <button type="button" className="nut nut-nguy" onClick={p.onXoa}>
              Xóa toàn bộ dữ liệu
            </button>
          </div>
        </section>
      </div>

      <div className="cot">
        <section className="hop">
          <h2>Thống kê</h2>
          <div className="so-lieu">
            <div>
              <strong>{so(tk.tongThanhVien)}</strong>
              <span>thành viên</span>
            </div>
            <div>
              <strong>{so(tk.tongDiemDaPhat)}</strong>
              <span>điểm đã phát</span>
            </div>
            <div>
              <strong>{so(tk.diemDaDoi)}</strong>
              <span>điểm đã tiêu</span>
            </div>
            <div>
              <strong>{so(tk.soVoucher)}</strong>
              <span>voucher trong ví</span>
            </div>
          </div>
          <p className="phu">
            Hạng: {tk.theoHang['Đồng']} Đồng · {tk.theoHang['Bạc']} Bạc · {tk.theoHang['Vàng']} Vàng. Điểm đã phát = điểm đang giữ ({so(tk.diemLuuHanh)}) + điểm đã tiêu.
          </p>
        </section>

        <section className="hop">
          <h2>Thành viên ({state.thanhVien.length})</h2>
          {state.thanhVien.length === 0 ? (
            <div className="trong">
              <p>Chưa có thành viên. Nạp dữ liệu mẫu hoặc đăng ký ở chế độ Thành viên.</p>
            </div>
          ) : (
            <div className="bang-cuon">
              <table>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Họ tên</th>
                    <th className="phai">Điểm</th>
                    <th>Hạng</th>
                    <th>
                      <span className="sr">Chọn</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.thanhVien.map((m) => (
                    <tr key={m.ma} className={tv?.ma === m.ma ? 'dong-chon' : ''}>
                      <td className="dam">{m.ma}</td>
                      <td>{m.ten}</td>
                      <td className="phai">{so(m.diem)}</td>
                      <td>
                        <span className={`chip chip-${lopHang(xepHang(m.diem))}`}>{xepHang(m.diem)}</span>
                      </td>
                      <td className="phai">
                        <button
                          type="button"
                          className="lien-ket"
                          onClick={() => {
                            setMa(m.ma);
                            setLoi('');
                            tienRef.current?.focus();
                          }}
                        >
                          Chọn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="hop">
          <h2>Sổ giao dịch ({state.giaoDich.length})</h2>
          {state.giaoDich.length === 0 ? (
            <p className="phu">Chưa có giao dịch nào.</p>
          ) : (
            <div className="bang-cuon">
              <table>
                <thead>
                  <tr>
                    <th>Mã giao dịch</th>
                    <th>Thành viên</th>
                    <th className="phai">Số tiền</th>
                    <th className="phai">Điểm</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {state.giaoDich.slice(0, 12).map((g) => (
                    <tr key={g.ma}>
                      <td className="dam">{g.ma}</td>
                      <td>{g.maTV}</td>
                      <td className="phai">{g.giaTri > 0 ? `${so(g.giaTri)}đ` : '–'}</td>
                      <td className={`phai dam ${g.diem > 0 ? 'cong' : 'tru'}`}>
                        {g.diem > 0 ? '+' : '−'}
                        {so(Math.abs(g.diem))}
                      </td>
                      <td>{gio(g.thoiGian)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ================= THỂ LỆ ================= */

function TheLe() {
  return (
    <div className="luoi">
      <section className="hop">
        <h1>Thể lệ chương trình</h1>
        <h2>Tích điểm</h2>
        <p>
          Cứ <strong>{so(VND_MOI_DIEM)}đ</strong> trên hóa đơn được <strong>1 điểm</strong>, làm tròn xuống. Ví dụ hóa đơn 1.000.000đ được 100 điểm.
        </p>
        <p>Nhân viên quầy cộng điểm bằng mã thành viên và mã giao dịch. Mỗi mã giao dịch chỉ được cộng một lần; nhập lại sẽ bị báo trùng.</p>
        <h2>Hạng thành viên</h2>
        <div className="bang-cuon">
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Điểm hiện có</th>
                <th>Màu thẻ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="chip chip-dong">Đồng</span>
                </td>
                <td>Dưới {so(MOC_BAC)} điểm</td>
                <td>Nâu đồng</td>
              </tr>
              <tr>
                <td>
                  <span className="chip chip-bac">Bạc</span>
                </td>
                <td>
                  Từ {so(MOC_BAC)} đến {so(MOC_VANG - 1)} điểm
                </td>
                <td>Xám bạc</td>
              </tr>
              <tr>
                <td>
                  <span className="chip chip-vang">Vàng</span>
                </td>
                <td>Từ {so(MOC_VANG)} điểm trở lên</td>
                <td>Vàng</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Hạng tự đổi theo số điểm hiện có, ngay sau mỗi lần cộng hoặc đổi điểm. Đổi nhiều điểm có thể làm hạng giảm; app báo trước ở từng ưu đãi.</p>
      </section>
      <section className="hop">
        <h2>Đổi điểm lấy ưu đãi</h2>
        <ul className="ds">
          {UU_DAI.map((u) => (
            <li key={u.ma} className="dong">
              <div className="gian">
                <p className="dam">{u.ten}</p>
                <p className="phu">
                  {u.moTa} · mã {u.ma}
                </p>
              </div>
              <span className="nhan">{so(u.diemCan)} điểm</span>
            </li>
          ))}
        </ul>
        <p>Đủ điểm thì ưu đãi vào ví của thành viên và điểm bị trừ đúng bằng mức đổi. Thiếu điểm thì từ chối, số dư giữ nguyên.</p>
        <h2>Thanh toán bằng điểm</h2>
        <p>
          Tại quầy, thành viên có thể dùng điểm trừ thẳng vào hóa đơn: <strong>1 điểm = {so(VND_MOI_DIEM_TIEU)}đ</strong> (100 điểm = {so(100 * VND_MOI_DIEM_TIEU)}đ).
          Số điểm dùng không vượt số dư và không vượt giá trị hóa đơn. Hóa đơn ghi rõ số điểm trừ, số tiền giảm và số tiền khách cần trả.
        </p>
        <p>Phần tiền khách thực trả vẫn được tích điểm theo tỉ lệ {so(VND_MOI_DIEM)}đ = 1 điểm. Lịch sử tách riêng hai mục: cộng điểm và tiêu điểm.</p>
        <h2>Mã QR</h2>
        <p>Mỗi thẻ có mã QR chứa đúng mã thành viên (ví dụ KT-004). Quầy quét bằng camera, bằng ảnh, hoặc máy quét cầm tay.</p>
        <h2>Dữ liệu và AI</h2>
        <p>
          Toàn bộ dữ liệu lưu trên trình duyệt này (localStorage) nên app chạy được khi mất mạng. Bộ dữ liệu mẫu do Ban tổ chức cung cấp, là dữ liệu hư cấu.
          Mục "Gợi ý ưu đãi" dùng AI khi có mạng và luôn ghi rõ nguồn; mất mạng thì gợi ý bằng quy tắc trên máy. Voucher và quà tặng là mô phỏng.
        </p>
      </section>
    </div>
  );
}
