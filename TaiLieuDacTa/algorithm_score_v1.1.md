# Thiết kế Thuật toán Score v1.1 (Cải tiến Cắt phôi)

Tài liệu này cập nhật và làm rõ công thức chấm điểm (Score) cho Đợt 2 theo các yêu cầu khắt khe về Kerf, Safe Margin và tính hợp lệ của phôi. Ở đợt này, hệ thống **CHỈ** sửa thuật toán và tính metrics trong bộ nhớ tại file `cutting-plans.service.ts`, hoàn toàn chưa làm API Proposal, chưa thêm Migration, chưa làm API Simulate.

---

## 1. Nguyên tắc cốt lõi và Tính hợp lệ của phôi
Hệ điểm (Score) **CÀNG CAO CÀNG TỐT**. Trước khi chấm điểm, hệ thống bắt buộc phải **LOẠI BỎ** các phôi không hợp lệ. Một thanh phôi chỉ được đưa vào chấm điểm nếu thỏa mãn TẤT CẢ các điều kiện sau:
1. **Trạng thái hợp lệ**: Không phải phôi `BO_DI`.
2. **Không có sự cố**: Phôi không nằm trong danh sách đang báo lỗi chờ xử lý (hàm `hasOpenIssue`).
3. **Đủ chiều dài**: `chieudaihientai >= Piece.length + BLADE_KERF + SAFE_MARGIN * 2`.
   *(Giải thích: Phải trừ `SAFE_MARGIN` ở cả 2 đầu máy cắt, và phải cộng thêm độ hao lưỡi cưa `BLADE_KERF` cho nhát cắt).*

---

## 2. Giải thích các hằng số (Quy tắc)
1. **`BLADE_KERF`** (Độ hao lưỡi cưa - mặc định 5mm): Tiêu hao cho mỗi nhát cắt.
2. **`SAFE_MARGIN`** (Biên an toàn - mặc định 20mm): Đoạn kẹp máy cắt ở 2 đầu thanh phôi (tổng cộng mất $20 \times 2 = 40$mm không thể dùng cắt thành phẩm).
3. **`SCRAP_THRESHOLD`** (Ngưỡng phế liệu - mặc định 100mm): Dưới ngưỡng này, phần dư bị coi là phế liệu và có thể vứt bỏ mà không bị đánh giá là lãng phí.
4. **`MIN_REUSABLE_LENGTH`** (Ngưỡng tái sử dụng - mặc định 1500mm): Trên ngưỡng này, phần dư đủ dài để cất kho `CON_DU` chờ cắt cho đơn hàng khác.

---

## 3. Công thức tính Score (v1.1)

> [!IMPORTANT]
> **Ràng buộc Tính toán**
> 1. `SAFE_MARGIN * 2` chỉ được trừ **MỘT LẦN DUY NHẤT** khi khởi tạo chiều dài khả dụng của mỗi cây phôi. Các nhát cắt sau đó chỉ trừ `Piece.length + BLADE_KERF`, tuyệt đối không trừ lặp lại `SAFE_MARGIN`.
> 2. Trong toàn bộ thuật toán, biến `Stock.remaining` luôn được hiểu thống nhất là chiều dài khả dụng ĐÃ TRỪ `SAFE_MARGIN * 2`. Do đó, khi kiểm tra Look-ahead hay bonus, chỉ cần dùng điều kiện: `Stock.remaining >= RemainingPiece.length + BLADE_KERF` hoặc `Scrap >= RemainingPiece.length + BLADE_KERF`.
> 3. Thuật toán phải trả về Metrics rõ ràng: `totalRequiredLength`, `totalKerfLoss`, `totalStockLength`, `totalReusableRemainder`, `totalScrapLength`, `utilizationRate`, và `selectedReasons`.

Khởi tạo thanh phôi để tính toán:
`Stock.remaining = chieudaihientai - SAFE_MARGIN * 2 - (Tổng chiều dài các nhát cắt trước đó + tổng các Kerf trước đó)`.

Đối với mỗi cặp `(Piece, Stock)`, nếu `Stock.remaining >= Piece.length + BLADE_KERF`, ta tính chiều dài phần dư (Scrap) nếu thực hiện nhát cắt:
**`Scrap = Stock.remaining - (Piece.length + BLADE_KERF)`**

Điểm khởi tạo **Score = 0**.

