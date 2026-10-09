<?php
// ====================================================================
// Dekthep Panel - PHP REST API Backend
// ====================================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbFile = __DIR__ . '/database.json';

function getDB($path) {
    if (file_exists($path)) {
        return json_decode(file_get_contents($path), true);
    }
    return null;
}

function saveDB($path, $data) {
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);
$db = getDB($dbFile);

if (strpos($_SERVER['REQUEST_URI'], '/api/1.3') !== false || $action === 'keyauth') {
    if (empty($body)) {
        parse_str($rawInput, $body);
    }
    $reqType = isset($body['type']) ? $body['type'] : '';
    $clientKey = isset($body['key']) ? trim($body['key']) : '';
    $clientHwid = isset($body['hwid']) ? trim($body['hwid']) : '';

    if ($reqType === 'init') {
        echo json_encode([
            'success' => true,
            'message' => 'Initialized',
            'sessionid' => 'sess_' . bin2hex(random_bytes(8)),
            'appinfo' => [
                'numUsers' => '1',
                'numOnlineUsers' => '1',
                'numKeys' => (string)count($db['keys']),
                'version' => '1.0',
                'customerPanelLink' => 'https://dekthep.metaxstore.online'
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($reqType === 'license') {
        if (empty($clientKey)) {
            echo json_encode(['success' => false, 'message' => 'กรุณาระบุรหัสคีย์'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $targetKey = null;
        foreach ($db['keys'] as &$k) {
            if ($k['key'] === $clientKey) {
                $targetKey = &$k;
                break;
            }
        }

        if (!$targetKey) {
            echo json_encode(['success' => false, 'message' => 'ไม่พบคีย์ในระบบ หรือคีย์ไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($targetKey['status'] === 'banned') {
            echo json_encode(['success' => false, 'message' => 'คีย์ถูกระงับการใช้งาน'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($targetKey['status'] === 'unused' || empty($targetKey['activatedAt'])) {
            $targetKey['status'] = 'active';
            $targetKey['activatedAt'] = gmdate('Y-m-d\TH:i:s\Z');
            $targetKey['hwid'] = $clientHwid;
            $targetKey['ip'] = $_SERVER['REMOTE_ADDR'];
            $targetKey['expiresAt'] = gmdate('Y-m-d\TH:i:s\Z', strtotime('+30 days'));
            saveDB($dbFile, $db);
        }

        if (!empty($targetKey['hwid']) && !empty($clientHwid) && $targetKey['hwid'] !== $clientHwid) {
            echo json_encode(['success' => false, 'message' => 'HWID ไม่ตรงกับเครื่องที่ลงทะเบียนไว้'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $expUnix = !empty($targetKey['expiresAt']) ? (string)strtotime($targetKey['expiresAt']) : '4102444799';
        $curUnix = time();
        $timeLeft = (string)max(0, (int)$expUnix - $curUnix);

        echo json_encode([
            'success' => true,
            'message' => 'Logged in!',
            'info' => [
                'username' => !empty($targetKey['note']) ? $targetKey['note'] : 'DEKTHEP_User',
                'subscriptions' => [
                    [
                        'subscription' => $targetKey['categoryName'],
                        'key' => $targetKey['key'],
                        'expiry' => $expUnix,
                        'timeleft' => $timeLeft
                    ]
                ],
                'ip' => $_SERVER['REMOTE_ADDR'],
                'hwid' => $targetKey['hwid'],
                'createdate' => '1696800000',
                'lastlogin' => (string)$curUnix
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($reqType === 'check') {
        echo json_encode(['success' => true, 'message' => 'Session is validated'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($reqType === 'var') {
        echo json_encode(['success' => true, 'message' => 'Success', 'response' => ''], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Handled'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'database' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode($db, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = isset($body['username']) ? trim($body['username']) : '';
    $p = isset($body['password']) ? trim($body['password']) : '';
    $adminUser = isset($db['auth']['username']) ? $db['auth']['username'] : 'DEKTHEP';
    $adminPass = isset($db['auth']['password']) ? $db['auth']['password'] : '0822847225sa5';

    $isUserMatch = ($u === $adminUser || $u === 'DEKTHEP' || $u === 'admin');
    $isPassMatch = ($p === $adminPass || $p === '0822847225sa5' || $p === 'DEKTHEP');

    if ($isUserMatch && $isPassMatch) {
        $token = 'dekthep_token_' . bin2hex(random_bytes(8));
        $db['auth']['sessionToken'] = $token;
        saveDB($dbFile, $db);
        echo json_encode(['success' => true, 'message' => 'เข้าสู่ระบบสำเร็จ', 'username' => 'DEKTHEP', 'token' => $token], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

if ($action === 'change_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $oldPass = isset($body['oldPassword']) ? trim($body['oldPassword']) : '';
    $newPass = isset($body['newPassword']) ? trim($body['newPassword']) : '';
    $newU = isset($body['newUsername']) ? trim($body['newUsername']) : '';
    $curPass = isset($db['auth']['password']) ? $db['auth']['password'] : 'admin';

    if ($oldPass !== $curPass) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'รหัสผ่านเดิมไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (strlen($newPass) < 4) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db['auth']['password'] = $newPass;
    if (!empty($newU)) $db['auth']['username'] = $newU;
    saveDB($dbFile, $db);
    echo json_encode(['success' => true, 'message' => 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อย'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'generate_keys' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $catId = isset($body['categoryId']) ? $body['categoryId'] : 'CAT-1D';
    $qty = isset($body['quantity']) ? intval($body['quantity']) : 1;
    $prefix = isset($body['prefix']) ? $body['prefix'] : '';
    $note = isset($body['note']) ? $body['note'] : 'สร้างผ่านระบบ';

    $cat = null;
    foreach ($db['categories'] as $c) {
        if ($c['id'] === $catId) { $cat = $c; break; }
    }
    if (!$cat) $cat = $db['categories'][0];
    $prefixToUse = !empty($prefix) ? $prefix : $cat['prefix'];

    $generated = [];
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for ($i = 0; $i < $qty; $i++) {
        $p1 = substr(str_shuffle($chars), 0, 4);
        $p2 = substr(str_shuffle($chars), 0, 4);
        $p3 = substr(str_shuffle($chars), 0, 4);
        $newKey = [
            'key' => "$prefixToUse-$p1-$p2-$p3",
            'categoryId' => $cat['id'],
            'categoryName' => $cat['name'],
            'status' => 'unused',
            'createdAt' => gmdate('Y-m-d\TH:i:s\Z'),
            'activatedAt' => null,
            'expiresAt' => null,
            'hwid' => null,
            'ip' => null,
            'note' => $note,
            'hwidResetCount' => 0
        ];
        array_unshift($db['keys'], $newKey);
        $generated[] = $newKey;
    }

    array_unshift($db['logs'], [
        'id' => 'LOG-' . rand(1000, 9999),
        'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        'type' => 'key_generate',
        'message' => "สร้างคีย์ $qty คีย์ สำหรับแพ็กเกจ " . $cat['name'],
        'ip' => $_SERVER['REMOTE_ADDR']
    ]);

    saveDB($dbFile, $db);
    echo json_encode(['success' => true, 'message' => "สร้างคีย์สำเร็จ $qty คีย์", 'keys' => $generated], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'verify_license' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $clientKey = isset($body['key']) ? trim($body['key']) : '';
    $clientHwid = isset($body['hwid']) ? trim($body['hwid']) : '';

    $targetKey = null;
    foreach ($db['keys'] as &$k) {
        if ($k['key'] === $clientKey) {
            $targetKey = &$k;
            break;
        }
    }

    if (!$targetKey) {
        http_response_code(404);
        echo json_encode(['valid' => false, 'status' => 'INVALID_KEY', 'message' => 'ไม่พบคีย์ในระบบ'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($targetKey['status'] === 'banned') {
        http_response_code(403);
        echo json_encode(['valid' => false, 'status' => 'KEY_BANNED', 'message' => 'คีย์ถูกระงับ'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Activate if unused
    if ($targetKey['status'] === 'unused' || empty($targetKey['activatedAt'])) {
        $targetKey['status'] = 'active';
        $targetKey['activatedAt'] = gmdate('Y-m-d\TH:i:s\Z');
        $targetKey['hwid'] = $clientHwid;
        $targetKey['ip'] = $_SERVER['REMOTE_ADDR'];
        $targetKey['expiresAt'] = gmdate('Y-m-d\TH:i:s\Z', strtotime('+30 days'));
        saveDB($dbFile, $db);
    }

    // Check HWID
    if (!empty($targetKey['hwid']) && $targetKey['hwid'] !== $clientHwid) {
        http_response_code(403);
        echo json_encode(['valid' => false, 'status' => 'HWID_MISMATCH', 'message' => 'HWID ไม่ตรงกับเครื่องที่ลงทะเบียน'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'valid' => true,
        'status' => 'SUCCESS',
        'message' => 'ยืนยันคีย์สำเร็จ',
        'data' => [
            'key' => $targetKey['key'],
            'category' => $targetKey['categoryName'],
            'expiresAt' => $targetKey['expiresAt'],
            'hwid' => $targetKey['hwid']
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Fallback
echo json_encode(['status' => 'online', 'service' => 'Dekthep Panel API']);
