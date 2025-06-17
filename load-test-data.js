require('dotenv').config();
const axios = require('axios');

async function loadTestData() {
  console.log('Loading test data from SAM.gov API...');
  
  try {
    // Trigger a small sync for testing - just last 7 days for one NAICS code
    const response = await axios.post('http://localhost:3000/api/sync', {
      naicsCodes: ['236220'], // Commercial and Institutional Building Construction
      postedFrom: '2025-06-10',
      postedTo: '2025-06-16', 
      ptype: 'a', // Award notices
      dryRun: false
    }, {
      timeout: 120000 // 2 minutes timeout
    });

    console.log('Sync Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log(`✅ Successfully loaded ${response.data.recordsCreated} new records`);
      console.log(`📊 Total processed: ${response.data.recordsProcessed}`);
      console.log(`⏱️  Duration: ${response.data.duration}ms`);
    } else {
      console.log('❌ Sync completed with errors:', response.data.errors);
    }

  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Request Error:', error.message);
    }
  }
}

loadTestData();