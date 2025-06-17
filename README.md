# Eyrus SAM.gov Integration

Enterprise-grade SAM.gov opportunities API integration for the Eyrus project. This system provides robust, scalable, and reliable integration with the SAM.gov API to fetch and store government contract opportunities.

## 🌟 Features

- **Enterprise-Grade Architecture**: Built for Fortune 100 companies with 24/7 reliability
- **Comprehensive SAM.gov Integration**: Full support for opportunities API v2
- **Advanced Rate Limiting**: Intelligent rate limiting to respect API quotas
- **Robust Error Handling**: Comprehensive error handling with retry mechanisms
- **Real-time Monitoring**: Health checks, logging, and performance monitoring
- **Scheduled Synchronization**: Automated data sync with configurable intervals
- **RESTful API**: Clean REST API for data access and management
- **Database Optimization**: Optimized PostgreSQL schema with proper indexing
- **Docker Support**: Production-ready containerization
- **Comprehensive Testing**: Full test suite with integration tests

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SAM.gov API   │    │  Eyrus SAM App  │    │   PostgreSQL    │
│                 │◄──►│                 │◄──►│                 │
│ Opportunities   │    │ Rate Limited    │    │ sam_opportunities│
│ Award Notices   │    │ Error Handling  │    │ sam_sync_logs   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                       ┌───────▼───────┐
                       │   REST API    │
                       │ /opportunities│
                       │ /sync         │
                       │ /health       │
                       └───────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 12+
- SAM.gov API key

### 1. Clone and Install

```bash
git clone https://github.com/AntaresIntelligence/eyrus-sam-integration.git
cd eyrus-sam-integration
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eyrus_sam
DB_USER=postgres
DB_PASSWORD=your_password

# SAM.gov API Configuration
SAM_API_KEY=cyPX1StgZ8Y1VaXyqkTM6RW0v6FJSP7UvLoPhyOd
SAM_API_BASE_URL=https://api.sam.gov/prod/opportunities/v2

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
PORT=3000
```

### 3. Database Setup

```bash
# Run migrations
npm run migrate

# Verify database setup
npm run health-check
```

### 4. Test Implementation

```bash
# Run comprehensive tests
npm run test:implementation
```

### 5. Start Application

```bash
# Development mode
npm run dev

# Production mode
npm run build && npm start
```

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Health Check Endpoints

#### GET /health
Quick health status for load balancers
```json
{
  "status": "healthy",
  "message": "System operational",
  "timestamp": "2025-06-17T04:30:00.000Z"
}
```

#### GET /health/detailed
Comprehensive health check with component details
```json
{
  "status": "healthy",
  "timestamp": "2025-06-17T04:30:00.000Z",
  "uptime": 3600.5,
  "version": "v1",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 12.5,
      "message": "Database connection successful"
    },
    "samApi": {
      "status": "healthy", 
      "responseTime": 245.8,
      "message": "API connection successful"
    }
  }
}
```

### Opportunities Endpoints

#### GET /opportunities
Retrieve opportunities with filtering and pagination

**Query Parameters:**
- `limit` (number): Max records to return (default: 50, max: 1000)
- `offset` (number): Number of records to skip (default: 0)
- `postedFrom` (string): Start date (YYYY-MM-DD format)
- `postedTo` (string): End date (YYYY-MM-DD format)
- `naicsCode` (string): NAICS code filter
- `department` (string): Department name filter
- `opportunityType` (string): Opportunity type filter
- `searchTerm` (string): Search in title, description, solicitation number

**Example:**
```bash
GET /api/v1/opportunities?postedFrom=2025-01-01&postedTo=2025-06-16&naicsCode=236220&limit=100
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "opportunityId": "12345",
      "title": "Construction Project",
      "description": "Major construction project...",
      "naicsCode": "236220",
      "department": "Department of Defense",
      "postedDate": "2025-01-15T00:00:00.000Z",
      "responseDeadline": "2025-02-15T00:00:00.000Z",
      "awardAmount": 1000000.00
    }
  ],
  "meta": {
    "count": 1,
    "limit": 100,
    "offset": 0
  }
}
```

#### GET /opportunities/:id
Get specific opportunity by ID

### Sync Endpoints

#### POST /sync/manual
Trigger manual synchronization

**Request Body:**
```json
{
  "postedFrom": "2025-01-01",
  "postedTo": "2025-06-16", 
  "ptype": "a",
  "ncode": "236220",
  "dryRun": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual sync started successfully",
  "syncOptions": {
    "postedFrom": "2025-01-01",
    "postedTo": "2025-06-16",
    "ptype": "a", 
    "ncode": "236220"
  }
}
```

#### GET /sync/history
Get synchronization history

#### GET /sync/status
Get current sync status and statistics

