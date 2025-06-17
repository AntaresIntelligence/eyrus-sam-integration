// Test the complete data flow: Database → API → React UI
const axios = require('axios');

async function testUIDataFlow() {
    console.log('🧪 Testing Complete UI Data Flow: SAM.gov → Database → API → React\n');
    
    try {
        console.log('📊 DASHBOARD DATA VERIFICATION:');
        console.log('=====================================');
        
        // Test the exact endpoints the React Dashboard calls
        const healthResponse = await axios.get('http://localhost:3000/health');
        console.log(`✅ Health Status: ${healthResponse.data.status}`);
        console.log(`📈 Total Opportunities: ${healthResponse.data.opportunities}`);
        
        const statsResponse = await axios.get('http://localhost:3000/api/statistics');
        const stats = statsResponse.data.data.overview;
        console.log(`💰 Total Contract Value: $${parseFloat(stats.total_value).toLocaleString()}`);
        console.log(`📊 Average Award: $${parseFloat(stats.avg_value).toLocaleString()}`);
        console.log(`🏆 Largest Contract: $${parseFloat(stats.max_value).toLocaleString()}`);
        
        console.log('\n📋 OPPORTUNITIES PAGE DATA:');
        console.log('=====================================');
        
        const oppsResponse = await axios.get('http://localhost:3000/api/opportunities');
        const opportunities = oppsResponse.data.data;
        
        console.log(`📄 Total Opportunities Available: ${oppsResponse.data.total}`);
        console.log('\n🏗️ Construction Contracts in Dashboard:');
        
        opportunities.forEach((opp, index) => {
            console.log(`\n${index + 1}. ${opp.title.substring(0, 60)}...`);
            console.log(`   💰 Award: $${opp.award_amount.toLocaleString()}`);
            console.log(`   🏢 Awardee: ${opp.awardee_name}`);
            console.log(`   🏛️  Department: ${opp.department}`);
            console.log(`   🏷️  NAICS: ${opp.naics_code}`);
            console.log(`   📅 Posted: ${new Date(opp.posted_date).toLocaleDateString()}`);
        });
        
        console.log('\n🎯 NAICS FILTERING TEST:');
        console.log('=====================================');
        
        const naicsResponse = await axios.get('http://localhost:3000/api/opportunities?naics=236220');
        console.log(`🏗️ NAICS 236220 (Commercial Construction): ${naicsResponse.data.total} opportunities`);
        console.log('   (This is what users see when filtering by Construction in the UI)');
        
        console.log('\n💼 SALES DASHBOARD DATA:');
        console.log('=====================================');
        
        const salesResponse = await axios.get('http://localhost:3000/api/sales/opportunities');
        const salesOpps = salesResponse.data.data;
        
        console.log(`🎯 Sales Qualified Contracts (≥$100K): ${salesResponse.data.total}`);
        console.log('\n💰 High-Value Opportunities (Sales Priority Order):');
        
        salesOpps.slice(0, 4).forEach((opp, index) => {
            const priority = opp.award_amount >= 50000000 ? 'HIGH' : 
                           opp.award_amount >= 10000000 ? 'MEDIUM' : 'LOW';
            console.log(`\n${index + 1}. $${opp.award_amount.toLocaleString()} - ${priority} PRIORITY`);
            console.log(`   📄 ${opp.title.substring(0, 50)}...`);
            console.log(`   🏢 ${opp.awardee_name}`);
            console.log(`   🏛️  ${opp.department}`);
            if (opp.sales_score) console.log(`   📊 Sales Score: ${opp.sales_score}/100`);
        });
        
        console.log('\n🔄 SYNC FUNCTIONALITY TEST:');
        console.log('=====================================');
        
        const syncResponse = await axios.post('http://localhost:3000/api/sync', {
            naics_codes: ['236220'],
            dry_run: true
        });
        
        if (syncResponse.data.success) {
            console.log('✅ Manual Sync Trigger: Working');
            console.log(`📅 Sync Status: ${syncResponse.data.data.status}`);
            console.log('   (Users can trigger data refresh from the UI)');
        }
        
        console.log('\n🌐 REACT UI ACCESS INSTRUCTIONS:');
        console.log('=====================================');
        console.log('1. Open browser: http://localhost:3001');
        console.log('2. You should see the Eyrus SAM Dashboard');
        console.log('3. Navigate through pages to see this data:');
        console.log('   • Dashboard: Statistics and overview');
        console.log('   • Opportunities: Browse all 4 contracts');
        console.log('   • Sales: High-value contract prioritization');
        console.log('   • Sync: Manual data refresh options');
        
        console.log('\n🎯 WHAT TO EXPECT IN THE UI:');
        console.log('=====================================');
        console.log('✅ Professional dashboard with real SAM.gov data');
        console.log('✅ 4 construction contracts ($15M - $88M range)');
        console.log('✅ NAICS 236220 filtering works');
        console.log('✅ Search by company names (CLARK, FLOYD, RECCO, COSTANZO)');
        console.log('✅ Department filtering (DoD, Veterans Affairs)');
        console.log('✅ Sales qualification for all contracts');
        console.log('✅ Real-time health monitoring');
        console.log('✅ Manual sync operations');
        
        console.log('\n🚀 UI TESTING CHECKLIST:');
        console.log('=====================================');
        console.log('□ Dashboard shows $145M+ total contract value');
        console.log('□ All 4 opportunities visible in Opportunities page');
        console.log('□ NAICS 236220 filter returns all 4 contracts');
        console.log('□ Sales page shows contracts sorted by value');
        console.log('□ Search finds relevant results');
        console.log('□ Manual sync triggers successfully');
        console.log('□ Navigation between pages works smoothly');
        console.log('□ Mobile responsive design works');
        
    } catch (error) {
        console.error('❌ UI Data Flow Test Failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check if API server running: curl http://localhost:3000/health');
        console.log('2. Check if React app running: curl http://localhost:3001');
        console.log('3. Check browser console for errors (F12)');
    }
}

testUIDataFlow();