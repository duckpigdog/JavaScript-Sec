/**
 * NoteCloud Application Module
 * 业务逻辑和界面交互
 */

(function() {
    'use strict';
    
    let currentUserId = '';
    let currentPage = 1;
    let isSyncing = false;
    
    // DOM 元素引用
    let userIdInput, pageNumInput, syncBtn, clearBtn, statusMessage;
    let loadingDiv, notesList, notesCount;
    
    // 初始化 DOM 元素引用
    function initElements() {
        userIdInput = document.getElementById('userId');
        pageNumInput = document.getElementById('pageNum');
        syncBtn = document.getElementById('syncBtn');
        clearBtn = document.getElementById('clearBtn');
        statusMessage = document.getElementById('statusMessage');
        loadingDiv = document.getElementById('loading');
        notesList = document.getElementById('notesList');
        notesCount = document.getElementById('notesCount');
    }
    
    // 显示状态消息
    function showStatus(message, type = 'info') {
        if (!statusMessage) return;
        
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');
        
        // 3秒后自动隐藏
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 3000);
    }
    
    // 显示/隐藏加载状态
    function setLoading(show) {
        if (!loadingDiv) return;
        
        if (show) {
            loadingDiv.classList.add('show');
            notesList.style.display = 'none';
        } else {
            loadingDiv.classList.remove('show');
            notesList.style.display = 'block';
        }
    }
    
    // 构建 API URL（避免直接字符串搜索）
    function buildApiUrl(userId, page, signature) {
        // 使用数组和变量拼接来避免直接字符串搜索
        const pathParts = ['/api', 'v3', 'note', 'list'];
        const path = pathParts.join('/');
        
        // 查询参数构建
        const queryParts = [
            'u=' + encodeURIComponent(userId),
            'p=' + encodeURIComponent(page),
            't=' + encodeURIComponent(signature.t),
            's=' + encodeURIComponent(signature.s)
        ];
        const query = queryParts.join('&');
        
        // 组合完整 URL
        const baseUrl = 'http://127.0.0.1:3000';
        const fullUrl = baseUrl + path + '?' + query;
        
        return fullUrl;
    }
    
    // 同步笔记函数
    async function syncNotes() {
        if (isSyncing) return;
        
        // 获取输入值
        const userId = userIdInput.value.trim();
        const page = parseInt(pageNumInput.value) || 1;
        
        if (!userId) {
            showStatus('请输入用户ID', 'error');
            return;
        }
        
        if (page < 1) {
            showStatus('页码必须大于0', 'error');
            return;
        }
        
        // 更新当前状态
        currentUserId = userId;
        currentPage = page;
        isSyncing = true;
        
        // 禁用同步按钮
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<span>⏳</span> 同步中...';
        
        // 显示加载状态
        setLoading(true);
        showStatus('正在同步笔记...', 'info');
        
        // 跟踪用户操作
        if (window.Analytics) {
            window.Analytics.trackUserAction('sync_start', { userId, page });
        }
        
        try {
            // 生成签名
            const signature = window.NCGuard.calc(userId, page.toString());
            console.log('生成的签名:', signature);
            
            // 构建 API URL
            const apiUrl = buildApiUrl(userId, page, signature);
            console.log('API URL:', apiUrl);
            
            // 发送请求
            const startTime = Date.now();
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            const responseTime = Date.now() - startTime;
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`同步失败: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.code === 200) {
                // 显示笔记列表
                displayNotes(data.data || []);
                
                // 更新笔记计数
                const noteCount = data.data ? data.data.length : 0;
                updateNoteCount(noteCount);
                
                // 显示成功消息
                showStatus(`同步成功！共 ${noteCount} 条笔记`, 'success');
                
                // 跟踪同步操作
                if (window.Analytics) {
                    window.Analytics.trackSyncOperation(userId, page, true, responseTime);
                }
                
            } else if (data.code === 401) {
                showStatus('签名验证失败，请检查用户ID', 'error');
            } else {
                showStatus(`同步失败: ${data.msg || '未知错误'}`, 'error');
            }
            
        } catch (error) {
            console.error('同步失败:', error);
            showStatus(`同步失败: ${error.message}`, 'error');
            
            // 跟踪失败的同步操作
            if (window.Analytics) {
                window.Analytics.trackSyncOperation(userId, page, false, 0);
            }
        } finally {
            // 恢复按钮状态
            isSyncing = false;
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<span>🔄</span> 同步笔记';
            setLoading(false);
        }
    }
    
    // 显示笔记列表
    function displayNotes(notes) {
        if (!notesList) return;
        
        if (!notes || notes.length === 0) {
            notesList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">暂无笔记</div>';
            return;
        }
        
        const notesHtml = notes.map(note => {
            const title = note.title || '无标题';
            const content = note.content || '无内容';
            const date = note.created_at || note.date || '未知时间';
            
            return `
                <div class="note-item">
                    <div class="note-header">
                        <h4 class="note-title">${escapeHtml(title)}</h4>
                        <span class="note-date">${formatDate(date)}</span>
                    </div>
                    <p class="note-content">${escapeHtml(content)}</p>
                </div>
            `;
        }).join('');
        
        notesList.innerHTML = notesHtml;
    }
    
    // 更新笔记计数
    function updateNoteCount(count) {
        if (!notesCount) return;
        notesCount.textContent = `${count} 条笔记`;
    }
    
    // 清空笔记列表
    function clearNotes() {
        if (!notesList) return;
        notesList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">暂无笔记</div>';
        updateNoteCount(0);
        showStatus('笔记列表已清空', 'info');
    }
    
    // HTML 转义函数
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 格式化日期
    function formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return dateStr;
            }
            
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                if (hours === 0) {
                    const minutes = Math.floor(diff / (1000 * 60));
                    return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
                }
                return `${hours}小时前`;
            } else if (days === 1) {
                return '昨天';
            } else if (days < 7) {
                return `${days}天前`;
            } else {
                return date.toLocaleDateString('zh-CN');
            }
        } catch (error) {
            return dateStr;
        }
    }
    
    // 绑定事件监听器
    function bindEvents() {
        if (syncBtn) {
            syncBtn.addEventListener('click', syncNotes);
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', clearNotes);
        }
        
        if (userIdInput) {
            userIdInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    syncNotes();
                }
            });
        }
        
        if (pageNumInput) {
            pageNumInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    syncNotes();
                }
            });
        }
    }
    
    // 初始化应用
    function init() {
        // 初始化 DOM 元素
        initElements();
        
        // 绑定事件
        bindEvents();
        
        // 从 localStorage 恢复用户ID
        const savedUserId = localStorage.getItem('notecloud_userid');
        if (savedUserId && userIdInput) {
            userIdInput.value = savedUserId;
        }
        
        // 保存用户ID到 localStorage
        if (userIdInput) {
            userIdInput.addEventListener('change', function() {
                localStorage.setItem('notecloud_userid', this.value);
            });
        }
        
        // 显示初始状态
        if (notesList) {
            notesList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">点击"同步笔记"按钮开始同步</div>';
        }
        
        console.log('NoteCloud 应用初始化完成');
    }
    
    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
        // 等待其他模块加载完成
        setTimeout(init, 100);
    });
    
    // 导出应用模块
    window.NoteCloudApp = {
        syncNotes: syncNotes,
        clearNotes: clearNotes,
        buildApiUrl: buildApiUrl,
        init: init
    };
    
})();