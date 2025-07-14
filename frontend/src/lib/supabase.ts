import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface Report {
  id: string
  created_at: string
  user_id?: string
  title: string
  description: string
  location: string
  category: string
  upvotes: number
  downvotes: number
  status: 'active' | 'removed'
  expires_at?: string
} 