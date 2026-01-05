<?php

class Database
{
    private $host = "localhost";
    private $user = "caiojo79_admuser";
    private $pass = "261456Caio*josef";
    private $db   = "caiojo79_vitrinedoslinks";

    public $conn;

    public function __construct()
    {
        $this->conn = new mysqli(
            $this->host,
            $this->user,
            $this->pass,
            $this->db
        );

        if ($this->conn->connect_error) {
            http_response_code(500);
            die(json_encode([
                "ok" => false,
                "message" => "Erro ao conectar ao MySQL",
                "erro" => $this->conn->connect_error
            ]));
        }

        $this->conn->set_charset("utf8mb4");
    }

    /**
     * INSERT, UPDATE, DELETE
     */
    public function execute($sql)
    {
        if (!$this->conn->query($sql)) {
            http_response_code(500);
            return [
                "ok" => false,
                "message" => "Erro ao executar operação no banco",
                "erro_mysql" => $this->conn->error,
                "sql" => $sql
            ];
        }

        http_response_code(200);
        return [
            "ok" => true,
            "message" => "Operação realizada com sucesso",
            "insert_id" => $this->conn->insert_id
        ];
    }

    /**
     * SELECT
     */
    public function select($sql)
    {
        $result = $this->conn->query($sql);

        if (!$result) {
            http_response_code(500);
            return [
                "ok" => false,
                "message" => "Erro ao executar consulta",
                "erro_mysql" => $this->conn->error,
                "sql" => $sql
            ];
        }

        if ($result->num_rows === 0) {
            http_response_code(404);
            return [
                "ok" => false,
                "message" => "Nenhum registro encontrado"
            ];
        }

        $dados = [];
        while ($row = $result->fetch_assoc()) {
            $dados[] = $row;
        }

        http_response_code(200);
        return [
            "ok" => true,
            "total" => count($dados),
            "dados" => $dados
        ];
    }

    /**
     * Escapar valores (segurança básica)
     */
    public function escape($value)
    {
        return $this->conn->real_escape_string($value);
    }
}
