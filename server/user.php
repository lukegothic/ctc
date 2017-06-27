<?php
header('Access-Control-Allow-Origin: *');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require "db.php";

$colors = $db->select("colors", "name", ["available" => "true"]);
shuffle($colors);
$animals = $db->select("animals", "name");
shuffle($animals);
$user = $colors[0] . " " . $animals[0];

foreach ($animals as $a) {
    echo "<div style='display:inline-block;width:100px;height:100px;color:#fff;background-color:" . "orange" . "'><img height=100 src='//ssl.gstatic.com/docs/common/profile/" . strtolower($a) . "_lg.png' /></div>";
}

?>
