import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://jdwjiwepuylqlvwzsyob.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impkd2ppd2VwdXlscWx2d3pzeW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzQ3NjAsImV4cCI6MjEwMTE1MDc2MH0.mbmQe8gaYYkAMguw5IMGMudfQBWE-Cl-psBcT4LggWw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
