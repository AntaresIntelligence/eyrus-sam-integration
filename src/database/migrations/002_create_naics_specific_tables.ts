import { Knex } from 'knex';

// NAICS codes for construction industry opportunities
const NAICS_CODES = [
  '236210', // Industrial Building Construction
  '236220', // Commercial and Institutional Building Construction  
  '237110', // Water and Sewer Line and Related Structures Construction
  '237130', // Power and Communication Line and Related Structures Construction
  '237310', // Highway, Street, and Bridge Construction
  '237990', // Other Heavy and Civil Engineering Construction
];

export async function up(knex: Knex): Promise<void> {
  // Create NAICS codes lookup table
  await knex.schema.createTable('naics_codes', (table) => {
    table.string('code').primary().comment('NAICS code');
    table.string('title').notNullable().comment('NAICS code description');
    table.text('description').comment('Detailed description');
    table.boolean('is_active').defaultTo(true).comment('Whether this NAICS code is actively tracked');
    table.timestamps(true, true);
    
    table.index(['is_active'], 'idx_naics_codes_active');
  });

  // Insert the construction NAICS codes
  await knex('naics_codes').insert([
    {
      code: '236210',
      title: 'Industrial Building Construction',
      description: 'This industry comprises establishments primarily engaged in the construction (including new work, additions, alterations, and repairs) of industrial buildings and warehouses.',
      is_active: true,
    },
    {
      code: '236220', 
      title: 'Commercial and Institutional Building Construction',
      description: 'This industry comprises establishments primarily engaged in the construction (including new work, additions, alterations, and repairs) of commercial and institutional buildings.',
      is_active: true,
    },
    {
      code: '237110',
      title: 'Water and Sewer Line and Related Structures Construction', 
      description: 'This industry comprises establishments primarily engaged in the construction of water and sewer lines, mains, pumping stations, and water and sewage treatment plants.',
      is_active: true,
    },
    {
      code: '237130',
      title: 'Power and Communication Line and Related Structures Construction',
      description: 'This industry comprises establishments primarily engaged in the construction of power lines, communication lines, and related structures.',
      is_active: true,
    },
    {
      code: '237310',
      title: 'Highway, Street, and Bridge Construction',
      description: 'This industry comprises establishments primarily engaged in the construction of highways, streets, roads, bridges, and tunnels.',
      is_active: true,
    },
    {
      code: '237990',
      title: 'Other Heavy and Civil Engineering Construction',
      description: 'This industry comprises establishments primarily engaged in heavy and civil engineering construction not classified elsewhere.',
      is_active: true,
    },
  ]);

  // Create opportunities_by_naics table for efficient NAICS-based querying
  await knex.schema.createTable('opportunities_by_naics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('opportunity_id').notNullable().comment('Reference to main opportunity');
    table.string('naics_code').notNullable().comment('NAICS code for this opportunity');
    table.timestamp('posted_date').notNullable().comment('Date posted on SAM.gov');
    table.timestamp('response_deadline').comment('Response deadline');
    table.decimal('award_amount', 15, 2).comment('Award amount if available');
    table.string('title').notNullable().comment('Opportunity title');
    table.string('department').comment('Department name');
    table.string('opportunity_type').comment('Type of opportunity');
    table.json('ai_analysis').comment('AI assistant analysis results');
    table.timestamp('ai_analysis_date').comment('When AI analysis was performed');
    table.timestamps(true, true);
    
    // Foreign key constraints
    table.foreign('opportunity_id').references('opportunity_id').inTable('sam_opportunities').onDelete('CASCADE');
    table.foreign('naics_code').references('code').inTable('naics_codes').onDelete('CASCADE');
    
    // Indexes for performance
    table.index(['naics_code'], 'idx_opportunities_naics_code');
    table.index(['posted_date'], 'idx_opportunities_naics_posted_date');
    table.index(['naics_code', 'posted_date'], 'idx_opportunities_naics_code_posted');
    table.index(['response_deadline'], 'idx_opportunities_naics_deadline');
    table.index(['award_amount'], 'idx_opportunities_naics_amount');
    
    // Unique constraint to prevent duplicates
    table.unique(['opportunity_id', 'naics_code'], 'uniq_opportunity_naics');
  });

  // Create flowise_ai_responses table for storing AI assistant responses
  await knex.schema.createTable('flowise_ai_responses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('opportunity_id').notNullable().comment('Reference to opportunity');
    table.text('question').notNullable().comment('Question asked to AI assistant');
    table.json('response').notNullable().comment('AI assistant response');
    table.decimal('confidence_score', 3, 2).comment('Confidence score if provided');
    table.json('metadata').comment('Additional metadata from AI response');
    table.timestamp('requested_at').notNullable().defaultTo(knex.fn.now());
    table.string('request_id').comment('Flowise request ID for tracking');
    table.string('status').defaultTo('completed').comment('Request status: pending, completed, failed');
    table.text('error_message').comment('Error message if request failed');
    table.timestamps(true, true);
    
    // Foreign key
    table.foreign('opportunity_id').references('opportunity_id').inTable('sam_opportunities').onDelete('CASCADE');
    
    // Indexes
    table.index(['opportunity_id'], 'idx_flowise_opportunity_id');
    table.index(['requested_at'], 'idx_flowise_requested_at');
    table.index(['status'], 'idx_flowise_status');
  });

  // Add indexes to original sam_opportunities table for NAICS filtering
  await knex.schema.alterTable('sam_opportunities', (table) => {
    table.index(['naics_code', 'posted_date', 'opportunity_type'], 'idx_sam_opportunities_naics_posted_type');
  });

  // Add comments to new tables
  await knex.raw(`
    COMMENT ON TABLE naics_codes IS 'Lookup table for NAICS codes being tracked by the system';
    COMMENT ON TABLE opportunities_by_naics IS 'Denormalized table for efficient NAICS-based opportunity querying and AI analysis';
    COMMENT ON TABLE flowise_ai_responses IS 'Stores responses from Flowise AI assistant for opportunity analysis';
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes first
  await knex.schema.alterTable('sam_opportunities', (table) => {
    table.dropIndex(['naics_code', 'posted_date', 'opportunity_type'], 'idx_sam_opportunities_naics_posted_type');
  });
  
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('flowise_ai_responses');
  await knex.schema.dropTableIfExists('opportunities_by_naics');
  await knex.schema.dropTableIfExists('naics_codes');
}