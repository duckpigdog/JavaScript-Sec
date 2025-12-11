/**
 * NoteCloud Backend Server
 * API 服务端，用于签名验证和数据提供
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置常量
const SEC_CONFIG = {
    v: '3',
    salt: 'NC_V3_SALT',
    key: 'NC_K3Y_2025',
    mix: '1',
    nonce: 'default'
};

// 模拟笔记数据
const MOCK_NOTES = [
    {
        id: 1,
        title: 'JavaScript 逆向工程笔记',
        content: '今天学习了XHR断点调试技巧，发现可以通过在Network面板设置断点来拦截API请求...',
        created_at: '2025-12-05T10:30:00Z',
        updated_at: '2025-12-05T10:30:00Z'
    },
    {
        id: 2,
        title: '加密算法分析',
        content: '分析了一个三层的签名算法：第一层是结构重排+Base64变种，第二层是流加密，第三层是HMAC+截断...',
        created_at: '2025-12-04T15:45:00Z',
        updated_at: '2025-12-04T15:45:00Z'
    },
    {
        id: 3,
        title: 'JSON.parse 混淆技巧',
        content: '学会了如何区分原生JSON.parse和自定义JSON解析器。关键看调用栈和解析的字符串格式...',
        created_at: '2025-12-03T09:20:00Z',
        updated_at: '2025-12-03T09:20:00Z'
    },
    {
        id: 4,
        title: '签名算法复现',
        content: '成功复现了NoteCloud的签名算法。需要在Node.js中实现相同的三层加密逻辑...',
        created_at: '2025-12-02T14:15:00Z',
        updated_at: '2025-12-02T14:15:00Z'
    },
    {
        id: 5,
        title: '调试技巧总结',
        content: '总结了JS逆向的调试技巧：1. 使用XHR断点 2. 分析调用栈 3. 区分真假JSON.parse 4. 跟踪签名生成过程...',
        created_at: '2025-12-01T16:30:00Z',
        updated_at: '2025-12-01T16:30:00Z'
    },
    {
        id: 6,
        title: 'Base64变种编码',
        content: '发现了一种自定义的Base64编码，使用了不同的字符表。需要实现对应的解码函数...',
        created_at: '2025-11-30T11:45:00Z',
        updated_at: '2025-11-30T11:45:00Z'
    },
    {
        id: 7,
        title: '流加密算法',
        content: '分析了RC4流加密算法的实现，理解了KSA和PRGA的工作原理。可以应用到自己的项目中...',
        created_at: '2025-11-29T13:20:00Z',
        updated_at: '2025-11-29T13:20:00Z'
    },
    {
        id: 8,
        title: 'HMAC构造方法',
        content: '学习了HMAC的构造方法：HMAC(key, message) = hash((key ⊕ opad) ∥ hash((key ⊕ ipad) ∥ message))...',
        created_at: '2025-11-28T10:10:00Z',
        updated_at: '2025-11-28T10:10:00Z'
    }
];

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 日志中间件
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 工具函数：MD5实现
function md5(str) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(str).digest('hex');
}

// 工具函数：SHA256实现
function sha256(str) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(str).digest('hex');
}

// 工具函数：RC4实现
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

// 工具函数：自定义Base64编码
function customBase64Encode(input, variant = 0) {
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

// 工具函数：HMAC实现
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

// 工具函数：字符串转字节
function stringToBytes(str) {
    return Array.from(str, c => c.charCodeAt(0));
}

// 工具函数：字节转十六进制
function bytesToHex(bytes) {
    return Array.from(bytes, b => ('0' + b.toString(16)).slice(-2)).join('');
}

// 签名验证函数（与前端保持一致）
function verifySignature(u, p, t, s) {
    try {
        // 检查时间戳有效性（5分钟容差）
        const currentTime = Math.floor(Date.now() / 1000);
        if (Math.abs(currentTime - t) > 300) {
            return false;
        }
        
        // 构建基础字符串
        const base = u + '|' + p + '|' + t + '|' + SEC_CONFIG.v;
        
        // 第一层：结构重排 + Base64 变种编码
        const parts = (base + '|' + SEC_CONFIG.salt).split('|');
        
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
        const encrypted = rc4(SEC_CONFIG.key, layer1);
        const layer2 = bytesToHex(stringToBytes(encrypted));
        
        // 第三层：HMAC + 截断 + 混淆
        const hmacKey = sha256(SEC_CONFIG.key + ':' + t);
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
        
        return final === s;
    } catch (error) {
        console.error('签名验证失败:', error);
        return false;
    }
}

// API 路由：获取配置
app.get('/config/notecloud_v3.json', (req, res) => {
    const configPath = path.join(__dirname, 'config', 'notecloud_v3.json');
    
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            console.error('读取配置文件失败:', err);
            return res.status(500).json({ error: '配置加载失败' });
        }
        
        try {
            const config = JSON.parse(data);
            res.json(config);
        } catch (error) {
            console.error('解析配置文件失败:', error);
            res.status(500).json({ error: '配置解析失败' });
        }
    });
});

// API 路由：获取笔记列表
app.get('/api/v3/note/list', (req, res) => {
    const { u: userId, p: page, t: timestamp, s: signature } = req.query;
    
    // 参数验证
    if (!userId || !page || !timestamp || !signature) {
        return res.status(400).json({
            code: 400,
            msg: '缺少必需参数'
        });
    }
    
    // 验证时间戳
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    
    if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > 300) {
        return res.status(401).json({
            code: 401,
            msg: '请求已过期'
        });
    }
    
    // 验证签名
    if (!verifySignature(userId, page, requestTime, signature)) {
        return res.status(401).json({
            code: 401,
            msg: 'invalid signature'
        });
    }
    
    // 分页处理
    const pageNum = parseInt(page) || 1;
    const perPage = 5;
    const startIndex = (pageNum - 1) * perPage;
    const endIndex = startIndex + perPage;
    
    const paginatedNotes = MOCK_NOTES.slice(startIndex, endIndex);
    
    // 返回成功响应
    res.json({
        code: 200,
        msg: 'success',
        data: paginatedNotes,
        meta: {
            page: pageNum,
            per_page: perPage,
            total: MOCK_NOTES.length,
            total_pages: Math.ceil(MOCK_NOTES.length / perPage)
        }
    });
});

// 默认路由：提供前端页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        code: 500,
        msg: '服务器内部错误'
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        code: 404,
        msg: '页面不存在'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`NoteCloud 服务器启动在端口 ${PORT}`);
    console.log(`访问地址: http://localhost:${PORT}`);
    console.log('API 端点: GET /api/v3/note/list');
});

module.exports = app;