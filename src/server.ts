import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { app } from './index';

// Serve static files from the React app build directory
const staticPath = path.join(process.cwd(), 'web', 'dist');
app.getApp().use(express.static(staticPath));

// Catch all handler: send back React's index.html file for SPA routing
app.getApp().get('*', (req, res) => {
  // Don't serve SPA for API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return res.status(404).json({
      error: 'Not Found',
      message: `API route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    });
  }
  
  res.sendFile(path.join(staticPath, 'index.html'));
});

export default app;
