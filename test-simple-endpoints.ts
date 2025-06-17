import express from 'express';
import cors from 'cors';
import db from './src/database/connection';

const app = express();
app.use(cors());
app.use(express.json());

// GET /api/opportunities
app.get('/api/opportunities', async (req, res) => {
    try {
        const { naics, limit = 10, offset = 0 } = req.query;
        
        let query = db('sam_opportunities').select('*');
        if (naics) {
            query = query.where('naics_code', naics);
        }
        
        const total = await db('sam_opportunities').count('* as count').first();
        const opportunities = await query
            .orderBy('posted_date', 'desc')
            .limit(parseInt(limit as string))
            .offset(parseInt(offset as string));

        res.json({
            success: true,
            total: parseInt(total?.count as string || '0'),
            data: opportunities
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch opportunities' });
    }
});

// GET /api/statistics
app.get('/api/statistics', async (req, res) => {
    try {
        const stats = await db('sam_opportunities')
            .select([
                db.raw('COUNT(*) as total_opportunities'),
                db.raw('SUM(award_amount) as total_value'),
                db.raw('AVG(award_amount) as avg_value'),
                db.raw('MAX(award_amount) as max_value')
            ])
            .first();

        const naicsStats = await db('sam_opportunities')
            .select('naics_code')
            .count('* as count')
            .groupBy('naics_code');

        res.json({
            success: true,
            data: {
                overview: stats,
                naics_breakdown: naicsStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

// GET /api/sales/opportunities
app.get('/api/sales/opportunities', async (req, res) => {
    try {
        const salesOpps = await db('sam_opportunities')
            .where('award_amount', '>=', 100000)
            .select('*')
            .orderBy('award_amount', 'desc');

        res.json({
            success: true,
            total: salesOpps.length,
            data: salesOpps
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch sales opportunities' });
    }
});

// POST /api/sync
app.post('/api/sync', async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Sync operation simulated',
            data: {
                status: 'completed',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Sync failed' });
    }
});

// DELETE /api/opportunities/:id
app.delete('/api/opportunities/:id', async (req, res) => {
    try {
        const deleted = await db('sam_opportunities')
            .where('opportunity_id', req.params.id)
            .del();

        res.json({
            success: true,
            deleted: deleted > 0,
            message: deleted > 0 ? 'Opportunity deleted' : 'Opportunity not found'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete opportunity' });
    }
});

// GET /health
app.get('/health', async (req, res) => {
    try {
        const count = await db('sam_opportunities').count('* as count').first();
        res.json({
            status: 'healthy',
            opportunities: parseInt(count?.count as string || '0'),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: 'Database connection failed'
        });
    }
});

const PORT = 3003;
app.listen(PORT, () => {
    console.log(`✅ API Server running on http://localhost:${PORT}`);
    console.log('\n🔗 Test these endpoints:');
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   GET  http://localhost:${PORT}/api/opportunities`);
    console.log(`   GET  http://localhost:${PORT}/api/opportunities?naics=236220`);
    console.log(`   GET  http://localhost:${PORT}/api/statistics`);
    console.log(`   GET  http://localhost:${PORT}/api/sales/opportunities`);
    console.log(`   POST http://localhost:${PORT}/api/sync`);
    console.log('\n💡 Server is ready for frontend integration!');
});

process.on('SIGINT', async () => {
    console.log('\n🔄 Gracefully shutting down...');
    await db.destroy();
    process.exit(0);
});