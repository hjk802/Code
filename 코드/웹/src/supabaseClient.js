import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kaclwnxcgiodwdrregwd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthY2x3bnhjZ2lvZHdkcnJlZ3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NTI1NzAsImV4cCI6MjA5MDQyODU3MH0.OGKnl8y5T_0aOtrKwDYeMKa_WzD3qTXKB42Dy24rgfA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)