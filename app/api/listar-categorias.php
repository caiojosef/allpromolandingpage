<?php
header("Content-Type: application/json; charset=utf-8");

// ===============================
// CORS (RESTRITO)
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

// Cache curto (opcional)
header("Cache-Control: public, max-age=300");

// ===============================
// Params (opcional)
// ===============================
// Por padrão, usamos slug 'inicio' como tela inicial.
// Você pode trocar via ?home_slug=inicio
$homeSlug = strtolower(trim($_GET["home_slug"] ?? "inicio"));
if ($homeSlug === "")
    $homeSlug = "inicio";

try {
    $db = new Database();
} catch (Exception $e) {
    error_log("DB connect error (listar-categorias): " . $e->getMessage());
    response(500, "Erro interno.");
}

// =====================================================
// SELECT: "Início" (sem produto) + categorias com produto
// =====================================================
$sql = "
(
  SELECT
    r.id   AS root_id,
    r.slug AS root_slug,
    r.name AS root_name,
    r.url  AS root_url,

    NULL AS main_id,
    NULL AS main_slug,
    NULL AS main_name,
    NULL AS main_url,

    NULL AS sub_id,
    NULL AS sub_slug,
    NULL AS sub_name,
    NULL AS sub_url,

    0 AS products_count,
    0 AS prioridade
  FROM categories r
  WHERE r.parent_id IS NULL
    AND LOWER(r.slug) = ?
  LIMIT 1
)

UNION ALL

(
  SELECT
    r.id   AS root_id,
    r.slug AS root_slug,
    r.name AS root_name,
    r.url  AS root_url,

    m.id   AS main_id,
    m.slug AS main_slug,
    m.name AS main_name,
    m.url  AS main_url,

    s.id   AS sub_id,
    s.slug AS sub_slug,
    s.name AS sub_name,
    s.url  AS sub_url,

    COUNT(p.id) AS products_count,
    1 AS prioridade
  FROM categories r
  JOIN categories m ON m.parent_id = r.id
  JOIN categories s ON s.parent_id = m.id
  JOIN products   p ON p.category_id = s.id AND p.active = 1
  WHERE r.parent_id IS NULL
    AND LOWER(r.slug) <> ?
  GROUP BY
    r.id, r.slug, r.name, r.url,
    m.id, m.slug, m.name, m.url,
    s.id, s.slug, s.name, s.url
)

ORDER BY prioridade ASC, root_name ASC, main_name ASC, sub_name ASC;
";

$stmt = $db->conn->prepare($sql);
if (!$stmt) {
    error_log("SQL prepare error (listar-categorias): " . $db->conn->error);
    response(500, "Erro interno.");
}

// bind dos 2 placeholders (homeSlug duas vezes)
$stmt->bind_param("ss", $homeSlug, $homeSlug);

if (!$stmt->execute()) {
    error_log("SQL execute error (listar-categorias): " . $stmt->error);
    response(500, "Erro interno.");
}

$res = $stmt->get_result();

// =====================================================
// Monta árvore roots -> mains -> subs
// (sem maps no JSON final)
// =====================================================
$rootsMap = []; // root_slug => root obj

while ($row = $res->fetch_assoc()) {
    $rslug = (string) $row["root_slug"];
    $mslug = $row["main_slug"] !== null ? (string) $row["main_slug"] : "";
    $sslug = $row["sub_slug"] !== null ? (string) $row["sub_slug"] : "";

    if (!isset($rootsMap[$rslug])) {
        $rootsMap[$rslug] = [
            "id" => (int) $row["root_id"],
            "slug" => $row["root_slug"],
            "name" => $row["root_name"],
            "url" => $row["root_url"],
            "mains" => []
        ];
    }

    // Início vem com main/sub NULL, então não entra aqui
    if ($mslug !== "") {
        if (!isset($rootsMap[$rslug]["mains"][$mslug])) {
            $rootsMap[$rslug]["mains"][$mslug] = [
                "id" => (int) $row["main_id"],
                "slug" => $row["main_slug"],
                "name" => $row["main_name"],
                "url" => $row["main_url"],
                "subs" => []
            ];
        }

        if ($sslug !== "") {
            // subs com produto (já vem filtrado no SELECT)
            $rootsMap[$rslug]["mains"][$mslug]["subs"][$sslug] = [
                "id" => (int) $row["sub_id"],
                "slug" => $row["sub_slug"],
                "name" => $row["sub_name"],
                "url" => $row["sub_url"],
                "products_count" => (int) $row["products_count"]
            ];
        }
    }
}
$stmt->close();

// normaliza para arrays
$roots = [];
foreach ($rootsMap as $r) {
    $mainsArr = [];
    foreach ($r["mains"] as $m) {
        $m["subs"] = array_values($m["subs"]);
        $mainsArr[] = $m;
    }
    $r["mains"] = $mainsArr;
    $roots[] = $r;
}

response(200, "Categorias listadas com sucesso.", [
    "filters" => [
        "home_slug" => $homeSlug
    ],
    "count_roots" => count($roots),
    "roots" => $roots
]);
