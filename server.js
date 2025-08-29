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

// Store tokens by locationId (in production, use a proper database)
const tokenStore = new Map();

// Configuration
const config = {
  apiDomain: process.env.GHL_API_DOMAIN || 'https://services.leadconnectorhq.com'
};

// Helper function to make authenticated API calls
async function makeAuthenticatedRequest(url, method, token, data = null) {
  try {
    const requestConfig = {
      method,
      url: `${config.apiDomain}${url}`,
      headers: {
        'Authorization': `Bearer ${token}`,
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
    console.error('API Request error:', error.response?.data || error.message);
    throw error;
  }
}

// Landing page with token entry
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
          .auth-form {
            background: rgba(255, 255, 255, 0.05);
            padding: 30px;
            border-radius: 10px;
            margin-top: 30px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .form-group {
            margin-bottom: 20px;
            text-align: left;
          }
          .form-label {
            display: block;
            margin-bottom: 8px;
            color: #cbd5e1;
            font-weight: 600;
          }
          .form-input {
            width: 100%;
            padding: 12px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            font-size: 1rem;
          }
          .form-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
          }
          .btn {
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.3s, box-shadow 0.3s;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
          }
          .help-text {
            font-size: 0.875rem;
            color: #94a3b8;
            margin-top: 8px;
          }
          .instructions {
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: left;
          }
          .instructions h3 {
            color: #667eea;
            margin-bottom: 15px;
          }
          .instructions ol {
            margin-left: 20px;
            color: #cbd5e1;
          }
          .instructions li {
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Custom Values Manager</h1>
          <p class="subtitle">Manage custom values and fields for your location</p>
          
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
          
          <div class="auth-form">
            <h2>Connect Your Location</h2>
            <form action="/authenticate" method="POST">
              <div class="form-group">
                <label class="form-label" for="token">Private Integration Token</label>
                <input type="text" id="token" name="token" class="form-input" placeholder="Enter your Private Integration token" required>
                <div class="help-text">This token is specific to your location and provides all necessary access</div>
              </div>
              <button type="submit" class="btn">Connect to Location</button>
            </form>
          </div>
          
          <div class="instructions">
            <h3>How to get your Private Integration Token:</h3>
            <ol>
              <li>Log into your location</li>
              <li>Go to Settings → Integrations → Private Integration Apps</li>
              <li>Click "Create App"</li>
              <li>Name it "Custom Values Manager"</li>
              <li>Select these scopes: locations.readonly, locations/customValues.write, locations/customFields.write</li>
              <li>Copy the generated token and paste it above</li>
            </ol>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Authentication endpoint - extract locationId from token
app.post('/authenticate', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).send('Token is required');
  }
  
  try {
    // Make a test API call to get location info
    // The token itself contains the location context
    const response = await axios.get(`${config.apiDomain}/locations/search`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28'
      },
      params: {
        limit: 1
      }
    });
    
    // Get the location ID from the response
    const locationId = response.data.locations?.[0]?.id;
    
    if (!locationId) {
      // Try alternate endpoint to get location info
      const meResponse = await axios.get(`${config.apiDomain}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28'
        }
      });
      
      const extractedLocationId = meResponse.data.locationId || meResponse.data.companyId;
      
      if (!extractedLocationId) {
        throw new Error('Could not determine location ID from token');
      }
      
      // Store the token for this location
      tokenStore.set(extractedLocationId, token);
      
      // Redirect to dashboard
      res.redirect(`/dashboard?locationId=${extractedLocationId}`);
    } else {
      // Store the token for this location
      tokenStore.set(locationId, token);
      
      // Redirect to dashboard
      res.redirect(`/dashboard?locationId=${locationId}`);
    }
    
  } catch (error) {
    console.error('Authentication error:', error.response?.data || error.message);
    res.status(401).send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #0a0e27 0%, #1e293b 100%);
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .error-container {
              text-align: center;
              padding: 40px;
              background: rgba(239, 68, 68, 0.1);
              border-radius: 10px;
              border: 1px solid rgba(239, 68, 68, 0.3);
            }
            .btn {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background: #ef4444;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h2>Authentication Failed</h2>
            <p>Invalid token or insufficient permissions. Please check your token and try again.</p>
            <p style="font-size: 0.9em; margin-top: 10px;">Make sure you have the required scopes: locations.readonly, locations/customValues.write, locations/customFields.write</p>
            <a href="/" class="btn">Go Back</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Dashboard page
app.get('/dashboard', (req, res) => {
  const { locationId } = req.query;
  
  if (!locationId || !tokenStore.has(locationId)) {
    return res.redirect('/');
  }
  
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes - Updated to use Private Integration tokens

// Get custom values
app.get('/api/custom-values/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const token = tokenStore.get(locationId);
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const customValues = await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues`,
      'GET',
      token
    );
    res.json(customValues);
  } catch (error) {
    console.error('Error fetching custom values:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch custom values' 
    });
  }
});

// Create custom value
app.post('/api/custom-values/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const token = tokenStore.get(locationId);
  const customValueData = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues`,
      'POST',
      token,
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

// Update custom value
app.put('/api/custom-values/:locationId/:customValueId', async (req, res) => {
  const { locationId, customValueId } = req.params;
  const token = tokenStore.get(locationId);
  const updateData = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues/${customValueId}`,
      'PUT',
      token,
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

// Delete custom value
app.delete('/api/custom-values/:locationId/:customValueId', async (req, res) => {
  const { locationId, customValueId } = req.params;
  const token = tokenStore.get(locationId);
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    await makeAuthenticatedRequest(
      `/locations/${locationId}/customValues/${customValueId}`,
      'DELETE',
      token
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom value:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to delete custom value' 
    });
  }
});

// Get custom fields
app.get('/api/custom-fields/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const token = tokenStore.get(locationId);
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const customFields = await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields`,
      'GET',
      token
    );
    res.json(customFields);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch custom fields' 
    });
  }
});

// Create custom field
app.post('/api/custom-fields/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const token = tokenStore.get(locationId);
  const customFieldData = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields`,
      'POST',
      token,
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

// Update custom field
app.put('/api/custom-fields/:locationId/:customFieldId', async (req, res) => {
  const { locationId, customFieldId } = req.params;
  const token = tokenStore.get(locationId);
  const updateData = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields/${customFieldId}`,
      'PUT',
      token,
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

// Delete custom field
app.delete('/api/custom-fields/:locationId/:customFieldId', async (req, res) => {
  const { locationId, customFieldId } = req.params;
  const token = tokenStore.get(locationId);
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    await makeAuthenticatedRequest(
      `/locations/${locationId}/customFields/${customFieldId}`,
      'DELETE',
      token
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
  const token = tokenStore.get(locationId);
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const location = await makeAuthenticatedRequest(
      `/locations/${locationId}`,
      'GET',
      token
    );
    res.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message || 'Failed to fetch location details' 
    });
  }
});

// Logout endpoint
app.post('/api/logout/:locationId', (req, res) => {
  const { locationId } = req.params;
  tokenStore.delete(locationId);
  res.json({ success: true });
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
