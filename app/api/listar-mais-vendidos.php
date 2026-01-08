<?php
// listar-mais-vendidos.php

header("Content-Type: application/json; charset=utf-8");

// ===============================
// CORS (RESTRITO) — ajuste conforme necessário
// ===============================
$allowedOrigins = [
    "https://vitrinedoslinks.com.br",
    "https://www.vitrinedoslinks.com.br",
    "http://127.0.0.1:5501"
];

$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if ($origin && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Vary: Origin");
}

header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

// Se quiser proteger esse GET também, descomente:
// require_once __DIR__ . "/auth.php";
// requireAuth();

require_once __DIR__ . "/../config/Database.php";

function response(int $status, string $msg, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(array_merge([
        "ok" => $status >= 200 && $status < 300,
        "message" => $msg
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ===============================
// LIMIT via querystring
// Ex: /listar-mais-vendidos.php?limit=12
// ===============================
$limit = isset($_GET["limit"]) ? (int) $_GET["limit"] : 5;
if ($limit < 1)
    $limit = 1;
if ($limit > 50)
    $limit = 50;

// Cache curto para home (ajuste se quiser)
header("Cache-Control: public, max-age=60");

try {
    $db = new Database();
} catch (Exception $e) {
    error_log("DB connect error (listar-mais-vendidos): " . $e->getMessage());
    response(500, "Erro interno.");
}

// ===============================
// SELECT (colunas explícitas, sem p.*)
// ===============================
$sql = "
SELECT
  p.affiliate_url,
  p.product_url,
  p.title,
  p.source_image_url,
  p.local_image_path,
  p.shipping_label,
  p.rating_avg,
  p.rating_count,
  p.price_original,
  p.discount_percent,
  p.price_current,
  p.installments_max,
  p.installment_value,
  p.marketplace,
  p.badge_top_seller,
  p.badge_mercado_lider,
  p.badge_oficial,
  (COALESCE(p.rating_avg, 0) * LOG10(1 + COALESCE(p.rating_count, 0))) AS best_seller_score
FROM products p
WHERE p.active = 1
ORDER BY
  best_seller_score DESC,
  COALESCE(p.discount_percent, 0) DESC,
  COALESCE(p.updated_at, p.created_at) DESC
LIMIT ?;
";


$stmt = $db->conn->prepare($sql);
if (!$stmt) {
    error_log("SQL prepare error (listar-mais-vendidos): " . $db->conn->error);
    response(500, "Erro interno.");
}

$stmt->bind_param("i", $limit);

if (!$stmt->execute()) {
    error_log("SQL execute error (listar-mais-vendidos): " . $stmt->error);
    response(500, "Erro interno.");
}

$result = $stmt->get_result();
$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

$stmt->close();

response(200, "Mais vendidos listados com sucesso.", [
    "limit" => $limit,
    "count" => count($items),
    "items" => $items
]);
