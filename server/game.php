<?php
header('Access-Control-Allow-Origin: *');
error_reporting(E_ALL);
ini_set('display_errors', 1);
date_default_timezone_set("Europe/Madrid");

require "db.php";
require "functions.php";

class GameLocation {
	const MAXATTEMPTS = 3;
	const BASESCORE = 300;
	const PENALTYSCORE = 100;
	public $id;
	public $found;
	public $attempts;
	public $name;
	private $lng;
	private $lat;
	public $position;
	public $score;
	function __construct($id, $found = false, $attempts = 0, $name = null, $lng = null, $lat = null) {
		$this->id = $id;
		$this->found = $found;
		$this->attempts = $attempts;
		$this->name = $name;
		$this->lng = $lng;
		$this->lat = $lat;
		if ($this->found) {
			$this->calculateScore();
			$this->setPosition();
		} else {
			$this->score = 0;
		}
	}
	function calculateScore() {
		$this->score = self::BASESCORE - (($this->attempts - 1) * self::PENALTYSCORE);
	}
	function setPosition() {
		$this->position = [(float)$this->lat, (float)$this->lng];
	}
	function discover() {
		$this->found = true;
		$locationdata = $GLOBALS["db"]->query(
		   "SELECT
		   		name,
			   	ST_X(position) AS lng,
			   	ST_Y(position) AS lat
			FROM
				locations, ST_CENTROID(geom) AS position
			WHERE
				id = " . $this->id)->FetchAll(PDO::FETCH_ASSOC)[0];
		$this->name = $locationdata["name"];
		$this->lng = $locationdata["lng"];
		$this->lat = $locationdata["lat"];
		$this->calculateScore();
		$this->setPosition();
	}
}
class Game {
	// CONSTS-CONFIG
	const LOCATIONCOUNT = 5;
	const BASEBONUS = 300 * self::LOCATIONCOUNT;
	const DURATION = 60000 * self::LOCATIONCOUNT;     // milisegundos
	const RADARCOOLDOWN = 50000; 	                  // milisegundos
	const RADARRADIUS = 100;		                  // metros
	const GUESSRADIUS = 10;		                      // metros
	// PROPERTIES
	protected $id;
	private $startDate;
	public $remainingTime;
	private $lastRadar;
	public $radarCooldown;
	public $cfg = ["maxAttempts" => GameLocation::MAXATTEMPTS, "radarCooldown" => self::RADARCOOLDOWN];
	public $bonus;
	public $locations = [];
	// CONSTRUCTOR
	function __construct() {
		if ($this->exists()) {
			$this->get();
		} else {
			$this->create();
		}
	}
	// METHODS
	private function guessedLocations($found = true) {
		return array_filter($this->locations, function($location) use ($found) {
			return $location->found == $found;
		});
	}
	private function usedAttempts($locations) {
		return array_reduce($locations, function($total, $location) {
			return $total + $location->attempts;
		}, 0);
	}
	function score() {
		$base = array_reduce($this->locations, function($total, $location) {
			return $total + $location->score;
		}, 0);
		$bonus = count($this->guessedLocations()) == self::LOCATIONCOUNT ? $this->bonus : 0;
		return $base + $bonus;
	}
	function finished() {
		$guessed = $this->guessedLocations();
		$notguessed = $this->guessedLocations(false);
		return
			$this->remainingTime == 0 ||				// se ha agotado el tiempo
			count($guessed) == self::LOCATIONCOUNT || 	// se han averiguado todas las locations
			(count($notguessed) * GameLocation::MAXATTEMPTS) == $this->usedAttempts($notguessed);	// se han acabado los intentos para las no encontradas
	}
	private function exists() {
		return $GLOBALS["db"]->count("games", ["userid" => $GLOBALS["currentUser"], "enddate" => null]) > 0;
	}
	private function get() {
		$fullgame = $GLOBALS["db"]->query(
			"SELECT
				g.id AS gameid,
				g.startdate AS gamestartdate,
				g.lastusedradar AS gamelastusedradar,
				l.id AS locationid,
				lxg.found AS locationfound,
				lxg.attempts AS locationattempts,
				CASE WHEN lxg.found THEN l.name ELSE NULL END AS locationname,
				CASE WHEN lxg.found THEN ST_X(position) ELSE NULL END AS locationlng,
				CASE WHEN lxg.found THEN ST_Y(position) ELSE NULL END AS locationlat
			FROM
				games g
				LEFT JOIN locationsxgame lxg ON g.id = lxg.gameid
				LEFT JOIN locations l ON lxg.locationid = l.id, ST_centroid(l.geom) AS position
			WHERE
				g.userid = '" . $GLOBALS["currentUser"] . "'
				AND g.enddate IS NULL
			ORDER BY
				l.id")->FetchAll(PDO::FETCH_ASSOC);
		$this->id = $fullgame[0]["gameid"];
		$this->startDate = $fullgame[0]["gamestartdate"];
		$this->remainingTime = max(self::DURATION - getElapsedTime($this->startDate, true), 0);
		$this->lastRadar = $fullgame[0]["gamelastusedradar"];
		$this->radarCooldown = max(self::RADARCOOLDOWN - ($this->lastRadar ? getElapsedTime($this->lastRadar, true) : self::RADARCOOLDOWN), 0);
		$this->bonus = ceil(self::BASEBONUS * ($this->remainingTime / self::DURATION));
		foreach ($fullgame as $location) {
			$this->locations[] = new GameLocation($location["locationid"],$location["locationfound"],$location["locationattempts"],$location["locationname"],$location["locationlng"],$location["locationlat"]);
		}
		if ($this->finished()) {
			$this->end();
		}
	}
	private function create() {
		// busca locations no utilizadas en juegos anteriores para el usuario
		$gamelocations = $GLOBALS["db"]->query(
			"SELECT
				id as locationid
			FROM
				locations l
			WHERE
				NOT EXISTS(
					SELECT
						locationid
					FROM
						games g
						LEFT JOIN locationsxgame lxg ON g.id = lxg.gameid
					WHERE
						NOT lxg.found
						AND userid = '" . $GLOBALS["currentUser"] . "'
						AND lxg.locationid = l.id)")->FetchAll(PDO::FETCH_ASSOC);
		// si no hay suficientes, cogemos utilizadas
		$neededlocations = self::LOCATIONCOUNT - count($gamelocations);
		if ($neededlocations > 0) {
			$usedlocations = $GLOBALS["db"]->query(
				"SELECT
					DISTINCT locationid
				FROM
					games g
					LEFT JOIN locationsxgame lxg ON g.id = lxg.gameid
				WHERE
					NOT lxg.found IS NULL
					AND userid = '" . $GLOBALS["currentUser"] . "'")->FetchAll(PDO::FETCH_ASSOC);
			shuffle($usedlocations);
			$usedlocations = array_slice($usedlocations, 0, $neededlocations);
			$gamelocations = array_merge($gamelocations, $usedlocations);
		} else {
			shuffle($gamelocations);
			$gamelocations = array_slice($gamelocations, 0, self::LOCATIONCOUNT);
		}
		array_multisort(array_column($gamelocations, "locationid"), $gamelocations);
		// obtener siguiente id de partida a mano, asi lo reservamos y no se machaca a nadie
		$this->id = $GLOBALS["db"]->query("SELECT nextval('games_id_seq')")->FetchAll(PDO::FETCH_ASSOC)[0]["nextval"];
		$this->remainingTime = self::DURATION;
		$this->radarCooldown = 0;
		$this->bonus = self::BASEBONUS;
		// preparar objeto para mandar a insertar
		foreach ($gamelocations as &$location) {
			$location["gameid"] = $this->id;
			$this->locations[] = new GameLocation($location["locationid"]);
		}
		// insertar nuevo game
		if ($GLOBALS["db"]->insert("games", ["id" => $this->id, "userid" => $GLOBALS["currentUser"]]) == 1) {
			if ($GLOBALS["db"]->insert("locationsxgame", $gamelocations) == self::LOCATIONCOUNT) {
				// Todo ha ido bien!
			} else {
				echo json_encode($db->error());
				$GLOBALS["db"]->delete("games", ["id" => $this->id]);
			}
		} else {
			echo json_encode($db->error());
		}
	}
	function end() {
		$GLOBALS["db"]->update("games", ["#enddate" => "NOW", "score" => $this->score()], ["id" =>  $this->id]);
	}
	function radar($lng, $lat) {
		// si el cooldown ya ha acabado, guardamos la fecha de uso en db
		if ($this->radarCooldown == 0 && $GLOBALS["db"]->update("games", ["#lastusedradar" => "NOW()"], ["id" => $this->id]) == 1) {
			// hacemos la consulta de locations utilizando lnglat, las locations del juego y el radio de accion del radar
			$radarLocations = $GLOBALS["db"]->query(
				"SELECT
					ST_X(p) AS lng,
					ST_Y(p) AS lat
				FROM (
					SELECT
						ST_CLOSESTPOINT(geom, pt) AS p
					FROM
						locations, st_geomfromtext('POINT(" . $lng . " " . $lat . ")', 4326) AS pt
					WHERE
						id IN (" . implode(",", array_map(function ($location) { return $location->id; }, $this->guessedLocations(false))) . ")
						AND ST_DISTANCE(geom, pt::geography) <= " . self::RADARRADIUS . ") t")->FetchAll(PDO::FETCH_ASSOC);
			$this->radarCooldown = self::RADARCOOLDOWN;
			return array_map(function($location) {
					return [(float)$location["lat"], (float)$location["lng"]];
				}, $radarLocations);
		} else {
			// no puede utilizarlo todavia
			return false;
		}
	}
	function guess($lng, $lat, $id) {
		$location = array_filter($this->locations, function($location) use ($id) {
			return $location->id == $id;
		});
		if (count($location) == 1) {
			$location = $location[array_keys($location)[0]];
			if ($location->attempts < GameLocation::MAXATTEMPTS) {
				// aumentar en 1 los intentos
				$location->attempts++;
				// TODO: esto tendria que hacerse en un procedimiento almacenado GUESS que como salida final obtiene la distancia al punto
				// tb en BD
				if ($GLOBALS["db"]->update("locationsxgame", ["attempts[+]" => 1], ["gameid" => $this->id, "locationid" => $id, "found" => "false"]) > 0) {
					// obtener distancia
                    $distance = (float)$GLOBALS["db"]->query("
                        SELECT
                            ST_DISTANCE(l.geom, st_geomfromtext('POINT(" . $lng . " " . $lat . ")', 4326)::geography) as distance
                        FROM
                            locationsxgame lxg
                            LEFT JOIN locations l ON lxg.locationid = l.id
                        WHERE
                            lxg.locationid = " . $id . "
                            AND lxg.gameid = " . $this->id . "
                            AND lxg.found = false")->fetchColumn();
					// comprobamos la distancia al punto
					$tramos = [self::GUESSRADIUS,self::GUESSRADIUS*5,self::GUESSRADIUS*10,self::GUESSRADIUS*25,self::GUESSRADIUS*50,self::GUESSRADIUS*100];
					$di = 0;
					while ($di < count($tramos) && $distance > $tramos[$di]) {
						$di++;
					}
					if ($di == 0) {// si el tramo es el primero, lo ha localizado
						if ($GLOBALS["db"]->update("locationsxgame", ["found" => "true"], ["locationid" => $id, "gameid" => $this->id, "found" => "false"]) == 1) {
						  $location->discover();
						  $result = $location;
						} else {
							echo "problema al actualizar guess";
						}
					} else {	// si no, se encuentra en el tramo $di
						$result = $di;
					}
					// si el juego ha terminado debemos devolver la partida
					if ($this->finished()) {
						$this->end();
						return $this;
					} else {
						return $result;
					}
				} else {
					return "Location already guessed";
				}
			} else {
				return "No more tries allowed";
			}
		} else {
			return "Esa loc no pertenece al game";
		}
	}
}

$currentUser = "1";		// TODO: Sesiones de usuario, recuperar id de usuario y partida actual (actualizandolo con los nuevos timeouts, hacer funcion refresh que recalcule los tiempos de la partida)
$game = new Game();

switch ($_SERVER['REQUEST_METHOD']) {
    case "GET":
		echo json_encode($game = new Game());
    break;
    case "POST":
		// si recibimos el parametro lnglat hay dos posibilidades
		if (!empty($_POST["lnglat"])) {
			// validacion parametro
			$lnglat = explode(",", $_POST["lnglat"]);
			if (count($lnglat) == 2) {
				// si hay location, el usuario quiere hacer un guess
				// el output es false si no ha acertado, true si no es el ultimo punto del juego, o el resumen del juego si es el ultimo punto
				if (!empty($_POST["locationid"])) {
					echo json_encode($game->guess($lnglat[0], $lnglat[1], $_POST["locationid"]));
				} else {
					// sino, es una solicitud de radar
					// el output es el resultado de la consulta de proximidad o false si todavia no se puede usar
					echo json_encode($game->radar($lnglat[0], $lnglat[1]));
				}
			} else {
				echo "Invalid lnglat";
			}
		} else {
			// si no hay parametros, entendemos que queremos cerrar el juego (este caso es llamado cuando se acaba el tiempo en cliente)
			$game->end();
			echo json_encode($game);
		}
    break;
	default:
		echo null;
	break;
}?>
