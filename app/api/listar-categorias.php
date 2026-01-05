<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");

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

$db = new Database();

$sql = "
SELECT categoria_principal, categorias
FROM produtos
WHERE categoria_principal IS NOT NULL
AND categorias IS NOT NULL
";

$result = $db->conn->query($sql);

if (!$result) {
    response(500, "Erro ao buscar categorias.", [
        "erro_mysql" => $db->conn->error
    ]);
}

$mapa = [];

while ($row = $result->fetch_assoc()) {
    $principal = $row["categoria_principal"];
    $categorias = json_decode($row["categorias"], true);

    if (!isset($mapa[$principal])) {
        $mapa[$principal] = [];
    }

    if (is_array($categorias)) {
        foreach ($categorias as $cat) {
            if (!in_array($cat, $mapa[$principal])) {
                $mapa[$principal][] = $cat;
            }
        }
    }
}

response(200, "Categorias organizadas com sucesso.", [
    "categorias" => $mapa
]);
