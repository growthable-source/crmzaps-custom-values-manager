const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path'); 
const cron = require('node-cron');
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

// FIXED PROFILE ENDPOINTS - Use authenticated Supabase client
// Replace the profile endpoints in your server.js with these

app.get('/api/profile', authenticateUser, async (req, res) => {
  try {
    // Create authenticated client for this user
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: req.headers.authorization
          }
        }
      }
    );
    
    const { data, error } = await userSupabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Profile fetch error:', error);
      return res.status(500).json({ error: 'Database error: ' + error.message });
    }
    
    res.json(data || { preferred_llm: 'openai' });
  } catch (error) {
    console.error('Profile endpoint error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.post('/api/profile', authenticateUser, async (req, res) => {
  try {
    const { preferred_llm, openai_api_key, claude_api_key } = req.body;
    
    // Create authenticated client for this user
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: req.headers.authorization
          }
        }
      }
    );
    
    const { data, error } = await userSupabase
      .from('user_profiles')
      .upsert({
        user_id: req.user.id,
        preferred_llm: preferred_llm || 'openai',
        openai_api_key: openai_api_key || null,
        claude_api_key: claude_api_key || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Profile save error:', error);
      return res.status(500).json({ error: 'Failed to save profile: ' + error.message });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Profile save exception:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Serve login page (same as before)
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>AI-Powered Custom Values Manager</title>
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
            <h1 id="formTitle">AI-Powered Manager</h1>
            
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
            document.getElementById('formTitle').textContent = isLogin ? 'AI-Powered Manager' : 'Create Account';
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
                    
                    localStorage.setItem('supabase.auth.token', data.session.access_token);
                    window.location.href = '/dashboard.html';
                } else {
                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password
                    });
                    
                    if (error) throw error;
                    
                    successDiv.textContent = 'Account created! Check email to verify, then login.';
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

// NEW: Profile management endpoints
app.get('/api/profile', authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Not found is ok
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
  
  res.json(data || {});
});

app.post('/api/profile', authenticateUser, async (req, res) => {
  const { preferred_llm, openai_api_key, claude_api_key } = req.body;
  
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: req.user.id,
      preferred_llm,
      openai_api_key,
      claude_api_key,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: 'Failed to save profile' });
  }
  
  res.json(data);
});

// NEW: AI integration endpoints
app.post('/api/ai/test-prompt', authenticateUser, async (req, res) => {
  const { prompt, location_id } = req.body;
  
  try {
    const result = await generateWithAI(req.user.id, prompt, location_id);
    res.json({ generated_text: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/generate-value', authenticateUser, async (req, res) => {
  const { name, prompt, location_id } = req.body;
  
  try {
    // Generate the value with AI
    const generatedValue = await generateWithAI(req.user.id, prompt, location_id);
    
    // Get location token
    const { data: location } = await supabase
      .from('locations')
      .select('token')
      .eq('location_id', location_id)
      .eq('user_id', req.user.id)
      .single();
    
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Create custom value in GHL
    const response = await axios.post(
      `${GHL_API}/locations/${location_id}/customValues`,
      { name, value: generatedValue },
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
    res.status(500).json({ error: error.message });
  }
});

// NEW: Scheduling endpoints
app.post('/api/schedule/create', authenticateUser, async (req, res) => {
  const { location_id, custom_value_id, custom_value_name, prompt_template, schedule_type, schedule_time } = req.body;
  
  // Calculate next run time
  const nextRun = calculateNextRun(schedule_type, schedule_time);
  
  const { data, error } = await supabase
    .from('scheduled_prompts')
    .insert({
      user_id: req.user.id,
      location_id,
      custom_value_id,
      custom_value_name,
      prompt_template,
      schedule_type,
      schedule_time,
      next_run_at: nextRun.toISOString()
    })
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: 'Failed to create schedule' });
  }
  
  res.json(data);
});

app.get('/api/schedule/list/:locationId', authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from('scheduled_prompts')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('location_id', req.params.locationId)
    .order('created_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: 'Failed to fetch schedules' });
  }
  
  res.json({ schedules: data || [] });
});

