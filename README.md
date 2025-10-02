# KuL AI Studio Pro

Một công cụ tạo ảnh AI hàng loạt chuyên nghiệp, chạy hoàn toàn trên trình duyệt. Ứng dụng này cho phép người dùng tạo ra nhiều hình ảnh chất lượng cao của cùng một chủ thể trong các bối cảnh, trang phục và tư thế khác nhau với khả năng kiểm soát chi tiết.

## Tính năng

- **Tạo ảnh hàng loạt:** Tạo nhiều ảnh từ một bộ nguyên liệu duy nhất.
- **Giữ vững Nhận dạng Chủ thể:** Các kỹ thuật prompt nâng cao để duy trì sự nhất quán của nhân vật.
- **Xử lý trên Trình duyệt:** Mọi quá trình tạo ảnh AI đều diễn ra phía client.
- **API Key do Người dùng Cung cấp:** Sử dụng an toàn API key Google Gemini của riêng bạn, chỉ được lưu trong bộ nhớ cục bộ của trình duyệt.
- **Studio Ghép Nhanh:** Tái sử dụng chủ thể đã tạo để nhanh chóng đặt vào các bối cảnh mới.
- **Tạo Biến thể:** Tạo các biến thể của ảnh hiện có với các tư thế mới.
- **Và nhiều hơn nữa...**

## Cách Sử dụng Ứng dụng đã Xuất bản

1. Truy cập vào đường link của ứng dụng.
2. Một hộp thoại sẽ yêu cầu bạn nhập Google Gemini API Key. Bạn có thể lấy key từ [Google AI Studio](https://aistudio.google.com/app/apikey).
3. Dán key của bạn vào và nhấn "Lưu". Key sẽ được lưu trong trình duyệt của bạn cho các lần truy cập sau.
4. Bắt đầu sáng tạo!

## Cách Chạy trên Máy tính (Local)

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
3.  **Chạy máy chủ phát triển:**
    ```bash
    npm run dev
    ```
4.  Mở trình duyệt và truy cập `http://localhost:3000`. Ứng dụng sẽ yêu cầu bạn nhập Gemini API key.
