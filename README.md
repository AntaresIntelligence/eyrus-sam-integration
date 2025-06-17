# Eyrus SAM.gov Integration with Web Dashboard

Enterprise-grade SAM.gov opportunities API integration with modern React dashboard for the Eyrus project. This system provides robust, scalable, and reliable integration with the SAM.gov API to fetch and store government contract opportunities, complete with a comprehensive web-based management interface.

## 🌟 Features

### **Backend API**
- **Enterprise-Grade Architecture**: Built for Fortune 100 companies with 24/7 reliability
- **Comprehensive SAM.gov Integration**: Full support for opportunities API v2
- **Advanced Rate Limiting**: Intelligent rate limiting to respect API quotas
- **Robust Error Handling**: Comprehensive error handling with retry mechanisms
- **Real-time Monitoring**: Health checks, logging, and performance monitoring
- **Scheduled Synchronization**: Automated data sync with configurable intervals
- **RESTful API**: Clean REST API for data access and management
- **Database Optimization**: Optimized PostgreSQL schema with proper indexing

### **Web Dashboard**
- **Modern React Interface**: Responsive, enterprise-grade web dashboard
- **Real-time Monitoring**: Live system health and performance metrics
- **Data Visualization**: Interactive charts and graphs for insights
- **Opportunity Management**: Browse, search, and filter opportunities
- **Sync Management**: Manual sync controls and operation history
- **Configuration Interface**: Web-based settings management
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SAM.gov API   │    │  Backend API    │    │   PostgreSQL    │
│                 │◄──►│ Express + TS    │◄──►│                 │
│ Opportunities   │    │ Rate Limited    │    │ sam_opportunities│
│ Award Notices   │    │ Error Handling  │    │ sam_sync_logs   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                       ┌───────▼───────┐
                       │   React UI    │
                       │   Dashboard   │
                       │ - Monitoring  │
                       │ - Management  │
                       │ - Analytics   │
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

# Install both backend and frontend dependencies
npm run install:all
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

### 5. Start the Application

#### **Development Mode (Recommended)**
```bash
# Start both backend and frontend in development mode
npm run dev:full
```

This will start:
- Backend API at `http://localhost:3000`
- React dashboard at `http://localhost:3001` (with API proxy)
- Automatic reload for both on code changes

#### **Production Mode**
```bash
# Build everything
npm run build:all

# Start production server
npm start
```

Production mode serves the React app from the backend at `http://localhost:3000`

## 🖥️ Web Dashboard

### **Dashboard Overview**
The main dashboard provides a comprehensive overview of your SAM.gov integration:

- **System Health Status**: Real-time health monitoring with component-level details
- **Key Metrics**: Total opportunities, sync statistics, system uptime
- **Recent Activity**: Latest sync operations and their status
- **Performance Charts**: Response times and system resource usage

### **Opportunities Management**
Browse and manage SAM.gov opportunities with advanced features:

- **Advanced Search**: Search by title, description, or solicitation number
- **Smart Filters**: Filter by NAICS code, department, opportunity type, date ranges
- **Detailed View**: Complete opportunity information with direct SAM.gov links
- **Export Capabilities**: Download opportunity data for external analysis
- **Real-time Updates**: Automatic refresh of opportunity listings

### **Sync Management**
Complete control over synchronization operations:

- **Manual Sync**: Trigger custom sync operations with specific parameters
- **Sync History**: Detailed logs of all synchronization operations
- **Performance Metrics**: Success rates, processing times, error analysis
- **Connection Testing**: Verify SAM.gov API connectivity
- **Data Cleanup**: Manage data retention and cleanup operations

### **System Health Monitoring**
Enterprise-grade monitoring and diagnostics:

- **Component Health**: Database, SAM.gov API, memory, and disk monitoring
- **Performance Metrics**: Response time charts and system resource usage
- **Real-time Alerts**: Visual indicators for system issues
- **Historical Data**: Trend analysis and performance over time
- **Cache Management**: Clear health check cache for fresh data

### **Configuration Management**
Web-based configuration interface:

- **Database Settings**: Connection parameters, pool configuration
- **API Configuration**: SAM.gov API settings, rate limits, timeouts
- **Sync Settings**: Automation intervals, batch sizes, retry logic
- **Monitoring**: Log levels, health check intervals, alert settings
- **Data Retention**: Automatic cleanup policies and retention periods

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

#### GET /sync/history
Get synchronization history

#### GET /sync/status
Get current sync status and statistics

#### POST /sync/test
Test SAM.gov API connectivity

## 🎨 UI Components & Features

### **Component Library**
The dashboard uses a custom component library built with:

- **React 18**: Latest React features with concurrent rendering
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Utility-first CSS framework for rapid development
- **Lucide React**: Beautiful, customizable icons
- **React Query**: Powerful data fetching and caching
- **React Router**: Client-side routing with history management
- **React Hook Form**: Performant forms with easy validation
- **Recharts**: Responsive charts and data visualization
- **React Hot Toast**: Elegant toast notifications

### **Design System**
- **Consistent Color Palette**: Professional blue and gray color scheme
- **Typography**: Inter font family for excellent readability
- **Responsive Grid**: Mobile-first responsive design
- **Loading States**: Smooth loading indicators throughout
- **Error Handling**: Graceful error states with recovery options
- **Accessibility**: ARIA labels and keyboard navigation support

