CREATE TABLE IF NOT EXISTS demo_call_leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  called_at TIMESTAMP WITH TIME ZONE,
  vapi_call_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS demo_call_leads_phone_idx ON demo_call_leads(phone);
CREATE INDEX IF NOT EXISTS demo_call_leads_status_idx ON demo_call_leads(status);
