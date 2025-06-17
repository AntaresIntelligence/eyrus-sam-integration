require('dotenv').config();
const { Client } = require('pg');

async function checkDatabase() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');

    // Check what tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%sam%' OR table_name LIKE '%naics%' OR table_name LIKE '%opportunities%'
      ORDER BY table_name;
    `);
    
    console.log('\n=== TABLES CREATED ===');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Check sam_opportunities table
    const oppCount = await client.query('SELECT COUNT(*) as count FROM sam_opportunities');
    console.log(`\n=== SAM_OPPORTUNITIES TABLE ===`);
    console.log(`Total records: ${oppCount.rows[0].count}`);

    if (oppCount.rows[0].count > 0) {
      const sampleOpps = await client.query(`
        SELECT opportunity_id, title, naics_code, department, award_amount, posted_date 
        FROM sam_opportunities 
        LIMIT 5
      `);
      console.log('\nSample records:');
      sampleOpps.rows.forEach((opp, index) => {
        console.log(`${index + 1}. ${opp.opportunity_id}: ${opp.title?.substring(0, 50)}...`);
        console.log(`   NAICS: ${opp.naics_code}, Dept: ${opp.department}, Amount: $${opp.award_amount}`);
      });
    }

    // Check naics_codes table
    const naicsCount = await client.query('SELECT COUNT(*) as count FROM naics_codes');
    console.log(`\n=== NAICS_CODES TABLE ===`);
    console.log(`Total NAICS codes: ${naicsCount.rows[0].count}`);

    const naicsList = await client.query('SELECT code, title FROM naics_codes ORDER BY code');
    naicsList.rows.forEach(naics => {
      console.log(`- ${naics.code}: ${naics.title}`);
    });

    // Check opportunities_by_naics table  
    const naicsOppCount = await client.query('SELECT COUNT(*) as count FROM opportunities_by_naics');
    console.log(`\n=== OPPORTUNITIES_BY_NAICS TABLE ===`);
    console.log(`Total records: ${naicsOppCount.rows[0].count}`);

    // Check flowise_ai_responses table
    const aiCount = await client.query('SELECT COUNT(*) as count FROM flowise_ai_responses');
    console.log(`\n=== FLOWISE_AI_RESPONSES TABLE ===`);
    console.log(`Total AI responses: ${aiCount.rows[0].count}`);

  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();