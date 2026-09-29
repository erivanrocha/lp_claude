-- Registros de clique no botão de WhatsApp da landing Endereço Fiscal.
-- created_at e sold_at ficam em UTC (formato ISO 8601).
CREATE TABLE IF NOT EXISTS whatsapp_clicks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_code   TEXT NOT NULL,
  gclid      TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  page       TEXT,
  button     TEXT,
  device     TEXT NOT NULL CHECK (device IN ('mobile', 'desktop')),
  -- Preenchidos manualmente pela equipe comercial quando a venda é fechada.
  status     TEXT CHECK (status IS NULL OR status = 'vendido'),
  sold_at    TEXT,
  sale_value REAL
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_ref_code ON whatsapp_clicks (ref_code);
CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_created_at ON whatsapp_clicks (created_at);
