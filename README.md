# DEKTHEP PANEL - ระบบจัดการคีย์ & เชื่อมต่อแผง RESELLER

ระบบเว็บแผงจัดการคีย์ License และระบบล็อคเครื่อง (HWID Management) จำลองตามโครงสร้างของ `dekthep.metaxstore.online` พร้อมใช้งานได้จริง 100% มีระบบ REST API สำหรับเชื่อมต่อโปรแกรมภายนอกและแผง Reseller

---

## 📁 โครงสร้างไฟล์ในโฟลเดอร์ `sss`

```text
C:\Users\Administrator\Downloads\sss\
├── index.html              # หน้าเว็บหลัก (Modern Cyberpunk & Dark Glassmorphism UI)
├── css/
│   └── style.css           # สไตล์ชีท UI ดีไซน์สวยงาม พร้อม Responsive & Animation
├── js/
│   ├── app.js              # โค้ดควบคุม UI, ตารางคีย์, Modal, ระบบค้นหา และการทำงานทั้งหมด
│   └── api.js              # ตัวเชื่อมต่อ API (รองรับทั้ง Live Server และ Local Database)
├── database.json           # ฐานข้อมูลคีย์, หมวดหมู่, ประวัติกิจกรรม และการตั้งค่าแผง
├── start_server.bat        # [แนะนำ] ดับเบิ้ลคลิกเพื่อเปิดเซิร์ฟเวอร์บน Windows ทันที
├── start_server.ps1        # สคริปต์ PowerShell REST API Server (พอร์ต 8080 ไม่ต้องลงโปรแกรมเพิ่ม)
├── server.js               # Node.js Express Backend (สำหรับรันบน VPS / Linux)
├── package.json            # ไฟล์ตั้งค่าสำหรับ Node.js
├── api.php                 # PHP REST Backend (สำหรับนำไปลงโฮสติ้ง cPanel / XAMPP / Apache)
└── README.md               # คู่มือการใช้งานฉบับนี้
```

---

## 🔐 ข้อมูลเข้าสู่ระบบเริ่มต้น (Default Admin Login)

เมื่อเปิดระบบครั้งแรก ระบบจะมีระบบรักษาความปลอดภัยบังคับล็อกอิน:

* **ชื่อผู้ใช้งาน (Username):** `DEKTHEP`
* **รหัสผ่าน (Password):** `0822847225sa5` (หรือ `DEKTHEP`)

> 💡 **การเปลี่ยนรหัสผ่าน:** หลังจากเข้าสู่ระบบแล้ว สามารถคลิกที่ไอคอนกุญแจ 🔑 ข้างชื่อผู้ใช้ที่มุมขวาบนของหน้าเว็บ เพื่อเปลี่ยนชื่อผู้ใช้งานและรหัสผ่านใหม่ได้ตลอดเวลา

---

## 🚀 วิธีเปิดใช้งาน

### วิธีที่ 1: ดับเบิ้ลคลิกไฟล์ `start_server.bat` (แนะนำสูงสุดบน Windows)
1. ดับเบิ้ลคลิกที่ไฟล์ **`start_server.bat`**
2. ระบบจะเปิดเซิร์ฟเวอร์บน **`http://localhost:8080/`** และเปิดเว็บบนเบราว์เซอร์ให้อัตโนมัติทันที
3. คุณจะได้ทั้งหน้าเว็บควบคุมและ REST API จริง พร้อมรองรับคำขอจากภายนอก

### วิธีที่ 2: เปิดผ่านเบราว์เซอร์โดยตรง (Standalone Local Mode)
- ดับเบิ้ลคลิกที่ไฟล์ **`index.html`** ในเบราว์เซอร์ใดก็ได้ (Chrome, Edge)
- ระบบมีโหมด Local Storage อัตโนมัติ สามารถสร้างคีย์, ปลดล็อค HWID, ต่ออายุ และส่งออกไฟล์ได้ทันที

### วิธีที่ 3: รันด้วย Node.js (หากมี Node.js)
```bash
cd C:\Users\Administrator\Downloads\sss
npm install
npm start
```

### วิธีที่ 4: อัปโหลดขึ้นโฮสติ้ง PHP / cPanel
- อัปโหลดไฟล์ทั้งหมดขึ้นโฟลเดอร์ `public_html` บนโฮสติ้งของคุณ
- ใช้ `api.php` เป็น Backend สำหรับบันทึกข้อมูลลงใน `database.json`

---

## ⚙️ คุณสมบัติหลักในระบบ (Features)

