/*jshint esversion: 6 */
(function(global) {
	var Game = (function() {

		var game,
			map,
			radarLayer,
			_selectedLocation = null,
			radarSignalTimeout = 0,
			messages = [
				["Oh no...", "¡Excelente!", "¡Genial!", "¡Bien!"], "Te quemas...", "Caliente...", "Templado...", "Frío, frío...", "Helado...", "En el polo..."
			];

		var createMap = function() {
			map = L.map("map", {
				attributionControl: false,
				zoomControl: false
			}).addControl(L.control.attribution({
				"prefix": false
			})).setView([42.81995845427844, -1.6417694091796877], 14);
			L.tileLayer.wms("http://www.ign.es/wms-inspire/pnoa-ma", {
				layers: "OI.OrthoimageCoverage",
				format: 'image/jpeg',
				transparent: false,
				minZoom: 13,
				maxZoom: 18,
				version: '1.3.0',
				attribution: "PNOA cedido por © Instituto Geográfico Nacional de España"
			}).addTo(map);
			/*
			 var layer = L.tileLayer("http://www.ign.es/wmts/pnoa-ma?layer=OI.OrthoimageCoverage&style=default&tilematrixset=EPSG%3A4326&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fpng&TileMatrix=EPSG%3A4326%3A{z}&TileCol={x}&TileRow={y}", {
				 crs: L.CRS.EPSG4326,
				 minZoom: 13,
				 maxZoom: 18,
				 zoomOffset: -1,
				 id: 'xxxx'
			 }).addTo(map);
			 */
			radarLayer = L.layerGroup().addTo(map);
			// TODO: location layer (chetos!!!), quitar
			$.getJSON("server/locations.php", function(locations) {
				L.geoJSON(locations.filter(x => game.locations.map(y => y.id).some(z => z == x.id)).map(x => JSON.parse(x.geom))).addTo(map);
			});
			map.on("click", guess);
		};
		// Init
		var addLocationToMap = function(name, position) {
			L.marker(position, {
				"icon": L.divIcon({
					"className": ""
				}),
				"interactive": false
			}).bindTooltip(name, {
				direction: "top",
				permanent: true
			}).addTo(map);
		};
		$.getJSON("server/game.php", function(gameResult) {
			createMap();
			game = gameResult;
			game.locations.forEach(function(location) {
				location.finished = function() {
					return location.found || location.attempts == game.cfg.maxAttempts;
				};
				if (location.found && location.name && location.position) {
					addLocationToMap(location.name, location.position);
				}
			});
			UI.draw(game);
			gameObj.selectedLocation = findFirstUnknownLocation();
			gameLoop(0);
		});
		var stopMain, lastFrameTime = 0;
		var gameLoop = function(time) {
			stopMain = window.requestAnimationFrame(gameLoop);
			if (game.remainingTime > 0) {
				update({
					time: time,
					delta: time - lastFrameTime
				});
				UI.update();
			}
			lastFrameTime = time;
		};
		// 	time.time: elapsed time since page load (ms)
		//	time.delta: elapsed time since last call (ms)
		var update = function(time) {
			game.remainingTime -= time.delta;
			if (game.remainingTime <= 0) {
				game.remainingTime = 0;
				endGame();
			}
			if (game.radarCooldown > 0) {
				game.radarCooldown -= time.delta;
				if (game.radarCooldown <= 0) {
					game.radarCooldown = 0;
				}
			}
			if (radarSignalTimeout > 0) {
				radarSignalTimeout -= time.delta;
				if (radarSignalTimeout <= 0) {
					radarSignalTimeout = 0;
					radarLayer.clearLayers();
				}
			}
		};
		var findFirstUnknownLocation = function() {
			return game.locations.find(function(location) {
				return !location.finished();
			});
		};
		var guess = function(point) {
			if (game.remainingTime > 0) {
				if (gameObj.selectedLocation && !gameObj.selectedLocation.found && gameObj.selectedLocation.attempts < game.cfg.maxAttempts) {
					gameObj.selectedLocation.attempts++;
					$.post("server/game.php", {
						"lnglat": "{0},{1}".format(point.latlng.lng, point.latlng.lat),
						"locationid": gameObj.selectedLocation.id
					}, function(guessResult) {
						// numero/distancia: no ha acertado
						// {id:....}: ha acertado
						// {locations:...} fin de juego
						// Location o Game, actualizar estado
						if (typeof guessResult === "object") {
							var location = guessResult.locations ? guessResult.locations.find(x => x.id === gameObj.selectedLocation.id) : guessResult;
							if (location.found) {
								gameObj.selectedLocation.found = true;
								gameObj.selectedLocation.name = location.name;
								gameObj.selectedLocation.position = location.position;
								gameObj.selectedLocation.score = location.score;
								addLocationToMap(gameObj.selectedLocation.name, gameObj.selectedLocation.position);
								UI.updateScore();
							}
						}
						UI.updateCurrentLocation();
						// TODO: Refactor
						var message = gameObj.selectedLocation.found ? messages[0][gameObj.selectedLocation.attempts] : (gameObj.selectedLocation.finished() ? messages[0][0] : messages[guessResult]);
						var status = gameObj.selectedLocation.found ? (6 + gameObj.selectedLocation.attempts) : (gameObj.selectedLocation.finished() ? 0 : guessResult);
						UI.showMessage(message, status);
						// Gestion del juego
						if (guessResult.locations) {
							endGame(guessResult);
						} else if (gameObj.selectedLocation.finished()) {
							gameObj.selectedLocation = findFirstUnknownLocation();
						} else {
							// ha fallado, mantenemos location
						}

					}, "json");
				} else {
					// se ha manipulado la interfaz o los datos
				}
			} else {
				// el juego esta terminado
			}
		};
		var endGame = function(endGameObj) {
			$.when(endGameObj || $.post("server/game.php", null), "json").then(function(endGameObj) {
				gameObj.bonus = endGameObj.bonus;
				UI.loadScoreScreen();
			}, "json");
			game.remainingTime = 0;
			gameObj.selectedLocation = null;
			UI.showScoreScreen();
			UI.endUnknownLocations();
		};
		var gameObj = {
			get remainingTime() {
				return game.remainingTime;
			},
			get selectedLocation() {
				return _selectedLocation;
			},
			get locations() {
				return game.locations;
			},
			get score() {
				return game.locations.reduce((t, l) => t + l.score, 0) + (game.locations.filter((l) => l.found).length === game.locations.length ? game.bonus : 0);
			},
			set selectedLocation(value) {
				// TODO: esto a una funcion, y hacer el return de esta clase (gameObj sin gameObj)
				_selectedLocation = value;
				UI.selectCurrentLocation();
			},
			radar: {
				use: function() {
					if (game.radarCooldown === 0) {
						var mc = map.getCenter();
						$.post("server/game.php", {
							"lnglat": "{0},{1}".format(mc.lng, mc.lat)
						}, function(radarResult) {
							if (radarResult) {
								game.radarCooldown = game.cfg.radarCooldown;
								if (radarResult.length > 0) {
									var total = L.polyline(mc);
									radarResult.forEach(function(location) {
										location = L.latLng(location);
										total.addLatLng(location);
										radarLayer.addLayer(L.circleMarker(location));
									});
									map.flyToBounds(total.getBounds());
									radarSignalTimeout = 10000;
								} else {
									// TODO: no se han encontrado locations cercanas, notificar?
								}
							} else {
								// no puede usar el radar todavia, y no se puede llegar aqui salvo manipulacion de interfaz o datos
							}
						}, "json");
					} else {
						// no puede usar el radar todavia, y no se puede llegar aqui salvo manipulacion de interfaz o datos
					}
				},
				get cooldown() {
					return game.radarCooldown;
				}
			}
		};
		return gameObj;

	})();

	global.Game = Game;

})(this);
