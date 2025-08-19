const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Check if environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Supabase environment variables not found!');
  console.error('Please check your .env file contains:');
  console.error('SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

// Initialize Supabase client with anon key (safer for client-side operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // Use anon key for better security
);


// Initialize database tables
const initDatabase = async () => {
  try {
    // Note: With anon key, we can't create tables via RPC
    // Tables need to be created manually in Supabase SQL Editor
  } catch (error) {
    console.error('Error setting up Supabase database:', error);
  }
};

// Helper functions for database operations
const query = async (sql, params = []) => {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql, params });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Insert data
const insert = async (table, data) => {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();
    
    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Insert error:', error);
    throw error;
  }
};

// Update data
const update = async (table, data, conditions) => {
  try {
    let query = supabase.from(table).update(data);
    
    // Add conditions
    Object.keys(conditions).forEach(key => {
      query = query.eq(key, conditions[key]);
    });
    
    const { data: result, error } = await query.select();
    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
};

// Select data
const select = async (table, columns = '*', conditions = {}) => {
  try {
    let query = supabase.from(table).select(columns);
    
    // Add conditions
    Object.keys(conditions).forEach(key => {
      query = query.eq(key, conditions[key]);
    });
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Select error:', error);
    throw error;
  }
};

// Initialize database on startup
initDatabase();

module.exports = { 
  supabase, 
  query, 
  insert, 
  update, 
  select,
  initDatabase 
}; 