app.put('/api/schedule/:scheduleId/toggle', authenticateUser, async (req, res) => {
  const { is_active } = req.body;
  
  const { error } = await supabase
    .from('scheduled_prompts')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', req.params.scheduleId)
    .eq('user_id', req.user.id);
  
  if (error) {
    return res.status(500).json({ error: 'Failed to update schedule' });
  }
  
  res.json({ success: true });
});

app.delete('/api/schedule/:scheduleId', authenticateUser, async (req, res) => {
  const { error } = await supabase
    .from('scheduled_prompts')
    .delete()
    .eq('id', req.params.scheduleId)
    .eq('user_id', req.user.id);
  
  if (error) {
    return res.status(500).json({ error: 'Failed to delete schedule' });
  }
  
  res.json({ success: true });
});

// NEW: AI helper functions
async function generateWithAI(userId, prompt, locationId) {
  // Get user profile for API keys
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (!profile) {
    throw new Error('No AI API keys configured. Please add them in Settings.');
  }
  
  // Replace variables in prompt
  const processedPrompt = await replaceVariables(prompt, userId, locationId);
  
  // Generate with preferred AI
  if (profile.preferred_llm === 'claude' && profile.claude_api_key) {
    return await generateWithClaude(profile.claude_api_key, processedPrompt);
  } else if (profile.openai_api_key) {
    return await generateWithOpenAI(profile.openai_api_key, processedPrompt);
  } else {
    throw new Error('No API keys configured for your preferred AI provider');
  }
}

async function generateWithOpenAI(apiKey, prompt) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates professional content for businesses. Keep responses concise and relevant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    throw new Error('OpenAI API error: ' + error.message);
  }
}

async function generateWithClaude(apiKey, prompt) {
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      messages: [
        { role: 'user', content: prompt }
      ]
    }, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });
    
    return response.data.content[0].text.trim();
  } catch (error) {
    throw new Error('Claude API error: ' + error.message);
  }
}

async function replaceVariables(prompt, userId, locationId) {
  // Get all custom values for this location
  const { data: location } = await supabase
    .from('locations')
    .select('token')
    .eq('location_id', locationId)
    .eq('user_id', userId)
    .single();
  
  if (!location) return prompt;
  
  try {
    const response = await axios.get(
      `${GHL_API}/locations/${locationId}/customValues`,
      {
        headers: {
          'Authorization': `Bearer ${location.token}`,
          'Version': '2021-07-28'
        }
      }
    );
    
    const customValues = response.data.customValues || [];
    let processedPrompt = prompt;
    
    // Replace {variable_name} with actual values
    customValues.forEach(cv => {
      const variablePattern = new RegExp(`\\{${cv.name}\\}`, 'g');
      processedPrompt = processedPrompt.replace(variablePattern, cv.value || '');
    });
    
    return processedPrompt;
  } catch (error) {
    console.error('Error replacing variables:', error);
    return prompt; // Return original if replacement fails
  }
}

function calculateNextRun(scheduleType, scheduleTime) {
  const now = new Date();
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  
  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);
  
  switch (scheduleType) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case 'weekly':
      // Set to next Monday
      const daysUntilMonday = (8 - nextRun.getDay()) % 7 || 7;
      nextRun.setDate(nextRun.getDate() + daysUntilMonday);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
      break;
    case 'monthly':
      // Set to 1st of next month
      nextRun.setDate(1);
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
  }
  
  return nextRun;
}

