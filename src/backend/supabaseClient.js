import { createClient } from '@supabase/supabase-js'

let cachedClient = null

function normalizeEnvFlag(value) {
    return String(value || '').trim().toLowerCase() === 'true'
}

export function isSupabaseMvpEnabled() {
    return normalizeEnvFlag(import.meta.env.VITE_SUPABASE_MVP_ENABLED)
}

export function getSupabaseClient() {
    if (cachedClient) return cachedClient

    const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
    const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

    if (!supabaseUrl || !supabaseAnonKey) {
        return null
    }

    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    })

    return cachedClient
}
