<?php
header('Content-Type: application/json; charset=utf-8');

// Ideal: mover para variável de ambiente/config fora do repo
define("API_USER", "eucaiojosef");
define("API_PASS", "261456Caio*");

/**
 * Aplica Basic Auth em requisições não públicas.
 * - GET é público
 * - OPTIONS é público (CORS preflight)
 */
function requireAuth(): void
{
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";

    // 🔓 Público
    if ($method === "GET" || $method === "OPTIONS") {
        return;
    }

    // 1) Caso padrão (Apache costuma preencher)
    $user = $_SERVER["PHP_AUTH_USER"] ?? null;
    $pass = $_SERVER["PHP_AUTH_PW"] ?? null;

    // 2) Fallback: muitos servidores colocam o Authorization aqui
    if ($user === null || $pass === null) {
        $authHeader = getAuthorizationHeader();
        if ($authHeader) {
            [$user, $pass] = parseBasicAuth($authHeader);
        }
    }

    if (!$user || !$pass) {
        unauthorized("Credenciais ausentes. Envie Authorization Basic.");
    }

    if (!hash_equals(API_USER, $user) || !hash_equals(API_PASS, $pass)) {
        unauthorized("Autorização falhou, forneça credenciais válidas.");
    }
}

/**
 * Tenta obter o header Authorization em diferentes ambientes.
 */
function getAuthorizationHeader(): ?string
{
    // Apache/Nginx/CGI variações comuns:
    $candidates = [
        $_SERVER["HTTP_AUTHORIZATION"] ?? null,
        $_SERVER["REDIRECT_HTTP_AUTHORIZATION"] ?? null,
    ];

    foreach ($candidates as $h) {
        if (is_string($h) && trim($h) !== "") {
            return trim($h);
        }
    }

    // Em alguns ambientes, getallheaders existe e funciona melhor
    if (function_exists("getallheaders")) {
        $headers = getallheaders();
        if (isset($headers["Authorization"]))
            return trim($headers["Authorization"]);
        if (isset($headers["authorization"]))
            return trim($headers["authorization"]);
    }

    return null;
}

/**
 * Faz parse de "Authorization: Basic base64(user:pass)"
 * Retorna [user, pass] ou [null, null].
 */
function parseBasicAuth(string $authHeader): array
{
    if (stripos($authHeader, "Basic ") !== 0) {
        return [null, null];
    }

    $b64 = trim(substr($authHeader, 6));
    if ($b64 === "")
        return [null, null];

    $decoded = base64_decode($b64, true);
    if ($decoded === false)
        return [null, null];

    // user:pass
    $pos = strpos($decoded, ":");
    if ($pos === false)
        return [null, null];

    $user = substr($decoded, 0, $pos);
    $pass = substr($decoded, $pos + 1);

    return [$user, $pass];
}

function unauthorized(string $msg): void
{
    // 401 é o mais adequado para auth (e permite WWW-Authenticate)
    http_response_code(401);
    header('WWW-Authenticate: Basic realm="API", charset="UTF-8"');

    echo json_encode([
        "ok" => false,
        "message" => $msg
    ], JSON_UNESCAPED_UNICODE);

    exit;
}
