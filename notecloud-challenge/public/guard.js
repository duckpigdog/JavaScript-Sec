/**
 * NoteCloud Security Guard
 * Core signature generation with three-layer encryption and custom JSON parser
 */

(function() {
  'use strict';
  
  // Custom JSON parser for SEC configuration - this is the key differentiator
  const JX = {
    parse: function(str) {
      // Check if this is a SEC-prefixed string
      if (str && str.startsWith('SEC|')) {
        // Parse SEC format: "SEC|v=3&salt=NC_V3_SALT&key=NC_K3Y_2025&mix=1"
        const content = str.substring(4); // Remove "SEC|" prefix
        const parts = content.split('&');
        const result = {};
        
        parts.forEach(part => {
          const [key, value] = part.split('=');
          result[key] = value;
        });
        
        return result;
      } else {
        // For non-SEC strings, fall back to native JSON.parse
        return JSON.parse(str);
      }
    }
  };
  
  // Additional fake JSON parsers to create confusion
  const JSONX = {
    parse: function(str) {
      // Fake parser that just calls native JSON.parse
      return JSON.parse(str);
    }
  };
  
  const JSONPlus = {
    parse: function(str) {
      // Another fake parser
      try {
        return JSON.parse(str);
      } catch (e) {
        return null;
      }
    }
  };
  
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
    return window.Vendor.base64VariantEncode(xored);
  }
  
  // Layer 2: Custom stream encryption (RC4/TEA style)
  function layer2Encrypt(input, config) {
    const { key } = config;
    
    // Use RC4-like encryption
    const encryptedBytes = window.Vendor.rc4Encrypt(input, key);
    
    // Convert to hex string
    return encryptedBytes.map(b => ('0' + b.toString(16)).slice(-2)).join('');
  }
  
  // Layer 3: HMAC + truncation + obfuscation
  function layer3Encrypt(input, timestamp, config) {
    const { key } = config;
    
    // Step 1: Create HMAC key using timestamp
    const hmacKey = window.Vendor.md5(key + ':' + timestamp);
    
    // Step 2: Generate HMAC
    const hmacResult = window.Vendor.hmac(input, hmacKey, window.Vendor.md5);
    
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
  
  // Main signature calculation function
  async function calc(u, p) {
    try {
      // Get current timestamp
      const t = Math.floor(Date.now() / 1000);
      
      // Get SEC configuration using custom JSON parser
      const configResponse = await fetch('/config/notecloud_v3.json');
      const configText = await configResponse.text();
      const fullConfig = JX.parse(configText); // This will fail - we need to parse the JSON first
      
      // Actually parse the JSON first, then extract SEC
      const jsonConfig = JSON.parse(configText);
      const secString = jsonConfig.sec;
      
      // Now use custom parser on the SEC string
      const secConfig = JX.parse(secString);
      
      // Construct raw string: u|p|t|ver|salt
      const rawString = [u, p, t, secConfig.v, secConfig.salt].join('|');
      
      // Layer 1: Structure rearrangement + Base64 variant
      const layer1 = layer1Encrypt(rawString, secConfig);
      
      // Layer 2: Stream encryption
      const layer2 = layer2Encrypt(layer1, secConfig);
      
      // Layer 3: HMAC + truncation + obfuscation
      const signature = layer3Encrypt(layer2, t, secConfig);
      
      // Convert to hex for URL safety
      const hexSignature = [];
      for (let i = 0; i < signature.length; i++) {
        hexSignature.push(('0' + signature.charCodeAt(i).toString(16)).slice(-2));
      }
      
      return {
        t: t,
        s: hexSignature.join('')
      };
      
    } catch (error) {
      console.error('Signature calculation failed:', error);
      throw error;
    }
  }
  
  // Additional JSON.parse noise - fake security configurations
  const fakeSecurity1 = JSON.parse('{"security": {"level": "high", "encryption": "AES-256"}}');
  const fakeSecurity2 = JSON.parse('{"keys": {"public": "rsa_public_key", "private": "rsa_private_key"}}');
  const fakeSecurity3 = JSON.parse('{"algorithms": {"preferred": ["ed25519", "ecdsa"], "deprecated": ["rsa", "dsa"]}}');
  
  // More JSON.parse noise - completely unrelated
  const noise1 = JSON.parse('{"guard": {"enabled": true, "mode": "strict"}}');
  const noise2 = JSON.parse('{"protection": {"csrf": true, "xss": true, "sql": false}}');
  const noise3 = JSON.parse('{"validation": {"required": true, "strict": false}}');
  
  // Export the main security object
  window.NCGuard = {
    calc: calc,
    // Expose fake parsers to create confusion
    parsers: {
      JX: JX,
      JSONX: JSONX,
      JSONPlus: JSONPlus
    }
  };
  
  // Even more JSON.parse noise after export
  const postExportNoise1 = JSON.parse('{"timestamp": ' + Date.now() + ', "action": "guard_loaded"}');
  const postExportNoise2 = JSON.parse('{"status": "ready", "version": "3.0", "build": "secure"}');
  const postExportNoise3 = JSON.parse('{"mode": "production", "debug": false, "verbose": false}');
  
})();