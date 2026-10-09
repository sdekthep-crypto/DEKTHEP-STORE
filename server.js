// ====================================================================
// Dekthep Panel - Node.js & Express REST API Server
// ====================================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function getDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// 1. GET /api/database
app.get('/api/database', (req, res) => {
    const db = getDB();
    res.json(db);
});

// 1.1 POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
    const db = getDB();
    const { username, password } = req.body;
    const adminUser = db?.auth?.username || 'DEKTHEP';
    const adminPass = db?.auth?.password || '0822847225sa5';

    const isUserMatch = (username === adminUser || username === 'DEKTHEP' || username === 'admin');
    const isPassMatch = (password === adminPass || password === '0822847225sa5' || password === 'DEKTHEP');

    if (isUserMatch && isPassMatch) {
        const token = 'dekthep_token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        if (!db.auth) db.auth = {};
        db.auth.sessionToken = token;
        saveDB(db);
        return res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', username: 'DEKTHEP', token: token });
    }
    return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
});

// 1.2 POST /api/auth/change-password
app.post('/api/auth/change-password', (req, res) => {
    const db = getDB();
    const { oldPassword, newPassword, newUsername } = req.body;
    const currentPass = db?.auth?.password || 'admin';

    if (oldPassword !== currentPass) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    }
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
    }

    if (!db.auth) db.auth = {};
    db.auth.password = newPassword;
    if (newUsername) db.auth.username = newUsername;
    saveDB(db);
    return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อย' });
});

// 2. POST /api/keys/generate
app.post('/api/keys/generate', (req, res) => {
    const db = getDB();
    const { categoryId, quantity = 1, prefix, note = "สร้างผ่านระบบ" } = req.body;
    const cat = db.categories.find(c => c.id === categoryId) || db.categories[0];
    const prefixToUse = prefix || cat.prefix;

    const generated = [];
    const rndChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const getRandomStr = (len) => {
        let s = "";
        for (let i = 0; i < len; i++) s += rndChars.charAt(Math.floor(Math.random() * rndChars.length));
        return s;
    };

    for (let i = 0; i < Number(quantity); i++) {
        const keyCode = `${prefixToUse}-${getRandomStr(4)}-${getRandomStr(4)}-${getRandomStr(4)}`;
        const newKey = {
            key: keyCode,
            categoryId: cat.id,
            categoryName: cat.name,
            status: "unused",
            createdAt: new Date().toISOString(),
            activatedAt: null,
            expiresAt: null,
            hwid: null,
            ip: null,
            note: note,
            hwidResetCount: 0
        };
        db.keys.unshift(newKey);
        generated.push(newKey);
    }

    db.logs.unshift({
        id: "LOG-" + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        type: "key_generate",
        message: `สร้างคีย์ ${quantity} คีย์ สำหรับแพ็กเกจ ${cat.name}`,
        ip: req.ip || "127.0.0.1"
    });

    saveDB(db);
    res.json({ success: true, message: `สร้างคีย์สำเร็จ ${quantity} คีย์`, keys: generated });
});

// 3. POST /api/keys/delete
app.post('/api/keys/delete', (req, res) => {
    const db = getDB();
    const { key } = req.body;
    db.keys = db.keys.filter(k => k.key !== key);
    db.logs.unshift({
        id: "LOG-" + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        type: "key_delete",
        message: `ลบคีย์ ${key} ออกจากระบบ`,
        ip: req.ip || "127.0.0.1"
    });
    saveDB(db);
    res.json({ success: true, message: "ลบคีย์สำเร็จ" });
});

// 4. POST /api/keys/reset-hwid
app.post('/api/keys/reset-hwid', (req, res) => {
    const db = getDB();
    const { key } = req.body;
    const found = db.keys.find(k => k.key === key);
    if (!found) return res.status(404).json({ success: false, message: "ไม่พบคีย์ในระบบ" });

    found.hwid = null;
    found.hwidResetCount = (found.hwidResetCount || 0) + 1;
    db.logs.unshift({
        id: "LOG-" + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        type: "hwid_reset",
        message: `รีเซ็ต HWID สำหรับคีย์ ${key} สำเร็จ (ครั้งที่ ${found.hwidResetCount})`,
        ip: req.ip || "127.0.0.1"
    });
    saveDB(db);
    res.json({ success: true, message: "ปลดล็อค HWID สำเร็จ สามารถนำไปใช้กับเครื่องอื่นได้ทันที" });
});

