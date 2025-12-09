// ShopPlus UI交互和现代化功能
import { getOrderList } from './app.js';

class ShopPlusUI {
  constructor() {
    this.currentPage = 1;
    this.currentUID = '10001';
    this.ordersData = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupUserDropdown();
    this.setupModal();
    this.setupToast();
    this.loadInitialData();
  }

  setupEventListeners() {
    // 加载订单按钮
    const loadBtn = document.getElementById('loadBtn');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.loadOrders());
    }

    // 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    // 导出按钮
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportOrders());
    }

    // 筛选按钮
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => this.applyFilters());
    }

    // 分页按钮
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    if (prevPage) prevPage.addEventListener('click', () => this.changePage(-1));
    if (nextPage) nextPage.addEventListener('click', () => this.changePage(1));

    // 搜索功能
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    if (searchInput && searchBtn) {
      searchBtn.addEventListener('click', () => this.handleSearch());
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleSearch();
      });
    }
  }

  setupUserDropdown() {
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userAvatar && userDropdown) {
      userAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        userAvatar.classList.toggle('active');
        userDropdown.classList.toggle('show');
      });

      // 点击外部关闭下拉菜单
      document.addEventListener('click', () => {
        userAvatar.classList.remove('active');
        userDropdown.classList.remove('show');
      });

      // 下拉菜单项点击事件
      const dropdownItems = userDropdown.querySelectorAll('.dropdown-item');
      dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const text = item.textContent.trim();
          this.showToast(`${text} 功能开发中...`, 'info');
        });
      });
    }
  }

  setupModal() {
    const modal = document.getElementById('orderModal');
    const modalClose = document.getElementById('modalClose');
    
    if (modal && modalClose) {
      modalClose.addEventListener('click', () => {
        modal.classList.remove('show');
      });

      // 点击模态框外部关闭
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    }
  }

  setupToast() {
    this.toastContainer = document.getElementById('toastContainer');
  }

  showToast(message, type = 'info', duration = 3000) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <i class="fas ${icons[type]} toast-icon"></i>
      <span class="toast-message">${message}</span>
    `;

    this.toastContainer.appendChild(toast);

    // 触发动画
    setTimeout(() => toast.classList.add('show'), 100);

    // 自动移除
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  async loadOrders() {
    const uid = document.getElementById('uidInput')?.value || this.currentUID;
    const page = parseInt(document.getElementById('pageInput')?.value || '1');
    this.currentUID = uid;
    this.currentPage = page;
    this.showLoadingState();
    try {
      const data = await getOrderList(uid, page);
      const orders = (data?.data?.orders && Array.isArray(data.data.orders)) ? data.data.orders : (Array.isArray(data?.data) ? data.data : []);
      this.ordersData = orders;
      this.updateUI(data);
      this.showToast('订单数据加载成功！', 'success');
    } catch (error) {
      console.error('加载订单失败:', error);
      this.showToast('订单数据加载失败，请重试', 'error');
      this.showErrorState();
    }
  }

  generateMockData() {
    const statuses = ['pending', 'processing', 'completed', 'cancelled'];
    const statusLabels = {
      pending: '待处理',
      processing: '处理中', 
      completed: '已完成',
      cancelled: '已取消'
    };

    const orders = Array.from({ length: 10 }, (_, i) => ({
      id: `ORD${Date.now() + i}`,
      product: `商品 ${i + 1}`,
      user: `用户${this.currentUID}`,
      amount: (Math.random() * 1000 + 50).toFixed(2),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      status_label: statusLabels[statuses[Math.floor(Math.random() * statuses.length)]]
    }));

    return {
      success: true,
      data: orders,
      total: 150,
      page: this.currentPage,
      per_page: 10,
      total_pages: 15,
      msg: '订单数据加载成功'
    };
  }

  showLoadingState() {
    const loadingSkeleton = document.getElementById('loadingSkeleton');
    const ordersContainer = document.getElementById('ordersContainer');
    const pagination = document.getElementById('pagination');
    const status = document.getElementById('status');

    if (loadingSkeleton) loadingSkeleton.style.display = 'block';
    if (ordersContainer) ordersContainer.style.display = 'none';
    if (pagination) pagination.style.display = 'none';
    if (status) {
      status.textContent = '状态：数据加载中...';
      status.className = 'status-message loading';
    }
  }

  showErrorState() {
    const loadingSkeleton = document.getElementById('loadingSkeleton');
    const ordersContainer = document.getElementById('ordersContainer');
    const pagination = document.getElementById('pagination');
    const status = document.getElementById('status');

    if (loadingSkeleton) loadingSkeleton.style.display = 'none';
    if (ordersContainer) ordersContainer.style.display = 'none';
    if (pagination) pagination.style.display = 'none';
    if (status) {
      status.textContent = '状态：数据加载失败';
      status.className = 'status-message error';
    }
  }

  updateUI(data) {
    const loadingSkeleton = document.getElementById('loadingSkeleton');
    const ordersContainer = document.getElementById('ordersContainer');
    const pagination = document.getElementById('pagination');
    const status = document.getElementById('status');
    const ordersTableBody = document.getElementById('ordersTableBody');

    if (loadingSkeleton) loadingSkeleton.style.display = 'none';
    if (ordersContainer) ordersContainer.style.display = 'block';
    if (pagination) pagination.style.display = 'flex';
    if (status) {
      status.textContent = `状态：${data.msg || '数据加载成功'}`;
      status.className = 'status-message success';
    }

    // 更新表格数据
    if (ordersTableBody) {
      const orders = (data?.data?.orders && Array.isArray(data.data.orders)) ? data.data.orders : (Array.isArray(data?.data) ? data.data : []);
      this.renderOrdersTable(orders);
    }

    // 更新统计卡片
    const statsOrders = (data?.data?.orders && Array.isArray(data.data.orders)) ? data.data.orders : (Array.isArray(data?.data) ? data.data : []);
    this.updateStats({ orders: statsOrders });

    // 更新分页
    const meta = {
      page: data?.data?.page ?? data?.page ?? this.currentPage,
      total: data?.data?.total ?? data?.total ?? statsOrders.length,
      per_page: data?.per_page ?? 10
    };
    this.updatePagination(meta);
  }

  renderOrdersTable(orders) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (!ordersTableBody) return;

    const statusClasses = {
      '待处理': 'status-pending',
      '处理中': 'status-processing', 
      '已完成': 'status-completed',
      '已取消': 'status-cancelled'
    };

    ordersTableBody.innerHTML = orders.map(order => `
      <tr>
        <td><strong>${order.id || order.order_id || 'N/A'}</strong></td>
        <td>
          <div class="product-info">
            <div class="product-name">${order.product || order.product_name || '未知商品'}</div>
            <div class="product-sku">SKU: ${order.sku || 'N/A'}</div>
          </div>
        </td>
        <td>
          <div class="user-info">
            <div class="user-name">${order.user || order.username || '未知用户'}</div>
            <div class="user-id">ID: ${order.user_id || this.currentUID}</div>
          </div>
        </td>
        <td><strong class="order-amount">¥${order.amount || order.total_amount || '0.00'}</strong></td>
        <td>
          <span class="status-badge ${statusClasses[(order.status_label || order.status) || '处理中'] || 'status-processing'}">
            ${(order.status_label || order.status) || '未知'}
          </span>
        </td>
        <td>
          <div class="time-info">
            <div class="date">${this.formatDate(order.created_at || order.create_time)}</div>
            <div class="time">${this.formatTime(order.created_at || order.create_time)}</div>
          </div>
        </td>
        <td>
          <button class="action-btn view" onclick="shopPlusUI.viewOrder('${order.id || order.order_id}')">
            <i class="fas fa-eye"></i> 查看
          </button>
        </td>
      </tr>
    `).join('');
  }

  updateStats(data) {
    const orders = data.orders || [];
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + parseFloat(order.amount || order.total_amount || 0);
    }, 0);
    const completedOrders = orders.filter(order => 
      (order.status_label || order.status) === '已完成'
    ).length;
    const pendingOrders = orders.filter(order => 
      (order.status_label || order.status) === '处理中'
    ).length;

    // 动画更新数字
    this.animateNumber('totalOrders', totalOrders);
    this.animateNumber('totalRevenue', totalRevenue, '¥');
    this.animateNumber('completedOrders', completedOrders);
    this.animateNumber('pendingOrders', pendingOrders);
  }

  animateNumber(elementId, targetValue, prefix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (targetValue - startValue) * easeOutQuart;

      if (elementId === 'totalRevenue') {
        element.textContent = prefix + currentValue.toFixed(2);
      } else {
        element.textContent = prefix + Math.floor(currentValue);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  updatePagination(data) {
    const currentPage = data.page || this.currentPage;
    const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.per_page || 10)));
    
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');

    if (prevPage) {
      prevPage.disabled = currentPage <= 1;
      prevPage.onclick = () => this.changePage(-1);
    }

    if (nextPage) {
      nextPage.disabled = currentPage >= totalPages;
      nextPage.onclick = () => this.changePage(1);
    }

    if (pageNumbers) {
      pageNumbers.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        if (i <= 3 || i >= totalPages - 2 || Math.abs(i - currentPage) <= 1) {
          const pageBtn = document.createElement('button');
          pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
          pageBtn.textContent = i;
          pageBtn.onclick = () => this.goToPage(i);
          pageNumbers.appendChild(pageBtn);
        } else if (i === 4 && currentPage > 4) {
          const dots = document.createElement('span');
          dots.textContent = '...';
          dots.style.padding = '8px';
          pageNumbers.appendChild(dots);
        } else if (i === totalPages - 3 && currentPage < totalPages - 3) {
          const dots = document.createElement('span');
          dots.textContent = '...';
          dots.style.padding = '8px';
          pageNumbers.appendChild(dots);
        }
      }
    }
  }

  

  viewOrder(orderId) {
    const order = this.ordersData.find(o => 
      (o.id || o.order_id) === orderId
    );

    if (!order) {
      this.showToast('订单详情加载失败', 'error');
      return;
    }

    const modal = document.getElementById('orderModal');
    const modalBody = document.getElementById('modalBody');

    if (modal && modalBody) {
      modalBody.innerHTML = this.generateOrderDetailHTML(order);
      modal.classList.add('show');
    }
  }

  generateOrderDetailHTML(order) {
    const statusLabels = {
      'pending': '待处理',
      'processing': '处理中',
      'completed': '已完成',
      'cancelled': '已取消'
    };

    const status = order.status_label || statusLabels[order.status] || '未知';
    const statusClass = status === '已完成' ? 'status-completed' : 
                       status === '处理中' ? 'status-processing' :
                       status === '待处理' ? 'status-pending' : 'status-cancelled';

    return `
      <div class="order-detail">
        <div class="detail-section">
          <h4>订单信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>订单号：</label>
              <span>${order.id || order.order_id || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>订单状态：</label>
              <span class="status-badge ${statusClass}">${status}</span>
            </div>
            <div class="detail-item">
              <label>创建时间：</label>
              <span>${this.formatDateTime(order.created_at || order.create_time)}</span>
            </div>
            <div class="detail-item">
              <label>订单金额：</label>
              <span class="order-amount">¥${order.amount || order.total_amount || '0.00'}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>商品信息</h4>
          <div class="product-detail">
            <div class="product-name">${order.product || order.product_name || '未知商品'}</div>
            <div class="product-sku">SKU: ${order.sku || 'N/A'}</div>
            ${order.description ? `<div class="product-desc">${order.description}</div>` : ''}
          </div>
        </div>
        
        <div class="detail-section">
          <h4>用户信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>用户名：</label>
              <span>${order.user || order.username || '未知用户'}</span>
            </div>
            <div class="detail-item">
              <label>用户ID：</label>
              <span>${order.user_id || this.currentUID}</span>
            </div>
          </div>
        </div>
        
        ${order.notes ? `
        <div class="detail-section">
          <h4>备注信息</h4>
          <div class="order-notes">${order.notes}</div>
        </div>
        ` : ''}
      </div>
      
      <style>
        .order-detail { max-height: 60vh; overflow-y: auto; }
        .detail-section { margin-bottom: 24px; }
        .detail-section h4 { margin: 0 0 16px 0; color: var(--text-primary); font-size: 16px; font-weight: 600; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .detail-item { display: flex; flex-direction: column; gap: 4px; }
        .detail-item label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
        .detail-item span { font-size: 14px; color: var(--text-primary); }
        .product-detail { background: var(--background); padding: 16px; border-radius: 8px; }
        .product-name { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
        .product-sku { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
        .product-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
        .order-notes { background: var(--background); padding: 16px; border-radius: 8px; font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
        .order-amount { color: var(--primary); font-weight: 600; }
        @media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }
      </style>
    `;
  }

  changePage(direction) {
    const newPage = this.currentPage + direction;
    if (newPage >= 1) {
      this.currentPage = newPage;
      document.getElementById('pageInput').value = newPage;
      this.loadOrders();
    }
  }

  goToPage(page) {
    this.currentPage = page;
    document.getElementById('pageInput').value = page;
    this.loadOrders();
  }

  handleSearch() {
    const searchInput = document.querySelector('.search-input');
    const query = searchInput?.value.trim();
    
    if (query) {
      this.showToast(`搜索功能：正在搜索 "${query}"...`, 'info');
      // 这里可以实现实际的搜索逻辑
    }
  }

  refreshData() {
    this.showToast('正在刷新数据...', 'info');
    this.loadOrders();
  }

  exportOrders() {
    this.showToast('订单导出功能开发中...', 'info');
    // 这里可以实现实际的导出功能
  }

  applyFilters() {
    const timeFilter = document.getElementById('timeFilter')?.value;
    const statusFilter = document.getElementById('statusFilter')?.value;
    
    this.showToast(`应用筛选：时间=${timeFilter}, 状态=${statusFilter}`, 'info');
    this.loadOrders();
  }

  loadInitialData() {
    // 延迟加载初始数据，让页面先渲染
    setTimeout(() => {
      this.loadOrders();
    }, 500);
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  }

  formatTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  }
}

// 初始化UI
let shopPlusUI;

document.addEventListener('DOMContentLoaded', () => {
  shopPlusUI = new ShopPlusUI();
});

// 全局函数供HTML调用
window.viewOrder = (orderId) => {
  if (shopPlusUI) {
    shopPlusUI.viewOrder(orderId);
  }
};

 
