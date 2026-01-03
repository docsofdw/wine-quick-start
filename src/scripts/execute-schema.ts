/**
 * Execute Supabase Schema
 * Runs the SQL schema file against your Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function executeSchema() {
  console.log('🗄️  Executing Supabase schema...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local');
  }
  
  console.log(`📡 Connecting to: ${supabaseUrl}`);
  
  // Read the schema file
  const schema = await readFile('supabase-schema.sql', 'utf-8');
  
  // Split into individual statements (simple split by semicolon)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));
  
  console.log(`📝 Found ${statements.length} SQL statements\n`);
  
  // Create Supabase client with service role key if available
  // Note: For schema changes, you might need the service role key
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty statements
    if (!statement) continue;
    
    // Extract table/object name for logging
    const match = statement.match(/CREATE\s+(TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    const objectName = match ? `${match[1]} ${match[2]}` : 'SQL statement';
    
    try {
      console.log(`   [${i + 1}/${statements.length}] Creating ${objectName}...`);
      
      // Execute using RPC to the database
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: statement + ';' 
      }).single();
      
      if (error) {
        // If exec_sql function doesn't exist, we need to use direct query
        // This is a limitation - anon key may not have DDL permissions
        console.log(`   ⚠️  Cannot execute with anon key - ${error.message}`);
        console.log(`   💡 Please run this SQL manually in Supabase dashboard`);
        errorCount++;
      } else {
        console.log(`   ✅ Success`);
        successCount++;
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log(`\n⚠️  IMPORTANT: Anon keys don't have DDL permissions.`);
    console.log(`\n📋 Please execute the schema manually:`);
    console.log(`   1. Go to: https://supabase.com/dashboard/project/nsyubkcfsrsowgefkbii/sql/new`);
    console.log(`   2. Copy the contents of supabase-schema.sql`);
    console.log(`   3. Paste and click "Run"`);
    console.log(`   4. Verify tables are created in the Table Editor\n`);
  } else {
    console.log(`\n✅ Schema executed successfully!`);
  }
}

executeSchema().catch(console.error);

