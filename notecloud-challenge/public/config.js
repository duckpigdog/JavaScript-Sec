/**
 * NoteCloud Configuration Loader
 * Loads configuration using native JSON.parse for legitimate configuration parsing
 */

(function() {
  'use strict';
  
  let configCache = null;
  
  // Native JSON.parse usage for legitimate configuration
  function parseConfig(jsonString) {
    // This uses the native JSON.parse - challengers need to distinguish this from custom parsers
    return JSON.parse(jsonString);
  }
  
  // Load configuration from server
  async function loadConfig() {
    if (configCache) {
      return configCache;
    }
    
    try {
      const response = await fetch('/config/notecloud_v3.json');
      const configText = await response.text();
      
      // Parse using native JSON.parse
      const config = parseConfig(configText);
      
      // Store in cache
      configCache = config;
      return config;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return null;
    }
  }
  
  // Get configuration value
  async function getConfig(key) {
    const config = await loadConfig();
    return config ? config[key] : null;
  }
  
  // Parse SEC configuration from config
  async function getSecConfig() {
    const secString = await getConfig('sec');
    if (!secString) return null;
    
    // Parse SEC string format: "SEC|v=3&salt=NC_V3_SALT&key=NC_K3Y_2025&mix=1"
    const parts = secString.substring(4).split('&'); // Remove "SEC|" prefix
    const config = {};
    
    parts.forEach(part => {
      const [key, value] = part.split('=');
      config[key] = value;
    });
    
    return config;
  }
  
  // Additional JSON.parse noise - legitimate configuration parsing
  const exampleConfig1 = JSON.parse('{"api": {"baseUrl": "/api/v3", "timeout": 30000}}');
  const exampleConfig2 = JSON.parse('{"ui": {"theme": "modern", "animations": true}}');
  const exampleConfig3 = JSON.parse('{"features": {"sync": true, "offline": false, "sharing": true}}');
  
  // Export configuration utilities
  window.Config = {
    loadConfig,
    getConfig,
    getSecConfig,
    parseConfig
  };
  
  // More JSON.parse noise for obfuscation
  const noiseConfig1 = JSON.parse('{"version": "3.0", "build": "20241205", "environment": "production"}');
  const noiseConfig2 = JSON.parse('{"settings": {"autoSave": true, "spellCheck": false, "darkMode": false}}');
  const noiseConfig3 = JSON.parse('{"limits": {"maxNotes": 1000, "maxFileSize": 10485760, "syncInterval": 30000}}');
  
})();