// NEW: Cron job for running scheduled prompts
cron.schedule('*/5 * * * *', async () => { // Check every 5 minutes
  console.log('Checking for scheduled prompts to run...');
  
  try {
    const { data: schedules } = await supabase
      .from('scheduled_prompts')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', new Date().toISOString());
    
    for (const schedule of schedules || []) {
      try {
        console.log(`Running scheduled prompt for ${schedule.custom_value_name}`);
        
        // Generate new value
        const generatedValue = await generateWithAI(
          schedule.user_id, 
          schedule.prompt_template, 
          schedule.location_id
        );
        
        // Get location token
        const { data: location } = await supabase
          .from('locations')
          .select('token')
          .eq('location_id', schedule.location_id)
          .eq('user_id', schedule.user_id)
          .single();
        
        if (location) {
          // Update custom value in GHL
          await axios.put(
            `${GHL_API}/locations/${schedule.location_id}/customValues/${schedule.custom_value_id}`,
            { name: schedule.custom_value_name, value: generatedValue },
            {
              headers: {
                'Authorization': `Bearer ${location.token}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
              }
            }
          );
          
          // Update schedule for next run
          const nextRun = calculateNextRun(schedule.schedule_type, schedule.schedule_time);
          await supabase
            .from('scheduled_prompts')
            .update({
              last_run_at: new Date().toISOString(),
              next_run_at: nextRun.toISOString()
            })
            .eq('id', schedule.id);
          
          console.log(`Successfully updated ${schedule.custom_value_name}`);
        }
      } catch (error) {
        console.error(`Failed to run scheduled prompt ${schedule.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

// Existing endpoints (locations, custom values, wizards, etc.)
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

app.post('/api/locations', authenticateUser, async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }
  
  try {
    const locationResponse = await axios.get(
      `${GHL_API}/oauth/locationInfo`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28'
        }
      }
    );
    
    const locationId = locationResponse.data.locationId;
    const locationName = locationResponse.data.name || locationId;
    
    const { data, error } = await supabase
      .from('locations')
      .upsert({
        user_id: req.user.id,
        location_id: locationId,
        location_name: locationName,
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
    res.status(400).json({ error: 'Invalid Private Integration token' });
  }
});

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

app.get('/api/locations/:locationId/customValues', authenticateUser, async (req, res) => {
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

// Wizard endpoints
app.get('/api/locations/:locationId/wizards', authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from('wizard_templates')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('location_id', req.params.locationId)
    .order('created_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: 'Failed to fetch wizards' });
  }
  
  res.json({ wizards: data || [] });
});

app.post('/api/locations/:locationId/wizards', authenticateUser, async (req, res) => {
  const { name, description, fields, branding, settings } = req.body;
  
  const { data, error } = await supabase
    .from('wizard_templates')
    .insert({
      user_id: req.user.id,
      location_id: req.params.locationId,
      name,
      description,
      fields: fields || [],
      branding: branding || {},
      settings: settings || {}
    })
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: 'Failed to create wizard' });
  }
  
  res.json(data);
});

app.put('/api/wizards/:wizardId', authenticateUser, async (req, res) => {
  const { name, description, fields, branding, settings } = req.body;
  
  const { data, error } = await supabase
    .from('wizard_templates')
    .update({
      name,
      description,
      fields,
      branding,
      settings,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.wizardId)
    .eq('user_id', req.user.id)
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: 'Failed to update wizard' });
  }
  
  res.json(data);
});

app.delete('/api/wizards/:wizardId', authenticateUser, async (req, res) => {
  const { error } = await supabase
    .from('wizard_templates')
    .delete()
    .eq('id', req.params.wizardId)
    .eq('user_id', req.user.id);
  
  if (error) {
    return res.status(500).json({ error: 'Failed to delete wizard' });
  }
  
  res.json({ success: true });
});

app.post('/api/wizards/:wizardId/sessions', authenticateUser, async (req, res) => {
  const { client_email, client_name, expires_in_days } = req.body;
  
  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + (expires_in_days || 7));
  
  const { data, error } = await supabase
    .from('wizard_sessions')
    .insert({
      template_id: req.params.wizardId,
      client_email,
      client_name,
      expires_at: expires_at.toISOString()
    })
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: 'Failed to create session' });
  }
  
  const clientLink = `${req.protocol}://${req.get('host')}/wizard/${data.access_token}`;
  res.json({ ...data, client_link: clientLink });
});

