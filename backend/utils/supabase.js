/**
 * @fileoverview Supabase Client configuration helper.
 * @module utils/supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.warn('Warning: Missing Supabase configurations in environment variables.');
}

// Client for general operations (honors RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client with service role bypass (for admin capabilities: auth.admin CRUD)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = {
  supabase,
  supabaseAdmin
};
