<?php

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}
// ===============================
// DEBUG / CAPTURA DE ERROS (retorna JSON mesmo em fatal)
// ===============================
ini_set('display_errors', '0');      // não imprime HTML na tela
error_reporting(E_ALL);

function response($status, $msg, $extra = [])
{
    http_response_code($status);
    echo json_encode(array_merge([
        "ok" => $status >= 200 && $status < 300,
        "message" => $msg
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Captura exceptions não tratadas
set_exception_handler(function ($e) {
    response(500, "Erro interno (exception).", [
        "type" => get_class($e),
        "error" => $e->getMessage(),
        "file" => $e->getFile(),
        "line" => $e->getLine()
    ]);
});

// Captura warnings/notices como erro (opcional, mas ajuda no debug)
set_error_handler(function ($severity, $message, $file, $line) {
    // respeita @silence
    if (!(error_reporting() & $severity)) return false;

    response(500, "Erro interno (php error).", [
        "severity" => $severity,
        "error" => $message,
        "file" => $file,
        "line" => $line
    ]);
});

// Captura FATAL ERROR (parse/undefined function/memory etc.)
register_shutdown_function(function () {
    $err = error_get_last();
    if (!$err) return;

    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR];
    if (!in_array($err["type"], $fatalTypes, true)) return;

    response(500, "Erro fatal no PHP.", [
        "type" => $err["type"],
        "error" => $err["message"],
        "file" => $err["file"],
        "line" => $err["line"]
    ]);
});


// 🔐 AUTH
require_once __DIR__ . "/auth.php";
requireAuth();

// ===============================
// FUNÇÃO DE RESPOSTA
// ===============================


// ===============================
// CONEXÃO COM BANCO
// ===============================
require_once __DIR__ . "/../config/Database.php";

try {
    $db = new Database();
} catch (Exception $e) {
    response(500, "Erro na conexão com o banco.", ["erro" => $e->getMessage()]);
}

// ===============================
// HELPERS
// ===============================
function safe($db, $value)
{
    return $db->escape($value ?? "");
}

function asInt01($v)
{
    if ($v === true || $v === 1 || $v === "1" || $v === "true")
        return 1;
    return 0;
}

function asNullableFloat($v)
{
    if ($v === null || $v === "")
        return null;
    $v = str_replace(",", ".", (string) $v);
    return is_numeric($v) ? (float) $v : null;
}

function asNullableInt($v)
{
    if ($v === null || $v === "")
        return null;
    return is_numeric($v) ? (int) $v : null;
}

// ===============================
// LEITURA DO JSON
// ===============================
$body = file_get_contents("php://input");
if (!$body || trim($body) === "") {
    response(400, "Nenhum JSON foi enviado.");
}

$data = json_decode($body, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    response(400, "JSON mal formatado.", ["erro_json" => json_last_error_msg()]);
}
if (!is_array($data)) {
    response(400, "JSON inválido. Esperado um objeto.");
}

// ===============================
// CAMPOS (EN e compatível com PT)
// ===============================
$marketplace = safe($db, $data["marketplace"] ?? $data["origem"] ?? "mercado_livre");
$external_id = safe($db, $data["external_id"] ?? $data["anuncio_id"] ?? "");
$title = safe($db, $data["title"] ?? $data["titulo"] ?? "");
$subtitle = safe($db, $data["subtitle"] ?? $data["subtitulo"] ?? "");

$product_url = safe($db, $data["product_url"] ?? "");
$affiliate_url = safe($db, $data["affiliate_url"] ?? "");
$source_image_url = safe($db, $data["source_image_url"] ?? "");
$local_image_path = safe($db, $data["local_image_path"] ?? "");

$shipping_label = safe($db, $data["shipping_label"] ?? "");
$shipping_free = asInt01($data["shipping_free"] ?? 0);

$rating_avg = asNullableFloat($data["rating_avg"] ?? null);
$rating_count = asNullableInt($data["rating_count"] ?? null);

$price_original = asNullableFloat($data["price_original"] ?? null);
$price_current = asNullableFloat($data["price_current"] ?? null);
$discount_percent = asNullableInt($data["discount_percent"] ?? null);

$pix_price = asNullableFloat($data["pix_price"] ?? null);

$installments_max = asNullableInt($data["installments_max"] ?? null);
$installment_value = asNullableFloat($data["installment_value"] ?? null);

$seller_name = safe($db, $data["seller_name"] ?? "");

$badge_oficial = asInt01($data["badge_oficial"] ?? 0);
$badge_mercado_lider = asInt01($data["badge_mercado_lider"] ?? 0);
$badge_top_seller = asInt01($data["badge_top_seller"] ?? 0);
$badge_em_alta = asInt01($data["badge_em_alta"] ?? 0);

$category_slug = safe($db, $data["category_slug"] ?? "");
$category_slug = strtolower(trim($category_slug));

// raw_payload: grava o JSON inteiro que chegou (opcional)
$raw_payload = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$raw_payload = $raw_payload ? safe($db, $raw_payload) : "";

// ===============================
// VALIDAÇÃO
// ===============================
if ($external_id === "")
    response(422, "Campo 'external_id' é obrigatório.");
if ($title === "")
    response(422, "Campo 'title' é obrigatório.");
if ($category_slug === "")
    response(422, "Campo 'category_slug' é obrigatório (ex.: whey).");
if ($price_current === null)
    response(422, "Campo 'price_current' é obrigatório.");

// ===============================
// SQL: UPSERT + ERRO SE CATEGORIA NÃO EXISTE
// - Se a categoria não existe, o subselect retorna NULL
// - Como category_id é NOT NULL, o MySQL vai gerar erro (1048)
// ===============================
$sql = "
INSERT INTO products (
  marketplace, external_id, title, subtitle, product_url, affiliate_url,
  source_image_url, local_image_path, shipping_label, shipping_free,
  rating_avg, rating_count, price_original, price_current, discount_percent,
  pix_price, installments_max, installment_value, seller_name,
  badge_oficial, badge_mercado_lider, badge_top_seller, badge_em_alta,
  raw_payload, category_id
) VALUES (
  '$marketplace',
  '$external_id',
  '$title',
  " . ($subtitle !== "" ? "'$subtitle'" : "NULL") . ",
  " . ($product_url !== "" ? "'$product_url'" : "NULL") . ",
  " . ($affiliate_url !== "" ? "'$affiliate_url'" : "NULL") . ",
  " . ($source_image_url !== "" ? "'$source_image_url'" : "NULL") . ",
  " . ($local_image_path !== "" ? "'$local_image_path'" : "NULL") . ",

  " . ($shipping_label !== "" ? "'$shipping_label'" : "NULL") . ",
  $shipping_free,

  " . ($rating_avg !== null ? $rating_avg : "NULL") . ",
  " . ($rating_count !== null ? $rating_count : "NULL") . ",

  " . ($price_original !== null ? $price_original : "NULL") . ",
  $price_current,
  " . ($discount_percent !== null ? $discount_percent : "NULL") . ",

  " . ($pix_price !== null ? $pix_price : "NULL") . ",

  " . ($installments_max !== null ? $installments_max : "NULL") . ",
  " . ($installment_value !== null ? $installment_value : "NULL") . ",

  " . ($seller_name !== "" ? "'$seller_name'" : "NULL") . ",

  $badge_oficial,
  $badge_mercado_lider,
  $badge_top_seller,
  $badge_em_alta,

  " . ($raw_payload !== "" ? "CAST('$raw_payload' AS JSON)" : "NULL") . ",

  (SELECT id FROM categories WHERE LOWER(slug) = LOWER('$category_slug') LIMIT 1)
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  subtitle = VALUES(subtitle),
  product_url = VALUES(product_url),
  affiliate_url = VALUES(affiliate_url),
  source_image_url = VALUES(source_image_url),
  local_image_path = VALUES(local_image_path),

  shipping_label = VALUES(shipping_label),
  shipping_free = VALUES(shipping_free),

  rating_avg = VALUES(rating_avg),
  rating_count = VALUES(rating_count),

  price_original = VALUES(price_original),
  price_current = VALUES(price_current),
  discount_percent = VALUES(discount_percent),

  pix_price = VALUES(pix_price),

  installments_max = VALUES(installments_max),
  installment_value = VALUES(installment_value),

  seller_name = VALUES(seller_name),

  badge_oficial = VALUES(badge_oficial),
  badge_mercado_lider = VALUES(badge_mercado_lider),
  badge_top_seller = VALUES(badge_top_seller),
  badge_em_alta = VALUES(badge_em_alta),

  raw_payload = VALUES(raw_payload),
  category_id = VALUES(category_id),
  updated_at = CURRENT_TIMESTAMP;
";

$result = $db->execute($sql);

// ===============================
// TRATAMENTO DE ERROS (Postman)
// ===============================
if (!$result["ok"]) {
    // tenta pegar o erro em qualquer chave que seu Database.php use
    $err =
        $result["error"] ??
        $result["message"] ??
        $result["msg"] ??
        $result["mysql_error"] ??
        "Erro desconhecido.";

    $errno = (int) ($result["errno"] ?? $result["mysql_errno"] ?? 0);

    // DEBUG: ligue/desligue aqui
    $DEBUG = true;

    // 1048 = Column cannot be null  (category_id veio NULL porque slug não existe)
    // 1452 = foreign key fails (depende de como está a FK/constraint)
    $isCategoryMissing =
        ($errno === 1048) ||
        ($errno === 1452) ||
        (stripos($err, "category_id") !== false && stripos($err, "null") !== false) ||
        (stripos($err, "fk_products_category") !== false) ||
        (stripos($err, "foreign key constraint fails") !== false);

    if ($isCategoryMissing) {
        response(422, "Categoria não existe (slug inválido).", array_filter([
            "category_slug" => $category_slug ?? null,
            "errno" => $errno ?: null,
            "db_error" => $DEBUG ? $err : null,
            "db_result" => $DEBUG ? $result : null
        ]));
    }

    // Erro genérico do banco
    response(500, "Erro ao cadastrar/atualizar produto.", array_filter([
        "errno" => $errno ?: null,
        "db_error" => $DEBUG ? $err : null,
        "db_result" => $DEBUG ? $result : null
    ]));
}

// inserted/updated (em muitos wrappers, insert_id vem 0 quando foi update)
$insertId = (int) ($result["insert_id"] ?? 0);
$action = $insertId > 0 ? "inserted" : "updated";

response($insertId > 0 ? 201 : 200, "Produto $action com sucesso.", [
    "action" => $action,
    "insert_id" => $insertId
]);