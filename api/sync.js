// Hàm phía máy chủ: lưu một bản dữ liệu dùng chung trên Supabase để các thiết bị đồng bộ với nhau.
// Khóa secret của Supabase chỉ nằm ở biến môi trường. Bảng bật RLS và không có policy nào,
// nên khóa công khai không đọc ghi được; chỉ hàm này (dùng khóa secret) mới truy cập.
// Chưa cấu hình thì trả chuaCauHinh: app tự chạy chỉ với localStorage.

const BANG = 'trang_thai';
// Mỗi "mã đồng bộ" là một dòng riêng. Thiết bị không nhập mã thì không đụng tới database.
const MA_HOP_LE = /^[A-Z0-9]{4,16}$/;

function cauHinh(env) {
  // Nhận cả tên biến NEXT_PUBLIC_SUPABASE_URL (tên Supabase gợi ý khi bấm Connect). URL không phải bí mật.
  const url = String(env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const key = String(env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  return /^https:\/\/[a-z0-9.-]+$/i.test(url) && key ? { url, key } : null;
}

function hopLe(d) {
  if (!d || typeof d !== 'object') return false;
  for (const k of ['thanhVien', 'giaoDich', 'bienDong', 'vi']) if (!Array.isArray(d[k])) return false;
  if (d.hoaDon !== undefined && !Array.isArray(d.hoaDon)) return false;
  if (d.thanhVien.length > 5000 || d.giaoDich.length > 20000 || d.bienDong.length > 40000 || d.vi.length > 20000) return false;
  return JSON.stringify(d).length <= 900000;
}

async function goi(c, duong, init = {}) {
  return fetch(`${c.url}/rest/v1/${duong}`, {
    ...init,
    headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(8000),
  });
}

async function docHienTai(c, ID) {
  const r = await goi(c, `${BANG}?id=eq.${ID}&select=phien_ban,du_lieu`);
  if (!r.ok) throw new Error(`doc ${r.status}`);
  const ds = await r.json();
  const dong = Array.isArray(ds) ? ds[0] : null;
  return dong ? { phienBan: Number(dong.phien_ban) || 0, duLieu: dong.du_lieu } : { phienBan: 0, duLieu: null };
}

export async function dongBo(method, body, env, ma) {
  const c = cauHinh(env);
  if (!c) return { status: 200, json: { ok: false, chuaCauHinh: true } };
  const ID = String(ma ?? '').trim().toUpperCase();
  if (!MA_HOP_LE.test(ID)) return { status: 400, json: { ok: false, loi: 'Mã đồng bộ gồm 4–16 chữ hoặc số.' } };
  try {
    if (method === 'GET') {
      return { status: 200, json: { ok: true, ...(await docHienTai(c, ID)) } };
    }
    if (method !== 'POST') return { status: 405, json: { ok: false, loi: 'Chỉ nhận GET và POST.' } };

    const goc = Number(body?.phienBan);
    if (!Number.isInteger(goc) || goc < 0 || !hopLe(body?.duLieu)) {
      return { status: 400, json: { ok: false, loi: 'Dữ liệu gửi lên không hợp lệ.' } };
    }
    const ghi = { du_lieu: body.duLieu, phien_ban: goc + 1, cap_nhat: new Date().toISOString() };
    let r;
    if (goc === 0) {
      // Lần ghi đầu tiên: tạo dòng. Nếu máy khác đã tạo trước thì Supabase báo trùng khóa (409).
      r = await goi(c, BANG, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ id: ID, ...ghi }) });
    } else {
      // Chỉ ghi khi phiên bản trên máy chủ còn đúng bằng phiên bản máy này đã biết
      r = await goi(c, `${BANG}?id=eq.${ID}&phien_ban=eq.${goc}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(ghi) });
    }
    const ds = r.ok ? await r.json() : [];
    if (r.ok && Array.isArray(ds) && ds.length === 1) return { status: 200, json: { ok: true, phienBan: goc + 1 } };
    if (r.ok || r.status === 409) return { status: 409, json: { ok: false, xungDot: true } };
    throw new Error(`ghi ${r.status}`);
  } catch (e) {
    return { status: 502, json: { ok: false, loi: `Không kết nối được database (${String(e?.message ?? e).slice(0, 60)}).` } };
  }
}

export default async function handler(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  let ma = req.query?.ma;
  if (ma === undefined) {
    try {
      ma = new URL(req.url, 'http://x').searchParams.get('ma');
    } catch {
      ma = '';
    }
  }
  const kq = await dongBo(req.method, body, process.env, Array.isArray(ma) ? ma[0] : ma);
  res.setHeader('Cache-Control', 'no-store');
  res.status(kq.status).json(kq.json);
}