app.get('/api/wizards/:wizardId/sessions', authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from('wizard_sessions')
    .select('*')
    .eq('template_id', req.params.wizardId)
    .order('created_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
  
  res.json({ sessions: data || [] });
});

// Client-facing endpoints
app.get('/api/client/wizard/:accessToken', async (req, res) => {
  const { data: session, error: sessionError } = await supabase
    .from('wizard_sessions')
    .select('*, wizard_templates!inner(*)')
    .eq('access_token', req.params.accessToken)
    .single();
  
  if (sessionError || !session) {
    return res.status(404).json({ error: 'Invalid or expired wizard link' });
  }
  
  if (new Date(session.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This wizard has expired' });
  }
  
  res.json(session);
});

// ENHANCED: Submit wizard responses - handles both new and existing custom values
app.post('/api/client/wizard/:accessToken/submit', async (req, res) => {
  const { responses } = req.body;
  
  const { data: session, error: sessionError } = await supabase
    .from('wizard_sessions')
    .select('*, wizard_templates!inner(*)')
    .eq('access_token', req.params.accessToken)
    .single();
  
  if (sessionError || !session) {
    return res.status(404).json({ error: 'Invalid session' });
  }
  
  const { error: updateError } = await supabase
    .from('wizard_sessions')
    .update({
      responses,
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress: 100
    })
    .eq('id', session.id);
  
  if (updateError) {
    return res.status(500).json({ error: 'Failed to save responses' });
  }
  
  const { data: location } = await supabase
    .from('locations')
    .select('token')
    .eq('location_id', session.wizard_templates.location_id)
    .eq('user_id', session.wizard_templates.user_id)
    .single();
  
  if (location && location.token) {
    for (const field of session.wizard_templates.fields) {
      if (responses[field.id]) {
        try {
          if (field.customValueMode === 'existing' && field.existing_custom_value_id) {
            // Update existing custom value
            await axios.put(
              `${GHL_API}/locations/${session.wizard_templates.location_id}/customValues/${field.existing_custom_value_id}`,
              { 
                name: field.existing_custom_value_name, 
                value: responses[field.id] 
              },
              {
                headers: {
                  'Authorization': `Bearer ${location.token}`,
                  'Version': '2021-07-28',
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log(`Updated existing custom value: ${field.existing_custom_value_name}`);
            
          } else if (field.customValueMode === 'create' && field.ghl_field) {
            // Check if custom value exists
            const existingValues = await axios.get(
              `${GHL_API}/locations/${session.wizard_templates.location_id}/customValues`,
              {
                headers: {
                  'Authorization': `Bearer ${location.token}`,
                  'Version': '2021-07-28'
                }
              }
            );
            
            const existing = existingValues.data.customValues?.find(v => v.name === field.ghl_field);
            
            if (existing) {
              await axios.put(
                `${GHL_API}/locations/${session.wizard_templates.location_id}/customValues/${existing.id}`,
                { name: field.ghl_field, value: responses[field.id] },
                {
                  headers: {
                    'Authorization': `Bearer ${location.token}`,
                    'Version': '2021-07-28',
                    'Content-Type': 'application/json'
                  }
                }
              );
            } else {
              await axios.post(
                `${GHL_API}/locations/${session.wizard_templates.location_id}/customValues`,
                { name: field.ghl_field, value: responses[field.id] },
                {
                  headers: {
                    'Authorization': `Bearer ${location.token}`,
                    'Version': '2021-07-28',
                    'Content-Type': 'application/json'
                  }
                }
              );
            }
          }
        } catch (ghlError) {
          console.error(`Failed to save custom value for field ${field.id}:`, ghlError.message);
        }
      }
    }
  }
  
  res.json({ success: true, message: 'Wizard completed successfully' });
});

app.get('/wizard/:accessToken', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'wizard-client.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`AI-Powered Custom Values Manager running on port ${PORT}`);
});
