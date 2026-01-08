<?php
header("Content-Type: application/json; charset=utf-8");

// ===============================
// CORS (RESTRITO) — ajuste se precisar
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
// Params
// ===============================
$limit = isset($_GET["limit"]) ? (int) $_GET["limit"] : 5;

// Segurança limit
$MAX_LIMIT = 50; // você pode subir, mas recomendo manter 50
if ($limit < 1)
    $limit = 1;
if ($limit > $MAX_LIMIT)
    $limit = $MAX_LIMIT;

// Pool interno (top N antes do random). Mantém coerência com seu SQL original.
$POOL_SIZE = 50;

// Cache curto (opcional)
header("Cache-Control: public, max-age=60");

try {
    $db = new Database();
} catch (Exception $e) {
    error_log("DB connect error (listar-destaques): " . $e->getMessage());
    response(500, "Erro interno.");
}

// ===============================
// SELECT (enxuto para o card + category_url + score)
// ===============================
$sql = "
SELECT *
FROM (
  SELECT *
  FROM (
    SELECT
      -- campos necessários para o card.js
      p.affiliate_url,
      p.product_url,
      p.title,
      p.source_image_url,
      p.local_image_path,
      p.shipping_label,
      p.shipping_free,
      p.rating_avg,
      p.rating_count,
      p.price_original,
      p.discount_percent,
      p.price_current,
      p.installments_max,
      p.installment_value,
      p.marketplace,
      p.badge_oficial,
      p.badge_mercado_lider,
      p.badge_top_seller,
      p.badge_em_alta,

      -- categoria (opcional, mas útil)
      c.slug AS category_slug,
      c.name AS category_name,
      c.url  AS category_url,

      (
        (COALESCE(p.rating_avg, 0) * LOG10(1 + COALESCE(p.rating_count, 0)))
        + (COALESCE(p.discount_percent, 0) / 10)
        + (COALESCE(p.badge_oficial, 0) * 0.8)
        + (COALESCE(p.badge_mercado_lider, 0) * 0.6)
        + (COALESCE(p.badge_top_seller, 0) * 0.4)
        + (COALESCE(p.badge_em_alta, 0) * 0.2)
      ) AS score
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.active = 1
      AND p.shipping_free = 1
      AND COALESCE(p.rating_avg, 0) >= 4.5
      AND COALESCE(p.rating_count, 0) >= 100
  ) ranked
  ORDER BY ranked.score DESC
  LIMIT ?
) pool
ORDER BY RAND()
LIMIT ?;
";

$stmt = $db->conn->prepare($sql);
if (!$stmt) {
    error_log("SQL prepare error (listar-destaques): " . $db->conn->error);
    response(500, "Erro interno.");
}

// bind_param: pool_size e limit (ambos int)
$stmt->bind_param("ii", $POOL_SIZE, $limit);

if (!$stmt->execute()) {
    error_log("SQL execute error (listar-destaques): " . $stmt->error);
    response(500, "Erro interno.");
}

$result = $stmt->get_result();
$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

$stmt->close();

response(200, "Destaques listados com sucesso.", [
    "filters" => [
        "limit" => $limit,
        "max_limit" => $MAX_LIMIT,
        "pool_size" => $POOL_SIZE,
        "rules" => [
            "shipping_free" => 1,
            "min_rating_avg" => 4.5,
            "min_rating_count" => 100
        ]
    ],
    "count" => count($items),
    "items" => $items
]);
