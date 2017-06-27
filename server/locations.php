<?php
header('Access-Control-Allow-Origin: *');

require "db.php";

echo json_encode($db->query("SELECT id, ST_AsGeoJson(geom) geom FROM locations")->FetchAll(PDO::FETCH_ASSOC));

?>
