<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

// Se quiser proteger (POST/PUT/DELETE) e manter GET público, deixe como está.
// Se quiser proteger esse GET também, descomente:
// require_once __DIR__ . "/auth.php";
// requireAuth();

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

// ===============================
// LIMIT dinâmico via querystring
// Ex: /listar-mais-vendidos.php?limit=12
// ===============================
$limit = isset($_GET["limit"]) ? (int) $_GET["limit"] : 5;

// Regras de segurança (ajuste como quiser)
if ($limit < 1)
    $limit = 1;
if ($limit > 50)
    $limit = 50;

try {
    $db = new Database();
} catch (Exception $e) {
    response(500, "Erro na conexão com o banco.", ["erro" => $e->getMessage()]);
}

// ===============================
// SELECT (mesmo conteúdo, só com LIMIT parametrizado)
// ===============================
$sql = "
SELECT
  p.*,
  c.slug AS category_slug,
  c.name AS category_name,
  c.url  AS category_url,
  (COALESCE(p.rating_avg, 0) * LOG10(1 + COALESCE(p.rating_count, 0))) AS best_seller_score
FROM products p
JOIN categories c ON c.id = p.category_id
ORDER BY
  best_seller_score DESC,
  COALESCE(p.discount_percent, 0) DESC,
  COALESCE(p.updated_at, p.created_at) DESC
LIMIT ?;
";

$stmt = $db->conn->prepare($sql);
if (!$stmt) {
    response(500, "Erro ao preparar SQL.", ["erro_mysql" => $db->conn->error]);
}

$stmt->bind_param("i", $limit);

if (!$stmt->execute()) {
    response(500, "Erro ao executar consulta.", ["erro_mysql" => $stmt->error]);
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
