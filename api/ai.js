// Hàm phía máy chủ: gọi AI để gợi ý ưu đãi. Khóa API chỉ nằm ở biến môi trường, trình duyệt không bao giờ thấy.
// Thử Gemini trước, lỗi thì thử NVIDIA NIM. Cả hai lỗi thì trả ok:false, giao diện tự dùng gợi ý theo quy tắc.

const HE_THONG =
  'Bạn là trợ lý của một chương trình thẻ thành viên tích điểm. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn. ' +
  'Chỉ trả về MỘT đối tượng JSON đúng mẫu {"loiChao": string, "goiY": string, "lyDo": string}, không thêm chữ nào khác. ' +
  'Mỗi trường tối đa 200 ký tự. Chỉ gợi ý ưu đãi có trong danh sách. Chỉ gợi ý đổi khi thành viên đủ điểm; ' +
  'nếu chưa đủ điểm cho ưu đãi nào, nói rõ còn thiếu bao nhiêu điểm. Lưu ý hạng tính theo điểm hiện có nên đổi nhiều điểm có thể làm giảm hạng. ' +
  'Không bịa thêm ưu đãi, giá tiền hay quy định.';

function chuanBi(duLieu) {
  if (!duLieu || typeof duLieu !== 'object') return null;
  const diem = Number(duLieu.diem);
  if (!Number.isFinite(diem) || diem < 0 || diem > 100000000) return null;
  const ten = String(duLieu.ten ?? '').replace(/[^\p{L}\p{N} .'-]/gu, '').slice(0, 60);
  const hang = ['Đồng', 'Bạc', 'Vàng'].includes(duLieu.hang) ? duLieu.hang : 'Đồng';
  const uuDai = Array.isArray(duLieu.uuDai)
    ? duLieu.uuDai.slice(0, 10).map((u) => ({ ten: String(u?.ten ?? '').slice(0, 60), diemCan: Number(u?.diemCan) || 0 }))
    : [];
  if (uuDai.length === 0) return null;
  // Tính sẵn mọi con số ở đây: AI chỉ diễn đạt, không tự làm phép tính (mô hình hay tính sai hạng).
  const hangCua = (d) => (d >= 5000 ? 'Vàng' : d >= 1000 ? 'Bạc' : 'Đồng');
  const dong = uuDai.map((u) => {
    const con = diem - u.diemCan;
    if (con < 0) return `- ${u.ten}: cần ${u.diemCan} điểm. CHƯA ĐỦ, thiếu ${-con} điểm.`;
    const sau = hangCua(con);
    return `- ${u.ten}: cần ${u.diemCan} điểm. ĐỦ ĐIỂM. Đổi xong còn ${con} điểm, hạng ${sau} (${sau === hang ? 'giữ nguyên hạng' : 'BỊ XUỐNG HẠNG'}).`;
  });
  return (
    `Thành viên: ${ten || 'bạn'}. Điểm hiện có: ${diem}. Hạng: ${hang}.\n` +
    'Tích điểm: 10.000đ = 1 điểm.\n' +
    'Danh sách ưu đãi (các con số dưới đây đã được hệ thống tính đúng, hãy dùng nguyên, không tự tính lại):\n' +
    dong.join('\n') +
    '\nHãy chào thành viên, gợi ý MỘT ưu đãi nên đổi và nêu lý do. Ưu tiên ưu đãi giá trị cao nhất mà vẫn giữ nguyên hạng. ' +
    'Nếu chưa đủ điểm cho ưu đãi nào thì khuyên tích thêm và nói còn thiếu bao nhiêu. Ghi đúng tên ưu đãi như trong danh sách.'
  );
}

function docJson(text) {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const d = JSON.parse(text.slice(a, b + 1));
    if (typeof d.loiChao !== 'string' || typeof d.goiY !== 'string' || typeof d.lyDo !== 'string') return null;
    if (!d.goiY.trim()) return null;
    return { loiChao: d.loiChao.slice(0, 300), goiY: d.goiY.slice(0, 300), lyDo: d.lyDo.slice(0, 300) };
  } catch {
    return null;
  }
}

async function goiGemini(prompt, key, model) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: HE_THONG }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const d = await r.json();
  return (d?.candidates?.[0]?.content?.parts ?? []).map((p) => p?.text ?? '').join('');
}

async function goiNvidia(prompt, key, model) {
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: HE_THONG },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`nvidia ${r.status}`);
  const d = await r.json();
  return d?.choices?.[0]?.message?.content ?? '';
}

export async function taoGoiY(duLieu, env) {
  const prompt = chuanBi(duLieu);
  if (!prompt) return { ok: false, loi: 'Dữ liệu gửi lên không hợp lệ.' };
  const loi = [];
  // .trim(): khóa dán vào biến môi trường hay dính dấu xuống dòng, làm hỏng header
  const khoaGemini = String(env.GEMINI_API_KEY ?? '').trim();
  const khoaNvidia = String(env.NVIDIA_API_KEY ?? '').trim();
  if (khoaGemini) {
    const model = (env.GEMINI_MODEL || 'gemini-flash-lite-latest').trim();
    try {
      const kq = docJson(await goiGemini(prompt, khoaGemini, model));
      if (kq) return { ok: true, ketQua: kq, moHinh: model };
      loi.push('gemini: sai định dạng');
    } catch (e) {
      loi.push(String(e?.message ?? e).slice(0, 60));
    }
  }
  if (khoaNvidia) {
    const model = (env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct').trim();
    try {
      const kq = docJson(await goiNvidia(prompt, khoaNvidia, model));
      if (kq) return { ok: true, ketQua: kq, moHinh: model };
      loi.push('nvidia: sai định dạng');
    } catch (e) {
      loi.push(String(e?.message ?? e).slice(0, 60));
    }
  }
  return { ok: false, loi: loi.length ? `AI không trả lời được (${loi.join('; ')}).` : 'Chưa cấu hình khóa AI.' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, loi: 'Chỉ nhận POST.' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const kq = await taoGoiY(body, process.env);
  res.status(kq.ok ? 200 : 502).json(kq);
}
