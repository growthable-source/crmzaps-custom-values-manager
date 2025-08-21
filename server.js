const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Store tokens (in production, use a proper database)
const tokenStore = new Map();

// Configuration - HARDCODED CLIENT_ID ONLY
const config = {
  clientId: '65ea6e98b145213004708e09-mel4cupz', // HARDCODED
  clientSecret: process.env.GHL_APP_CLIENT_SECRET,
  apiDomain: process.env.GHL_API_DOMAIN || 'https://services.leadconnectorhq.com',
  redirectUri: process.env.REDIRECT_URI || 'https://crmzaps-custom-values-manager-1.onrender.com/authorize-handler'
};

// Helper function to refresh token
async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios.post(`${config.apiDomain}/oauth/token`, {
      client_id: '68a41a4eb5154c8bb56d1555-mei65mus', // HARDCODED
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });
    return response.data;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

// Helper function to make authenticated API calls
async function makeAuthenticatedRequest(url, method, locationId, data = null) {
  const tokenData = tokenStore.get(locationId);
  if (!tokenData) {
    throw new Error('No token found for this location');
  }

  try {
    const requestConfig = {
      method,
      url: `${config.apiDomain}${url}`,
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      requestConfig.data = data;
    }

    const response = await axios(requestConfig);
    return response.data;
  } catch (error) {
    // If token expired, try to refresh
    if (error.response?.status === 401 && tokenData.refresh_token) {
      try {
        const newTokenData = await refreshAccessToken(tokenData.refresh_token);
        tokenStore.set(locationId, newTokenData);
        
        // Retry the request with new token
        const retryConfig = {
          method,
          url: `${config.apiDomain}${url}`,
          headers: {
            'Authorization': `Bearer ${newTokenData.access_token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          }
        };
        
        if (data) {
          retryConfig.data = data;
        }
        
        const response = await axios(retryConfig);
        return response.data;
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        throw refreshError;
      }
    }
    throw error;
  }
}

// Landing page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Custom Values Manager</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0e27 0%, #1e293b 100%);
            color: #e2e8f0;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            max-width: 800px;
            text-align: center;
            padding: 50px 20px;
          }
          h1 {
            font-size: 3rem;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            font-size: 1.5rem;
            color: #94a3b8;
            margin-bottom: 40px;
          }
          .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 40px 0;
          }
          .feature {
            background: rgba(255, 255, 255, 0.05);
            padding: 25px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .feature h3 {
            color: #667eea;
            margin-bottom: 10px;
          }
          .install-btn {
            display: inline-block;
            padding: 18px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-size: 1.2rem;
            font-weight: bold;
            margin-top: 30px;
            transition: transform 0.3s, box-shadow 0.3s;
          }
          .install-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Custom Values Manager</h1>
          <p class="subtitle">Effortlessly manage custom values and fields for your location</p>
          
          <div class="features">
            <div class="feature">
              <h3>📊 Centralized Management</h3>
              <p>View and manage all custom values and fields in one place</p>
            </div>
            <div class="feature">
              <h3>✏️ Easy Editing</h3>
              <p>Create, update, and delete custom values with a simple interface</p>
            </div>
            <div class="feature">
              <h3>🎨 Multiple Data Types</h3>
              <p>Support for text, numbers, dates, dropdowns, files, and more</p>
            </div>
            <div class="feature">
              <h3>🔍 Search & Filter</h3>
              <p>Quickly find and modify specific custom values and fields</p>
            </div>
          </div>
          
          <a href="/install" class="install-btn">Install to Your Location</a>
          
          <p style="margin-top: 40px; color: #64748b; font-size: 0.9rem;">
            This app requires location-level access with custom values and fields permissions
          </p>
        </div>
      </body>
    </html>
  `);
});

// Dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// OAuth installation handler
app.get('/install', (req, res) => {
  // HARDCODED CLIENT_ID in URL
  const installUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
    `client_id=68a41a4eb5154c8bb56d1555-mei65mus&` +  // HARDCODED
    `scope=locations.readonly locations/customValues.readonly locations/customValues.write locations/customFields.readonly locations/customFields.write`;
  
  res.redirect(installUrl);
});

// OAuth authorization handler
app.get('/authorize-handler', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h2>Installation Failed</h2>
          <p>No authorization code provided.</p>
          <a href="/install">Try Again</a>
        </body>
      </html>
    `);
  }

  try {
    // Exchange code for token - HARDCODED CLIENT_ID
    const tokenResponse = await axios.post(`${config.apiDomain}/oauth/token`, {
      client_id: '68a41a4eb5154c8bb56d1555-mei65mus', // HARDCODED
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri
    });

    const tokenData = tokenResponse.data;
    
    // Decode the token to get location info
    const base64Payload = tokenData.access_token.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    
    // For sub-account apps, we get locationId directly
    const locationId = payload.locationId;
    
    // Store token data
    tokenStore.set(locationId, tokenData);
    
    // Show success page
    res.send(`
      <html>
        <head>
          <title>Installation Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              background: rgba(255, 255, 255, 0.1);
              padding: 50px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            h1 { margin-bottom: 20px; }
            p { margin-bottom: 30px; font-size: 18px; }
            .button {
              display: inline-block;
              padding: 15px 30px;
              background: white;
              color: #764ba2;
              text-decoration: none;
              border-radius: 10px;
              font-weight: bold;
              transition: transform 0.3s;
            }
            .button:hover {
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Installation Successful!</h1>
            <p>Custom Values Manager has been installed for this location.</p>
            <a href="/dashboard?locationId=${locationId}" class="button">Go to Dashboard</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h2>Installation Failed</h2>
          <p>${error.message}</p>
          <a href="/install">Try Again</a>
        </body>
      </html>
    `);
  }
});

// API Routes for Custom Values
app.get('/api/custom-values/:locationId', async (req, res) => {
  const { locationId } = req.params;

  try {
    const customValues = await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues`,
      'GET',
      locationId
    );
    res.json(customValues);
  } catch (error) {
    console.error('Error fetching custom values:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch custom values' 
    });
  }
});

