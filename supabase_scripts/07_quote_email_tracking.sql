-- Track whether a quotation email has been sent before allowing price approval.
-- This is intentionally additive and does not alter/drop existing enums or data.

ALTER TABLE donhang
  ADD COLUMN IF NOT EXISTS baogia_gui_luc TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS baogia_email TEXT NULL;

COMMENT ON COLUMN donhang.baogia_gui_luc IS 'Timestamp when the latest quote email was sent to the customer.';
COMMENT ON COLUMN donhang.baogia_email IS 'Recipient email used for the latest quote email.';

