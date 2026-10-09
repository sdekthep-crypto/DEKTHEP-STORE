// ====================================================================
// Dekthep Panel - Frontend Application Logic
// ====================================================================

let dbState = null;

// Initialize app on DOM Load
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initEventListeners();
  checkAuthAndInit();
});

function checkAuthAndInit() {
  const overlay = document.getElementById('authOverlay');
  const userDisplay = document.getElementById('displayAdminUser');

  if (API.isLoggedIn()) {
    if (overlay) overlay.style.display = 'none';
    if (userDisplay) userDisplay.textContent = API.getCurrentUser();
    loadAndRender();
  } else {
    if (overlay) overlay.style.display = 'flex';
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'ri-checkbox-circle-line' :
               type === 'error' ? 'ri-error-warning-line' : 'ri-information-line';

  toast.innerHTML = `
    <i class="${icon}" style="font-size: 18px;"></i>
    <div>${message}</div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modal helpers
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('open');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('open');
}

// Navigation handling
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPage = item.getAttribute('data-page');
      navigateTo(targetPage);
    });
  });
}

function navigateTo(pageId) {
  // Update sidebar active class
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-page') === pageId);
  });

  // Switch visible section
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.style.display = 'none';
  });
  const activeSection = document.getElementById(`page-${pageId}`);
  if (activeSection) activeSection.style.display = 'block';

  // Update topbar headers
  const pageTitles = {
    dashboard: { title: 'หน้าควบคุมระบบ', desc: 'ภาพรวมสถิติคีย์, การผูกเครื่อง HWID และการเชื่อมต่อแผง', icon: 'ri-dashboard-3-line' },
    keys: { title: 'รายการคีย์ทั้งหมด', desc: 'จัดการคีย์ทั้งหมด, สร้างคีย์ใหม่, ปลดล็อค HWID และต่ออายุ', icon: 'ri-key-2-line' },
    categories: { title: 'หมวดหมู่คีย์', desc: 'กำหนดแพ็กเกจระยะเวลา, ราคาขาย และคำนำหน้าคีย์ (Prefix)', icon: 'ri-folders-line' },
    hwid: { title: 'ระบบล็อคเครื่อง (HWID)', desc: 'ตรวจสอบเครื่องที่ผูกกับคีย์, ประวัติการเข้าใช้ และปลดล็อคเครื่อง', icon: 'ri-computer-line' },
    upstream: { title: 'เชื่อมต่อแผง API', desc: 'ตั้งค่า API Key และ URL สำหรับซิงค์กับแผง Reseller หลัก', icon: 'ri-cloud-line' },
    docs: { title: 'เอกสาร API (Client)', desc: 'ตัวอย่างโค้ดสำหรับนำไปเชื่อมต่อในบอท สคริปต์ หรือโปรแกรม', icon: 'ri-code-box-line' },
    tester: { title: 'ทดสอบยิง API คีย์', desc: 'เครื่องมือจำลองการตรวจสอบคีย์และล็อคเครื่องเสมือนจริง', icon: 'ri-terminal-box-line' }
  };

  const meta = pageTitles[pageId] || pageTitles.dashboard;
  document.getElementById('currentPageText').textContent = meta.title;
  document.getElementById('currentPageDesc').textContent = meta.desc;
  document.getElementById('currentPageIcon').className = meta.icon;
}

// Fetch database and update all views
async function loadAndRender() {
  dbState = await API.init();
  updateServerIndicator();
  if (!dbState) return;

  renderDashboard();
  renderKeysTable();
  renderCategories();
  renderHwidTable();
  renderUpstreamSettings();
}

function updateServerIndicator() {
  const pulse = document.getElementById('serverPulse');
  const text = document.getElementById('serverStatusText');
  if (API.isLiveServer) {
    pulse.style.backgroundColor = '#10b981';
    pulse.style.boxShadow = '0 0 10px #10b981';
    text.textContent = 'REST API เซิร์ฟเวอร์ออนไลน์';
  } else {
    pulse.style.backgroundColor = '#38bdf8';
    pulse.style.boxShadow = '0 0 10px #38bdf8';
    text.textContent = 'ระบบ Local Database พร้อมใช้';
  }
}

// Render Dashboard
function renderDashboard() {
  if (!dbState) return;

  const totalKeys = dbState.keys.length;
  const activeKeys = dbState.keys.filter(k => k.status === 'active').length;
  const unusedKeys = dbState.keys.filter(k => k.status === 'unused').length;
  const hwidBound = dbState.keys.filter(k => k.hwid && k.hwid.trim() !== '').length;

  document.getElementById('statTotalKeys').textContent = totalKeys;
  document.getElementById('statActiveKeys').textContent = activeKeys;
  document.getElementById('statUnusedKeys').textContent = unusedKeys;
  document.getElementById('statHwidBound').textContent = hwidBound;

  // Logs table
  const tbody = document.getElementById('recentLogsTableBody');
  tbody.innerHTML = '';
  const logs = (dbState.logs || []).slice(0, 10);

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 24px;">ไม่มีประวัติกิจกรรม</td></tr>`;
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement('tr');
    const dateStr = new Date(log.timestamp).toLocaleString('th-TH');
    
    let badgeClass = 'badge-unused';
    if (log.type.includes('success') || log.type.includes('activate')) badgeClass = 'badge-active';
    if (log.type.includes('delete') || log.type.includes('ban')) badgeClass = 'badge-banned';
    if (log.type.includes('hwid')) badgeClass = 'badge-category';

    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 12px;">${dateStr}</td>
      <td><span class="badge ${badgeClass}">${log.type}</span></td>
      <td>${log.message}</td>
      <td style="font-family: monospace; color: var(--text-dim);">${log.ip || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Keys Table
function renderKeysTable() {
  if (!dbState) return;

  const tbody = document.getElementById('keysTableBody');
  const catFilter = document.getElementById('keyFilterCategory').value;
  const statusFilter = document.getElementById('keyFilterStatus').value;
  const searchVal = document.getElementById('keySearchInput').value.toLowerCase().trim();

  // Populate category select filter if needed
  const catSelect = document.getElementById('keyFilterCategory');
  if (catSelect.options.length <= 1) {
    dbState.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      catSelect.appendChild(opt);
    });
  }

  // Filter keys
  const filtered = dbState.keys.filter(k => {
    if (catFilter && k.categoryId !== catFilter) return false;
    if (statusFilter && k.status !== statusFilter) return false;
    if (searchVal) {
      const matchKey = k.key.toLowerCase().includes(searchVal);
      const matchHwid = (k.hwid || '').toLowerCase().includes(searchVal);
      const matchNote = (k.note || '').toLowerCase().includes(searchVal);
      if (!matchKey && !matchHwid && !matchNote) return false;
    }
    return true;
  });

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 30px;">ไม่พบคีย์ที่ตรงตามเงื่อนไข</td></tr>`;
    return;
  }

  filtered.forEach(k => {
    const tr = document.createElement('tr');
    
    let statusBadge = '';
    if (k.status === 'active') statusBadge = '<span class="badge badge-active"><i class="ri-checkbox-circle-fill"></i> ใช้งานได้</span>';
    else if (k.status === 'unused') statusBadge = '<span class="badge badge-unused"><i class="ri-inbox-fill"></i> ว่าง (พร้อมใช้)</span>';
    else if (k.status === 'expired') statusBadge = '<span class="badge badge-expired"><i class="ri-time-fill"></i> หมดอายุ</span>';
    else if (k.status === 'banned') statusBadge = '<span class="badge badge-banned"><i class="ri-prohibited-line"></i> ถูกระงับ</span>';

    const activatedStr = k.activatedAt ? new Date(k.activatedAt).toLocaleDateString('th-TH') : '-';
    let expiresStr = '-';
    if (k.expiresAt) {
      expiresStr = k.categoryId === 'CAT-LIFE' ? 'ตลอดชีพ (Lifetime)' : new Date(k.expiresAt).toLocaleDateString('th-TH');
    }

    const hwidDisplay = k.hwid ? `<span class="hwid-tag" title="${k.hwid}">${k.hwid}</span>` : '<span style="color: var(--text-dim);">-</span>';

    tr.innerHTML = `
      <td>
        <span class="key-code">
          <span>${k.key}</span>
          <button class="btn-copy" onclick="copyText('${k.key}')" title="คัดลอกคีย์"><i class="ri-file-copy-line"></i></button>
        </span>
      </td>
      <td><span class="badge badge-category">${k.categoryName}</span></td>
      <td>${statusBadge}</td>
      <td style="color: var(--text-muted); font-size: 12px;">${activatedStr}</td>
      <td style="color: var(--text-muted); font-size: 12px;">${expiresStr}</td>
      <td>${hwidDisplay}</td>
      <td style="font-size: 12px; color: var(--text-muted);">${k.note || '-'}</td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 6px;">
          <button class="btn btn-outline btn-sm" onclick="openExtendKeyModal('${k.key}')" title="ต่ออายุคีย์">
            <i class="ri-time-line"></i>
          </button>
          <button class="btn btn-outline btn-sm" onclick="handleResetHwid('${k.key}')" title="ปลดล็อคเครื่อง HWID">
            <i class="ri-refresh-line"></i>
          </button>
          <button class="btn btn-outline btn-sm" onclick="handleToggleStatus('${k.key}')" title="${k.status === 'banned' ? 'ปลดระงับ' : 'ระงับคีย์'}">
            <i class="${k.status === 'banned' ? 'ri-lock-unlock-line' : 'ri-lock-line'}" style="color: ${k.status === 'banned' ? '#34d399' : '#f87171'}"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="handleDeleteKey('${k.key}')" title="ลบคีย์">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Categories
function renderCategories() {
  if (!dbState) return;

  const tbody = document.getElementById('categoriesTableBody');
  tbody.innerHTML = '';

  // Also update GenKey Modal Category Select
  const genCatSelect = document.getElementById('genCategoryId');
  genCatSelect.innerHTML = '';

  dbState.categories.forEach(c => {
    // Fill select
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.price}฿)`;
    genCatSelect.appendChild(opt);

    // Fill table
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; color: var(--primary); font-weight: 600;">${c.id}</td>
      <td><strong style="color: #ffffff;">${c.name}</strong></td>
      <td><span class="badge badge-unused">${c.prefix}</span></td>
      <td>${c.durationDays >= 9000 ? 'ถาวร (Lifetime)' : `${c.durationDays} วัน`}</td>
      <td><strong style="color: #34d399;">${c.price} ฿</strong></td>
      <td style="color: var(--text-muted); font-size: 12px;">${c.description || '-'}</td>
      <td style="text-align: right;">
        <button class="btn btn-outline btn-sm" onclick="openEditCategoryModal('${c.id}')">
          <i class="ri-edit-line"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="handleDeleteCategory('${c.id}')">
          <i class="ri-delete-bin-line"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render HWID Management
function renderHwidTable() {
  if (!dbState) return;

  const tbody = document.getElementById('hwidTableBody');
  tbody.innerHTML = '';

  const boundKeys = dbState.keys.filter(k => k.hwid && k.hwid.trim() !== '');
  if (boundKeys.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 30px;">ยังไม่มีเครื่องที่ผูกกับคีย์ในขณะนี้</td></tr>`;
  } else {
    boundKeys.forEach(k => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: 'Fira Code', monospace; color: #38bdf8;">${k.hwid}</td>
        <td><span class="key-code" style="font-size: 11px;">${k.key}</span></td>
        <td><span class="badge badge-category">${k.categoryName}</span></td>
        <td style="font-family: monospace; color: var(--text-dim);">${k.ip || '-'}</td>
        <td><span class="badge badge-active">ผูกเรียบร้อย</span></td>
        <td style="text-align: center;">${k.hwidResetCount || 0} ครั้ง</td>
        <td style="text-align: right;">
          <button class="btn btn-outline btn-sm" onclick="handleResetHwid('${k.key}')">
            <i class="ri-refresh-line"></i> ปลดล็อค HWID
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Blacklist table
  const blBody = document.getElementById('hwidBlacklistTableBody');
  blBody.innerHTML = '';
  const bl = dbState.hwidBlacklist || [];
  if (bl.length === 0) {
    blBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-dim); padding: 20px;">ไม่มีรายการ Blacklist</td></tr>`;
  } else {
    bl.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: 'Fira Code', monospace; color: #f87171;">${item.hwid}</td>
        <td>${item.reason}</td>
        <td style="color: var(--text-dim);">${new Date(item.bannedAt).toLocaleDateString('th-TH')}</td>
      `;
      blBody.appendChild(tr);
    });
  }
}

// Render Upstream Settings
function renderUpstreamSettings() {
  if (!dbState || !dbState.settings || !dbState.settings.upstreamPanel) return;
  const cfg = dbState.settings.upstreamPanel;
  document.getElementById('upstreamBaseUrl').value = cfg.baseUrl || '';
  document.getElementById('upstreamApiKey').value = cfg.apiKey || '';
  document.getElementById('upstreamResellerId').value = cfg.resellerId || '';
  document.getElementById('upstreamSyncMode').value = cfg.syncMode || 'local_first';
  document.getElementById('dashboardUpstreamStatus').innerHTML = `กำลังเชื่อมต่อแผง: <span style="color: #38bdf8;">${cfg.baseUrl || '-'}</span>`;
}

// Action Handlers
async function handleResetHwid(key) {
  if (!confirm(`คุณต้องการปลดล็อคเครื่อง (Reset HWID) สำหรับคีย์ ${key} ใช่หรือไม่?`)) return;
  const res = await API.resetHwid(key);
  if (res.success) {
    showToast(res.message, 'success');
    await loadAndRender();
  } else {
    showToast(res.message, 'error');
  }
}

async function handleToggleStatus(key) {
  const res = await API.toggleStatus(key);
  if (res.success) {
    showToast(res.message, 'info');
    await loadAndRender();
  }
}

async function handleDeleteKey(key) {
  if (!confirm(`ยืนยันการลบคีย์ ${key} ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้!`)) return;
  const res = await API.deleteKey(key);
  if (res.success) {
    showToast(res.message, 'success');
    await loadAndRender();
  }
}

function openExtendKeyModal(key) {
  document.getElementById('extendTargetKey').value = key;
  document.getElementById('extendKeyDisplay').textContent = key;
  openModal('modalExtendKey');
}

// Init Event Listeners
function initEventListeners() {
  // --- AUTHENTICATION EVENT LISTENERS ---
  const formLogin = document.getElementById('formLogin');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('loginUsername').value.trim();
      const p = document.getElementById('loginPassword').value.trim();
      const alertBox = document.getElementById('authAlert');
      const alertMsg = document.getElementById('authAlertMsg');

      const res = await API.login(u, p);
      if (res.success) {
        if (alertBox) alertBox.style.display = 'none';
        document.getElementById('authOverlay').style.display = 'none';
        document.getElementById('displayAdminUser').textContent = res.username || u;
        showToast(`ยินดีต้อนรับคุณ ${res.username || u}!`, 'success');
        await loadAndRender();
      } else {
        if (alertBox) {
          alertMsg.textContent = res.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
          alertBox.style.display = 'flex';
        }
      }
    });
  }

  // Toggle Password Visibility in Login
  const btnTogglePass = document.getElementById('btnToggleLoginPass');
  if (btnTogglePass) {
    btnTogglePass.addEventListener('click', () => {
      const input = document.getElementById('loginPassword');
      const icon = document.getElementById('iconTogglePass');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'ri-eye-off-line';
      } else {
        input.type = 'password';
        icon.className = 'ri-eye-line';
      }
    });
  }

  // Logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        API.logout();
        document.getElementById('authOverlay').style.display = 'flex';
        document.getElementById('loginPassword').value = '';
        showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
      }
    });
  }

  // Open Change Password Modal
  const btnOpenChangePass = document.getElementById('btnOpenChangePassModal');
  if (btnOpenChangePass) {
    btnOpenChangePass.addEventListener('click', () => {
      document.getElementById('changeNewUsername').value = API.getCurrentUser();
      document.getElementById('changeOldPassword').value = '';
      document.getElementById('changeNewPassword').value = '';
      document.getElementById('changeConfirmPassword').value = '';
      openModal('modalChangePassword');
    });
  }

  // Submit Change Password
  const formChangePass = document.getElementById('formChangePassword');
  if (formChangePass) {
    formChangePass.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newU = document.getElementById('changeNewUsername').value.trim();
      const oldP = document.getElementById('changeOldPassword').value.trim();
      const newP = document.getElementById('changeNewPassword').value.trim();
      const confP = document.getElementById('changeConfirmPassword').value.trim();

      if (newP !== confP) {
        return showToast('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน', 'error');
      }

      const res = await API.changePassword(oldP, newP, newU);
      if (res.success) {
        closeModal('modalChangePassword');
        showToast(res.message, 'success');
        if (newU) {
          document.getElementById('displayAdminUser').textContent = newU;
        }
      } else {
        showToast(res.message, 'error');
      }
    });
  }

  // Quick Gen Key & Topbar
  document.getElementById('btnQuickGenKey').addEventListener('click', () => openModal('modalGenKeys'));
  document.getElementById('btnOpenGenModal').addEventListener('click', () => openModal('modalGenKeys'));
  document.getElementById('btnRefreshAll').addEventListener('click', async () => {
    await loadAndRender();
    showToast('รีเฟรชข้อมูลล่าสุดเรียบร้อย', 'info');
  });

  // Search & Filter
  document.getElementById('keySearchInput').addEventListener('input', renderKeysTable);
  document.getElementById('keyFilterCategory').addEventListener('change', renderKeysTable);
  document.getElementById('keyFilterStatus').addEventListener('change', renderKeysTable);

  // Form Generate Keys
  document.getElementById('formGenKeys').addEventListener('submit', async (e) => {
    e.preventDefault();
    const catId = document.getElementById('genCategoryId').value;
    const qty = document.getElementById('genQuantity').value;
    const prefix = document.getElementById('genPrefix').value.trim();
    const note = document.getElementById('genNote').value.trim();

    const res = await API.generateKeys(catId, qty, prefix, note);
    if (res.success) {
      closeModal('modalGenKeys');
      showToast(res.message, 'success');
      await loadAndRender();

      // Show result modal
      const keyList = res.keys.map(k => k.key).join('\n');
      document.getElementById('resultKeysTextarea').value = keyList;
      openModal('modalResultKeys');
    }
  });

  // Copy result keys
  document.getElementById('btnCopyResultKeys').addEventListener('click', () => {
    const val = document.getElementById('resultKeysTextarea').value;
    copyText(val);
    showToast('คัดลอกคีย์ทั้งหมดเรียบร้อยแล้ว!', 'success');
  });

  // Form Extend Key
  document.getElementById('formExtendKey').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = document.getElementById('extendTargetKey').value;
    const days = document.getElementById('extendDays').value;
    const res = await API.extendKey(key, days);
    if (res.success) {
      closeModal('modalExtendKey');
      showToast(res.message, 'success');
      await loadAndRender();
    }
  });

  // Export Keys to TXT
  document.getElementById('btnExportKeys').addEventListener('click', () => {
    if (!dbState || dbState.keys.length === 0) return showToast('ไม่มีคีย์สำหรับส่งออก', 'error');
    const txt = dbState.keys.map(k => `${k.key}\t${k.categoryName}\t${k.status}\t${k.expiresAt || 'Lifetime'}\t${k.hwid || 'No-HWID'}\t${k.note || ''}`).join('\n');
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dekthep-keys-export-${Date.now()}.txt`;
    a.click();
    showToast('ส่งออกไฟล์คีย์เรียบร้อยแล้ว', 'success');
  });

  // Category Form
  document.getElementById('btnOpenAddCategoryModal').addEventListener('click', () => {
    document.getElementById('categoryModalTitle').innerHTML = '<i class="ri-folders-line"></i> เพิ่มหมวดหมู่ใหม่';
    document.getElementById('categoryFormId').value = '';
    document.getElementById('catName').value = '';
    document.getElementById('catPrefix').value = '';
    document.getElementById('catDays').value = '7';
    document.getElementById('catPrice').value = '250';
    document.getElementById('catDesc').value = '';
    openModal('modalCategory');
  });

  document.getElementById('formCategory').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('categoryFormId').value || ('CAT-' + Date.now().toString(36).toUpperCase());
    const newCat = {
      id: id,
      name: document.getElementById('catName').value.trim(),
      prefix: document.getElementById('catPrefix').value.trim(),
      durationDays: Number(document.getElementById('catDays').value),
      price: Number(document.getElementById('catPrice').value),
      description: document.getElementById('catDesc').value.trim(),
      color: '#38bdf8'
    };
    const res = await API.saveCategory(newCat);
    if (res.success) {
      closeModal('modalCategory');
      showToast(res.message, 'success');
      await loadAndRender();
    }
  });

  // Test Upstream Connection
  document.getElementById('btnTestUpstream').addEventListener('click', async () => {
    const url = document.getElementById('upstreamBaseUrl').value.trim();
    const key = document.getElementById('upstreamApiKey').value.trim();
    showToast('กำลังส่งสัญญาณทดสอบแผง Reseller...', 'info');

    const res = await API.testUpstreamPanel(url, key);
    if (res.success) {
      const box = document.getElementById('upstreamResultBox');
      const content = document.getElementById('upstreamResultContent');
      content.innerHTML = `
        <div>🟢 <strong>สถานะแผง:</strong> ${res.panelInfo.status} (เชื่อมต่อได้ตามปกติ)</div>
        <div>⚡ <strong>Latency / Ping:</strong> ${res.panelInfo.pingMs} ms</div>
        <div>💰 <strong>ยอดเงินคงเหลือในแผง:</strong> <span style="color: #34d399; font-weight: 700;">${res.panelInfo.balance}</span></div>
        <div>🏷️ <strong>ระดับบัญชีตัวแทน:</strong> ${res.panelInfo.plan}</div>
        <div>🔗 <strong>Server:</strong> ${res.panelInfo.upstreamServer}</div>
        <div>⏱️ <strong>เวลาทดสอบ:</strong> ${res.panelInfo.connectedAt}</div>
      `;
      box.style.display = 'block';
      showToast('เชื่อมต่อแผง Reseller สำเร็จ!', 'success');
    }
  });

  document.getElementById('btnSyncUpstream').addEventListener('click', () => {
    document.getElementById('btnTestUpstream').click();
  });

  // Upstream Form Save
  document.getElementById('formUpstreamSettings').addEventListener('submit', async (e) => {
    e.preventDefault();
    const settings = dbState.settings || {};
    settings.upstreamPanel = {
      enabled: true,
      baseUrl: document.getElementById('upstreamBaseUrl').value.trim(),
      apiKey: document.getElementById('upstreamApiKey').value.trim(),
      resellerId: document.getElementById('upstreamResellerId').value.trim(),
      syncMode: document.getElementById('upstreamSyncMode').value
    };
    const res = await API.saveSettings(settings);
    if (res.success) {
      showToast('บันทึกการตั้งค่าแผงเรียบร้อย', 'success');
      await loadAndRender();
    }
  });

  // API Tester
  document.getElementById('btnFillRandomKey').addEventListener('click', () => {
    if (dbState && dbState.keys.length > 0) {
      const rnd = dbState.keys[Math.floor(Math.random() * dbState.keys.length)];
      document.getElementById('testKeyInput').value = rnd.key;
      document.getElementById('testHwidInput').value = rnd.hwid || 'HWID-TEST-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    }
  });

  document.getElementById('btnExecuteTestVerify').addEventListener('click', async () => {
    const key = document.getElementById('testKeyInput').value.trim();
    const hwid = document.getElementById('testHwidInput').value.trim();
    if (!key) return showToast('กรุณาระบุรหัสคีย์ที่ต้องการทดสอบ', 'error');

    const consoleOut = document.getElementById('testOutputConsole');
    consoleOut.textContent = '// กำลังส่งคำขอตรวจสอบคีย์ไปยัง /api/license/verify...';

    const res = await API.verifyLicense(key, hwid);
    consoleOut.textContent = JSON.stringify(res, null, 2);

    if (res.valid) {
      showToast('คีย์ถูกต้องและผ่านการตรวจสอบ!', 'success');
    } else {
      showToast(`ปฏิเสธ: ${res.message}`, 'error');
    }
    await loadAndRender();
  });
}

// Copy helpers
function copyText(text) {
  navigator.clipboard.writeText(text);
  showToast(`คัดลอก: ${text}`, 'info');
}

function copyCode(btn) {
  const pre = btn.nextElementSibling;
  navigator.clipboard.writeText(pre.textContent);
  btn.textContent = 'คัดลอกแล้ว!';
  setTimeout(() => btn.textContent = 'คัดลอก', 2000);
}

function openEditCategoryModal(id) {
  const cat = dbState.categories.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('categoryModalTitle').innerHTML = '<i class="ri-edit-line"></i> แก้ไขหมวดหมู่';
  document.getElementById('categoryFormId').value = cat.id;
  document.getElementById('catName').value = cat.name;
  document.getElementById('catPrefix').value = cat.prefix;
  document.getElementById('catDays').value = cat.durationDays;
  document.getElementById('catPrice').value = cat.price;
  document.getElementById('catDesc').value = cat.description || '';
  openModal('modalCategory');
}

async function handleDeleteCategory(id) {
  if (!confirm(`ยืนยันการลบหมวดหมู่ ${id}?`)) return;
  const res = await API.deleteCategory(id);
  if (res.success) {
    showToast(res.message, 'success');
    await loadAndRender();
  }
}
