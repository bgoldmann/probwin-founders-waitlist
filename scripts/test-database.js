const { createClient } = require('@supabase/supabase-js');

// Use the credentials directly for testing
const supabase = createClient(
  'https://berahhdcvtlzqrtbrrjj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlcmFoaGRjdnRsenFydGJycmpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU5MTk3MiwiZXhwIjoyMDcyMTY3OTcyfQ.r0wjJ-92ZPoCcYbv-o5RgdIX39KWUKfa9ubUbdWbxno'
);

async function testAndSetup() {
  console.log('🔄 Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('_schema_check')
      .select('*')
      .limit(1);

    console.log('Connection test result:', { data, error });

    // Try to create a simple waves table
    console.log('📝 Creating waves table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS waves (
        id INTEGER PRIMARY KEY,
        tier TEXT NOT NULL,
        total_seats INTEGER NOT NULL,
        filled_seats INTEGER NOT NULL DEFAULT 0,
        wave_number INTEGER NOT NULL,
        last_updated TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Execute using RPC (if available)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('exec', { 
        sql: createTableSQL 
      });
      console.log('RPC result:', { rpcData, rpcError });
    } catch (rpcErr) {
      console.log('RPC not available, trying direct insert...');
    }

    // Try inserting test data
    console.log('📊 Inserting test wave data...');
    const { data: insertData, error: insertError } = await supabase
      .from('waves')
      .upsert([
        { 
          id: 1, 
          tier: '99', 
          total_seats: 100, 
          filled_seats: 5,
          wave_number: 1 
        },
        { 
          id: 2, 
          tier: '199', 
          total_seats: 50, 
          filled_seats: 12,
          wave_number: 2 
        }
      ], { onConflict: 'id' });

    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('✅ Test data inserted:', insertData);
    }

    // Test fetching data
    const { data: fetchData, error: fetchError } = await supabase
      .from('waves')
      .select('*');

    if (fetchError) {
      console.error('Fetch error:', fetchError);
    } else {
      console.log('✅ Data fetched successfully:', fetchData);
    }

  } catch (err) {
    console.error('❌ Setup error:', err);
  }
}

testAndSetup();