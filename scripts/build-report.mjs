import { chromium } from 'playwright-core';
import { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, PageNumber, PageBreak, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { PDFDocument } from 'pdf-lib';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const OUT = 'output';
const student = process.env.REPORT_STUDENT || 'Bổ sung họ tên - MSSV - lớp';
const demo = process.env.REPORT_DEMO_URL || 'Bổ sung URL sau khi triển khai HTTPS';
const repo = 'https://github.com/ManhCuong2005/Lab01_LapTrinhDaNenTang';
const blue = '0284C7';
const dark = '10243A';
const gray = '64748B';
const shots = [
  await readFile('docs/assets/01-tong-quan.png'),
  await readFile('docs/assets/02-danh-gia-ngoai-tuyen.png'),
  await readFile('docs/assets/03-cho-dong-bo.png'),
  await readFile('docs/assets/04-da-dong-bo.png')
];
await mkdir(OUT, { recursive: true });

const body = text => new Paragraph({ text, spacing: { after: 120, line: 264 } });
const heading = text => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 } });
const bullet = text => new Paragraph({ text, bullet: { indent: 720 }, spacing: { after: 120, line: 280 } });
const caption = text => new Paragraph({ children: [new TextRun({ text, color: gray, size: 18 })], spacing: { before: 80, after: 180 } });
const shot = (index, width = 550, height = 382) => new Paragraph({ children: [new ImageRun({ data: shots[index], transformation: { width, height }, type: 'png', altText: ['Giao diện tổng quan', 'Biểu mẫu đánh giá ngoại tuyến', 'Phiếu chờ đồng bộ', 'Phiếu đã đồng bộ'][index] })], alignment: AlignmentType.CENTER, spacing: { after: 80 } });
const cell = (text, width, header = false) => new TableCell({ width: { size: width, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, shading: header ? { fill: 'F2F4F7' } : undefined, children: [new Paragraph({ children: [new TextRun({ text, bold: header })] })] });
const table = new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [2400, 6960], borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D9E4EC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D9E4EC' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'D9E4EC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'D9E4EC' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'D9E4EC' }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'D9E4EC' } }, rows: [
  new TableRow({ children: [cell('Thành phần', 2400, true), cell('Vai trò', 6960, true)] }),
  new TableRow({ children: [cell('PWA / Vite', 2400), cell('Giao diện khảo sát, manifest và Service Worker Cache-First', 6960)] }),
  new TableRow({ children: [cell('IndexedDB', 2400), cell('Lưu bản nháp, ảnh, hàng đợi và URL máy chủ', 6960)] }),
  new TableRow({ children: [cell('HTTPS API', 2400), cell('Nhận phiếu theo UUID, trả 2xx khi lưu thành công', 6960)] })
] });
const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22, color: dark }, paragraph: { spacing: { after: 120, line: 264 } } } }, paragraphStyles: [
    { id: 'Title', name: 'Title', run: { font: 'Calibri', size: 42, bold: true, color: dark }, paragraph: { spacing: { after: 140 } } },
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { font: 'Calibri', size: 32, bold: true, color: '2E74B5' }, paragraph: { spacing: { before: 320, after: 160 } } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: { font: 'Calibri', size: 26, bold: true, color: '2E74B5' }, paragraph: { spacing: { before: 240, after: 120 } } }
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 708, footer: 708 } } },
    headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'VKU  |  KHẢO SÁT THỰC ĐỊA', color: blue, bold: true, size: 16 })], alignment: AlignmentType.RIGHT })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: 'Báo cáo kỹ thuật ngắn  •  Trang ', color: gray, size: 16 }), new TextRun({ children: [PageNumber.CURRENT], color: gray, size: 16 })], alignment: AlignmentType.RIGHT })] }) },
    children: [
      new Paragraph({ children: [new TextRun({ text: 'TIỂU DỰ ÁN 1', color: blue, bold: true, size: 18 })], spacing: { after: 140 } }),
      new Paragraph({ text: 'Khảo sát thực địa VKU', style: 'Title' }),
      new Paragraph({ children: [new TextRun({ text: 'Ứng dụng PWA thu thập dữ liệu ngoại tuyến', color: gray, size: 25 })], spacing: { after: 300 } }),
      body(`Sinh viên / nhóm: ${student}`),
      body(`Kho mã nguồn: ${repo}`),
      body(`URL demo HTTPS: ${demo}`),
      heading('1. Bài toán và mục tiêu'),
      body('Thanh tra cơ sở vật chất cần ghi nhận hiện trạng phòng học ở khu vực không có Wi-Fi hoặc 4G/5G. Ứng dụng cho phép hoàn thành phiếu khi ngoại tuyến, giữ dữ liệu trên thiết bị và gửi lên máy chủ khi kết nối trở lại.'),
      heading('2. Các chức năng chính'),
      bullet('Cài đặt PWA độc lập: manifest standalone, biểu tượng 192/512 px, Service Worker lưu App Shell theo Cache-First.'),
      bullet('Phiếu ba bước: tòa nhà, tầng, phòng; hạng mục, đánh giá 1–5 sao, ghi chú; ảnh và tọa độ GPS.'),
      bullet('IndexedDB lưu bản nháp tự động và hàng đợi PENDING_SYNC kèm UUID, thời gian tạo.'),
      bullet('Khi có mạng, gửi phiếu theo thứ tự. Chỉ đánh dấu SYNCED sau HTTP 2xx; server xử lý lặp theo UUID.'),
      heading('3. Kiến trúc'),
      table,
      new Paragraph({ children: [new PageBreak()] }),
      heading('4. Luồng dữ liệu ngoại tuyến'),
      body('Nhập biểu mẫu → lưu nháp IndexedDB → nộp phiếu vào hàng đợi → phát hiện kết nối → POST HTTPS → nhận 2xx → cập nhật trạng thái. Khi lỗi mạng hoặc HTTP, phiếu tiếp tục ở hàng đợi để thử lại.'),
      body('Ảnh được lưu cùng bản nháp và chuyển đến API khi đồng bộ. API Firebase mẫu lưu dữ liệu vào Firestore và ảnh vào Cloud Storage.'),
      heading('5. Kiểm thử'),
      bullet('Build TypeScript/Vite thành công; manifest và tài nguyên PWA được phục vụ đúng.'),
      bullet('Dừng máy chủ: ứng dụng vẫn mở từ Cache Storage, bản nháp còn sau khi tải lại.'),
      bullet('Nộp phiếu khi không có máy chủ: trạng thái Chờ đồng bộ. Khôi phục kết nối: server nhận UUID và giao diện chuyển Đã đồng bộ.'),
      caption('Hình 1. Biểu mẫu đánh giá khi máy chủ web không hoạt động'),
      shot(1, 450, 312),
      heading('6. Kết luận'),
      body('Ứng dụng đáp ứng quy trình khảo sát ngoại tuyến và đồng bộ khi có mạng. Bản demo công khai cần cấu hình URL HTTPS của API trước khi thử trên thiết bị khác.'),
      new Paragraph({ children: [new PageBreak()] }),
      heading('7. Ảnh chụp màn hình'),
      caption('Hình 2. Giao diện tổng quan và biểu mẫu vị trí'),
      shot(0, 450, 312),
      caption('Hình 3. Phiếu đã đồng bộ sau khi kết nối trở lại'),
      shot(3, 450, 312),
      body('Nguồn ảnh: chụp trực tiếp từ bản build production bằng Chrome trong quá trình kiểm thử.')
    ]
  }]
});
await writeFile(`${OUT}/bao-cao-vku.docx`, await Packer.toBuffer(doc));

