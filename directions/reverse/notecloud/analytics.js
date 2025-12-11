/**
 * NoteCloud Analytics Module
 * 分析和埋点模块
 */

(function() {
    'use strict';
    
    let analyticsData = {};
    let sessionStartTime = Date.now();
    
    // 从隐藏的 script 标签中读取分析数据
    function loadAnalyticsData() {
        try {
            const analyticsScript = document.getElementById('analytics-data');
            if (analyticsScript) {
                const dataContent = analyticsScript.textContent || analyticsScript.innerText;
                if (dataContent) {
                    // 使用原生 JSON.parse 解析
                    analyticsData = JSON.parse(dataContent);
                    console.log('分析数据加载成功');
                }
            }
        } catch (error) {
            console.log('分析数据加载失败，使用默认值');
            analyticsData = {
                tracking_id: 'nc_v3_default',
                session_duration: 0,
                page_views: 1,
                user_agent: navigator.userAgent || ''
            };
        }
    }
    
    // 生成会话ID
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 跟踪页面访问
    function trackPageView(pageName) {
        try {
            const trackData = {
                event: 'page_view',
                page: pageName,
                timestamp: Date.now(),
                session_id: generateSessionId(),
                tracking_id: analyticsData.tracking_id || 'nc_v3_default'
            };
            
            // 模拟发送分析数据
            console.log('页面访问跟踪:', JSON.stringify(trackData));
            
            // 这里可以发送到真实的分析服务
            // sendAnalyticsData(trackData);
        } catch (error) {
            console.log('页面访问跟踪失败:', error);
        }
    }
    
    // 跟踪用户操作
    function trackUserAction(action, data) {
        try {
            const actionData = {
                event: 'user_action',
                action: action,
                data: data,
                timestamp: Date.now(),
                session_duration: Date.now() - sessionStartTime,
                tracking_id: analyticsData.tracking_id || 'nc_v3_default'
            };
            
            console.log('用户操作跟踪:', JSON.stringify(actionData));
        } catch (error) {
            console.log('用户操作跟踪失败:', error);
        }
    }
    
    // 跟踪同步操作
    function trackSyncOperation(userId, page, success, responseTime) {
        try {
            const syncData = {
                event: 'sync_operation',
                user_id: userId,
                page: page,
                success: success,
                response_time: responseTime,
                timestamp: Date.now(),
                tracking_id: analyticsData.tracking_id || 'nc_v3_default'
            };
            
            console.log('同步操作跟踪:', JSON.stringify(syncData));
        } catch (error) {
            console.log('同步操作跟踪失败:', error);
        }
    }
    
    // 生成性能指标
    function generatePerformanceMetrics() {
        try {
            if (window.performance && window.performance.timing) {
                const timing = window.performance.timing;
                const metrics = {
                    load_time: timing.loadEventEnd - timing.navigationStart,
                    dom_ready: timing.domContentLoadedEventEnd - timing.navigationStart,
                    first_byte: timing.responseStart - timing.navigationStart,
                    timestamp: Date.now()
                };
                
                console.log('性能指标:', JSON.stringify(metrics));
                return metrics;
            }
        } catch (error) {
            console.log('性能指标生成失败:', error);
        }
        return null;
    }
    
    // 模拟发送分析数据
    function sendAnalyticsData(data) {
        // 这里可以实现真实的数据发送逻辑
        // 例如发送到 Google Analytics, Mixpanel 等
        console.log('发送分析数据:', data);
    }
    
    // 初始化分析模块
    function init() {
        loadAnalyticsData();
        
        // 跟踪页面访问
        trackPageView('notecloud_main');
        
        // 生成性能指标
        setTimeout(() => {
            generatePerformanceMetrics();
        }, 1000);
        
        console.log('NoteCloud 分析模块初始化完成');
    }
    
    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
        init();
    });
    
    // 额外的 JSON.parse 噪音 - 与签名无关
    (function() {
        const trackingConfigs = [
            '{"track_clicks": true, "track_scrolls": false, "track_time": 30000}',
            '{"events": ["click", "scroll", "resize"], "sampling": 0.1}',
            '{"providers": ["ga", "mixpanel"], "debug": false, "timeout": 5000}',
            '{"user_properties": {"plan": "free", "created": "2025-01-01"}}',
            '{"session_config": {"max_duration": 1800000, "idle_timeout": 300000}}'
        ];
        
        trackingConfigs.forEach((configStr, index) => {
            try {
                const parsed = JSON.parse(configStr);
                console.log(`跟踪配置 ${index + 1}:`, parsed);
            } catch (e) {
                console.log(`跟踪配置 ${index + 1} 解析失败`);
            }
        });
        
        // 模拟一些跟踪事件数据
        const eventData = [
            '{"event": "page_load", "timestamp": ' + Date.now() + '}',
            '{"event": "button_click", "element": "sync_btn", "timestamp": ' + Date.now() + '}',
            '{"event": "api_request", "endpoint": "notes", "timestamp": ' + Date.now() + '}',
            '{"event": "error", "type": "network", "timestamp": ' + Date.now() + '}',
            '{"event": "success", "operation": "sync", "timestamp": ' + Date.now() + '}'
        ];
        
        eventData.forEach((eventStr, index) => {
            try {
                const parsed = JSON.parse(eventStr);
                console.log(`事件数据 ${index + 1}:`, parsed);
            } catch (e) {
                console.log(`事件数据 ${index + 1} 解析失败`);
            }
        });
    })();
    
    // 导出分析模块
    window.Analytics = {
        trackPageView: trackPageView,
        trackUserAction: trackUserAction,
        trackSyncOperation: trackSyncOperation,
        generatePerformanceMetrics: generatePerformanceMetrics,
        getAnalyticsData: function() { return analyticsData; },
        init: init
    };
    
})();