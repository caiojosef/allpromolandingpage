<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/auth.php";
require_once __DIR__ . "/../config/Database.php";

// ===============================
// FUNÇÃO DE RESPOSTA
// ===============================
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
// CONEXÃO
// ===============================
try {
    $db = new Database();
} catch (Exception $e) {
    response(500, "Erro na conexão.", ["erro" => $e->getMessage()]);
}

// ===============================
// PARAMS
// ===============================
$categoria_raw = $_GET["categoria"] ?? "";
$categoria_raw = is_string($categoria_raw) ? $categoria_raw : "";
$categoria_raw = trim($categoria_raw);

if ($categoria_raw === "") {
    response(422, "Parâmetro 'categoria' é obrigatório.");
}

$limit = (int) ($_GET["limit"] ?? 5);
if ($limit <= 0 || $limit > 20)
    $limit = 5;

// Escapados para SQL
$cat = $db->escape($categoria_raw);
$cat_norm = $db->escape(strtolower($categoria_raw));

// ===============================
// SQL
// ===============================
$sql = "
SELECT
  p.id,
  p.titulo,
  p.subtitulo,
  p.slug,

  JSON_UNQUOTE(JSON_EXTRACT(p.preco, '$.preco_oferta')) AS preco_oferta,
  JSON_UNQUOTE(JSON_EXTRACT(p.preco, '$.preco_lista'))  AS preco_lista,

  COALESCE(
    JSON_UNQUOTE(JSON_EXTRACT(p.urls, '$.afiliado')),
    JSON_UNQUOTE(JSON_EXTRACT(p.urls, '$.produto'))
  ) AS url_click,

  JSON_UNQUOTE(JSON_EXTRACT(p.urls, '$.imagem')) AS imagem,

  p.criado_em

FROM produtos p
LEFT JOIN categorias_principais cp
  ON cp.id = p.categoria_principal_id

WHERE
  (
    cp.id IS NOT NULL
    AND cp.ativo = 1
    AND (
      cp.slug = '$cat'
      OR LOWER(TRIM(cp.nome)) = '$cat_norm'
    )
  )
  OR
  (
    LOWER(TRIM(p.categoria_principal)) = '$cat_norm'
  )

ORDER BY
  CASE
    WHEN p.criado_em >= (NOW() - INTERVAL 5 DAY) THEN 0
    ELSE 1
  END,
  RAND()

LIMIT $limit
";

// ===============================
// EXECUÇÃO (SELECT usa select())
// ===============================
$result = $db->select($sql);

// Se seu Database.php retornar 404 quando não achar nada, aqui a gente converte pra 200 com lista vazia
if (!$result["ok"]) {
    $msg = $result["message"] ?? "Erro ao buscar produtos.";

    if ($msg === "Nenhum registro encontrado") {
        response(200, "Produtos carregados.", [
            "categoria" => $categoria_raw,
            "total" => 0,
            "produtos" => [],
            "sql_debug" => $sql
        ]);
    }

    response(500, "Erro ao buscar produtos.", [
        "erro" => $result,
        "sql_debug" => $sql
    ]);
}

$rows = $result["dados"] ?? [];

// ===============================
// FORMATA PARA O CARD
// ===============================
$cards = [];
function money2($v)
{
    if ($v === null || $v === '')
        return null;
    // retorna STRING com 2 casas (evita bug de float no JSON)
    return number_format((float) $v, 2, '.', '');
}

function moneyCents($v)
{
    if ($v === null || $v === '')
        return null;
    // retorna inteiro em centavos (bem robusto)
    return (int) round(((float) $v) * 100);
}


foreach ($rows as $r) {
    $cards[] = [
        "id" => (int) ($r["id"] ?? 0),
        "titulo" => $r["titulo"] ?? "",
        "subtitulo" => $r["subtitulo"] ?? null,
        "slug" => $r["slug"] ?? null,
        "preco" => [
            "preco_oferta" => money2($r["preco_oferta"] ?? null),
            "preco_lista" => money2($r["preco_lista"] ?? null),
            "preco_oferta_centavos" => moneyCents($r["preco_oferta"] ?? null),
            "preco_lista_centavos" => moneyCents($r["preco_lista"] ?? null),
            "moeda" => "BRL"
        ],
        "urls" => [
            "click" => $r["url_click"] ?? null,
            "imagem" => $r["imagem"] ?? null
        ],
        "criado_em" => $r["criado_em"] ?? null
    ];
}

response(200, "Produtos carregados.", [
    "categoria" => $categoria_raw,
    "total" => count($cards),
    "produtos" => $cards,
    "sql_debug" => $sql // depois remove
]);
