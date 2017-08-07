<?php
require "Medoo.php";
use Medoo\Medoo;

$db = new Medoo([
    'database_type' => 'pgsql',
    'database_name' => 'ctc',
    'server' => '192.168.1.14',
    'username' => 'postgres',
    'password' => 'postgres',
    'charset' => 'utf8',
    'port' => 5432
]);
?>