#### POST /sync/test
Test SAM.gov API connectivity

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database host | localhost | ✅ |
| `DB_PORT` | Database port | 5432 | ❌ |
| `DB_NAME` | Database name | eyrus_sam | ✅ |
| `DB_USER` | Database user | postgres | ✅ |
| `DB_PASSWORD` | Database password | - | ✅ |
| `SAM_API_KEY` | SAM.gov API key | - | ✅ |
| `SAM_API_BASE_URL` | SAM.gov API base URL | - | ✅ |
| `SYNC_INTERVAL_MINUTES` | Auto-sync interval | 30 | ❌ |
| `LOG_LEVEL` | Logging level | info | ❌ |
| `PORT` | Server port | 3000 | ❌ |

### Database Schema

The system creates three main tables:

1. **sam_opportunities**: Stores opportunity data with comprehensive fields
2. **sam_sync_logs**: Tracks all synchronization operations 
3. **sam_api_rate_limits**: Manages API rate limiting

## 🔄 Scheduled Operations

### Automatic Synchronization
- **Frequency**: Every 30 minutes (configurable)
- **Data Range**: Last 30 days
- **Filters**: Award notices (ptype=a), NAICS 236220

### Data Cleanup
- **Frequency**: Daily at 2 AM UTC
- **Retention**: 365 days (configurable)
- **Operation**: Soft delete old records

### Health Monitoring
- **Frequency**: Every 5 minutes
- **Components**: Database, SAM.gov API, Memory, Disk
- **Alerting**: Configurable email alerts

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring & Observability

### Logging
- **Structured JSON logging** with Winston
- **Log levels**: error, warn, info, debug
- **Log files**: `logs/error.log`, `logs/combined.log`
- **Performance metrics** for all operations

### Health Checks
- **Liveness probe**: `/health/liveness`
- **Readiness probe**: `/health/readiness`
- **Detailed health**: `/health/detailed`

### Metrics
- API response times
- Database operation performance
- SAM.gov API rate limit status
- Sync operation statistics

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:implementation
```

### Health Check
```bash
npm run health-check
```

### Test Coverage
```bash
npm run test:coverage
```

## 🚨 Error Handling & Recovery

### API Errors
- **Retry logic**: Exponential backoff for transient failures
- **Rate limiting**: Automatic throttling to respect API limits
- **Circuit breaker**: Fail-fast for persistent API issues

### Database Errors
- **Connection pooling**: Automatic reconnection handling
- **Transaction rollback**: Ensure data consistency
- **Dead letter queue**: For failed operations

### Monitoring & Alerts
- **Failed sync notifications**: Email alerts for sync failures
- **Health check failures**: Immediate alerting for critical issues
- **Performance degradation**: Warnings for slow operations

## 🔐 Security

### API Security
- **Rate limiting**: Prevent abuse and DoS attacks
- **Input validation**: Comprehensive parameter validation
- **CORS configuration**: Restricted cross-origin requests
- **Helmet.js**: Security headers and protection

### Data Security
- **Environment variables**: Sensitive data in environment configs
- **API key protection**: Never log or expose API keys
- **Database encryption**: SSL/TLS for database connections
- **Access logging**: All API access logged for auditing

## 📚 Key Implementation Details

### Rate Limiting Strategy
- **60 requests per minute** to SAM.gov API (configurable)
- **Memory-based rate limiting** with Redis option
- **Graceful degradation** when limits approached

### Data Processing
- **Batch processing**: 100 records per batch (configurable)
- **Incremental sync**: Only fetch changed data
- **Duplicate detection**: Prevent duplicate opportunity records
- **Data validation**: Comprehensive validation before storage

### Enterprise Features
- **Horizontal scaling**: Stateless design for load balancing
- **Circuit breaker pattern**: Fail-fast for downstream failures
- **Graceful shutdown**: Clean termination with running operations
- **Resource monitoring**: Memory and CPU usage tracking

## 🛠️ Development

### Project Structure
```
src/
├── config/           # Configuration management
├── database/         # Database migrations and connection
├── repositories/     # Data access layer
├── services/         # Business logic layer
├── routes/           # API route handlers
├── utils/           # Utility functions and helpers
└── scripts/         # Maintenance and deployment scripts
```

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

### Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

### Documentation
- **API Documentation**: Available at `/api/v1/docs` (when running)
- **Health Dashboard**: Available at `/health/detailed`
- **Logs**: Check `logs/` directory for detailed logs

### Troubleshooting

#### Common Issues

**Database Connection Fails**
```bash
# Check database status
npm run health-check

# Verify environment variables
cat .env | grep DB_
```

**SAM.gov API Issues**
```bash
# Test API connectivity
curl -X POST http://localhost:3000/api/v1/sync/test

# Check API key validity
npm run test:implementation
```

**Sync Operations Failing**
```bash
# Check sync logs
npm run logs:sync

# Review error details
GET /api/v1/sync/history
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **SAM.gov**: For providing the opportunities API
- **Eyrus Team**: For project requirements and specifications
- **Open Source Community**: For the excellent libraries used in this project

---

**Built with ❤️ for enterprise reliability and scale**

For questions or support, please contact the Eyrus development team.
