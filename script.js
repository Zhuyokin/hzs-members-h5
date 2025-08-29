// 配置常量
const API_BASE_URL = 'https://api.masdey.com/api/users/membersList';
const ITEMS_PER_PAGE = 50;

// 枚举映射
const sexList = [
    { value: undefined, label: '全部' },
    { label: '女', value: 0 },
    { label: '男', value: 1 }
];

const academic_list = [
    { value: undefined, label: '全部' },
    { value: 0, label: '无学历' },
    { value: 1, label: '小学' },
    { value: 2, label: '初中' },
    { value: 3, label: '高中' },
    { value: 4, label: '中专' },
    { value: 5, label: '大专' },
    { value: 6, label: '本科' },
    { value: 7, label: '211/985本科' },
    { value: 8, label: '研究生' },
    { value: 9, label: '博士' }
];

const marriage_list = [
    { value: undefined, label: '全部' },
    { value: 1, label: '未婚单身' },
    { value: 2, label: '离异带孩' },
    { value: 3, label: '离异不带孩' },
    { value: 4, label: '丧偶带孩' },
    { value: 5, label: '丧偶不带孩' }
];

const house_vehicle_list = [
    { value: undefined, label: '全部' },
    { value: 0, label: '无房无车' },
    { value: 1, label: '有房无车' },
    { value: 2, label: '无房有车' },
    { value: 3, label: '有房有车' }
];

// 全局状态
let currentPage = 1;
let currentFilters = { academic: '', has_house_vehicle: '', marriage: '' };
let isLoading = false;

// DOM 元素缓存（在 DOMContentLoaded 后会刷新一次）
const elements = {
    membersList: null,
    loading: null,
    errorMessage: null,
    errorText: null,
    pageNumber: null,
    prevBtn: null,
    nextBtn: null,
    pages: null,
    navItems: null,
    contactBtn: null,
    contactFloatBtn: null,
};

function cacheDom() {
    elements.membersList = document.getElementById('membersList');
    elements.loading = document.getElementById('loading');
    elements.errorMessage = document.getElementById('errorMessage');
    elements.errorText = document.getElementById('errorText');
    elements.pageNumber = document.getElementById('pageNumber');
    elements.prevBtn = document.getElementById('prevBtn');
    elements.nextBtn = document.getElementById('nextBtn');
    elements.pages = document.querySelectorAll('.page');
    elements.navItems = document.querySelectorAll('.nav-item');
    elements.contactBtn = document.querySelector('.contact-btn');
    elements.contactFloatBtn = document.querySelector('.contact-float-btn');
}

// 工具函数
function getLabel(value, list) {
    const v = value === '' ? undefined : (value === null ? undefined : (isNaN(value) ? value : Number(value)));
    const item = list.find(item => item.value === v);
    return item ? item.label : '未填写';
}

function formatAge(year) {
    if (!year) return '未填写';
    const currentYear = new Date().getFullYear();
    const y = parseInt(year);
    if (isNaN(y)) return String(year);
    const age = currentYear - y;
    return `${age}岁 (${year}年)`;
}

function getSexIcon(sex) { return sex === 1 ? '♂' : '♀'; }
function getSexClass(sex) { return sex === 1 ? 'male' : 'female'; }

// 页面切换
function switchPage(targetPageId) {
    if (!elements.pages) return;
    elements.pages.forEach(p => p.classList.remove('active'));
    const target = document.getElementById(targetPageId);
    if (target) target.classList.add('active');
    if (elements.navItems) {
        elements.navItems.forEach(n => {
            n.classList.toggle('active', n.dataset.page === targetPageId);
        });
    }
    if (targetPageId === 'membersPage' && elements.membersList && elements.membersList.children.length === 0) {
        fetchMembers(1, currentFilters);
    }
}

