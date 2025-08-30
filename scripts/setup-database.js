#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔄 Setting up database schema...');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    console.log('📝 Running migration...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If the exec_sql function doesn't exist, try executing parts manually
      console.log('📝 Trying alternative approach...');
      
      // Create basic tables
      const { error: createError } = await supabase
        .from('_schema_check')
        .select('*')
        .limit(1);

      if (createError) {
        console.log('✅ Database schema needs setup');
        
        // Try to create the waves table first as a test
        const { error: wavesError } = await supabase.rpc('exec', {
          query: `
            CREATE TABLE IF NOT EXISTS waves (
              id INTEGER PRIMARY KEY,
              tier TEXT NOT NULL,
              total_seats INTEGER NOT NULL CHECK (total_seats > 0),
              status TEXT NOT NULL DEFAULT 'upcoming',
              opens_at TIMESTAMPTZ,
              closes_at TIMESTAMPTZ,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
          `
        });

        if (wavesError) {
          console.error('❌ Database setup failed:', wavesError.message);
          console.log('📋 You may need to run the migration manually in Supabase dashboard');
          console.log('📋 SQL file location: supabase/migrations/001_initial_schema.sql');
        } else {
          console.log('✅ Basic table created successfully');
        }
      }
    } else {
      console.log('✅ Migration executed successfully');
    }

    // Insert initial wave data
    console.log('📊 Setting up initial wave data...');
    const { error: insertError } = await supabase
      .from('waves')
      .upsert([
        { id: 1, tier: '99', total_seats: 100, status: 'open' },
        { id: 2, tier: '199', total_seats: 50, status: 'open' }
      ], { onConflict: 'id' });

    if (insertError) {
      console.log('📋 Wave data insertion failed, may need manual setup');
    } else {
      console.log('✅ Initial wave data inserted');
    }

    // Test the connection by fetching waves
    console.log('🔍 Testing database connection...');
    const { data: waves, error: testError } = await supabase
      .from('waves')
      .select('*');

    if (testError) {
      console.error('❌ Database test failed:', testError.message);
      console.log('📋 Manual database setup may be required');
    } else {
      console.log('✅ Database connection successful!');
      console.log('📊 Available waves:', waves);
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('📋 You may need to run the SQL migration manually');
  }
}

setupDatabase();