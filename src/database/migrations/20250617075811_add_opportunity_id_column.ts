import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  // Check if the column exists before adding it
  const hasColumn = await knex.schema.hasColumn('sam_opportunities', 'opportunity_id');
  
  if (!hasColumn) {
    await knex.schema.alterTable('sam_opportunities', (table) => {
      table.string('opportunity_id').notNullable().unique().comment('SAM.gov opportunity ID');
      table.index(['opportunity_id'], 'idx_sam_opportunities_opportunity_id_new');
    });
  }
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('sam_opportunities', (table) => {
    table.dropColumn('opportunity_id');
  });
}

