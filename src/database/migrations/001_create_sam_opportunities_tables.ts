import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create the sam_opportunities table
  await knex.schema.createTable('sam_opportunities', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // SAM.gov API fields
    table.string('opportunity_id').notNullable().unique().comment('SAM.gov opportunity ID');
    table.string('notice_id').comment('Notice ID from SAM.gov');
    table.string('title').notNullable().comment('Opportunity title');
    table.text('description').comment('Opportunity description');
    table.string('opportunity_type').comment('Type of opportunity (e.g., Award Notice)');
    table.string('base_type').comment('Base type of the opportunity');
    table.string('archive_type').comment('Archive type');
    table.string('archive_date').comment('Archive date');
    
    // Classification
    table.string('classification_code').comment('Classification code');
    table.string('naics_code').comment('NAICS code');
    table.string('set_aside_code').comment('Set-aside code');
    table.string('set_aside').comment('Set-aside description');
    
    // Agency information
    table.string('department').comment('Department name');
    table.string('sub_tier').comment('Sub-tier agency');
    table.string('office').comment('Office name');
    table.string('solicitation_number').comment('Solicitation number');
    
    // Dates
    table.timestamp('posted_date').comment('Date posted on SAM.gov');
    table.timestamp('response_deadline').comment('Response deadline');
    table.timestamp('updated_date').comment('Last updated date');
    
    // Contact information
    table.json('contact_info').comment('Contact information as JSON');
    table.json('attachments').comment('Attachments information as JSON');
    
    // Award information (for award notices)
    table.string('award_number').comment('Award number');
    table.decimal('award_amount', 15, 2).comment('Award amount');
    table.string('awardee_name').comment('Name of the awardee');
    table.string('awardee_duns').comment('DUNS number of awardee');
    table.string('awardee_cage').comment('CAGE code of awardee');
    table.json('awardee_info').comment('Additional awardee information as JSON');
    
    // URLs and references
    table.string('sam_url').comment('Direct URL to SAM.gov opportunity');
    table.json('related_notices').comment('Related notices as JSON array');
    
    // Metadata
    table.json('raw_data').comment('Raw API response data as JSON');
    table.string('data_source').defaultTo('sam.gov').comment('Source of the data');
    table.string('sync_status').defaultTo('pending').comment('Sync status: pending, synced, error');
    table.text('sync_error').comment('Error message if sync failed');
    table.timestamp('last_synced_at').comment('Last successful sync timestamp');
    
    // Audit fields
    table.timestamps(true, true);
    table.timestamp('deleted_at').comment('Soft delete timestamp');
    
    // Indexes for performance
    table.index(['opportunity_id'], 'idx_sam_opportunities_opportunity_id');
    table.index(['posted_date'], 'idx_sam_opportunities_posted_date');
    table.index(['response_deadline'], 'idx_sam_opportunities_response_deadline');
    table.index(['naics_code'], 'idx_sam_opportunities_naics_code');
    table.index(['department'], 'idx_sam_opportunities_department');
    table.index(['opportunity_type'], 'idx_sam_opportunities_type');
    table.index(['sync_status'], 'idx_sam_opportunities_sync_status');
    table.index(['created_at'], 'idx_sam_opportunities_created_at');
    table.index(['updated_at'], 'idx_sam_opportunities_updated_at');
    
    // Composite indexes for common queries
    table.index(['opportunity_type', 'posted_date'], 'idx_sam_opportunities_type_posted');
    table.index(['naics_code', 'posted_date'], 'idx_sam_opportunities_naics_posted');
    table.index(['sync_status', 'last_synced_at'], 'idx_sam_opportunities_sync_status_time');
  });

  // Create sync_logs table for tracking API sync operations
  await knex.schema.createTable('sam_sync_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('sync_type').notNullable().comment('Type of sync: full, incremental, manual');
    table.string('status').notNullable().comment('Status: running, completed, failed');
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').comment('When sync completed');
    table.integer('records_processed').defaultTo(0).comment('Number of records processed');
    table.integer('records_created').defaultTo(0).comment('Number of new records created');
    table.integer('records_updated').defaultTo(0).comment('Number of records updated');
    table.integer('records_failed').defaultTo(0).comment('Number of records that failed to process');
    table.json('error_details').comment('Error details as JSON');
    table.json('sync_parameters').comment('Sync parameters used');
    table.text('notes').comment('Additional notes about the sync');
    table.timestamps(true, true);
    
    table.index(['sync_type'], 'idx_sam_sync_logs_type');
    table.index(['status'], 'idx_sam_sync_logs_status');
    table.index(['started_at'], 'idx_sam_sync_logs_started_at');
  });

  // Create API rate limiting table
  await knex.schema.createTable('sam_api_rate_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('api_key_hash').notNullable().comment('Hash of the API key for tracking');
    table.timestamp('window_start').notNullable().comment('Start of the rate limit window');
    table.integer('request_count').defaultTo(0).comment('Number of requests in this window');
    table.integer('rate_limit').notNullable().comment('Rate limit for this window');
    table.timestamps(true, true);
    
    table.unique(['api_key_hash', 'window_start'], 'uniq_rate_limit_key_window');
    table.index(['window_start'], 'idx_sam_rate_limits_window_start');
  });

  // Add comments to tables
  await knex.raw(`
    COMMENT ON TABLE sam_opportunities IS 'Stores SAM.gov opportunity data with comprehensive fields for enterprise use';
    COMMENT ON TABLE sam_sync_logs IS 'Tracks all SAM.gov API synchronization operations for monitoring and debugging';
    COMMENT ON TABLE sam_api_rate_limits IS 'Manages API rate limiting to prevent exceeding SAM.gov API limits';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sam_api_rate_limits');
  await knex.schema.dropTableIfExists('sam_sync_logs');
  await knex.schema.dropTableIfExists('sam_opportunities');
}
