<?php
/**
 * deploy.php - Auto Deploy từ GitHub
 * 
 * HƯỚNG DẪN:
 * 1. Upload file này lên htdocs/deploy.php
 * 2. Cấu hình SECRET_KEY bên dưới
 * 3. Setup GitHub Webhook: 
 *    - URL: https://vocab.infinityfreeapp.com/deploy.php
 *    - Secret: [SECRET_KEY của bạn]
 *    - Events: push
 * 4. Mỗi lần push lên GitHub, code tự động update
 */

// ==================== CẤU HÌNH ====================

// Secret key (phải trùng với GitHub Webhook Secret)
define('SECRET_KEY', 'Quockhain49');

// GitHub repository
define('GITHUB_REPO', 'https://github.com/khain7728/VOCABULARY.git');

// Branch cần deploy
define('BRANCH', 'main');

// Thư mục deploy (thường là thư mục hiện tại)
define('DEPLOY_DIR', __DIR__);

// File log
define('LOG_FILE', DEPLOY_DIR . '/deploy.log');

// ==================== FUNCTIONS ====================

function writeLog($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] {$message}\n";
    file_put_contents(LOG_FILE, $logMessage, FILE_APPEND);
    echo $logMessage;
}

function verifyGitHubSignature($payload, $signature) {
    $hash = 'sha256=' . hash_hmac('sha256', $payload, SECRET_KEY);
    return hash_equals($hash, $signature);
}

function executeCommand($command) {
    writeLog("Executing: {$command}");
    exec($command . ' 2>&1', $output, $returnCode);
    foreach ($output as $line) {
        writeLog($line);
    }
    if ($returnCode !== 0) {
        writeLog("ERROR: Command failed with code {$returnCode}");
        return false;
    }
    return true;
}

function backupImportantFiles() {
    $backupDir = DEPLOY_DIR . '/backup_' . date('YmdHis');
    $filesToBackup = [
        'config/database.php',
        'config/oauth.php',
        '.htaccess'
    ];
    mkdir($backupDir, 0755, true);
    foreach ($filesToBackup as $file) {
        $source = DEPLOY_DIR . '/' . $file;
        if (file_exists($source)) {
            $dest = $backupDir . '/' . basename($file);
            copy($source, $dest);
            writeLog("Backed up: {$file}");
        }
    }
    return $backupDir;
}

function restoreBackup($backupDir) {
    if (!is_dir($backupDir)) return;
    $files = scandir($backupDir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        $source = $backupDir . '/' . $file;
        $dest = DEPLOY_DIR . '/config/' . $file;
        if (file_exists($source)) {
            copy($source, $dest);
            writeLog("Restored: {$file}");
        }
    }
}

function deployFromGitHub() {
    writeLog("=== BẮT ĐẦU DEPLOY ===");
    $backupDir = backupImportantFiles();
    if (!is_dir(DEPLOY_DIR . '/.git')) {
        writeLog("Chưa có Git repo, đang clone...");
        $cloneCmd = "git clone " . GITHUB_REPO . " " . DEPLOY_DIR . "_temp";
        if (!executeCommand($cloneCmd)) {
            writeLog("ERROR: Clone failed");
            return false;
        }
        rename(DEPLOY_DIR . "_temp/.git", DEPLOY_DIR . "/.git");
        executeCommand("rm -rf " . DEPLOY_DIR . "_temp");
        writeLog("Clone hoàn tất");
    }
    if (!executeCommand("cd " . DEPLOY_DIR . " && git fetch origin " . BRANCH)) {
        writeLog("ERROR: Git fetch failed");
        restoreBackup($backupDir);
        return false;
    }
    if (!executeCommand("cd " . DEPLOY_DIR . " && git reset --hard origin/" . BRANCH)) {
        writeLog("ERROR: Git reset failed");
        restoreBackup($backupDir);
        return false;
    }
    executeCommand("cd " . DEPLOY_DIR . " && git clean -fd");
    restoreBackup($backupDir);
    executeCommand("chmod 755 " . DEPLOY_DIR . "/uploads");
    executeCommand("chmod 755 " . DEPLOY_DIR . "/logs");
    writeLog("=== DEPLOY THÀNH CÔNG ===");
    return true;
}

// ==================== MAIN ====================

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die('Method not allowed');
}

$payload = file_get_contents('php://input');
$signature = isset($_SERVER['HTTP_X_HUB_SIGNATURE_256']) 
    ? $_SERVER['HTTP_X_HUB_SIGNATURE_256'] 
    : '';

if (!verifyGitHubSignature($payload, $signature)) {
    writeLog("ERROR: Invalid signature");
    http_response_code(403);
    die('Invalid signature');
}

$data = json_decode($payload, true);

if (!isset($data['ref']) || $data['ref'] !== 'refs/heads/' . BRANCH) {
    writeLog("Skipping: Not a push to " . BRANCH);
    http_response_code(200);
    die('Not a push to ' . BRANCH);
}

$success = deployFromGitHub();

if ($success) {
    http_response_code(200);
    echo "Deploy successful";
} else {
    http_response_code(500);
    echo "Deploy failed. Check " . LOG_FILE;
}
?>
