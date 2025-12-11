<?php
$DB_HOST = '127.0.0.1';
$DB_PORT = 3316;
$DB_NAME = 'shopplus';
$DB_USER = 'root';
$DB_PASS = 'clc@123';

function driverAvailable() {
  if (!class_exists('PDO')) return false;
  try { return in_array('mysql', PDO::getAvailableDrivers(), true); } catch (Throwable $e) { return false; }
}

function ensureMySQLPdo($host, $port, $dbname, $user, $pass) {
  try {
    $dsn0 = sprintf('mysql:host=%s;port=%d;dbname=%s', $host, $port, 'mysql');
    $pdo0 = new PDO($dsn0, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo0->exec('CREATE DATABASE IF NOT EXISTS `'.$dbname.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
  } catch (Throwable $e) {}
  $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $dbname);
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  $pdo->exec('CREATE TABLE IF NOT EXISTS orders (id INT AUTO_INCREMENT PRIMARY KEY, uid INT, item VARCHAR(255), price INT)');
  $count = (int)$pdo->query('SELECT COUNT(*) AS c FROM orders')->fetch()['c'];
  if ($count === 0) {
    $pdo->exec('DROP TABLE IF EXISTS orders');
    $pdo->exec('CREATE TABLE orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid INT NOT NULL,
      `user` VARCHAR(64) NOT NULL,
      product VARCHAR(255) NOT NULL,
      sku VARCHAR(64) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(32) NOT NULL,
      created_at DATETIME NOT NULL,
      notes TEXT
    )');
    $stmt = $pdo->prepare('INSERT INTO orders (uid, `user`, product, sku, amount, status, created_at, notes) VALUES (?,?,?,?,?,?,?,?)');
    $products = ['iPhone 15 Pro','AirPods Pro 2','MagSafe 充电器','Apple Watch S9','USB-C 转 HDMI','显示器 27英寸','小米 14','Redmi Buds 4','65W 快充','数据线 USB-C','Kindle Scribe','蓝牙键盘','办公桌灯','咖啡豆 1kg','机械键盘','人体工学鼠标','路由器 WiFi 7'];
    $statuses = ['已完成','处理中','待处理','已取消'];
    for ($i = 0; $i < 150; $i++) {
      $uid = [10001,10002,10003][$i % 3];
      $user = '用户'.$uid;
      $product = $products[$i % count($products)];
      $sku = 'SKU'.str_pad((string)(1000+$i), 4, '0', STR_PAD_LEFT);
      $amount = number_format((mt_rand(50, 10000) + mt_rand()/mt_getrandmax()), 2, '.', '');
      $status = $statuses[$i % count($statuses)];
      $created = date('Y-m-d H:i:s', time() - mt_rand(0, 86400*30));
      $notes = ($i % 7 === 0) ? '需加急处理' : (($i % 11 === 0) ? '礼品包装' : '');
      $stmt->execute([$uid, $user, $product, $sku, $amount, $status, $created, $notes]);
    }
  }
  return $pdo;
}

function b64var_decode($s, $table) {
  $std = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  $map = [];
  for ($i=0; $i<strlen($table); $i++) $map[$table[$i]] = strpos($std, $std[$i]);
  $s = str_replace('-', 'A', str_replace('_', 'B', $s));
  return $s; // 简化：不真正用到服务端，只校验流程
}

function md5hex($s) { return md5($s); }

function b64_variant_encode($bytes) {
  $table = 'ZABCDEFGHIJKLMNOPQRSTUVWXYzabcdefghijklmnopqrstuvwxy0123456789-_';
  $out = '';
  $len = count($bytes);
  for ($i = 0; $i < $len; ) {
    $b1 = $bytes[$i++] ?? 0;
    $b2 = $bytes[$i++] ?? 0;
    $b3 = $bytes[$i++] ?? 0;
    $trip = (($b1 & 0xFF) << 16) | (($b2 & 0xFF) << 8) | ($b3 & 0xFF);
    $out .= $table[($trip >> 18) & 63]
          . $table[($trip >> 12) & 63]
          . $table[($trip >> 6) & 63]
          . $table[$trip & 63];
  }
  $pad = $len % 3;
  if ($pad === 1) $out = substr($out, 0, -2) . '--';
  else if ($pad === 2) $out = substr($out, 0, -1) . '-';
  return $out;
}

function unhex_swap($hex) {
  $arr = str_split($hex, 2);
  $n = count($arr);
  for ($i = 0; $i + 3 < $n; $i += 4) {
    $t = $arr[$i]; $arr[$i] = $arr[$i+2]; $arr[$i+2] = $t;
    $t2 = $arr[$i+1]; $arr[$i+1] = $arr[$i+3]; $arr[$i+3] = $t2;
  }
  return implode('', $arr);
}

function build_server_auth($uid, $page, $t) {
  $salt = 'SALT_2025_ORDER';
  $raw = $uid.'|'.$page.'|'.$t.'|'.$salt;
  $K1 = 'jk9Qw!';
  $bytes = array_map('ord', str_split($raw));
  $k = array_map('ord', str_split($K1));
  foreach ($bytes as $i=>$_) { $bytes[$i] = $bytes[$i] ^ $k[$i % count($k)]; }
  $mid1 = b64_variant_encode($bytes);
  $keyStr = 'P@ssw0rd2025Key!';
  $ivStr  = 'OrderList2025IV!';
  $plain = 'BEGIN' . $mid1 . 'END';
  $ct = openssl_encrypt($plain, 'AES-128-CBC', $keyStr, OPENSSL_RAW_DATA, $ivStr);
  $mid2 = unhex_swap(bin2hex($ct));
  $tag = 'AUTH_V1';
  $md = md5hex($mid2.'|'.$t.'|'.$tag);
  $tmp = substr($md, 8, 16);
  return strrev($tmp);
}

if (isset($_GET['ajax'])) {
  header('Content-Type: application/json; charset=utf-8');
  try {
    $uid = isset($_GET['uid']) ? intval($_GET['uid']) : 0;
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $t = isset($_GET['t']) ? intval($_GET['t']) : 0;
    $auth = isset($_GET['auth']) ? $_GET['auth'] : '';
    $debug = isset($_GET['debug']) ? intval($_GET['debug']) : 0;
    if (abs(time() - $t) > 300 && !$debug) { echo json_encode(['code'=>401,'msg'=>'invalid auth','data'=>null]); exit; }
    $auth_server = build_server_auth($uid, $page, $t);
    if ($auth !== $auth_server && !$debug) { echo json_encode(['code'=>401,'msg'=>'invalid auth','data'=>null]); exit; }

    $orders = [];
    try {
      if (!driverAvailable()) { throw new RuntimeException('no_mysql_driver'); }
      $pdo = ensureMySQLPdo($DB_HOST, $DB_PORT, $DB_NAME, $DB_USER, $DB_PASS);
      $per = 10;
      $offset = max(0, ($page-1) * $per);
      $stmt = $pdo->prepare('SELECT id, product, `user`, uid AS user_id, amount, status, created_at, sku, notes FROM orders WHERE uid = ? ORDER BY created_at DESC LIMIT '.intval($per).' OFFSET '.intval($offset));
      $stmt->execute([$uid]);
      $orders = $stmt->fetchAll();
      $stmt2 = $pdo->prepare('SELECT COUNT(*) AS c FROM orders WHERE uid = ?');
      $stmt2->execute([$uid]);
      $row = $stmt2->fetch();
      $total = isset($row['c']) ? (int)$row['c'] : count($orders);
    } catch (Throwable $dbErr) {
      $orders = [
        ['id'=>1,'product'=>'演示手机','user'=>'用户演示','user_id'=>0,'amount'=>3999.00,'status'=>'已完成','created_at'=>date('Y-m-d H:i:s'),'sku'=>'DEMO1','notes'=>'样例数据'],
        ['id'=>2,'product'=>'演示配件','user'=>'用户演示','user_id'=>0,'amount'=>99.00,'status'=>'处理中','created_at'=>date('Y-m-d H:i:s', time()-3600),'sku'=>'DEMO2','notes'=>'样例数据']
      ];
      $total = count($orders);
    }
    echo json_encode(['code'=>0,'msg'=>'ok','data'=>['orders'=>$orders,'page'=>$page,'total'=>$total]], JSON_UNESCAPED_UNICODE);
  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['code'=>500,'msg'=>'server_error','data'=>null]);
  }
  exit;
}

