import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { makeQrMatrix, qrPng } from '../lib/qrcode.js';

const vietQrPayload = '00020101021238570010A000000727012700069704360113MONA00000123450208QRIBFTTA530370454068900005802VN62190815DHVIBECLOUD0126304ABCD';

test('encoder tạo PNG QR có thể giải mã lại nguyên payload', async (context) => {
  const matrix = makeQrMatrix(vietQrPayload, 'M');
  assert.ok(matrix.length >= 21);
  assert.equal(matrix.length, matrix[0].length);

  const png = qrPng(vietQrPayload, { scale: 7, quietZone: 4 });
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  const directory = await mkdtemp(join(tmpdir(), 'monapay-qr-'));
  const path = join(directory, 'vietqr.png');
  await writeFile(path, png);
  const decoded = spawnSync('zbarimg', ['--quiet', '--raw', path], { encoding: 'utf8' });
  await rm(directory, { recursive: true, force: true });

  if (decoded.error?.code === 'ENOENT') {
    context.skip('Máy không có zbarimg; đã kiểm PNG signature và matrix');
    return;
  }
  assert.equal(decoded.status, 0, decoded.stderr);
  assert.equal(decoded.stdout.trim(), vietQrPayload);
});
