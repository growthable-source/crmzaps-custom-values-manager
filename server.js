const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const GHL_API = 'https://services.leadconnectorhq.com';

// Middleware to verify Supabase auth token
async function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
}

// Serve login page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Custom Values Manager</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0e27 0%, #1e293b 100%);
            color: #e2e8f0;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            max-width: 400px;
            width: 100%;
            padding: 20px;
        }
        .card {
            background: rgba(255, 255, 255, 0.05);
            padding: 40px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        h1 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        input {
            width: 100%;
            padding: 12px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            font-size: 1rem;
        }
        button {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 10px;
        }
        button:hover {
            opacity: 0.9;
        }
        .toggle-link {
            text-align: center;
            margin-top: 20px;
            color: #94a3b8;
        }
        .toggle-link a {
            color: #667eea;
            text-decoration: none;
        }
        .error {
            color: #ef4444;
            margin-top: 10px;
            display: none;
        }
        .success {
            color: #10b981;
            margin-top: 10px;
            display: none;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1 id="formTitle">Login</h1>
            
            <form id="authForm">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="email" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" required>
                </div>
                <button type="submit" id="submitBtn">Login</button>
            </form>
            
            <div class="toggle-link">
                <span id="toggleText">Don't have an account?</span>
                <a href="#" onclick="toggleForm()">Sign Up</a>
            </div>
            
            <div id="error" class="error"></div>
            <div id="success" class="success"></div>
        </div>
    </div>
    
    <script>
        // Initialize Supabase client
        const { createClient } = supabase;
        const supabaseClient = createClient(
            '${process.env.SUPABASE_URL}',
            '${process.env.SUPABASE_ANON_KEY}'
        );
        
        let isLogin = true;
        
        function toggleForm() {
            isLogin = !isLogin;
            document.getElementById('formTitle').textContent = isLogin ? 'Login' : 'Sign Up';
            document.getElementById('submitBtn').textContent = isLogin ? 'Login' : 'Sign Up';
            document.getElementById('toggleText').textContent = isLogin ? "Don't have an account?" : "Already have an account?";
            document.querySelector('.toggle-link a').textContent = isLogin ? 'Sign Up' : 'Login';
        }
        
        document.getElementById('authForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            const successDiv = document.getElementById('success');
            
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            
            try {
                if (isLogin) {
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email,
                        password
                    });
                    
                    if (error) throw error;
                    
                    // Store the session token
                    localStorage.setItem('supabase.auth.token', data.session.access_token);
                    window.location.href = '/dashboard.html';
                } else {
                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password
                    });
                    
                    if (error) throw error;
                    
                    successDiv.textContent = 'Account created! Please check your email to verify, then login.';
                    successDiv.style.display = 'block';
                    toggleForm();
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            }
        });
    </script>
