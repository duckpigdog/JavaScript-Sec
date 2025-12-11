/**
 * NoteCloud Signature Test Script
 * 用于测试签名算法是否正确实现
 */

const crypto = require('crypto');

// 配置常量（与前端和后端保持一致）
const SEC_CONFIG = {
    v: '3',
    salt: 'NC_V3_SALT',
    key: 'NC_K3Y_2025',
    mix: '1',
    nonce: 'default'
};

// MD5 实现
function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

// SHA256 实现
function sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

// RC4 实现
function rc4(key, text) {
    const s = [];
    let j = 0;
    let result = '';
    
    for (let i = 0; i < 256; i++) {
        s[i] = i;
    }
    
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
        const x = s[i];
        s[i] = s[j];
        s[j] = x;
    }
    
    let i = 0;
    j = 0;
    
    for (let y = 0; y < text.length; y++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        const x = s[i];
        s[i] = s[j];
        s[j] = x;
        result += String.fromCharCode(text.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
    }
    
    return result;
}

// 自定义Base64编码
function customBase64Encode(input) {
    const table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-";
    let output = "";
    let i = 0;
    
    while (i < input.length) {
        const a = input.charCodeAt(i++);
        const b = i < input.length ? input.charCodeAt(i++) : 0;
        const c = i < input.length ? input.charCodeAt(i++) : 0;
        
        const bitmap = (a << 16) | (b << 8) | c;
        
        output += table.charAt((bitmap >> 18) & 63);
        output += table.charAt((bitmap >> 12) & 63);
        output += table.charAt((bitmap >> 6) & 63);
        output += table.charAt(bitmap & 63);
    }
    
    const pad = input.length % 3;
    if (pad === 1) output = output.slice(0, -2) + "--";
    else if (pad === 2) output = output.slice(0, -1) + "-";
    
    return output;
}

// HMAC实现
function hmac(key, message, hashFunc) {
    const blockSize = 64;
    let keyBytes = [];
    
    for (let i = 0; i < key.length; i++) {
        keyBytes.push(key.charCodeAt(i));
    }
    
    if (keyBytes.length > blockSize) {
        keyBytes = hashFunc(key).match(/.{2}/g).map(b => parseInt(b, 16));
    }
    
    while (keyBytes.length < blockSize) {
        keyBytes.push(0);
    }
    
    const outerKeyPad = keyBytes.map(b => b ^ 0x5c);
    const innerKeyPad = keyBytes.map(b => b ^ 0x36);
    
    const innerHash = hashFunc(String.fromCharCode(...innerKeyPad) + message);
    const outerHash = hashFunc(String.fromCharCode(...outerKeyPad) + innerHash);
    
    return outerHash;
}

// 字符串转字节
function stringToBytes(str) {
    return Array.from(str, c => c.charCodeAt(0));
}

// 字节转十六进制
function bytesToHex(bytes) {
    return Array.from(bytes, b => ('0' + b.toString(16)).slice(-2)).join('');
}

// 解析SEC配置
function parseSecConfig(secStr) {
    try {
        const configPart = secStr.substring(4);
        const config = {};
        const pairs = configPart.split('&');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key && value) {
                config[key] = value;
            }
        });
        
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

// 三层签名算法实现
function calcSignature(u, p) {
    try {
        // 构建SEC配置字符串
        const secConfigStr = `SEC|v=${SEC_CONFIG.v}&salt=${SEC_CONFIG.salt}&key=${SEC_CONFIG.key}&mix=${SEC_CONFIG.mix}&nonce=${SEC_CONFIG.nonce}`;
        
        // 解析SEC配置
        const secConfig = parseSecConfig(secConfigStr);
        
        // 生成时间戳
        const t = Math.floor(Date.now() / 1000);
        
        // 构建基础字符串
        const base = u + '|' + p + '|' + t + '|' + secConfig.version;
        
        // 第一层：结构重排 + Base64变种编码
        const raw = base + '|' + secConfig.salt_v3;
        const parts = raw.split('|');
        
        // 重排算法：交换位置
        if (parts.length >= 4) {
            const temp = parts[0];
            parts[0] = parts[2];
            parts[2] = temp;
            
            const temp2 = parts[1];
            parts[1] = parts[3];
            parts[3] = temp2;
        }
        
        const rearranged = parts.join('|');
        const layer1 = customBase64Encode(rearranged);
        
        // 第二层：流加密
        const encrypted = rc4(secConfig.key_v3, layer1);
        const layer2 = bytesToHex(stringToBytes(encrypted));
        
        // 第三层：HMAC + 截断 + 混淆
        const hmacKey = sha256(secConfig.key_v3 + ':' + t);
        const hmacResult = hmac(hmacKey, layer2, md5);
        
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
        
        return {
            t: t,
            s: final
        };
    } catch (error) {
        console.error('签名计算失败:', error);
        throw error;
    }
}

// 测试函数
function testSignature() {
    console.log('=== NoteCloud 签名算法测试 ===\n');
    
    const testCases = [
        { u: 'user123', p: '1' },
        { u: 'test_user', p: '2' },
        { u: 'alice', p: '1' }
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`测试用例 ${index + 1}:`);
        console.log(`用户ID: ${testCase.u}`);
        console.log(`页码: ${testCase.p}`);
        
        try {
            const result = calcSignature(testCase.u, testCase.p);
            console.log(`时间戳: ${result.t}`);
            console.log(`签名: ${result.s}`);
            console.log(`完整URL: /api/v3/note/list?u=${testCase.u}&p=${testCase.p}&t=${result.t}&s=${result.s}`);
            console.log('✅ 签名生成成功\n');
        } catch (error) {
            console.log('❌ 签名生成失败:', error.message);
            console.log('');
        }
    });
    
    console.log('=== 测试完成 ===');
}

// 运行测试
if (require.main === module) {
    testSignature();
}

module.exports = {
    calcSignature,
    parseSecConfig,
    SEC_CONFIG
};