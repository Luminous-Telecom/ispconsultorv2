/** Injeção do campo crls [1] em CMS SignedData (RFC 6488 — exigido pelo Krill). */

function encodeDerContentLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length]);
  if (length <= 0xff) return Buffer.from([0x81, length]);
  if (length <= 0xffff) return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff]);
  throw new Error('CMS: comprimento DER fora do intervalo suportado');
}

export function encodeCmsSignedDataCrlsField(crlDer: Buffer): Buffer {
  if (!crlDer.length || crlDer[0] !== 0x30) {
    throw new Error('CMS: CRL DER inválida (esperado CertificateList SEQUENCE)');
  }
  return Buffer.concat([Buffer.from([0xa1]), encodeDerContentLength(crlDer.length), crlDer]);
}

export function injectRpkiCrlFieldIntoSignedDataCms(cmsDer: Buffer, crlDer: Buffer): Buffer {
  const readLen = (off: number): { value: number; size: number } => {
    const b = cmsDer[off];
    if (b < 0x80) return { value: b, size: 1 };
    const n = b & 0x7f;
    let v = 0;
    for (let i = 1; i <= n; i++) v = (v << 8) | cmsDer[off + i];
    return { value: v, size: 1 + n };
  };
  const tlvSize = (off: number): number => {
    const len = readLen(off + 1);
    return 1 + len.size + len.value;
  };

  const ciLenOff = 1;
  const ciLen = readLen(ciLenOff);
  let p = 1 + ciLen.size;
  p += tlvSize(p);
  const expLenOff = p + 1;
  const expLen = readLen(expLenOff);
  p += 1 + expLen.size;
  const sdLenOff = p + 1;
  const sdLen = readLen(sdLenOff);
  p += 1 + sdLen.size;
  p += tlvSize(p);
  p += tlvSize(p);
  p += tlvSize(p);
  if (cmsDer[p] === 0xa0) p += tlvSize(p);
  if (cmsDer[p] === 0xa1) return cmsDer;

  const insertAt = p;
  const crlField = encodeCmsSignedDataCrlsField(crlDer);
  const delta = crlField.length;
  const result = Buffer.concat([cmsDer.subarray(0, insertAt), crlField, cmsDer.subarray(insertAt)]);

  const patchLen = (lenOff: number, old: { value: number; size: number }): void => {
    let newVal = old.value + delta;
    for (let i = old.size - 1; i >= 1; i--) {
      result[lenOff + i] = newVal & 0xff;
      newVal >>= 8;
    }
    if (old.size === 1) result[lenOff] = old.value + delta;
  };

  patchLen(ciLenOff, ciLen);
  patchLen(expLenOff, expLen);
  patchLen(sdLenOff, sdLen);
  return result;
}
