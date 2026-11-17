import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { napMau } from '../data/mau';
import { rong, timThanhVien } from './loyalty';

// Vẽ mã QR thành điểm ảnh rồi đưa cho bộ giải mã, giống camera chụp thẻ.
function giaiMa(noiDung: string): string | undefined {
  const qr = QRCode.create(noiDung, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const o = 8;
  const vien = 4;
  const w = (n + vien * 2) * o;
  const px = new Uint8ClampedArray(w * w * 4).fill(255);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!qr.modules.get(y, x)) continue;
      for (let dy = 0; dy < o; dy++) {
        for (let dx = 0; dx < o; dx++) {
          const i = (((y + vien) * o + dy) * w + (x + vien) * o + dx) * 4;
          px[i] = 0;
          px[i + 1] = 0;
          px[i + 2] = 0;
        }
      }
    }
  }
  return jsQR(px, w, w)?.data;
}

describe('Mã QR trên thẻ', () => {
  it('TC-KT-05: QR chứa đúng mã thành viên, quét ra KT-004 và mở hồ sơ Dũng Phạm', () => {
    const doc = giaiMa('KT-004');
    expect(doc).toBe('KT-004');
    expect(timThanhVien(napMau(rong()).state, doc ?? '')?.ten).toBe('Dũng Phạm');
  });
});
