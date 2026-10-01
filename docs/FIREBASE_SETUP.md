# Thiết lập Firebase cho đồng bộ khảo sát

Ứng dụng PWA gửi `POST` JSON tới một HTTPS Cloud Function. Mã function đã có trong `firebase/functions`; không cần thay đổi biểu mẫu hoặc IndexedDB.

## 1. Tạo dự án

1. Tạo Firebase project tại [Firebase Console](https://console.firebase.google.com/).
2. Bật **Cloud Firestore** và **Cloud Storage**. Storage dùng cho ảnh; Firestore dùng cho phiếu.
3. Cloud Functions yêu cầu gói **Blaze** và tài khoản thanh toán. Kiểm tra chi phí và đặt cảnh báo ngân sách trước khi triển khai.

## 2. Triển khai function

Tại thư mục gốc của dự án:

```powershell
npm.cmd install -g firebase-tools
firebase.cmd login
cd firebase
Copy-Item .firebaserc.example .firebaserc
```

Sửa `firebase/.firebaserc`: thay `YOUR_FIREBASE_PROJECT_ID` bằng Project ID của bạn. Sau đó:

```powershell
cd functions
npm.cmd install
cd ..
firebase.cmd deploy --only functions:submitSurvey
```

Firebase CLI sẽ in URL HTTPS của `submitSurvey`. Function ghi phiếu vào collection `surveys` theo UUID; ảnh nằm trong Cloud Storage dưới `surveys/<UUID>.<đuôi ảnh>`. Gửi lại cùng UUID không tạo phiếu thứ hai.

## 3. Gắn URL với PWA

**Cách đơn giản:** mở PWA, nhập URL function vào ô **Máy chủ nhận phiếu**, bấm **Lưu địa chỉ**. Địa chỉ được lưu trên thiết bị bằng IndexedDB.

**Cấu hình sẵn cho mọi người dùng:** tạo biến môi trường `VITE_SURVEY_API_URL` bằng URL function trong Cloudflare Pages/Vercel, rồi triển khai lại. Biến này là URL công khai, không phải khóa bí mật. Người dùng vẫn có thể đổi địa chỉ trong giao diện.

## 4. Kiểm tra

1. Mở PWA bằng HTTPS, tắt mạng, lập và lưu một phiếu có ảnh.
2. Xác nhận phiếu có trạng thái **Chờ đồng bộ**.
3. Bật mạng và đợi hoặc bấm **Đồng bộ ngay**.
4. Xác nhận trạng thái **Đã đồng bộ**, tài liệu xuất hiện trong Firestore và ảnh xuất hiện trong Storage.

Lưu ý: function mẫu nhận yêu cầu công khai để tiện demo. Trước khi dùng với dữ liệu thật, cần thêm xác thực và giới hạn truy cập. Nếu không muốn bật Blaze, có thể dùng API HTTPS khác tương thích `POST` JSON; ứng dụng không phụ thuộc Firebase.