</body>
</html>
  `);
});

// Get user's locations
app.get('/api/locations', authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: 'Failed to fetch locations' });
  }
  
  res.json({ locations: data || [] });
});

// Add a new location
app.post('/api/locations', authenticateUser, async (req, res) => {
  const { token, locationId } = req.body;
  
  if (!token || !locationId) {
    return res.status(400).json({ error: 'Token and Location ID required' });
  }
  
  try {
    // Test that the token works by trying to fetch custom values
    const response = await axios.get(
      `${GHL_API}/locations/${locationId}/customValues`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28'
        }
      }
    );
    
    // If we get here, the token is valid for this location
    // Store in Supabase
    const { data, error } = await supabase
      .from('locations')
      .upsert({
        user_id: req.user.id,
        location_id: locationId,
        location_name: locationId, // We'll update this if we can get the name
        token: token
      }, {
        onConflict: 'user_id,location_id'
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to save location' });
    }
    
    res.json({ success: true, location: data });
    
  } catch (error) {
    console.error('Token validation error:', error.message);
    res.status(400).json({ error: 'Invalid token or Location ID. Please check both values.' });
  }
});

// Delete a location
app.delete('/api/locations/:id', authenticateUser, async (req, res) => {
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  
  if (error) {
    return res.status(500).json({ error: 'Failed to delete location' });
  }
  
  res.json({ success: true });
});

// Get custom values for a location
app.get('/api/locations/:locationId/customValues', authenticateUser, async (req, res) => {
  // Get the token for this location
  const { data: location, error } = await supabase
    .from('locations')
    .select('token')
    .eq('location_id', req.params.locationId)
    .eq('user_id', req.user.id)
    .single();
  
  if (error || !location) {
    return res.status(404).json({ error: 'Location not found' });
  }
  
  try {
    const response = await axios.get(
      `${GHL_API}/locations/${req.params.locationId}/customValues`,
      {
        headers: {
          'Authorization': `Bearer ${location.token}`,
          'Version': '2021-07-28'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom values' });
  }
});

// Create custom value
app.post('/api/locations/:locationId/customValues', authenticateUser, async (req, res) => {
  const { data: location, error } = await supabase
    .from('locations')
    .select('token')
    .eq('location_id', req.params.locationId)
    .eq('user_id', req.user.id)
    .single();
  
  if (error || !location) {
    return res.status(404).json({ error: 'Location not found' });
  }
  
  try {
    const response = await axios.post(
      `${GHL_API}/locations/${req.params.locationId}/customValues`,
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${location.token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create custom value' });
  }
});

// Update custom value
app.put('/api/locations/:locationId/customValues/:valueId', authenticateUser, async (req, res) => {
  const { data: location, error } = await supabase
    .from('locations')
    .select('token')
    .eq('location_id', req.params.locationId)
    .eq('user_id', req.user.id)
    .single();
  
  if (error || !location) {
    return res.status(404).json({ error: 'Location not found' });
  }
  
  try {
    const response = await axios.put(
      `${GHL_API}/locations/${req.params.locationId}/customValues/${req.params.valueId}`,
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${location.token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update custom value' });
  }
});

// Delete custom value
app.delete('/api/locations/:locationId/customValues/:valueId', authenticateUser, async (req, res) => {
  const { data: location, error } = await supabase
    .from('locations')
    .select('token')
    .eq('location_id', req.params.locationId)
    .eq('user_id', req.user.id)
    .single();
  
  if (error || !location) {
    return res.status(404).json({ error: 'Location not found' });
  }
  
  try {
    await axios.delete(
      `${GHL_API}/locations/${req.params.locationId}/customValues/${req.params.valueId}`,
      {
        headers: {
          'Authorization': `Bearer ${location.token}`,
          'Version': '2021-07-28'
        }
      }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete custom value' });
  }
});

// Custom fields endpoints
app.get('/api/locations/:locationId/customFields', authenticateUser, async (req, res) => {
  const { data: location, error } = await supabase
    .from('locations')
    .select('token')
    .eq('location_id', req.params.locationId)
    .eq('user_id', req.user.id)
    .single();
  
  if (error || !location) {
    return res.status(404).json({ error: 'Location not found' });
  }
  
  try {
    const response = await axios.get(
      `${GHL_API}/locations/${req.params.locationId}/customFields`,
      {
        headers: {
          'Authorization': `Bearer ${location.token}`,
          'Version': '2021-07-28'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom fields' });
  }
});

app.post('/api/locations/:locationId/customFields', authenticateUser, async (req, res) => {
  const { data: location, error } = await supabase
    .from('locations')
    .select('token')
    .eq('location_id', req.params.locationId)
    .eq('user_id', req.user.id)
    .single();
  
  if (error || !location) {
    return res.status(404).json({ error: 'Location not found' });
  }
  
  try {
    const response = await axios.post(
      `${GHL_API}/locations/${req.params.locationId}/customFields`,
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${location.token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create custom field' });
  }
});

app.delete('/api/locations/:locationId/customFields/:fieldId', authenticateUser, async (req, res) => {
  const { data: location, error } = await supabase
    .from('locations')
    .select('token')
    .eq('location_id', req.params.locationId)
    .eq('user_id', req.user.id)
    .single();
  
  if (error || !location) {
    return res.status(404).json({ error: 'Location not found' });
  }
  
  try {
    await axios.delete(
      `${GHL_API}/locations/${req.params.locationId}/customFields/${req.params.fieldId}`,
      {
        headers: {
          'Authorization': `Bearer ${location.token}`,
          'Version': '2021-07-28'
        }
      }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete custom field' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
