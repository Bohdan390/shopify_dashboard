// Supabase Initialization Script
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Check environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please check your .env file contains:');
  console.error('SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

// Create Supabase client with anon key (safer for client-side operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test connection and initialize database
async function initializeSupabase() {
  try {
    // Test 1: Basic connection
    const { data: testData, error: testError } = await supabase
      .from('orders')
      .select('count')
      .limit(1);
    
    if (testError) {
      return {
        success: false,
        message: 'Database tables need to be created',
        error: testError.message
      };
    } else {
      return {
        success: true,
        message: 'Supabase initialized successfully'
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: 'Initialization failed',
      error: error.message
    };
  }
}

// Test specific tables
async function testTables() {
  const tables = ['orders', 'ad_spend_detailed', 'cost_of_goods', 'analytics'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`);
      } else {
        console.log(`✅ Table '${table}': Exists`);
      }
    } catch (error) {
      console.log(`❌ Table '${table}': ${error.message}`);
    }
  }
}

// Run initialization
async function main() {
  const result = await initializeSupabase();
  
  if (result.success) {
    await testTables();
    
    console.log('\n🎉 Supabase is ready!');
    console.log('✅ You can now start your dashboard');
    console.log('🚀 Run: npm run dev');
  } else {
    console.log('\n⚠️  Supabase needs setup');
    console.log('📋 Follow the steps above to create the database tables');
  }
  
}

main().catch(console.error); 