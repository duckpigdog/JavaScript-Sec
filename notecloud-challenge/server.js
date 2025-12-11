/**
 * NoteCloud Server
 * Express.js backend with signature validation for the reverse engineering challenge
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration
const CONFIG = {
  sec: "SEC|v=3&salt=NC_V3_SALT&key=NC_K3Y_2025&mix=1&nonce=default",
  timeout: 300, // 5 minutes in seconds
  maxPage: 100
};

// Vendor crypto functions (same as frontend)
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Base64 variant encoding (same as frontend)
const BASE64_VARIANT_TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64VariantEncode(data) {
  let result = '';
  let i = 0;
  
  while (i < data.length) {
    const a = data[i++] || 0;
    const b = data[i++] || 0;
    const c = data[i++] || 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += BASE64_VARIANT_TABLE.charAt((bitmap >> 18) & 63);
    result += BASE64_VARIANT_TABLE.charAt((bitmap >> 12) & 63);
    result += BASE64_VARIANT_TABLE.charAt((bitmap >> 6) & 63);
    result += BASE64_VARIANT_TABLE.charAt(bitmap & 63);
  }
  
  // Handle padding
  const padLength = 3 - (data.length % 3);
  if (padLength !== 3) {
    result = result.slice(0, result.length - padLength);
    for (let i = 0; i < padLength; i++) {
      result += '=';
    }
  }
  
  return result;
}

// RC4-like stream cipher (same as frontend)
function rc4Encrypt(data, key) {
  // Key-scheduling algorithm (KSA)
  const S = [];
  for (let i = 0; i < 256; i++) {
    S[i] = i;
  }
  
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key.charCodeAt(i % key.length)) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  
  // Pseudo-random generation algorithm (PRGA)
  let i = 0;
  j = 0;
  const result = [];
  
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    const keystreamByte = S[(S[i] + S[j]) % 256];
    result.push(data.charCodeAt(k) ^ keystreamByte);
  }
  
  return result;
}

// Parse SEC configuration (same as frontend)
function parseSecConfig(secString) {
  const parts = secString.substring(4).split('&'); // Remove "SEC|" prefix
  const config = {};
  
  parts.forEach(part => {
    const [key, value] = part.split('=');
    config[key] = value;
  });
  
  return config;
}

// Three-layer signature validation (same as frontend)
function validateSignature(u, p, t, s) {
  try {
    // Check timestamp validity (5 minutes window)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - parseInt(t));
    if (timeDiff > CONFIG.timeout) {
      return { valid: false, reason: 'timestamp_expired' };
    }
    
    // Parse SEC configuration
    const secConfig = parseSecConfig(CONFIG.sec);
    
    // Construct raw string: u|p|t|ver|salt
    const rawString = [u, p, t, secConfig.v, secConfig.salt].join('|');
    
    // Layer 1: Structure rearrangement + Base64 variant
    const layer1 = layer1Encrypt(rawString, secConfig);
    
    // Layer 2: Stream encryption
    const layer2 = layer2Encrypt(layer1, secConfig);
    
    // Layer 3: HMAC + truncation + obfuscation
    const expectedSignature = layer3Encrypt(layer2, t, secConfig);
    
    // Convert to hex for comparison
    const hexSignature = [];
    for (let i = 0; i < expectedSignature.length; i++) {
      hexSignature.push(('0' + expectedSignature.charCodeAt(i).toString(16)).slice(-2));
    }
    const expectedHex = hexSignature.join('');
    
    // Compare signatures
    const valid = s === expectedHex;
    
    return {
      valid: valid,
      reason: valid ? 'valid' : 'invalid_signature'
    };
    
  } catch (error) {
    console.error('Signature validation error:', error);
    return { valid: false, reason: 'validation_error' };
  }
}

// Layer 1: Structure rearrangement + Base64 variant encoding
function layer1Encrypt(input, config) {
  const { salt, key } = config;
  
  // Step 1: Create base string with rearrangement
  const parts = input.split('|');
  // Rearrange parts: move salt to different position
  const rearranged = [parts[0], parts[2], parts[1], parts[3]].join('|');
  
  // Step 2: XOR with key
  const xored = [];
  for (let i = 0; i < rearranged.length; i++) {
    xored.push(rearranged.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  
  // Step 3: Base64 variant encoding
  return base64VariantEncode(xored);
}

// Layer 2: Custom stream encryption (RC4/TEA style)
function layer2Encrypt(input, config) {
  const { key } = config;
  
  // Use RC4-like encryption
  const encryptedBytes = rc4Encrypt(input, key);
  
  // Convert to hex string
  return encryptedBytes.map(b => ('0' + b.toString(16)).slice(-2)).join('');
}

// Layer 3: HMAC + truncation + obfuscation
function layer3Encrypt(input, timestamp, config) {
  const { key } = config;
  
  // Step 1: Create HMAC key using timestamp
  const hmacKey = md5(key + ':' + timestamp);
  
  // Step 2: Generate HMAC
  const hmacResult = crypto.createHmac('md5', hmacKey).update(input).digest('hex');
  
  // Step 3: Truncate to 16 characters from middle
  const startPos = Math.floor(hmacResult.length / 2) - 8;
  const truncated = hmacResult.substr(startPos, 16);
  
  // Step 4: Reverse and add timestamp-based transformation
  const reversed = truncated.split('').reverse().join('');
  
  // Step 5: Final transformation using timestamp
  const finalResult = [];
  for (let i = 0; i < reversed.length; i++) {
    const charCode = reversed.charCodeAt(i);
    const timestampDigit = parseInt(timestamp.toString()[i % timestamp.toString().length]);
    finalResult.push(String.fromCharCode((charCode + timestampDigit) % 256));
  }
  
  return finalResult.join('');
}

// Generate mock note data
function generateMockNotes(page = 1, count = 10) {
  const notes = [];
  const baseId = (page - 1) * count;
  
  for (let i = 0; i < count; i++) {
    const noteId = `note_${baseId + i + 1}`;
    const createdAt = Math.floor(Date.now() / 1000) - (Math.random() * 86400 * 30); // Random time within last 30 days
    const updatedAt = createdAt + Math.floor(Math.random() * 86400 * 7); // Updated within 7 days
    
    notes.push({
      id: noteId,
      title: `笔记标题 ${baseId + i + 1}`,
      content: `这是第 ${baseId + i + 1} 条笔记的内容。\n\nNoteCloud 采用先进的加密技术保护您的笔记安全。每条笔记都经过多重加密处理，确保数据在传输和存储过程中的安全性。\n\n本系统支持实时同步功能，您可以在任何设备上访问您的笔记。所有的同步操作都需要通过安全验证，包括时间戳检查和签名验证。\n\n如果您是逆向工程师，欢迎挑战我们的安全机制！`,
      created_at: createdAt,
      updated_at: updatedAt,
      user_id: "demo_user"
    });
  }
  
  return notes;
}

// API Routes

// Serve configuration
app.get('/config/notecloud_v3.json', (req, res) => {
  const config = {
    sec: CONFIG.sec,
    api: {
      base_url: "/api/v3",
      timeout: 30000,
      max_retries: 3
    },
    ui: {
      theme: "modern",
      animations: true,
      language: "zh-CN"
    },
    features: {
      sync: true,
      offline: false,
      sharing: true,
      encryption: "advanced"
    },
    limits: {
      max_notes: 1000,
      max_file_size: 10485760,
      sync_interval: 30000
    }
  };
  
  res.json(config);
});

// Main API endpoint - Note list with signature validation
app.get('/api/v3/note/list', (req, res) => {
  const { u, p, t, s } = req.query;
  
  // Validate required parameters
  if (!u || !p || !t || !s) {
    return res.status(400).json({
      code: 400,
      msg: 'Missing required parameters',
      data: null
    });
  }
  
  // Validate page parameter
  const page = parseInt(p);
  if (isNaN(page) || page < 1 || page > CONFIG.maxPage) {
    return res.status(400).json({
      code: 400,
      msg: 'Invalid page parameter',
      data: null
    });
  }
  
  // Validate signature
  const validation = validateSignature(u, p, t, s);
  
  if (!validation.valid) {
    console.log(`Signature validation failed for user ${u}: ${validation.reason}`);
    return res.status(401).json({
      code: 401,
      msg: 'Invalid signature',
      reason: validation.reason,
      data: null
    });
  }
  
  console.log(`Signature validation successful for user ${u}, page ${page}`);
  
  // Generate mock notes
  const notes = generateMockNotes(page, 10);
  
  res.json({
    code: 200,
    msg: 'success',
    data: notes,
    page: page,
    per_page: 10,
    total: 95, // Mock total count
    timestamp: Math.floor(Date.now() / 1000)
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Math.floor(Date.now() / 1000),
    version: '3.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    code: 500,
    msg: 'Internal server error',
    data: null
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    msg: 'Not found',
    data: null
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`📝 NoteCloud Server v3.0`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔒 Signature validation enabled with 3-layer encryption`);
  console.log(`⏰ Timestamp window: ${CONFIG.timeout} seconds`);
  console.log(`📊 Mock data generation active`);
});

module.exports = app;