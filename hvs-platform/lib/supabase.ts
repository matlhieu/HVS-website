import { createClient } from '@supabase/supabase-js'

// grabbing env vars from local config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// exporting supabase instance for db queries
export const supabase = createClient(supabaseUrl, supabaseKey)