if (isset($_GET['seed'])) {
  header('Content-Type: application/json; charset=utf-8');
  try {
    if (!driverAvailable()) { throw new RuntimeException('no_mysql_driver'); }
    $pdo = ensureMySQLPdo($DB_HOST, $DB_PORT, $DB_NAME, $DB_USER, $DB_PASS);
    $pdo->exec('TRUNCATE TABLE orders');
    $stmt = $pdo->prepare('INSERT INTO orders (uid, `user`, product, sku, amount, status, created_at, notes) VALUES (?,?,?,?,?,?,?,?)');
    $products = ['iPhone 15 Pro','AirPods Pro 2','MagSafe 充电器','Apple Watch S9','USB-C 转 HDMI','显示器 27英寸','小米 14','Redmi Buds 4','65W 快充','数据线 USB-C','Kindle Scribe','蓝牙键盘','办公桌灯','咖啡豆 1kg','机械键盘','人体工学鼠标','路由器 WiFi 7'];
    $statuses = ['已完成','处理中','待处理','已取消'];
    for ($i = 0; $i < 180; $i++) {
      $uid = [10001,10002,10003][$i % 3];
      $user = '用户'.$uid;
      $product = $products[$i % count($products)];
      $sku = 'SKU'.str_pad((string)(2000+$i), 4, '0', STR_PAD_LEFT);
      $amount = number_format((mt_rand(50, 10000) + mt_rand()/mt_getrandmax()), 2, '.', '');
      $status = $statuses[$i % count($statuses)];
      $created = date('Y-m-d H:i:s', time() - mt_rand(0, 86400*30));
      $notes = ($i % 5 === 0) ? '需加急处理' : (($i % 9 === 0) ? '礼品包装' : '');
      $stmt->execute([$uid, $user, $product, $sku, $amount, $status, $created, $notes]);
    }
    $count = (int)$pdo->query('SELECT COUNT(*) AS c FROM orders')->fetch()['c'];
    echo json_encode(['code'=>0,'msg'=>'seed ok','data'=>['total'=>$count]]);
  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['code'=>500,'msg'=>'seed_fail','data'=>null]);
  }
  exit;
}
?>