### **Real-time Updates**
- **Auto-refresh**: Key data refreshes automatically
- **Loading Indicators**: Visual feedback for all operations
- **Error Recovery**: Automatic retry logic for failed requests
- **Cache Management**: Intelligent caching with invalidation

## 🔧 Development

### **Project Structure**
```
├── src/                 # Backend TypeScript source
│   ├── config/         # Configuration management
│   ├── database/       # Database migrations and connection
│   ├── repositories/   # Data access layer
│   ├── services/       # Business logic layer
│   ├── routes/         # API route handlers
│   ├── utils/         # Utility functions
│   └── scripts/       # Maintenance scripts
└── web/                # Frontend React source
    ├── src/
    │   ├── components/ # Reusable UI components
    │   ├── pages/     # Page components
    │   ├── hooks/     # Custom React hooks
    │   ├── services/  # API service layer
    │   └── utils/     # Frontend utilities
    ├── public/        # Static assets
    └── dist/          # Built frontend assets
```

### **Development Scripts**

#### **Backend Development**
```bash
npm run dev              # Start backend in development mode
npm run build           # Build backend TypeScript
npm run test           # Run backend tests
npm run lint           # Lint backend code
npm run migrate        # Run database migrations
```

#### **Frontend Development**
```bash
npm run dev:web         # Start frontend development server
npm run build:web       # Build frontend for production
npm run lint:web        # Lint frontend code
```

#### **Full Stack Development**
```bash
npm run dev:full        # Start both backend and frontend
npm run build:all       # Build both backend and frontend
npm run lint:all        # Lint both backend and frontend
npm run install:all     # Install all dependencies
```

### **Code Quality**
- **TypeScript**: Full type safety across backend and frontend
- **ESLint**: Code linting with custom rules
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for quality checks
- **Jest**: Comprehensive test suite

## 🚨 Error Handling & Recovery

### **Frontend Error Handling**
- **React Error Boundaries**: Graceful component error recovery
- **API Error Handling**: Automatic retry logic with exponential backoff
- **Toast Notifications**: User-friendly error messages
- **Loading States**: Clear loading indicators for all operations
- **Offline Detection**: Handle network connectivity issues

### **Backend Error Handling**
- **API Errors**: Retry logic with circuit breaker pattern
- **Database Errors**: Connection pooling with automatic reconnection
- **Rate Limiting**: Graceful degradation when limits are reached
- **Health Monitoring**: Automatic alerting for critical issues

## 🔐 Security

### **Frontend Security**
- **XSS Protection**: Sanitized user input and secure rendering
- **CSRF Protection**: Token-based request validation
- **Secure Headers**: Helmet.js security headers
- **Input Validation**: Client and server-side validation
- **API Security**: Secure communication with backend

### **Backend Security**
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Comprehensive parameter validation
- **CORS Configuration**: Restricted cross-origin requests
- **Environment Variables**: Sensitive data protection
- **API Key Management**: Secure SAM.gov API key handling

## 📱 Mobile & Responsive Design

The dashboard is fully responsive and works seamlessly across all devices:

- **Desktop**: Full-featured interface with all capabilities
- **Tablet**: Optimized layout with touch-friendly controls
- **Mobile**: Streamlined interface with essential features
- **Progressive Web App**: Install as an app on mobile devices

## 🛠️ Deployment Options

### **Production Deployment**
```bash
# Build everything for production
npm run build:all

# Start production server
npm start
```

### **Docker Deployment**
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### **Environment Variables for Production**
```env
NODE_ENV=production
PORT=3000
DB_SSL=true
LOG_LEVEL=warn
SENTRY_DSN=your_sentry_dsn
```

## 🎯 **Next Steps After Setup**

1. **Access the Dashboard**: Navigate to `http://localhost:3000` (production) or `http://localhost:3001` (development)

2. **Configure Settings**: Use the Settings page to configure your specific requirements

3. **Test API Connection**: Use the Sync Management page to test SAM.gov connectivity

4. **Run First Sync**: Execute a manual sync with your desired parameters

5. **Monitor System**: Use the Health page to monitor system performance

6. **Set Up Automation**: Configure automatic sync intervals in Settings

## 📞 Support & Documentation

### **Getting Help**
- **Dashboard Help**: Built-in help tooltips and guidance
- **API Documentation**: Available at `/api/v1/docs` (when running)
- **Health Dashboard**: Real-time system status at `/health/detailed`
- **Log Analysis**: Check `logs/` directory for detailed logs

### **Common Issues**

**Web UI Not Loading**
```bash
# Check if frontend is built
npm run build:web

# Verify API is running
curl http://localhost:3000/health
```

**API Connection Issues**
```bash
# Test API from the dashboard
# Or manually test connection
npm run test:implementation
```

**Database Connection Problems**
```bash
# Verify database status
npm run health-check

# Check environment variables
cat .env | grep DB_
```

## 🚀 **Performance Optimizations**

### **Frontend Performance**
- **Code Splitting**: Automatic route-based code splitting
- **Lazy Loading**: Components loaded on demand
- **Caching**: Intelligent API response caching
- **Compression**: Gzip compression for static assets
- **Bundle Optimization**: Tree shaking and minification

### **Backend Performance**
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Caching**: Redis-compatible caching layer
- **Rate Limiting**: Prevents system overload
- **Monitoring**: Real-time performance metrics

---

**Built with ❤️ for enterprise reliability and modern user experience**

The combination of robust backend architecture and intuitive web interface makes this the complete solution for SAM.gov integration at enterprise scale.

For questions or support, please contact the Eyrus development team.
