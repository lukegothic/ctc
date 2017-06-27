<?php
header('Access-Control-Allow-Origin: *');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require "db.php";

class CollectionLocation {
	public $id;
	public $name;
	public $geometry;
	function __construct($id, $name, $envelope) {
		$this->id = $id;
		$this->name = $name;
		$this->geometry = $envelope;
	}
}

class Category {
	public $id;
	public $name;
	public $locations = [];
	function __construct($id, $name) {
		$this->id = $id;
		$this->name = $name;
	}
	function getId() {
		return $this->id;
	}
}

class Collection {
	public $categories = [];
	function __construct() {
		// TODO: empezar con ST_Centroid y mas adelante hacer con ST_Envelope para posicionar grafico guapo en el mapa
		$locations = $GLOBALS["db"]->query(
			"SELECT
				l.id as locationid,
				CASE WHEN lxg.found THEN l.name ELSE NULL END AS locationname,
				CASE WHEN lxg.found THEN ST_AsGeoJSON(ST_Centroid(l.geom)) ELSE NULL END AS locationenvelope,
				c.id as categoryid,
				c.name as categoryname
			FROM
				locations l
				LEFT JOIN (
					SELECT
						locationid,
						true AS found
					FROM
						locationsxgame
					WHERE
						found = true
						AND EXISTS(SELECT 1 FROM games WHERE id = gameid AND userid = '1')
					GROUP BY
						locationid) lxg ON l.id = lxg.locationid
				LEFT JOIN categories c on l.categoryid = c.id
			ORDER BY l.categoryid, l.id")->FetchAll(PDO::FETCH_ASSOC);
		foreach ($locations as $location) {
			$category = array_filter($this->categories, function($cat) use ($location) {
				return $location["categoryid"] == $cat->getId();
			});
			if (count($category) == 1) {
				$category = $category[array_keys($category)[0]];
			} else {
				$category = new Category($location["categoryid"], $location["categoryname"]);
				$this->categories[] = $category;
			}
			$category->locations[] = new CollectionLocation($location["locationid"], $location["locationname"], $location["locationenvelope"]);
		}
	}
}

echo json_encode((new Collection())->categories);

?>
