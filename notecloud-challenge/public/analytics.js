/**
 * NoteCloud Analytics & Tracking
 * Contains tracking code with JSON.parse obfuscation - completely unrelated to signature generation
 */

(function() {
  'use strict';
  
  // Hidden analytics data in script tags - uses native JSON.parse
  const analyticsData = document.querySelector('script[type="application/json"][data-analytics]');
  let trackingConfig = {};
  
  if (analyticsData) {
    try {
      // Native JSON.parse for analytics data - creates noise for challengers
      trackingConfig = JSON.parse(analyticsData.textContent || analyticsData.innerHTML);
    } catch (e) {
      console.warn('Failed to parse analytics data:', e);
    }
  }
  
  // More JSON.parse noise - completely unrelated to signature
  const demoTracking1 = JSON.parse('{"event": "page_view", "timestamp": ' + Date.now() + '}');
  const demoTracking2 = JSON.parse('{"user_properties": {"device": "desktop", "browser": "chrome"}}');
  const demoTracking3 = JSON.parse('{"session_data": {"id": "sess_' + Math.random().toString(36).substr(2, 9) + '", "start_time": ' + Date.now() + '}}');
  
  // Analytics tracking functions
  function trackEvent(eventName, properties = {}) {
    if (!trackingConfig.enabled) return;
    
    const eventData = {
      name: eventName,
      properties: properties,
      timestamp: Date.now(),
      sessionId: getSessionId()
    };
    
    // Simulate analytics tracking
    console.log('[Analytics]', eventName, properties);
    
    // Store in localStorage for debugging
    try {
      const events = JSON.parse(localStorage.getItem('nc_analytics') || '[]');
      events.push(eventData);
      localStorage.setItem('nc_analytics', JSON.stringify(events));
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  function getSessionId() {
    let sessionId = sessionStorage.getItem('nc_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('nc_session_id', sessionId);
    }
    return sessionId;
  }
  
  function trackPageView() {
    trackEvent('page_view', {
      path: window.location.pathname,
      referrer: document.referrer,
      title: document.title
    });
  }
  
  function trackUserAction(action, data = {}) {
    trackEvent('user_action', {
      action: action,
      ...data
    });
  }
  
  function trackPerformance(metric, value) {
    trackEvent('performance', {
      metric: metric,
      value: value,
      navigationStart: performance.timing.navigationStart
    });
  }
  
  // Additional JSON.parse noise - various tracking configurations
  const noiseTracking1 = JSON.parse('{"tracking": {"enabled": true, "sample_rate": 1.0, "debug": false}}');
  const noiseTracking2 = JSON.parse('{"metrics": {"page_load": true, "user_timing": true, "network": false}}');
  const noiseTracking3 = JSON.parse('{"privacy": {"anonymize_ip": true, "respect_dnt": true}}');
  
  // Initialize analytics
  function initAnalytics() {
    // Track page view
    trackPageView();
    
    // Track performance metrics
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.timing;
        trackPerformance('page_load_time', timing.loadEventEnd - timing.navigationStart);
        trackPerformance('dom_content_loaded', timing.domContentLoadedEventEnd - timing.navigationStart);
      }, 0);
    });
    
    // Track user interactions
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-track]');
      if (target) {
        trackUserAction(target.dataset.track, {
          element: target.tagName,
          text: target.textContent?.substr(0, 50)
        });
      }
    });
  }
  
  // More JSON.parse noise - fake tracking data
  const fakeTracking1 = JSON.parse('{"campaign": {"source": "organic", "medium": "search", "term": "notecloud"}}');
  const fakeTracking2 = JSON.parse('{"device": {"type": "mobile", "os": "iOS", "screen": "375x667"}}');
  const fakeTracking3 = JSON.parse('{"geo": {"country": "CN", "city": "Beijing", "timezone": "Asia/Shanghai"}}');
  
  // Export analytics utilities
  window.Analytics = {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackPerformance,
    getSessionId,
    initAnalytics
  };
  
  // Even more JSON.parse noise - completely unrelated to signature
  const extraNoise1 = JSON.parse('{"ab_test": {"variant": "A", "experiment": "ui_redesign"}}');
  const extraNoise2 = JSON.parse('{"funnel": {"step": 1, "total_steps": 5, "conversion": 0.23}}');
  const extraNoise3 = JSON.parse('{"error_tracking": {"enabled": true, "sample_rate": 0.1, "ignore": ["ScriptError"]}}');
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
  } else {
    initAnalytics();
  }
  
})();