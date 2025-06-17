import { config } from '../config';
import { logger, logBusinessEvent } from '../utils/logger';
import { testDatabaseConnection } from '../database/connection';
import { samOpportunitiesService } from '../services/samOpportunitiesService';
import { healthCheckService } from '../services/healthCheckService';

/**
 * Comprehensive test script to validate the SAM.gov integration implementation
 */
class IntegrationTestRunner {
  private testResults: { [key: string]: boolean } = {};
  private errors: string[] = [];

  async runAllTests(): Promise<void> {
    logger.info('Starting comprehensive integration tests');
    logBusinessEvent('integration_tests_started');

    console.log('\n🚀 Eyrus SAM.gov Integration - Test Suite');
    console.log('==========================================\n');

    try {
      await this.testConfiguration();
      await this.testDatabaseConnection();
      await this.testSamApiConnection();
      await this.testHealthCheck();
      await this.testSyncOperation();
      
      await this.displayResults();
    } catch (error: any) {
      logger.error('Integration tests failed', { error: error.message });
      console.error('❌ Integration tests failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test 1: Configuration Validation
   */
  private async testConfiguration(): Promise<void> {
    console.log('📋 Test 1: Configuration Validation');
    
    try {
      // Check required environment variables
      const requiredConfigs = [
        'database.host',
        'database.name',
        'database.user',
        'sam.apiKey',
        'sam.apiBaseUrl',
      ];

      const missingConfigs: string[] = [];
      
      requiredConfigs.forEach(configPath => {
        const value = this.getNestedConfig(config, configPath);
        if (!value) {
          missingConfigs.push(configPath);
        }
      });

      if (missingConfigs.length > 0) {
        throw new Error(`Missing required configurations: ${missingConfigs.join(', ')}`);
      }

      // Validate API key format (should be a reasonable length)
      if (config.sam.apiKey.length < 20) {
        throw new Error('SAM API key appears to be invalid (too short)');
      }

      this.testResults['configuration'] = true;
      console.log('   ✅ Configuration validation passed');
      
    } catch (error: any) {
      this.testResults['configuration'] = false;
      this.errors.push(`Configuration: ${error.message}`);
      console.log(`   ❌ Configuration validation failed: ${error.message}`);
    }
  }

  /**
   * Test 2: Database Connection
   */
  private async testDatabaseConnection(): Promise<void> {
    console.log('🗄️  Test 2: Database Connection');
    
    try {
      const isConnected = await testDatabaseConnection();
      
      if (!isConnected) {
        throw new Error('Database connection test returned false');
      }

      this.testResults['database'] = true;
      console.log('   ✅ Database connection successful');
      console.log(`   📍 Connected to: ${config.database.host}:${config.database.port}/${config.database.name}`);
      
    } catch (error: any) {
      this.testResults['database'] = false;
      this.errors.push(`Database: ${error.message}`);
      console.log(`   ❌ Database connection failed: ${error.message}`);
    }
  }

  /**
   * Test 3: SAM.gov API Connection
   */
  private async testSamApiConnection(): Promise<void> {
    console.log('🌐 Test 3: SAM.gov API Connection');
    
    try {
      const apiTest = await samOpportunitiesService.testApiConnection();
      
      if (!apiTest.success) {
        throw new Error(apiTest.message);
      }

      this.testResults['samApi'] = true;
      console.log('   ✅ SAM.gov API connection successful');
      console.log(`   📊 Total records available: ${apiTest.details?.totalRecords || 'Unknown'}`);
      
    } catch (error: any) {
      this.testResults['samApi'] = false;
      this.errors.push(`SAM API: ${error.message}`);
      console.log(`   ❌ SAM.gov API connection failed: ${error.message}`);
    }
  }

  /**
   * Test 4: Health Check System
   */
  private async testHealthCheck(): Promise<void> {
    console.log('💊 Test 4: Health Check System');
    
    try {
      const healthResult = await healthCheckService.performHealthCheck(true);
      
      const unhealthyComponents = Object.values(healthResult.checks)
        .filter(check => check.status === 'unhealthy').length;

      if (unhealthyComponents > 0) {
        console.log(`   ⚠️  Health check completed with ${unhealthyComponents} unhealthy components`);
        Object.entries(healthResult.checks).forEach(([component, result]) => {
          const icon = result.status === 'healthy' ? '✅' : '❌';
          console.log(`      ${icon} ${component}: ${result.message}`);
        });
      } else {
        console.log('   ✅ All health check components are healthy');
      }

      this.testResults['healthCheck'] = unhealthyComponents === 0;
      
    } catch (error: any) {
      this.testResults['healthCheck'] = false;
      this.errors.push(`Health Check: ${error.message}`);
      console.log(`   ❌ Health check failed: ${error.message}`);
    }
  }

  /**
   * Test 5: Sync Operation (Dry Run)
   */
  private async testSyncOperation(): Promise<void> {
    console.log('🔄 Test 5: Sync Operation (Dry Run)');
    
    try {
      // Test with the specific date range and parameters from requirements
      const result = await samOpportunitiesService.syncOpportunities({
        postedFrom: '2025-01-01',
        postedTo: '2025-06-16',
        ptype: 'a', // Award notices
        ncode: '236220', // Specific NAICS code
        dryRun: true, // Don't actually write to database
      });

      console.log('   📈 Sync operation completed (dry run)');
      console.log(`   📊 Records processed: ${result.recordsProcessed}`);
      console.log(`   ⏱️  Duration: ${result.duration}ms`);
      console.log(`   🆔 Sync ID: ${result.syncId}`);

      if (!result.success) {
        throw new Error(`Sync failed: ${result.errors.join(', ')}`);
      }

      this.testResults['syncOperation'] = true;
      console.log('   ✅ Sync operation test passed');
      
    } catch (error: any) {
      this.testResults['syncOperation'] = false;
      this.errors.push(`Sync Operation: ${error.message}`);
      console.log(`   ❌ Sync operation failed: ${error.message}`);
    }
  }

  /**
   * Display final test results
   */
  private async displayResults(): Promise<void> {
    console.log('\n📊 Test Results Summary');
    console.log('========================');

    const passedTests = Object.values(this.testResults).filter(result => result).length;
    const totalTests = Object.keys(this.testResults).length;
    const allPassed = passedTests === totalTests;

    Object.entries(this.testResults).forEach(([testName, passed]) => {
      const icon = passed ? '✅' : '❌';
      const status = passed ? 'PASSED' : 'FAILED';
      console.log(`${icon} ${testName.padEnd(20)}: ${status}`);
    });

    console.log(`\n📈 Overall Result: ${passedTests}/${totalTests} tests passed`);

    if (!allPassed) {
      console.log('\n⚠️  Errors encountered:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n🎯 Next Steps:');
    if (allPassed) {
      console.log('   ✅ All tests passed! The integration is ready for use.');
      console.log('   🚀 You can now:');
      console.log('      - Start the application: npm run dev');
      console.log('      - Run migrations: npm run migrate');
      console.log('      - Trigger manual sync via API: POST /api/v1/sync/manual');
      
      logBusinessEvent('integration_tests_completed', {
        success: true,
        passedTests,
        totalTests,
      });
    } else {
      console.log('   ❌ Some tests failed. Please review the errors above.');
      console.log('   🔧 Common fixes:');
      console.log('      - Ensure PostgreSQL is running and accessible');
      console.log('      - Verify SAM.gov API key is valid');
      console.log('      - Check all environment variables in .env file');
      
      logBusinessEvent('integration_tests_completed', {
        success: false,
        passedTests,
        totalTests,
        errors: this.errors,
      });

      process.exit(1);
    }
  }

  /**
   * Helper to get nested configuration values
   */
  private getNestedConfig(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const testRunner = new IntegrationTestRunner();
  testRunner.runAllTests().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { IntegrationTestRunner };
