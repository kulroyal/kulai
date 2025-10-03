# KuL AI Studio Pro

Một công cụ tạo ảnh AI hàng loạt chuyên nghiệp, chạy hoàn toàn trên trình duyệt. Ứng dụng này cho phép người dùng tạo ra nhiều hình ảnh chất lượng cao của cùng một chủ thể trong các bối cảnh, trang phục và tư thế khác nhau với khả năng kiểm soát chi tiết.

## Tính năng

- **Tạo ảnh hàng loạt:** Tạo nhiều ảnh từ một bộ nguyên liệu duy nhất.
- **Giữ vững Nhận dạng Chủ thể:** Các kỹ thuật prompt nâng cao để duy trì sự nhất quán của nhân vật.
- **Xử lý trên Trình duyệt:** Mọi quá trình tạo ảnh AI đều diễn ra phía client.
- **Studio Ghép Nhanh:** Tái sử dụng chủ thể đã tạo để nhanh chóng đặt vào các bối cảnh mới.
- **Tạo Biến thể:** Tạo các biến thể của ảnh hiện có với các tư thế mới.
- **Và nhiều hơn nữa...**

## Cách Chạy trên Máy tính (Local Development)

**Yêu cầu:** Đã cài đặt [Node.js](https://nodejs.org/).

1.  **Tải mã nguồn về:**
    ```bash
    git clone https://github.com/kulroyal/kulai.git
    cd kulai
    ```
2.  **Cài đặt các gói phụ thuộc:**
    ```bash
    npm install
    ```
3.  **Tạo biến môi trường:**
    Tạo một tệp mới tên là `.env` ở thư mục gốc của dự án và thêm vào đó API key của bạn:
    ```
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```
    Thay `YOUR_GEMINI_API_KEY_HERE` bằng key thật của bạn.

4.  **Chạy máy chủ phát triển:**
    ```bash
    npm run dev
    ```
5.  Mở trình duyệt và truy cập `http://localhost:3000`.

## Cách Triển khai (Deploy) lên GitHub Pages

Dự án này được cấu hình để tự động triển khai lên GitHub Pages khi có thay đổi được đẩy lên nhánh `main`.

1.  **Tạo Repository trên GitHub:** Tạo một repository mới. **Quan trọng:** Đặt tên là `kulai` để khớp với cấu hình `base` trong `vite.config.ts`.
2.  **Thiết lập GitHub Secret:**
    - Trong repository của bạn, đi đến **Settings > Secrets and variables > Actions**.
    - Nhấp vào nút **New repository secret**.
    - Đặt tên cho secret là `GEMINI_API_KEY`.
    - Dán Gemini API Key của bạn vào ô "Value".
    - Nhấp **Add secret**.
3.  **Đẩy mã nguồn lên GitHub:**
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/kulai.git
    git branch -M main
    git push -u origin main
    ```
4.  **Kích hoạt GitHub Pages:**
    - Trong repository GitHub, đi đến **Settings > Pages**.
    - Trong phần "Build and deployment", mục "Source", hãy chọn **GitHub Actions**.
5.  **Hoàn tất:** Workflow sẽ tự động chạy. Sau vài phút, trang web của bạn sẽ được xuất bản tại địa chỉ `https://<your-username>.github.io/kulai/`.
