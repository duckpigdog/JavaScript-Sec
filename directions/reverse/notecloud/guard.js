/**
 * NoteCloud Security Guard Module
 * 核心签名和加密逻辑
 */

(function() {
    'use strict';
    
    // 自定义 JSON 解析器 - 专门处理 SEC| 前缀的字符串
    const JX = {
        parse: function(str) {
            if (typeof str !== 'string') {
                throw new Error('Invalid input type');
            }
            
            // 如果是 SEC| 前缀的字符串，使用自定义解析
            if (str.startsWith('SEC|')) {
                return parseSecConfig(str);
            }
            
            // 否则使用原生 JSON.parse
            return JSON.parse(str);
        }
    };
    
    // 解析 SEC 配置
    function parseSecConfig(secStr) {
        try {
            // 移除 SEC| 前缀
            const configPart = secStr.substring(4);
            
            // 解析键值对
            const config = {};
            const pairs = configPart.split('&');
            
            pairs.forEach(pair => {
                const [key, value] = pair.split('=');
                if (key && value) {
                    config[key] = value;
                }
            });
            
            // 验证必需的字段
            if (!config.v || !config.salt || !config.key) {
                throw new Error('Invalid SEC configuration');
            }
            
            return {
                version: config.v,
                salt_v3: config.salt,
                key_v3: config.key,
                mix: config.mix || '1',
                nonce_rules: config.nonce || 'default'
            };
        } catch (error) {
            throw new Error('SEC configuration parsing failed: ' + error.message);
        }
    }
    
    // 第一层：结构重排 + Base64 变种编码
    function layer1StructureRearrange(input, salt, version) {
        // 构建原始字符串
        const raw = input + '|' + salt + '|' + version;
        
        // 按 | 分割并重排
        const parts = raw.split('|');
        
        // 重排算法：交换位置
        if (parts.length >= 4) {
            // 交换第1和第3个位置
            const temp = parts[0];
            parts[0] = parts[2];
            parts[2] = temp;
            
            // 交换第2和第4个位置
            const temp2 = parts[1];
            parts[1] = parts[3];
            parts[3] = temp2;
        }
        
        const rearranged = parts.join('|');
        
        // 使用自定义 Base64 编码
        const encoded = Vendor.customBase64Encode(rearranged, 0x00);
        
        return encoded;
    }
    
    // 第二层：自定义流加密（RC4 风格）
    function layer2StreamEncrypt(input, key) {
        // 使用 Vendor 的 RC4 实现
        const encrypted = Vendor.rc4(key, input);
        
        // 转换为十六进制字符串
        const hex = Vendor.bytesToHex(Vendor.stringToBytes(encrypted));
        
        return hex;
    }
    
    // 第三层：HMAC + 截断 + 混淆
    function layer3HmacTruncateObfuscate(input, key, timestamp) {
        // 构造 HMAC key
        const hmacKey = Vendor.sha256(key + ':' + timestamp);
        
        // 计算 HMAC
        const hmacResult = Vendor.hmac(hmacKey, input, Vendor.md5);
        
        // 从中间截取 16-20 字符
        const startPos = Math.floor(hmacResult.length / 2) - 8;
        const truncated = hmacResult.substr(startPos, 16);
        
        // 反转和交错重排
        const reversed = truncated.split('').reverse().join('');
        
        // 交错重排：偶数位和奇数位交换
        let final = '';
        for (let i = 0; i < reversed.length; i += 2) {
            if (i + 1 < reversed.length) {
                final += reversed[i + 1] + reversed[i];
            } else {
                final += reversed[i];
            }
        }
        
        return final;
    }
    
    // 主签名计算函数
    function calcSignature(u, p) {
        try {
            // 获取配置
            const secConfigStr = window.ConfigManager.getSecConfig();
            if (!secConfigStr) {
                throw new Error('SEC configuration not available');
            }
            
            // 使用自定义 JSON 解析器解析 SEC 配置
            const secConfig = JX.parse(secConfigStr);
            
            // 生成时间戳
            const t = Math.floor(Date.now() / 1000);
            
            // 构建基础字符串
            const base = u + '|' + p + '|' + t + '|' + secConfig.version;
            
            // 第一层：结构重排 + Base64 变种编码
            const layer1 = layer1StructureRearrange(base, secConfig.salt_v3, secConfig.version);
            
            // 第二层：流加密
            const layer2 = layer2StreamEncrypt(layer1, secConfig.key_v3);
            
            // 第三层：HMAC + 截断 + 混淆
            const layer3 = layer3HmacTruncateObfuscate(layer2, secConfig.key_v3, t);
            
            return {
                t: t,
                s: layer3
            };
        } catch (error) {
            console.error('签名计算失败:', error);
            throw error;
        }
    }
    
    // 验证签名（用于测试）
    function verifySignature(u, p, t, s) {
        try {
            const calculated = calcSignature(u, p);
            return calculated.s === s && Math.abs(calculated.t - t) < 300; // 5分钟容差
        } catch (error) {
            return false;
        }
    }
    
    // 生成随机字符串（用于测试）
    function generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    // 初始化安全模块
    function init() {
        console.log('NoteCloud 安全模块初始化完成');
        
        // 测试签名生成
        setTimeout(() => {
            try {
                const testResult = calcSignature('test_user', '1');
                console.log('签名测试成功:', testResult);
            } catch (error) {
                console.log('签名测试失败:', error);
            }
        }, 1000);
    }
    
    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
        init();
    });
    
    // 导出安全模块
    window.NCGuard = {
        calc: calcSignature,
        verify: verifySignature,
        JX: JX, // 导出自定义 JSON 解析器
        init: init
    };
    
    // 混淆：添加一些无关的 JSON 处理函数
    (function() {
        function fakeJSONParser1(str) {
            try {
                return JSON.parse(str);
            } catch (e) {
                return null;
            }
        }
        
        function fakeJSONParser2(str) {
            try {
                return JSON.parse(str);
            } catch (e) {
                return {};
            }
        }
        
        function fakeJSONParser3(str) {
            try {
                return JSON.parse(str);
            } catch (e) {
                return [];
            }
        }
        
        // 测试假的解析器
        const testData = '{"test": "data"}';
        console.log('假解析器1:', fakeJSONParser1(testData));
        console.log('假解析器2:', fakeJSONParser2(testData));
        console.log('假解析器3:', fakeJSONParser3(testData));
    })();
    
})();