// 新筛选交互：标签 + 模态框
function setupFiltersUI() {
    const btnAcademic = document.getElementById('btnAcademic');
    const btnHouseVehicle = document.getElementById('btnHouseVehicle');
    const btnMarriage = document.getElementById('btnMarriage');
    const modal = document.getElementById('filterModal');
    const resetBtn = document.getElementById('filterReset');
    const confirmBtn = document.getElementById('filterConfirm');
    const groupAcademic = document.getElementById('groupAcademic');
    const groupHouseVehicle = document.getElementById('groupHouseVehicle');
    const groupMarriage = document.getElementById('groupMarriage');

    if (!modal) return;

    let tempFilters = { ...currentFilters };

    const refreshGroupUI = () => {
        const apply = (groupEl, key) => {
            if (!groupEl) return;
            const value = tempFilters[key] ?? '';
            groupEl.querySelectorAll('button').forEach(btn => {
                const selected = (btn.dataset.value ?? '') === String(value ?? '');
                btn.classList.toggle('bg-primary/5', selected);
                btn.classList.toggle('text-primary', selected);
                btn.classList.toggle('ring-1', selected);
                btn.classList.toggle('ring-primary/20', selected);
            });
        };
        apply(groupAcademic, 'academic');
        apply(groupHouseVehicle, 'has_house_vehicle');
        apply(groupMarriage, 'marriage');
    };

    const openModal = (focus) => {
        tempFilters = { ...currentFilters };
        refreshGroupUI();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        const map = { academic: groupAcademic, has_house_vehicle: groupHouseVehicle, marriage: groupMarriage };
        const el = map[focus];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };

    if (btnAcademic) btnAcademic.addEventListener('click', () => openModal('academic'));
    if (btnHouseVehicle) btnHouseVehicle.addEventListener('click', () => openModal('has_house_vehicle'));
    if (btnMarriage) btnMarriage.addEventListener('click', () => openModal('marriage'));

    modal.addEventListener('click', (e) => {
        const overlay = modal.querySelector('.absolute');
        if (e.target === overlay) closeModal();
    });

    const wireGroup = (groupEl, key) => {
        if (!groupEl) return;
        groupEl.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                tempFilters[key] = btn.dataset.value;
                refreshGroupUI();
            });
        });
    };
    wireGroup(groupAcademic, 'academic');
    wireGroup(groupHouseVehicle, 'has_house_vehicle');
    wireGroup(groupMarriage, 'marriage');

    if (resetBtn) resetBtn.addEventListener('click', () => {
        tempFilters = { academic: '', has_house_vehicle: '', marriage: '' };
        refreshGroupUI();
    });
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
        currentFilters = { ...tempFilters };
        updateTopFilterLabels();
        closeModal();
        handleSearch();
    });

    updateTopFilterLabels();
}

function updateTopFilterLabels() {
    const setActive = (btn, isActive) => {
        if (!btn) return;
        btn.dataset.active = isActive ? 'true' : 'false';
        const span = btn.querySelector('[data-underline]');
        if (span) span.style.width = isActive ? '100%' : '0';
    };
    setActive(document.getElementById('btnAcademic'), currentFilters.academic !== '');
    setActive(document.getElementById('btnHouseVehicle'), currentFilters.has_house_vehicle !== '');
    setActive(document.getElementById('btnMarriage'), currentFilters.marriage !== '');
}

// 创建用户卡片
function createMemberCard(member) {
    const card = document.createElement('div');
    card.className = 'member-card bg-white rounded-lg shadow-sm hover:shadow-md transition p-4';

    const sexText = member.sex === 1 ? '男' : '女';
    const academicLabel = getLabel(member.academic, academic_list);
    const marriageLabel = getLabel(member.marriage, marriage_list);
    const houseVehicleLabel = getLabel(member.has_house_vehicle, house_vehicle_list);

    card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
            <div>
                <div class="text-[18px] font-semibold text-primary">${member.number}号${sexText}・${member.year ? String(member.year).slice(-2) : ''}年</div>
                <div class="mt-2 space-y-1 text-[14px] text-[#333]">
                    <div class="flex items-center gap-2"><i class="fa-solid fa-location-dot text-gray-400"></i><span>现居：${member.city ?? ''}</span></div>
                    <div class="flex items-center gap-2"><i class="fa-solid fa-ruler-vertical text-gray-400"></i><span>身高：${member.height ?? ''}cm</span></div>
                    <div class="flex items-center gap-2"><i class="fa-solid fa-graduation-cap text-gray-400"></i><span>学历：${academicLabel}</span></div>
                    <div class="flex items-center gap-2"><i class="fa-solid fa-yen-sign text-gray-400"></i><span>收入：${member.income ?? ''}</span></div>
                    <div class="flex items-center gap-2"><i class="fa-solid fa-ring text-gray-400"></i><span>婚姻状况：${marriageLabel}</span></div>
                    <div class="flex items-center gap-2"><i class="fa-solid fa-car text-gray-400"></i><span>房车：${houseVehicleLabel}</span></div>
                    <div class="flex items-center gap-2"><i class="fa-solid fa-briefcase text-gray-400"></i><span>职业：${member.career ?? ''}</span></div>
                </div>
            </div>
            <div>
                <button class="px-3 py-2 text-[14px] rounded bg-gradient-to-r from-[#4080FF] to-primary text-white shadow hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition" data-contact>联系我们</button>
            </div>
        </div>
    `;

    const btn = card.querySelector('[data-contact]');
    if (btn) btn.addEventListener('click', showContactInfo);
    return card;
}

// 显示加载状态
function showLoading() {
    isLoading = true;
    elements.loading.style.display = 'block';
    elements.errorMessage.style.display = 'none';
    if (elements.membersList) {
        elements.membersList.style.opacity = '0.5';
    }
}

// 隐藏加载状态
function hideLoading() {
    isLoading = false;
    elements.loading.style.display = 'none';
    if (elements.membersList) {
        elements.membersList.style.opacity = '1';
    }
}

// 显示错误信息
function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.style.display = 'block';
    hideLoading();
}

// 隐藏错误信息
function hideError() {
    elements.errorMessage.style.display = 'none';
}

// 更新分页状态
function updatePagination(pagination) {
    if (elements.pageNumber) {
        elements.pageNumber.textContent = pagination.current;
    }
    
    // 更新分页按钮状态
    if (elements.prevBtn) {
        elements.prevBtn.disabled = pagination.current <= 1;
    }
    if (elements.nextBtn) {
        elements.nextBtn.disabled = pagination.current >= pagination.totalPages;
    }
}

// 渲染用户列表
function renderMembers(members) {
    if (!elements.membersList) return;
    elements.membersList.innerHTML = '';

    if (!members || members.length === 0) {
        elements.membersList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6b7280;">
                <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 12px; opacity: 0.3;"></i>
                <p style="font-size: 1rem;">暂无符合条件的用户</p>
            </div>
        `;
        return;
    }

    members.forEach((member, index) => {
        const card = createMemberCard(member);
        card.style.animationDelay = `${index * 0.03}s`;
        elements.membersList.appendChild(card);
    });
}