const b64 = shots.map(buffer => buffer.toString('base64'));
const image = (n, alt) => `<img src="data:image/png;base64,${b64[n]}" alt="${alt}">`;
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
@page{size:letter;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Calibri,Arial,sans-serif;color:#10243a;font-size:11pt;line-height:1.32}.page{width:8.5in;height:11in;padding:1in;page-break-after:always;position:relative;overflow:hidden}.page:last-child{page-break-after:auto}.top{font-size:8pt;font-weight:bold;letter-spacing:.12em;color:#0284c7;text-align:right;border-bottom:1px solid #d7e9f3;padding-bottom:8px;margin-bottom:24px}.footer{position:absolute;bottom:.5in;right:1in;color:#64748b;font-size:8pt}.eyebrow{font-size:9pt;color:#0284c7;font-weight:bold;letter-spacing:.14em}h1{font-size:25pt;margin:8px 0 4px}h2{font-size:15pt;color:#2e74b5;margin:21px 0 9px}h3{font-size:12pt;margin:12px 0 5px}p{margin:0 0 9px}.sub{font-size:14pt;color:#64748b;margin-bottom:22px}.meta{font-size:9pt;color:#475569;line-height:1.5}.rule{height:4px;background:#0284c7;border-radius:3px;margin:19px 0}ul{padding-left:22px;margin:7px 0}li{margin-bottom:9px}table{border-collapse:collapse;width:100%;font-size:9.5pt;margin:8px 0 20px}th,td{border:1px solid #d9e4ec;padding:9px 10px;text-align:left;vertical-align:top}th{background:#f2f4f7}.flow{padding:16px;background:#edf8fd;border-left:4px solid #0284c7;font-weight:bold;font-size:9.5pt;line-height:1.6}.figure{margin:10px 0 15px}.figure img{width:100%;border:1px solid #d9e4ec;border-radius:8px}.figure small{display:block;color:#64748b;margin-top:5px}.pair{display:flex;gap:13px}.pair .figure{width:50%}.note{background:#f8fafc;padding:13px;border-radius:8px;font-size:9pt;color:#475569}
.page:nth-of-type(2) .figure img{width:80%;display:block;margin:auto}
</style></head><body>
<section class="page"><div class="top">VKU | KHẢO SÁT THỰC ĐỊA</div><div class="eyebrow">TIỂU DỰ ÁN 1</div><h1>Khảo sát thực địa VKU</h1><p class="sub">Ứng dụng PWA thu thập dữ liệu ngoại tuyến</p><p class="meta"><b>Sinh viên / nhóm:</b> ${student}<br><b>Kho mã nguồn:</b> ${repo}<br><b>URL demo HTTPS:</b> ${demo}</p><div class="rule"></div><h2>1. Bài toán và mục tiêu</h2><p>Thanh tra cơ sở vật chất cần ghi nhận hiện trạng phòng học ở khu vực không có Wi-Fi hoặc 4G/5G. Ứng dụng cho phép hoàn thành phiếu khi ngoại tuyến, giữ dữ liệu trên thiết bị và gửi lên máy chủ khi kết nối trở lại.</p><h2>2. Danh sách chức năng</h2><ul><li>PWA cài đặt độc lập, manifest standalone, biểu tượng 192/512 px và App Shell Cache-First.</li><li>Phiếu ba bước: vị trí; hạng mục, 1–5 sao, ghi chú; ảnh và GPS.</li><li>IndexedDB lưu bản nháp tự động và hàng đợi PENDING_SYNC với UUID, thời gian tạo.</li><li>Gửi tuần tự khi mạng trở lại; chỉ đánh dấu SYNCED sau phản hồi HTTP 2xx.</li></ul><h2>3. Kiến trúc</h2><table><tr><th>Thành phần</th><th>Vai trò</th></tr><tr><td>PWA / Vite</td><td>Giao diện, manifest và Service Worker</td></tr><tr><td>IndexedDB</td><td>Bản nháp, ảnh, hàng đợi và cấu hình máy chủ</td></tr><tr><td>HTTPS API</td><td>Nhận phiếu theo UUID, phản hồi khi lưu thành công</td></tr></table><div class="footer">Báo cáo kỹ thuật ngắn · Trang 1/3</div></section>
<section class="page"><div class="top">VKU | KIẾN TRÚC VÀ KIỂM THỬ</div><h2>4. Luồng dữ liệu ngoại tuyến</h2><div class="flow">Nhập biểu mẫu → IndexedDB → PENDING_SYNC → Kết nối trở lại → POST HTTPS → 2xx → SYNCED</div><p style="margin-top:14px">Khi mất mạng hoặc server trả lỗi, phiếu tiếp tục ở hàng đợi. Ảnh được giữ cùng bản nháp và gửi lên API khi đồng bộ. API Firebase mẫu lưu phiếu trong Firestore và ảnh trong Cloud Storage.</p><h2>5. Kiểm thử</h2><ul><li>Build TypeScript/Vite thành công; manifest, Service Worker và biểu tượng được phục vụ đúng.</li><li>Dừng máy chủ web: ứng dụng vẫn mở từ Cache Storage và bản nháp còn sau khi tải lại.</li><li>Nộp khi không có máy chủ: phiếu hiển thị “Chờ đồng bộ”.</li><li>Khôi phục kết nối: server nhận cùng UUID; giao diện chuyển “Đã đồng bộ”.</li></ul><div class="figure">${image(1,'Biểu mẫu đánh giá ngoại tuyến')}<small>Hình 1. Đánh giá tình trạng trong khi máy chủ web không hoạt động.</small></div><h2>6. Kết luận</h2><p>Ứng dụng đáp ứng quy trình khảo sát ngoại tuyến và đồng bộ khi có mạng. Bản demo công khai cần cấu hình URL HTTPS của API để kiểm tra đồng bộ trên thiết bị khác.</p><div class="footer">Báo cáo kỹ thuật ngắn · Trang 2/3</div></section>
<section class="page"><div class="top">VKU | ẢNH CHỤP MÀN HÌNH</div><h2>7. Giao diện và trạng thái phiếu</h2><div class="figure">${image(0,'Giao diện tổng quan')}<small>Hình 2. Giao diện tổng quan và biểu mẫu vị trí.</small></div><div class="pair"><div class="figure">${image(2,'Phiếu chờ đồng bộ')}<small>Hình 3. Phiếu ở trạng thái chờ đồng bộ.</small></div><div class="figure">${image(3,'Phiếu đã đồng bộ')}<small>Hình 4. Phiếu sau khi server phản hồi thành công.</small></div></div><p class="note">Ảnh chụp trực tiếp từ bản build production trong quá trình kiểm thử. URL demo và thông tin sinh viên cần được bổ sung trước khi nộp bản cuối cùng.</p><div class="footer">Báo cáo kỹ thuật ngắn · Trang 3/3</div></section></body></html>`;
await writeFile(`${OUT}/bao-cao-vku.html`, html, 'utf8');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await mkdir('output/qa', { recursive: true });
for (let i = 0; i < 3; i++) await page.locator('.page').nth(i).screenshot({ path: `output/qa/page-${i + 1}.png` });
await page.pdf({ path: `${OUT}/bao-cao-vku.pdf`, format: 'Letter', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
await browser.close();
const pdf = await PDFDocument.load(await readFile(`${OUT}/bao-cao-vku.pdf`));
if (pdf.getPageCount() !== 3) throw new Error(`Expected 3 PDF pages, got ${pdf.getPageCount()}`);
console.log('Created DOCX and 3-page PDF');
