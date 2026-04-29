-- Hardens the message_templates table that was previously created empty
-- (Onda 3 #30). Adds the columns the application needs, plus a single
-- default template per (channel, tone) so DB-driven rendering can
-- gracefully fall back when no seller-specific override exists.

ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS tone TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS seller_key TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_message_templates_slug_seller
  ON message_templates (slug, COALESCE(seller_key, '__default__'));

CREATE INDEX IF NOT EXISTS idx_message_templates_channel_tone
  ON message_templates (channel, tone)
  WHERE active = true;

-- Ensure a baseline of templates exists so message-generator can read from DB
-- without short-circuiting back to hardcoded TS arrays.
INSERT INTO message_templates (slug, channel, tone, body, is_default, active)
VALUES
  (
    'gentle-reminder-general',
    'whatsapp',
    'empathetic',
    E'Oi {{customerName}}, tudo bem? Vi que o pagamento de {{paymentValue}} ainda está em aberto. Posso te enviar o link novamente?\n\n{{retryLink}}',
    true,
    true
  ),
  (
    'reengagement-48h',
    'whatsapp',
    'casual',
    E'{{customerName}}, é o {{brandName}} de novo. Imagino que tenha sido corrido — quer que eu te ajude a finalizar o pagamento de {{paymentValue}}?\n\n{{retryLink}}',
    true,
    true
  ),
  (
    'payment-alternative',
    'whatsapp',
    'urgent',
    E'{{customerName}}, ainda dá pra recuperar essa compra hoje. Posso oferecer condições especiais ou parcelamento. Me avisa?\n\n{{retryLink}}',
    true,
    true
  ),
  (
    'last-chance',
    'whatsapp',
    'empathetic',
    E'{{customerName}}, esse é o último contato sobre o pagamento de {{paymentValue}}. Se quiser, esta é a sua chance de não perder. Estou aqui se precisar.\n\n{{retryLink}}',
    true,
    true
  ),
  (
    'discount-offer',
    'whatsapp',
    'urgent',
    E'{{customerName}}, posso liberar uma condição especial pra fechar hoje. Topa conversar?\n\n{{retryLink}}',
    true,
    true
  ),
  (
    'post-call-checkout',
    'whatsapp',
    'empathetic',
    E'Oi {{customerName}}, conforme combinamos no telefone, segue o link para concluir o pagamento de {{paymentValue}}.\n\n{{retryLink}}',
    true,
    true
  )
ON CONFLICT (slug, COALESCE(seller_key, '__default__')) DO NOTHING;

-- Convenience trigger: keep updated_at in sync.
CREATE OR REPLACE FUNCTION fn_message_templates_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_templates_touch ON message_templates;
CREATE TRIGGER trg_message_templates_touch
  BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION fn_message_templates_touch();