### 3.1. Đánh giá tính khả dụng của phần dư (Scrap Evaluation)
- **Nếu `Scrap < SCRAP_THRESHOLD`** $\rightarrow$ **CỘNG +1000 điểm**.
- **Nếu `Scrap >= MIN_REUSABLE_LENGTH`** $\rightarrow$ **CỘNG +500 điểm**.
- **Nếu `SCRAP_THRESHOLD <= Scrap < MIN_REUSABLE_LENGTH`** $\rightarrow$ **TRỪ -1000 điểm** (`shortRemainderPenalty`).

### 3.2. Ưu tiên dọn kho (Stock Status Preference)
- **Nếu Stock là `CON_DU`** $\rightarrow$ **CỘNG +100 điểm** (`useOldStockBonus`).
- **Nếu Stock là `MOI`** $\rightarrow$ **CỘNG +0 điểm**.

### 3.3. Heuristic Look-ahead (Tính toán các đoạn cắt tương lai)
Thuật toán sẽ "nhìn trước" các mảnh cắt còn lại trong BOM (Remaining Pieces).
- **Tránh dùng sai mục đích** (`reservedLongStockPenalty`): Quét các đoạn cắt còn lại. Nếu tồn tại một đoạn cắt dài đang chờ mà **CHỈ CÓ DUY NHẤT** thanh phôi này đủ sức chứa nó (tức là `Stock.remaining >= RemainingPiece.length + BLADE_KERF`), nhưng việc cắt đoạn `Piece` hiện tại làm `Scrap` không còn đủ chứa `RemainingPiece` nữa $\rightarrow$ **TRỪ -5000 điểm**.
- **Tận dụng cắt liên tiếp** (`fitRemainingPiecesBonus`): Nếu `Scrap >= RemainingPiece.length + BLADE_KERF` (tức là phần dư vẫn còn đủ để cắt trọn vẹn ít nhất 1 đoạn cắt khác đang chờ) $\rightarrow$ **CỘNG +200 điểm**.

---

## 4. Minh họa Test Cases có tính Kerf (5mm)

### Test Case 1: "Chọn tái sử dụng thay vì lỡ cỡ"
- **BOM**: Chỉ có 1 đoạn dài `5000`mm.
- **Kho**: Cây `6000`mm, Cây `10000`mm. Cả 2 đều có biên an toàn đủ dài.
- **Tính toán cho đoạn 5000mm**:
  - **Ướm vào cây 6000**: Dư `Scrap = (6000 - 40) - (5000 + 5) = 955`mm. 
    Nằm trong vùng lỡ cỡ (`100mm < 955mm < 1500mm`). Score: **-1000 điểm**.
  - **Ướm vào cây 10000**: Dư `Scrap = (10000 - 40) - (5000 + 5) = 4955`mm. 
    Đạt chuẩn tái sử dụng (`4955mm > 1500mm`). Score: **+500 điểm**.
- **Kết quả**: Hệ thống chọn cây **10m**. *Lý do: Phần dư 4955mm còn giá trị tái sử dụng, trong khi phần dư 955mm thì bỏ phí không dùng được.*

### Test Case 2: "Look-ahead phạt dùng sai mục đích"
- **BOM**: Có 2 đoạn là `9000`mm và `5000`mm. (Thuật toán sẽ xét 9m trước, sau đó đến 5m, tuy nhiên giả sử thuật toán đang đánh giá phôi cho nhát cắt 5m trước một cách độc lập).
- **Kho**: Cây `6000`mm, Cây `10000`mm.
- **Tính toán cho đoạn 5000mm**:
  - **Ướm vào cây 10000**: Dư `Scrap = 4955`mm (đạt chuẩn tái sử dụng $\rightarrow$ +500). **Tuy nhiên**, thuật toán Look-ahead quét thấy BOM còn đoạn `9000`mm chưa cắt, và cây `10000` là **phôi duy nhất** thỏa mãn điều kiện `chieudaihientai >= 9000 + 5 + 40` (tức là 9045mm). Nếu cắt đoạn 5000mm, phần dư 4955mm sẽ không đủ cho đoạn 9000mm. Kích hoạt phạt Look-ahead $\rightarrow$ **-5000 điểm**. Tổng Score = **-4500**.
  - **Ướm vào cây 6000**: Dư `Scrap = 955`mm (lỡ cỡ $\rightarrow$ -1000). Cây này vốn không đủ cắt 9000mm nên không dính phạt Look-ahead. Tổng Score = **-1000**.
- **Kết quả**: Hệ thống chọn cây **6m** cho đoạn 5000mm (vì Score -1000 lớn hơn Score -4500), và giữ nguyên cây 10m cho đoạn 9000mm. *Lý do: Buộc phải hy sinh 955mm phế liệu để đảm bảo toàn bộ BOM được hoàn thành.*