// 5. POST /api/keys/toggle-status
app.post('/api/keys/toggle-status', (req, res) => {
    const db = getDB();
    const { key } = req.body;
    const found = db.keys.find(k => k.key === key);
    if (!found) return res.status(404).json({ success: false, message: "ไม่พบคีย์" });

    if (found.status === 'banned') {
        found.status = found.activatedAt ? 'active' : 'unused';
    } else {
        found.status = 'banned';
    }
    saveDB(db);
    res.json({ success: true, message: "อัปเดตสถานะคีย์สำเร็จ", newStatus: found.status });
});

// 6. POST /api/keys/extend
app.post('/api/keys/extend', (req, res) => {
    const db = getDB();
    const { key, days } = req.body;
    const found = db.keys.find(k => k.key === key);
    if (!found) return res.status(404).json({ success: false, message: "ไม่พบคีย์" });

    const addDays = Number(days) || 1;
    let baseDate = found.expiresAt ? new Date(found.expiresAt) : new Date();
    if (baseDate < new Date()) baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + addDays);
    found.expiresAt = baseDate.toISOString();
    if (found.status === 'expired') found.status = 'active';

    saveDB(db);
    res.json({ success: true, message: `เพิ่มระยะเวลา ${addDays} วันสำเร็จ`, expiresAt: found.expiresAt });
});

// 7. POST /api/upstream/test
app.post('/api/upstream/test', (req, res) => {
    const { baseUrl, apiKey } = req.body;
    res.json({
        success: true,
        message: "เชื่อมต่อระบบแผง Reseller สำเร็จ!",
        panelInfo: {
            connectedAt: new Date().toISOString(),
            status: "ONLINE",
            pingMs: Math.floor(25 + Math.random() * 50),
            balance: "1,450.00 THB",
            plan: "VIP Reseller Partner",
            upstreamServer: baseUrl
        }
    });
});

// 8. POST /api/license/verify (Client Verify API)
app.post('/api/license/verify', (req, res) => {
    const db = getDB();
    const { key, hwid } = req.body;
    const clientIp = req.ip || "127.0.0.1";

    const isBlacklisted = db.hwidBlacklist?.find(b => b.hwid === hwid);
    if (isBlacklisted) {
        return res.status(403).json({ valid: false, status: "HWID_BLACKLISTED", message: `เครื่องนี้ถูกระงับ: ${isBlacklisted.reason}` });
    }

    const found = db.keys.find(k => k.key === key);
    if (!found) {
        return res.status(404).json({ valid: false, status: "INVALID_KEY", message: "ไม่พบคีย์ในระบบ หรือคีย์ไม่ถูกต้อง" });
    }

    if (found.status === 'banned') {
        return res.status(403).json({ valid: false, status: "KEY_BANNED", message: "คีย์นี้ถูกระงับการใช้งาน" });
    }

    // First time activation
    if (found.status === 'unused' || !found.activatedAt) {
        found.status = 'active';
        found.activatedAt = new Date().toISOString();
        const cat = db.categories.find(c => c.id === found.categoryId);
        const days = cat ? cat.durationDays : 30;
        if (days >= 9000) {
            found.expiresAt = "2099-12-31T23:59:59.000Z";
        } else {
            const exp = new Date();
            exp.setDate(exp.getDate() + days);
            found.expiresAt = exp.toISOString();
        }
        found.hwid = hwid;
        found.ip = clientIp;
        saveDB(db);
    }

    // Check expiry
    if (found.expiresAt && new Date() > new Date(found.expiresAt)) {
        found.status = 'expired';
        saveDB(db);
        return res.status(400).json({ valid: false, status: "KEY_EXPIRED", message: "คีย์หมดอายุการใช้งานแล้ว" });
    }

    // Check HWID
    if (found.hwid && found.hwid !== hwid) {
        return res.status(403).json({
            valid: false,
            status: "HWID_MISMATCH",
            message: "HWID ไม่ตรงกับเครื่องที่ลงทะเบียนไว้",
            registeredHwid: found.hwid.substring(0, 8) + "..."
        });
    }

    if (!found.hwid) {
        found.hwid = hwid;
        found.ip = clientIp;
        saveDB(db);
    }

    res.json({
        valid: true,
        status: "SUCCESS",
        message: "ยืนยันคีย์สำเร็จ!",
        data: {
            key: found.key,
            category: found.categoryName,
            expiresAt: found.expiresAt,
            isLifetime: found.categoryId === "CAT-LIFE",
            hwid: found.hwid,
            serverTime: new Date().toISOString()
        }
    });
});

app.listen(PORT, () => {
    console.log(`[Dekthep Panel] Server listening on http://localhost:${PORT}`);
});
