// Supabase Initialization Script
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🚀 Initializing Supabase...\n');

// Check environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please check your .env file contains:');
  console.error('SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

console.log('✅ Environment variables loaded:');
console.log(`   URL: ${process.env.SUPABASE_URL}`);
console.log(`   Anon Key: ${process.env.SUPABASE_ANON_KEY.substring(0, 20)}...`);

// Create Supabase client with anon key (safer for client-side operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('✅ Supabase client created successfully');

// Test connection and initialize database
async function initializeSupabase() {
  try {
    console.log('\n🔍 Testing Supabase connection...');
    
    // Test 1: Basic connection
    const { data: testData, error: testError } = await supabase
      .from('orders')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  Database tables not found. This is expected if you haven\'t run the schema yet.');
      console.log('💡 You need to run the schema in Supabase SQL Editor');
      
      // Show what needs to be done
      console.log('\n📋 Next Steps:');
      console.log('1. Go to https://app.supabase.com/');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Copy and paste the contents of supabase-schema.sql');
      console.log('5. Click Run');
      
      return {
        success: false,
        message: 'Database tables need to be created',
        error: testError.message
      };
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('✅ Database tables exist');
      
      return {
        success: true,
        message: 'Supabase initialized successfully'
      };
    }
    
  } catch (error) {
    console.log('❌ Supabase initialization failed:');
    console.log('   Error:', error.message);
    
    return {
      success: false,
      message: 'Initialization failed',
      error: error.message
    };
  }
}

// Test specific tables
async function testTables() {
  console.log('\n📊 Testing database tables...');
  
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
  
  console.log('\n📚 Resources:');
  console.log('- Supabase Dashboard: https://app.supabase.com/');
  console.log('- Schema file: supabase-schema.sql');
  console.log('- Setup guide: FIX_ERRORS_GUIDE.md');
}

main().catch(console.error); 