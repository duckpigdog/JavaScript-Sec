/**
 * NoteCloud Configuration Module
 * 配置加载和管理
 */

(function() {
    'use strict';
    
    let configData = null;
    let secConfig = null;
    
    // 使用原生 JSON.parse 解析配置
    function parseConfig(jsonString) {
        try {
            // 使用原生 JSON.parse
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('配置解析失败:', error);
            return null;
        }
    }
    
    // 加载配置文件
    async function loadConfig() {
        try {
            const response = await fetch('/config/notecloud_v3.json');
            if (!response.ok) {
                throw new Error('配置加载失败');
            }
            
            const configText = await response.text();
            
            // 使用原生 JSON.parse 解析配置
            const parsed = parseConfig(configText);
            if (!parsed) {
                throw new Error('配置解析失败');
            }
            
            configData = parsed;
            
            // 提取 SEC 配置
            if (parsed.sec && typeof parsed.sec === 'string') {
                secConfig = parsed.sec;
            }
            
            console.log('配置加载成功');
            return true;
        } catch (error) {
            console.error('配置加载失败:', error);
            return false;
        }
    }
    
    // 获取配置数据
    function getConfig() {
        return configData;
    }
    
    // 获取 SEC 配置字符串
    function getSecConfig() {
        return secConfig;
    }
    
    // 获取特定配置项
    function getConfigItem(key, defaultValue = null) {
        if (!configData) return defaultValue;
        return configData[key] !== undefined ? configData[key] : defaultValue;
    }
    
    // 初始化配置
    async function init() {
        const success = await loadConfig();
        if (success) {
            console.log('NoteCloud 配置初始化完成');
        }
        return success;
    }
    
    // 页面加载时初始化配置
    document.addEventListener('DOMContentLoaded', async function() {
        await init();
    });
    
    // 导出配置管理器
    window.ConfigManager = {
        loadConfig: loadConfig,
        getConfig: getConfig,
        getSecConfig: getSecConfig,
        getConfigItem: getConfigItem,
        init: init
    };
    
    // 额外的 JSON.parse 使用示例（与签名无关）
    (function() {
        const exampleConfigs = [
            '{"theme": "light", "fontSize": 14, "language": "zh-CN"}',
            '{"sync": {"interval": 30000, "auto": true}, "cache": {"size": 100}}',
            '{"ui": {"animations": true, "darkMode": false}, "features": {"search": true}}'
        ];
        
        exampleConfigs.forEach((configStr, index) => {
            try {
                const parsed = JSON.parse(configStr);
                console.log(`配置示例 ${index + 1}:`, parsed);
            } catch (e) {
                console.log(`配置示例 ${index + 1} 解析失败`);
            }
        });
    })();
    
})();