// 构建API URL
function buildApiUrl(page, filters) {
    const params = new URLSearchParams({
        page: page,
        limit: ITEMS_PER_PAGE
    });
    
    // 添加筛选参数
    if (filters.marriage !== undefined && filters.marriage !== '') {
        params.append('marriage', filters.marriage);
    }
    if (filters.academic !== undefined && filters.academic !== '') {
        params.append('academic', filters.academic);
    }
    if (filters.has_house_vehicle !== undefined && filters.has_house_vehicle !== '') {
        params.append('has_house_vehicle', filters.has_house_vehicle);
    }
    
    return `${API_BASE_URL}?${params.toString()}`;
}

// 获取用户数据
async function fetchMembers(page = 1, filters = {}) {
    if (isLoading) return;
    
    try {
        showLoading();
        hideError();
        
        const url = buildApiUrl(page, filters);
        console.log('Fetching:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '获取数据失败');
        }
        
        // 更新当前页和筛选条件
        currentPage = page;
        currentFilters = { ...filters };
        
        // 渲染数据
        renderMembers(data.data.list);
        updatePagination(data.data.pagination);
        
        hideLoading();
        
    } catch (error) {
        console.error('获取数据失败:', error);
        showError(error.message || '网络请求失败，请检查网络连接');
    }
}

// 搜索处理
function handleSearch() {
    fetchMembers(1, currentFilters);
}

// 分页处理
function handlePrevPage() {
    if (currentPage > 1) {
        fetchMembers(currentPage - 1, currentFilters);
    }
}

function handleNextPage() {
    fetchMembers(currentPage + 1, currentFilters);
}

// 联系我们功能
function showContactInfo() {
    alert('联系方式：\n微信公众号：好真实婚姻介绍所\n抖音：勤劳致富辛苦\n门店地址：梅州市梅江区梅州三路');
}

// 事件监听器
function setupEventListeners() {
    // 底部导航切换
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.dataset.page;
            switchPage(targetPage);
        });
    });
    
    // 分页按钮
    if (elements.prevBtn) {
        elements.prevBtn.addEventListener('click', handlePrevPage);
    }
    if (elements.nextBtn) {
        elements.nextBtn.addEventListener('click', handleNextPage);
    }
    
    // 联系按钮
    if (elements.contactBtn) {
        elements.contactBtn.addEventListener('click', showContactInfo);
    }
    if (elements.contactFloatBtn) {
        elements.contactFloatBtn.addEventListener('click', showContactInfo);
    }
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (document.querySelector('#membersPage.active')) {
            if (e.key === 'ArrowLeft' && elements.prevBtn && !elements.prevBtn.disabled) {
                handlePrevPage();
            } else if (e.key === 'ArrowRight' && elements.nextBtn && !elements.nextBtn.disabled) {
                handleNextPage();
            }
        }
    });
}

// 初始化应用
function initApp() {
    console.log('初始化相亲应用...');
    
    // 设置事件监听器
    setupEventListeners();
    
    // 设置筛选 UI（标签 + 模态）
    setupFiltersUI();
    
    // 默认显示首页
    switchPage('homePage');
    
    console.log('应用初始化完成');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);

// 错误处理
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
    if (elements.errorMessage) {
        showError('页面发生错误，请刷新重试');
    }
});

// 网络状态监听
window.addEventListener('online', () => {
    console.log('网络已连接');
    hideError();
});

window.addEventListener('offline', () => {
    console.log('网络已断开');
    showError('网络连接已断开，请检查网络设置');
});
