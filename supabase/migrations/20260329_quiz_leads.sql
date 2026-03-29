-- Quiz leads: store email submissions from the landing page quiz
CREATE TABLE IF NOT EXISTS quiz_leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  answers JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX quiz_leads_email_idx ON quiz_leads(email);
CREATE INDEX quiz_leads_status_idx ON quiz_leads(status);
CREATE INDEX quiz_leads_created_at_idx ON quiz_leads(created_at DESC);
