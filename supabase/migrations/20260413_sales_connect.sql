-- 매출 연동: monthly_snapshots에 배달 매출 컬럼 추가
ALTER TABLE monthly_snapshots
  ADD COLUMN IF NOT EXISTS delivery_sales BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fees BIGINT DEFAULT 0;
