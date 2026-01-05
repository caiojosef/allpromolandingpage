<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

// ✅ Se quiser proteger igual ao cadastrar, descomente:
// require_once __DIR__ . "/auth.php";

require_once __DIR__ . "/../config/Database.php";

function response($status, $msg, $extra = [])
{
    http_response_code($status);
    echo json_encode(array_merge([
        "ok" => $status >= 200 && $status < 300,
        "message" => $msg
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $db = new Database();
} catch (Exception $e) {
    response(500, "Erro na conexão com o banco.", ["erro" => $e->getMessage()]);
}

// ===============================
// Params (com defaults)
// ===============================
$main  = strtolower(trim($_GET["main"] ?? "suplementos"));
$sub   = strtolower(trim($_GET["sub"] ?? "whey"));
$days  = (int)($_GET["days"] ?? 5);
$limit = (int)($_GET["limit"] ?? 5);

if ($days < 1) $days = 1;
if ($days > 30) $days = 30;

if ($limit < 1) $limit = 1;
if ($limit > 5) $limit = 5;

$mainEsc = $db->conn->real_escape_string($main);
$subEsc  = $db->conn->real_escape_string($sub);

// ===============================
// 1) Validação: categoria existe?
// (se não existir, retorna 422)
// ===============================
$sqlCheck = "
SELECT sub.id
FROM categories sub
JOIN categories main ON main.id = sub.parent_id
WHERE LOWER(main.slug) = '{$mainEsc}'
  AND LOWER(sub.slug)  = '{$subEsc}'
LIMIT 1;
";

$check = $db->conn->query($sqlCheck);
if (!$check) {
    response(500, "Erro ao validar categoria.", [
        "erro_mysql" => $db->conn->error
    ]);
}

if ($check->num_rows === 0) {
    response(422, "Categoria não existe (main/sub inválidos).", [
        "main" => $main,
        "sub"  => $sub
    ]);
}

// ===============================
// 2) SELECT principal (seu SQL)
// ===============================
$sql = "
SELECT *
FROM (
  (SELECT
      p.*,
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
   WHERE LOWER(main.slug) = '{$mainEsc}'
     AND LOWER(sub.slug)  = '{$subEsc}'
     AND p.created_at >= (NOW() - INTERVAL {$days} DAY)
   ORDER BY
     COALESCE(p.rating_avg, 0) DESC,
     COALESCE(p.discount_percent, 0) DESC,
     COALESCE(p.rating_count, 0) DESC
   LIMIT 5)

  UNION ALL

  (SELECT
      p.*,
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
   WHERE LOWER(main.slug) = '{$mainEsc}'
     AND LOWER(sub.slug)  = '{$subEsc}'
     AND p.created_at < (NOW() - INTERVAL {$days} DAY)
   ORDER BY
     COALESCE(p.rating_avg, 0) DESC,
     COALESCE(p.discount_percent, 0) DESC,
     COALESCE(p.rating_count, 0) DESC
   LIMIT 5)
) t
ORDER BY
  t.prioridade ASC,
  RAND()
LIMIT {$limit};
";

$result = $db->conn->query($sql);

if (!$result) {
    response(500, "Erro ao buscar produtos.", [
        "erro_mysql" => $db->conn->error
        // se quiser depurar, você pode adicionar: "sql" => $sql
    ]);
}

$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

response(200, "Produtos listados com sucesso.", [
    "filters" => [
        "main" => $main,
        "sub" => $sub,
        "days" => $days,
        "limit" => $limit
    ],
    "count" => count($items),
    "items" => $items
]);