1. **หน้าควบคุมระบบ (Dashboard)**
   - สรุปสถิติคีย์ทั้งหมด, คีย์ที่กำลังใช้งาน, คีย์สต็อกที่รอจำหน่าย, สถิติการผูกเครื่อง HWID
   - แสดงสถานะการเชื่อมต่อกับแผงหลัก (Upstream Reseller Panel) และยอดเงินคงเหลือ
   - บันทึกประวัติกิจกรรมล่าสุดในระบบแบบเรียลไทม์

2. **รายการคีย์ทั้งหมด (All Keys Management)**
   - สร้างคีย์ใหม่ (Bulk Generate) ได้ครั้งละ 1 ถึง 100 คีย์ พร้อมกำหนด Prefix เองได้
   - ระบบค้นหาและตัวกรองตามหมวดหมู่/สถานะ
   - ปุ่มคัดลอกคีย์ด่วน (Copy)
   - ปุ่มต่ออายุคีย์ (Extend Key) เพิ่มจำนวนวันได้ตามต้องการ
   - ปุ่มปลดล็อคเครื่อง (Reset HWID) รายคีย์
   - ปุ่มระงับคีย์ / ปลดระงับ (Ban/Unban)
   - ปุ่มส่งออกรายการคีย์ทั้งหมดเป็นไฟล์ `.txt`

3. **หมวดหมู่คีย์ (Key Categories)**
   - กำหนดแพ็กเกจ: รายวัน (1 Day), รายสัปดาห์ (7 Days), รายเดือน (30 Days), ถาวร (Lifetime)
   - แก้ไขราคา, คำนำหน้า (Prefix), และรายละเอียดแพ็กเกจ

4. **ระบบล็อคเครื่อง (HWID Lock System)**
   - แสดงรายการเครื่องที่ผูกกับคีย์ พร้อม IP Address ล่าสุด
   - ป้องกันการแชร์คีย์ให้บุคคลอื่น
   - แสดงประวัติจำนวนครั้งที่ขอรีเซ็ต HWID
   - ตารางบัญชีดำ (HWID Blacklist) แบนเครื่องที่กระทำผิด

5. **เชื่อมต่อแผง API (Reseller Panel Integration)**
   - กำหนด Base URL ของแผงหลัก (Upstream Panel) และ API Key
   - ปุ่มทดสอบการเชื่อมต่อแผง (Test Connection) เช็ค Latency/Ping และยอดเงินคงเหลือ

6. **เครื่องมือทดสอบ API (Interactive Tester)**
   - หน้าทดสอบยิง API ตรวจสอบคีย์และ HWID เสมือนจริง พร้อมแสดงผล JSON ตอบกลับ

---

## 📡 เอกสาร API สำหรับนำไปเชื่อมต่อในโปรแกรม (Client API)

### 1. ตรวจสอบคีย์ & ผูกเครื่อง (Verify & Bind HWID)
- **URL:** `http://localhost:8080/api/license/verify`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "key": "DEKTHEP-1D-A8F2-99C1-71B0",
  "hwid": "BFEBFBFF000906EA-8C47-D22A-5E91"
}
```

**Response Success (200 OK):**
```json
{
  "valid": true,
  "status": "SUCCESS",
  "message": "ยืนยันคีย์สำเร็จ ยินดีต้อนรับ!",
  "data": {
    "key": "DEKTHEP-1D-A8F2-99C1-71B0",
    "category": "รายวัน (1 Day)",
    "expiresAt": "2026-10-10T08:00:00Z",
    "isLifetime": false,
    "hwid": "BFEBFBFF000906EA-8C47-D22A-5E91",
    "serverTime": "2026-10-09T13:45:00Z"
  }
}
```

**Response Error (403 Forbidden - HWID ไม่ตรงกัน):**
```json
{
  "valid": false,
  "status": "HWID_MISMATCH",
  "message": "HWID ไม่ตรงกับเครื่องที่ลงทะเบียนไว้ กรุณาติดต่อแอดมินเพื่อรีเซ็ต HWID",
  "registeredHwid": "BFEBFBFF..."
}
```

---

### ตัวอย่างโค้ดในภาษา Python

```python
import requests
import subprocess

def get_hwid():
    cmd = 'wmic csproduct get uuid'
    return subprocess.check_output(cmd, shell=True).decode().split('\n')[1].strip()

def check_license(key):
    url = "http://localhost:8080/api/license/verify"
    payload = {
        "key": key,
        "hwid": get_hwid()
    }
    res = requests.post(url, json=payload).json()
    if res.get("valid"):
        print(f"[+] ใช้งานได้! หมดอายุ: {res['data']['expiresAt']}")
        return True
    else:
        print(f"[-] ปฏิเสธ: {res.get('message')}")
        return False

# ทดสอบเรียกใช้
check_license("DEKTHEP-1D-A8F2-99C1-71B0")
```
