// server.js
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

// Configuration
const config = {
  clientId: process.env.GHL_APP_CLIENT_ID,
  clientSecret: process.env.GHL_APP_CLIENT_SECRET,
  apiDomain: process.env.GHL_API_DOMAIN || 'https://services.leadconnectorhq.com',
  ssoKey: process.env.GHL_APP_SSO_KEY || null, // Optional: only needed for embedded custom pages
  redirectUri: process.env.REDIRECT_URI || `http://localhost:${PORT}/authorize-handler`
};

// Helper function to refresh token
async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios.post(`${config.apiDomain}/oauth/token`, {
      client_id: config.clientId,
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
async function makeAuthenticatedRequest(url, method, companyId, data = null) {
  const tokenData = tokenStore.get(companyId);
  if (!tokenData) {
    throw new Error('No token found for this company');
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
        tokenStore.set(companyId, newTokenData);
        
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

// Routes

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// OAuth installation handler - This is where agencies install your app
app.get('/install', (req, res) => {
  // Generate the OAuth URL for agencies to install your app
  const installUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?` +
    `response_type=code&` +
    `client_id=${config.clientId}&` +
    `redirect_uri=${encodeURIComponent(config.redirectUri)}`;
  
  res.redirect(installUrl);
});

// OAuth authorization handler - Handles the callback after installation
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
    // Exchange code for token
    const tokenResponse = await axios.post(`${config.apiDomain}/oauth/token`, {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri
    });

    const tokenData = tokenResponse.data;
    
    // Decode the token to get company/location info
    const base64Payload = tokenData.access_token.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    
    // Store token data (in production, store in database with company association)
    tokenStore.set(payload.companyId, tokenData);
    
    // Show success page with access instructions
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
            .url-display {
              background: rgba(0,0,0,0.3);
              padding: 15px;
              border-radius: 10px;
              margin: 20px 0;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Installation Successful!</h1>
            <p>Custom Values Manager has been installed for your agency.</p>
            <div class="url-display">
              Access your dashboard at:<br>
              <strong>${req.protocol}://${req.get('host')}/dashboard?companyId=${payload.companyId}</strong>
            </div>
            <a href="/dashboard?companyId=${payload.companyId}" class="button">Go to Dashboard</a>
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

// Get all custom values for a location
app.get('/api/custom-values/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const { companyId } = req.query;

  try {
    const customValues = await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues`,
      'GET',
      companyId
    );
    res.json(customValues);
  } catch (error) {
    console.error('Error fetching custom values:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch custom values' 
    });
  }
});

// Create a new custom value
app.post('/api/custom-values/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const { companyId } = req.query;
  const customValueData = req.body;

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues`,
      'POST',
      companyId,
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

// Update a custom value
app.put('/api/custom-values/:locationId/:customValueId', async (req, res) => {
  const { locationId, customValueId } = req.params;
  const { companyId } = req.query;
  const updateData = req.body;

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues/${customValueId}`,
      'PUT',
      companyId,
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

// Delete a custom value
app.delete('/api/custom-values/:locationId/:customValueId', async (req, res) => {
  const { locationId, customValueId } = req.params;
  const { companyId } = req.query;

  try {
    await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues/${customValueId}`,
      'DELETE',
      companyId
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

// Get all custom fields for a location
app.get('/api/custom-fields/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const { companyId } = req.query;

  try {
    const customFields = await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields`,
      'GET',
      companyId
    );
    res.json(customFields);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch custom fields' 
    });
  }
});

