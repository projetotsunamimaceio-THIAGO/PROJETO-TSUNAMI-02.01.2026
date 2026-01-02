
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sprsnrvrpqqgeunjcebq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oqUZ_pfb7Jirza38EymK_g_-NuiWhJ1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
