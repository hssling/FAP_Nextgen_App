-- Create table for storing Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, endpoint) -- Prevent duplicate subscriptions for same device
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own subscriptions" 
ON push_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" 
ON push_subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- Only service role (Edge Functions) should typically read this to send notifications
-- But users might trigger triggers? No, usually sending is backend.
-- We allow users to read own subscriptions to manage them if needed.
CREATE POLICY "Users can view their own subscriptions" 
ON push_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- Grant access
GRANT ALL ON push_subscriptions TO authenticated;
GRANT ALL ON push_subscriptions TO service_role;
