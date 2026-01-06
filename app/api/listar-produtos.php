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
// Params (com defaults)
// ===============================
$main = strtolower(trim($_GET["main"] ?? "suplementos"));
$sub = strtolower(trim($_GET["sub"] ?? "whey"));
$days = (int) ($_GET["days"] ?? 5);
$limit = (int) ($_GET["limit"] ?? 5);

// Segurança days
if ($days < 1)
    $days = 1;
if ($days > 30)
    $days = 30;

// Segurança limit
$MAX_LIMIT = 100;
if ($limit < 1)
    $limit = 1;
if ($limit > $MAX_LIMIT)
    $limit = $MAX_LIMIT;

// Mantém a regra do seu UNION: cada subquery busca até $limit, e no final retorna $limit.
$innerLimit = $limit;

// Cache curto (opcional)
header("Cache-Control: public, max-age=60");

try {
    $db = new Database();
} catch (Exception $e) {
    error_log("DB connect error (listar-produtos): " . $e->getMessage());
    response(500, "Erro interno.");
}

// ===============================
// 1) Validação: categoria existe?
// ===============================
$sqlCheck = "
SELECT
  sub.id,
  sub.slug AS category_slug,
  sub.name AS category_name,
  sub.url  AS category_url,
  main.slug AS main_slug,
  main.name AS main_name,
  main.url  AS main_url
FROM categories sub
JOIN categories main ON main.id = sub.parent_id
WHERE LOWER(main.slug) = ?
  AND LOWER(sub.slug)  = ?
LIMIT 1;
";

$stmtCheck = $db->conn->prepare($sqlCheck);
if (!$stmtCheck) {
    error_log("SQL prepare error (listar-produtos:check): " . $db->conn->error);
    response(500, "Erro interno.");
}

$stmtCheck->bind_param("ss", $main, $sub);

if (!$stmtCheck->execute()) {
    error_log("SQL execute error (listar-produtos:check): " . $stmtCheck->error);
    response(500, "Erro interno.");
}

$resCheck = $stmtCheck->get_result();
if ($resCheck->num_rows === 0) {
    $stmtCheck->close();
    response(422, "Categoria não existe (main/sub inválidos).", [
        "filters" => [
            "main" => $main,
            "sub" => $sub
        ]
    ]);
}

$catInfo = $resCheck->fetch_assoc();
$stmtCheck->close();

// ===============================
// 2) SELECT principal (ENXUTO)
// Somente campos usados no card.js + infos de categoria
// ===============================
$sql = "
SELECT *
FROM (
  (
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

      sub.slug AS category_slug,
      sub.name AS category_name,
      sub.url  AS category_url,
      main.slug AS main_slug,
      main.name AS main_name,
      main.url  AS main_url,

      0 AS prioridade
    FROM products p
    JOIN categories sub  ON sub.id = p.category_id
    JOIN categories main ON main.id = sub.parent_id
    WHERE LOWER(main.slug) = ?
      AND LOWER(sub.slug)  = ?
      AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ORDER BY
      COALESCE(p.rating_avg, 0) DESC,
      COALESCE(p.discount_percent, 0) DESC,
      COALESCE(p.rating_count, 0) DESC
    LIMIT ?
  )

  UNION ALL

  (
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

      sub.slug AS category_slug,
      sub.name AS category_name,
      sub.url  AS category_url,
      main.slug AS main_slug,
      main.name AS main_name,
      main.url  AS main_url,

      1 AS prioridade
    FROM products p
    JOIN categories sub  ON sub.id = p.category_id
    JOIN categories main ON main.id = sub.parent_id
    WHERE LOWER(main.slug) = ?
      AND LOWER(sub.slug)  = ?
      AND p.created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    ORDER BY
      COALESCE(p.rating_avg, 0) DESC,
      COALESCE(p.discount_percent, 0) DESC,
      COALESCE(p.rating_count, 0) DESC
    LIMIT ?
  )
) t
ORDER BY
  t.prioridade ASC,
  RAND()
LIMIT ?;
";

$stmt = $db->conn->prepare($sql);
if (!$stmt) {
    error_log("SQL prepare error (listar-produtos): " . $db->conn->error);
    response(500, "Erro interno.");
}

/**
 * bind_param types:
 *  ssii  (main, sub, days, innerLimit)
 *  ssii  (main, sub, days, innerLimit)
 *  i     (limit)
 */
$stmt->bind_param(
    "ssii" . "ssii" . "i",
    $main,
    $sub,
    $days,
    $innerLimit,
    $main,
    $sub,
    $days,
    $innerLimit,
    $limit
);

if (!$stmt->execute()) {
    error_log("SQL execute error (listar-produtos): " . $stmt->error);
    response(500, "Erro interno.");
}

$result = $stmt->get_result();
$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}
$stmt->close();

// Resposta inclui category_url também em filters (facilita seu botão "Mostrar todos")
response(200, "Produtos listados com sucesso.", [
    "filters" => [
        "main" => $main,
        "sub" => $sub,
        "days" => $days,
        "limit" => $limit,
        "max_limit" => $MAX_LIMIT,
        "category_slug" => $catInfo["category_slug"],
        "category_name" => $catInfo["category_name"],
        "category_url" => $catInfo["category_url"],
        "main_slug" => $catInfo["main_slug"],
        "main_name" => $catInfo["main_name"],
        "main_url" => $catInfo["main_url"],
    ],
    "count" => count($items),
    "items" => $items
]);