// Create a new custom field
app.post('/api/custom-fields/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const { companyId } = req.query;
  const customFieldData = req.body;

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields`,
      'POST',
      companyId,
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

// Update a custom field
app.put('/api/custom-fields/:locationId/:customFieldId', async (req, res) => {
  const { locationId, customFieldId } = req.params;
  const { companyId } = req.query;
  const updateData = req.body;

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields/${customFieldId}`,
      'PUT',
      companyId,
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

// Delete a custom field
app.delete('/api/custom-fields/:locationId/:customFieldId', async (req, res) => {
  const { locationId, customFieldId } = req.params;
  const { companyId } = req.query;

  try {
    await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields/${customFieldId}`,
      'DELETE',
      companyId
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to delete custom field' 
    });
  }
});

// Get all subaccounts (locations) for an agency
app.get('/api/locations', async (req, res) => {
  const { companyId } = req.query;

  try {
    const locations = await makeAuthenticatedRequest(
      `/companies/${companyId}/locations`,
      'GET',
      companyId
    );
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch locations' 
    });
  }
});

// Bulk operations for custom values

// Copy custom values from one location to another
app.post('/api/bulk/copy-custom-values', async (req, res) => {
  const { companyId, sourceLocationId, targetLocationIds } = req.body;

  try {
    // Get custom values from source location
    const sourceValues = await makeAuthenticatedRequest(
      `/locations/${sourceLocationId}/customValues`,
      'GET',
      companyId
    );

    const results = [];
    
    // Copy to each target location
    for (const targetLocationId of targetLocationIds) {
      const locationResults = [];
      
      for (const customValue of sourceValues.customValues || []) {
        try {
          // Create new custom value in target location
          const result = await makeAuthenticatedRequest(
            `/locations/${targetLocationId}/customValues`,
            'POST',
            companyId,
            {
              name: customValue.name,
              value: customValue.value
            }
          );
          locationResults.push({ success: true, value: result });
        } catch (error) {
          locationResults.push({ 
            success: false, 
            error: error.message,
            valueName: customValue.name 
          });
        }
      }
      
      results.push({
        locationId: targetLocationId,
        results: locationResults
      });
    }
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error in bulk copy operation:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to copy custom values' 
    });
  }
});

// Copy custom fields from one location to another
app.post('/api/bulk/copy-custom-fields', async (req, res) => {
  const { companyId, sourceLocationId, targetLocationIds } = req.body;

  try {
    // Get custom fields from source location
    const sourceFields = await makeAuthenticatedRequest(
      `/locations/${sourceLocationId}/customFields`,
      'GET',
      companyId
    );

    const results = [];
    
    // Copy to each target location
    for (const targetLocationId of targetLocationIds) {
      const locationResults = [];
      
      for (const customField of sourceFields.customFields || []) {
        try {
          // Create new custom field in target location
          const fieldData = {
            name: customField.name,
            dataType: customField.dataType,
            position: customField.position,
            picklistOptions: customField.picklistOptions
          };
          
          if (customField.placeholder) {
            fieldData.placeholder = customField.placeholder;
          }
          
          const result = await makeAuthenticatedRequest(
            `/locations/${targetLocationId}/customFields`,
            'POST',
            companyId,
            fieldData
          );
          locationResults.push({ success: true, field: result });
        } catch (error) {
          locationResults.push({ 
            success: false, 
            error: error.message,
            fieldName: customField.name 
          });
        }
      }
      
      results.push({
        locationId: targetLocationId,
        results: locationResults
      });
    }
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error in bulk copy operation:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to copy custom fields' 
    });
  }
});

// SSO Decryption endpoint (only needed if using embedded custom pages)
app.post('/decrypt-sso', (req, res) => {
  if (!config.ssoKey) {
    return res.status(400).json({ 
      error: 'SSO key not configured. Only needed for embedded custom pages.' 
    });
  }
  
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'No SSO key provided' });
    }
    
    // SSO decryption logic would go here if implementing custom pages
    // This is just a placeholder for the structure
    res.json({ 
      message: 'SSO endpoint ready but not implemented for standalone app',
      note: 'This endpoint is only used when app is embedded in GoHighLevel'
    });
  } catch (error) {
    console.error('SSO decryption error:', error);
    res.status(500).json({ error: 'Failed to decrypt SSO data' });
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
