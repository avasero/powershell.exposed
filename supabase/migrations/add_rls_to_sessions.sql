-- Enable RLS on sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow service role to do everything (for backend operations)
CREATE POLICY "Service role has full access"
ON public.sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Allow authenticated users to read their own sessions
CREATE POLICY "Users can read their own sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 3: Allow authenticated users to insert their own sessions
CREATE POLICY "Users can insert their own sessions"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Allow authenticated users to update their own sessions
CREATE POLICY "Users can update their own sessions"
ON public.sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 5: Allow authenticated users to delete their own sessions
CREATE POLICY "Users can delete their own sessions"
ON public.sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy 6: Allow anonymous users to insert sessions without user_id
CREATE POLICY "Anonymous users can insert sessions"
ON public.sessions
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Policy 7: Allow anonymous users to read their own sessions by session id
-- This is useful if you store session.id in cookies/localStorage for anonymous users
CREATE POLICY "Anonymous users can read sessions by id"
ON public.sessions
FOR SELECT
TO anon
USING (user_id IS NULL);

-- Add comment explaining the RLS setup
COMMENT ON TABLE public.sessions IS 
'RLS enabled table. 
- Service role: full access (for backend operations, analytics)
- Authenticated users: full CRUD on their own sessions (where user_id = auth.uid())
- Anonymous users: can INSERT sessions with user_id = NULL, can SELECT sessions with user_id = NULL
- Sessions are used for tracking user activity and analytics';
