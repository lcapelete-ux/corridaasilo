import { createClient } from '@supabase/supabase-js';

// Chave anon/public: é segura para ficar no site (a proteção real vem das
// políticas de RLS definidas em supabase/setup_completo.sql)
const SUPABASE_URL = 'https://wycxyqcmhnxphgndgaze.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5Y3h5cWNtaG54cGhnbmRnYXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDk0MTIsImV4cCI6MjA5NjgyNTQxMn0.nK3IpJ23asJdmAK_HlgssfjnPBlVRQj_XXMKZodHPDM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