app.post('/api/custom-values/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const customValueData = req.body;

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues`,
      'POST',
      locationId,
      customValueData
    );
    res.json(result);
  } catch (error) {
    console.error('Error creating custom value:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to create custom value' 
    });
  }
});

app.put('/api/custom-values/:locationId/:customValueId', async (req, res) => {
  const { locationId, customValueId } = req.params;
  const updateData = req.body;

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues/${customValueId}`,
      'PUT',
      locationId,
      updateData
    );
    res.json(result);
  } catch (error) {
    console.error('Error updating custom value:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to update custom value' 
    });
  }
});

app.delete('/api/custom-values/:locationId/:customValueId', async (req, res) => {
  const { locationId, customValueId } = req.params;

  try {
    await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues/${customValueId}`,
      'DELETE',
      locationId
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom value:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to delete custom value' 
    });
  }
});

// API Routes for Custom Fields
app.get('/api/custom-fields/:locationId', async (req, res) => {
  const { locationId } = req.params;

  try {
    const customFields = await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields`,
      'GET',
      locationId
    );
    res.json(customFields);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch custom fields' 
    });
  }
});

app.post('/api/custom-fields/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const customFieldData = req.body;

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields`,
      'POST',
      locationId,
      customFieldData
    );
    res.json(result);
  } catch (error) {
    console.error('Error creating custom field:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to create custom field' 
    });
  }
});

app.put('/api/custom-fields/:locationId/:customFieldId', async (req, res) => {
  const { locationId, customFieldId } = req.params;
  const updateData = req.body;

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields/${customFieldId}`,
      'PUT',
      locationId,
      updateData
    );
    res.json(result);
  } catch (error) {
    console.error('Error updating custom field:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to update custom field' 
    });
  }
});

app.delete('/api/custom-fields/:locationId/:customFieldId', async (req, res) => {
  const { locationId, customFieldId } = req.params;

  try {
    await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields/${customFieldId}`,
      'DELETE',
      locationId
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to delete custom field' 
    });
  }
});

// Get location details
app.get('/api/location/:locationId', async (req, res) => {
  const { locationId } = req.params;

  try {
    const location = await makeAuthenticatedRequest(
      `/locations/${locationId}`,
      'GET',
      locationId
    );
    res.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch location details' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the app`);
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});
