-- Migration: Per-seller WhatsApp instance management
-- Each seller can connect their own WhatsApp number via Evolution API QR code

ALTER TABLE seller_admin_controls
  ADD COLUMN IF NOT EXISTS whatsapp_instance_name TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_instance_status TEXT DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS whatsapp_instance_qr_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_instance_phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_instance_error TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_instance_updated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN seller_admin_controls.whatsapp_instance_name IS 'Evolution API instance name for this seller';
COMMENT ON COLUMN seller_admin_controls.whatsapp_instance_status IS 'disconnected | pending_qr | connected | error';
COMMENT ON COLUMN seller_admin_controls.whatsapp_instance_phone IS 'Connected phone number (e.g. 5511999999999)';
