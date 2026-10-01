import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { allSurveys, deleteSurvey, getEndpoint, getSurvey, putSurvey, setEndpoint, type Category, type Survey } from './store';
import { onSyncChange, requestBackgroundSync, syncPending } from './sync';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
const categories: Category[] = ['Phần cứng', 'Máy chiếu', 'Điều hòa', 'Điện', 'Nội thất'];
let survey: Survey = freshSurvey();
let step = 0;
let connected = navigator.onLine;
let saveTimer: number | undefined;

function freshSurvey(): Survey {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), building: '', floor: '', room: '', category: 'Phần cứng', rating: 0, notes: '', createdAt: now, updatedAt: now, status: 'DRAFT' };
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
function saveDraft() {
  clearTimeout(saveTimer);
  survey.updatedAt = new Date().toISOString();
  saveTimer = window.setTimeout(() => void putSurvey({ ...survey }).then(renderList), 250);
}
function field(label: string, name: string, value: string, placeholder: string) {
  return `<label class="field"><span>${label}</span><input name="${name}" value="${escapeHtml(value)}" placeholder="${placeholder}" autocomplete="off" required></label>`;
}
function renderForm() {
  const parts = [
    `<div class="fields">${field('Tòa nhà', 'building', survey.building, 'Ví dụ: Khu A')}${field('Tầng', 'floor', survey.floor, 'Ví dụ: 2')}${field('Số phòng', 'room', survey.room, 'Ví dụ: 204')}</div>`,
    `<div class="fields"><label class="field"><span>Hạng mục</span><select name="category">${categories.map(item => `<option ${item === survey.category ? 'selected' : ''}>${item}</option>`).join('')}</select></label><div class="field"><span>Đánh giá tình trạng</span><div class="stars" role="group" aria-label="Đánh giá từ 1 đến 5 sao">${[1,2,3,4,5].map(n => `<button type="button" data-rating="${n}" aria-label="${n} sao" aria-pressed="${survey.rating === n}">${n <= survey.rating ? '★' : '☆'}</button>`).join('')}</div></div><label class="field"><span>Ghi chú lỗi</span><textarea name="notes" rows="5" placeholder="Mô tả hiện trạng, lỗi cần xử lý...">${escapeHtml(survey.notes)}</textarea></label></div>`,
    `<div class="fields"><div class="photo-actions"><button type="button" id="photoBtn">📷 Chụp hoặc chọn ảnh</button><button type="button" id="locationBtn">⌖ Lấy vị trí GPS</button></div>${survey.photo ? `<img class="preview" src="${survey.photo}" alt="Ảnh hiện trạng"><button type="button" id="removePhoto">Xóa ảnh</button>` : '<p class="muted">Chưa có ảnh. Có thể nộp phiếu không kèm ảnh.</p>'}<p id="locationText" class="muted">${survey.latitude === undefined ? 'Chưa có tọa độ' : `GPS: ${survey.latitude.toFixed(6)}, ${survey.longitude!.toFixed(6)}`}</p></div>`
  ];
  document.querySelector('#formBody')!.innerHTML = parts[step];
  document.querySelector('#stepText')!.textContent = `Bước ${step + 1}/3 · ${['Vị trí', 'Đánh giá', 'Minh chứng'][step]}`;
  (document.querySelector('#prevBtn') as HTMLButtonElement).disabled = step === 0;
  document.querySelector('#nextBtn')!.textContent = step === 2 ? 'Lưu phiếu chờ đồng bộ' : 'Tiếp tục';
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('#formBody [name]').forEach(input => {
    input.addEventListener('input', () => {
      const key = input.name as 'building' | 'floor' | 'room' | 'category' | 'notes';
      (survey as unknown as Record<string, string>)[key] = input.value;
      saveDraft();
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-rating]').forEach(button => button.onclick = () => {
    survey.rating = Number(button.dataset.rating); saveDraft(); renderForm();
  });
  document.querySelector<HTMLButtonElement>('#photoBtn')?.addEventListener('click', capturePhoto);
  document.querySelector<HTMLButtonElement>('#locationBtn')?.addEventListener('click', captureLocation);
  document.querySelector<HTMLButtonElement>('#removePhoto')?.addEventListener('click', () => { survey.photo = undefined; saveDraft(); renderForm(); });
}
async function capturePhoto() {
  try {
    const photo = await Camera.getPhoto({ quality: 60, width: 1200, resultType: CameraResultType.DataUrl, source: CameraSource.Prompt });
    if (photo.dataUrl) { survey.photo = photo.dataUrl; saveDraft(); renderForm(); }
  } catch (error) { showMessage(`Không lấy được ảnh: ${String(error)}`); }
}
async function captureLocation() {
  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 });
    survey.latitude = position.coords.latitude; survey.longitude = position.coords.longitude;
    saveDraft(); renderForm();
  } catch (error) { showMessage(`Không lấy được GPS: ${String(error)}`); }
}
function showMessage(message: string) { const el = document.querySelector('#message')!; el.textContent = message; window.setTimeout(() => { if (el.textContent === message) el.textContent = ''; }, 6000); }
async function renderList() {
  const items = (await allSurveys()).reverse();
  const pending = items.filter(item => item.status === 'PENDING_SYNC').length;
  document.querySelector('#queueCount')!.textContent = `${pending} phiếu chờ`;
  document.querySelector('#surveyList')!.innerHTML = items.length ? items.map(item => `<article class="item"><div><strong>${escapeHtml(item.building || 'Bản nháp')} ${escapeHtml(item.room)}</strong><small>${escapeHtml(item.category)} · ${new Date(item.updatedAt).toLocaleString('vi-VN')}</small><span class="badge ${item.status.toLowerCase()}">${item.status === 'DRAFT' ? 'Bản nháp' : item.status === 'SYNCED' ? 'Đã đồng bộ' : 'Chờ đồng bộ'}</span>${item.lastError ? `<small class="error">${escapeHtml(item.lastError)}</small>` : ''}</div><div class="item-actions">${item.status === 'DRAFT' ? `<button data-open="${item.id}">Sửa</button>` : ''}<button data-delete="${item.id}" aria-label="Xóa phiếu">Xóa</button></div></article>`).join('') : '<p class="empty">Chưa có phiếu khảo sát nào.</p>';
  document.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(button => button.onclick = async () => { const found = await getSurvey(button.dataset.open!); if (found) { survey = found; step = 0; renderForm(); window.scrollTo(0, 0); } });
  document.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(button => button.onclick = async () => { if (confirm('Xóa phiếu này?')) { await deleteSurvey(button.dataset.delete!); await renderList(); } });
}
async function submit() {
  if (!survey.building.trim() || !survey.floor.trim() || !survey.room.trim()) { step = 0; renderForm(); showMessage('Hãy nhập đủ tòa nhà, tầng và số phòng.'); return; }
  if (!survey.rating) { step = 1; renderForm(); showMessage('Hãy chọn đánh giá từ 1 đến 5 sao.'); return; }
  clearTimeout(saveTimer);
  survey.updatedAt = new Date().toISOString();
  await putSurvey({ ...survey, status: 'PENDING_SYNC' });
  survey = freshSurvey(); step = 0; renderForm(); await renderList();
  showMessage('Đã lưu phiếu vào hàng đợi trên thiết bị.');
  await requestBackgroundSync();
}
async function init() {
  app.innerHTML = `<header><div class="brand"><div class="logo">VKU</div><div><h1>Khảo sát thực địa</h1><p>Kiểm tra cơ sở vật chất · VKU</p></div></div><span id="connection" class="connection"></span></header><main><section class="intro"><span class="eyebrow">FIELD INSPECTION</span><h2>Ghi nhận mọi nơi,<br><em>kể cả khi mất mạng.</em></h2><p>Phiếu được giữ an toàn trên thiết bị và tự gửi khi kết nối trở lại.</p><div class="intro-stats"><span id="queueCount">0 phiếu chờ</span><span>● Lưu tự động</span></div></section><div class="grid"><section class="panel"><div class="panel-head"><div><p class="kicker">PHIẾU KIỂM TRA</p><h2>Khảo sát mới</h2></div><span id="stepText"></span></div><div class="progress"><span id="progressBar"></span></div><div id="formBody"></div><div class="form-actions"><button id="prevBtn" class="secondary">Quay lại</button><button id="nextBtn" class="primary">Tiếp tục</button></div><p id="message" role="status"></p></section><aside><section class="panel settings"><p class="kicker">ĐỒNG BỘ</p><h2>Máy chủ nhận phiếu</h2><label class="field"><span>API endpoint (HTTPS)</span><input id="endpoint" type="url" placeholder="https://example.com/api/surveys"></label><p class="hint">Máy chủ cần nhận POST JSON và trả mã 2xx. UUID nằm trong trường id và header Idempotency-Key.</p><button id="saveEndpoint" class="secondary">Lưu địa chỉ</button><button id="syncBtn" class="primary">Đồng bộ ngay</button></section><section class="panel list-panel"><div class="panel-head"><div><p class="kicker">LƯU TRÊN THIẾT BỊ</p><h2>Phiếu khảo sát</h2></div></div><div id="surveyList"></div></section></aside></div></main>`;
  const draft = (await allSurveys()).filter(item => item.status === 'DRAFT').at(-1);
  if (draft) survey = draft;
  (document.querySelector('#endpoint') as HTMLInputElement).value = await getEndpoint();
  document.querySelector<HTMLButtonElement>('#saveEndpoint')!.onclick = async () => {
    const value = (document.querySelector('#endpoint') as HTMLInputElement).value.trim();
    if (value && (!/^https:\/\//i.test(value) && !(value.startsWith('http://localhost') && !Capacitor.isNativePlatform()))) { showMessage('Hãy dùng URL HTTPS hợp lệ.'); return; }
    await setEndpoint(value); showMessage('Đã lưu địa chỉ máy chủ.'); void requestBackgroundSync();
  };
  document.querySelector<HTMLButtonElement>('#syncBtn')!.onclick = () => void syncPending().then(renderList);
  document.querySelector<HTMLButtonElement>('#prevBtn')!.onclick = () => { if (step) { step--; renderForm(); updateProgress(); } };
  document.querySelector<HTMLButtonElement>('#nextBtn')!.onclick = () => {
    if (step === 0 && (!survey.building.trim() || !survey.floor.trim() || !survey.room.trim())) { showMessage('Hãy nhập đủ tòa nhà, tầng và số phòng.'); return; }
    if (step === 1 && !survey.rating) { showMessage('Hãy chọn đánh giá từ 1 đến 5 sao.'); return; }
    if (step === 2) void submit(); else { step++; renderForm(); updateProgress(); }
  };
  function updateProgress() { (document.querySelector('#progressBar') as HTMLElement).style.width = `${(step + 1) / 3 * 100}%`; }
  function updateConnection() { document.querySelector('#connection')!.textContent = connected ? '● Trực tuyến' : '● Ngoại tuyến'; document.querySelector('#connection')!.className = `connection ${connected ? 'online' : 'offline'}`; }
  window.addEventListener('online', () => { connected = true; updateConnection(); void requestBackgroundSync(); });
  window.addEventListener('offline', () => { connected = false; updateConnection(); });
  await Network.addListener('networkStatusChange', status => { connected = status.connected; updateConnection(); if (status.connected) void requestBackgroundSync(); });
  const network = await Network.getStatus(); connected = network.connected; updateConnection();
  onSyncChange(() => void renderList());
  renderForm(); updateProgress(); await renderList();
  if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
    navigator.serviceWorker.register('/sw.js').then(() => { navigator.serviceWorker.addEventListener('message', event => { if (event.data?.type === 'SYNC_NOW') void syncPending(); }); }).catch(console.error);
  }
  if (connected) void requestBackgroundSync();
}

void init().catch(error => { app.textContent = `Không khởi động được ứng dụng: ${String(error)}`; });
