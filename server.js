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

// Landing page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Custom Values Manager - Marketplace App</title>
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
          <p class="subtitle">Ef
