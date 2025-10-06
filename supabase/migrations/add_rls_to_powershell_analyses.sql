-- Enable RLS on powershell_analyses table
ALTER TABLE public.powershell_analyses ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow service role to do everything (for anonymous analyses)
CREATE POLICY "Service role has full access"
ON public.powershell_analyses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Allow authenticated users to insert their own analyses
CREATE POLICY "Users can insert their own analyses"
ON public.powershell_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow authenticated users to read their own analyses
CREATE POLICY "Users can read their own analyses"
ON public.powershell_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 4: Allow authenticated users to update their own analyses
CREATE POLICY "Users can update their own analyses"
ON public.powershell_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 5: Allow public read access to analyses by uuid or short_id (for sharing)
CREATE POLICY "Public can read analyses by uuid or short_id"
ON public.powershell_analyses
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy 6: Allow anonymous users to insert analyses without user_id
CREATE POLICY "Anonymous users can insert analyses"
ON public.powershell_analyses
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Add comment explaining the RLS setup
COMMENT ON TABLE public.powershell_analyses IS 
'RLS enabled table. 
- Service role: full access (for backend operations)
- Authenticated users: can CRUD their own analyses (where user_id = auth.uid())
- Anonymous users: can INSERT analyses with user_id = NULL, can SELECT any analysis by uuid/short_id
- Public sharing: anyone can read analyses by uuid or short_id for sharing purposes';
