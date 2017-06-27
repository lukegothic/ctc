<?php
require "Medoo.php";
use Medoo\Medoo;

$db = new Medoo([
    'database_type' => 'pgsql',
    'database_name' => 'ctc',
    'server' => '127.0.0.1',
    'username' => 'postgres',
    'password' => 'postgres',
    'charset' => 'utf8',
    'port' => 5432
]);
?>
