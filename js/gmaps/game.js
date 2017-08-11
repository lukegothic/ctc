/*jshint esversion: 6 */
(function(global) {
	var game = (function() {
    // CONSTS
		var localidades = [{
			"id": 31201,
			"names": ["Pamplona", "Iruña"],
			"center": {lat: 42.81577003943018, lng: -1.6500215999999455},
			"zoom": 14
		},{
			"id": 45678,
			"names": ["Bilbao"],
			"center": {lat: 42.81577003943018, lng: -1.6500215999999455},
			"zoom": 14
		},{
			"id": 12456,
			"names": ["San Sebastian", "Donostia", "Donosti"],
			"center": {lat: 42.81577003943018, lng: -1.6500215999999455},
			"zoom": 14
		}];
		var localidadPorDefecto = localidades[0];
    var timePerLocation = 30000;
    var locationsToGuess = 5;
		var failpenalty = 10000;
		// scores
		var scorePerLocation = 100;
		var scoreCompletionBonus = 300;
		var scoreTimeBonus = locationsToGuess * scorePerLocation;
    // VARS
    var localidad, allLocations, locations, map, timeleft, ui, infowindow, gameOver, mapClick, featureClick;
		// Inicializar GMap
    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        center: localidad.center,
        maxZoom: 20,
        minZoom: localidad.zoom,
        zoom: localidad.zoom,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        labels: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        styles: [
            {
              "featureType": "administrative",
              "elementType": "geometry",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "featureType": "administrative.land_parcel",
              "elementType": "labels",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "featureType": "poi",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "labels.text",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "labels.icon",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "featureType": "road.local",
              "elementType": "labels",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "featureType": "transit",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            }
          ]
      });
			// Establecer modo perspectiva
      map.setTilt(45);
      // Fallar al hacer clic en el mapa
      mapClick = map.addListener('click', function(e) {
        if (!locations.features[0].properties.found) {
          fail();
        }
        /*
        var m = new google.maps.Marker({
          position: e.latLng,
          map: map,
          title: 'Click to zoom',
          animation: google.maps.Animation.DROP
        });
        // Esto para el rebote en la animacion
        setTimeout(function() {
            m.setAnimation(null)
        }, 250);
        */
      });
			// Ocultar los lugares de juego
			/*
      map.data.setStyle({
        fillColor: 'transparent',
        strokeColor: "transparent",
        cursor: "url('https://maps.gstatic.com/mapfiles/openhand_8_8.cur') 8 8, default;"
      });*/
			// TODO: MEJORA: CARGAR SOLO LA FEATURE CON LA QUE SE ESTA JUGANDO? Simplificaria esta funcion
      // Comprobar cuando hacemos clic en una feature si es la misma que esta activa
      featureClick = map.data.addListener('click', function(event) {
        if (!locations.features[0].properties.found) {
          if (event.feature.getProperty("id") === locations.features[0].properties.id) {
						// Establecemos que se ha encontrado la feature
            locations.features[0].properties.found = true;
						event.feature.setProperty("found", true);
						// Mostrar la feature descubierta
            map.data.overrideStyle(event.feature, { fillColor: "#0000ff", strokeColor: "#0000ff" });
						showCurrentPlace();
						showPlaceFoundState();
						// Si se han averiguado todos los lugares terminamos el juego
						if (locations.features.every(function(location) { return location.properties.found; })) {
							end(true);
						}
          } else {
						// Si se ha hecho clic en un lugar que no corresponde
            fail();
          }
        } else {
					//showCurrentPlaceName(event.latLng);
				}
      });
    }
		// Agrega las locations al mapa
		function updateMap() {
			// Limpiar capa
			map.data.forEach(function(feature) {
    		map.data.remove(feature);
			});
			// Anadir los lugares de juego al mapa
      map.data.addGeoJson(locations, { "idPropertyName": "id" });
		}
		// Actualizar contador de tiempo
    function updateTimer() {
      ui.remainingtimebar.style.width = ((timeleft * 100) / (timePerLocation * locationsToGuess)) + "%";
      var seconds = Math.round(timeleft / 1000);
      ui.timeleft.innerHTML = "{0}{1}".format((seconds >= 60 ? Math.floor(seconds / 60) + ":" : ""), Math.ceil(seconds % 60).toString().padStart((seconds >= 60 ? 2 : 1), "0"));
    }
		function showPlaceFoundState() {
			locations.features[0].properties.found ? ui.centralphoto.classList.add("found") : ui.centralphoto.classList.remove("found");
		}
		// Actualizar las fotos
		function updatePhotos() {
			ui.leftphoto.style.backgroundImage = "url(img/locations/{0}.jpg)".format(locations.features[locations.features.length - 1].properties.id.toString().padStart(8,"0"));
			ui.centralphoto.style.backgroundImage = "url(img/locations/{0}.jpg)".format(locations.features[0].properties.id.toString().padStart(8,"0"));
			ui.rightphoto.style.backgroundImage = "url(img/locations/{0}.jpg)".format(locations.features[1].properties.id.toString().padStart(8,"0"));
			showPlaceFoundState();
		}
		// Inicializar interfaz
    function initUI() {
      ui = {};
			// Carrousel de fotos
      ui.carousel = document.getElementById("carousel");
			/*
			var photo = docment.createElement("div");
      photo.classList.add("photo");
      photo.style.backgroundImage = "url(img/locations/{0}.jpg)".format(locations.features[0].properties.id.toString().padStart(8,"0"));
      ui.carousel.appendChild(photo);
			*/
			ui.leftphoto = ui.carousel.querySelector(".photo.left");
			ui.leftphoto.addEventListener("click", prev);
			ui.centralphoto = ui.carousel.querySelector(".photo.central");
			ui.centralphoto.addEventListener("click", zoom);
			ui.rightphoto = ui.carousel.querySelector(".photo.right");
			ui.rightphoto.addEventListener("click", next);
			// Contador de tiempo
			ui.timeleftbar = document.getElementById("timeleftbar");
			ui.remainingtimebar = ui.timeleftbar.querySelector(".bar");
			ui.timeleft = document.getElementById("timeleft");
			// Panel de resultados
			ui.results = {};
			ui.results.stars = {};
			ui.results.stars.one = document.getElementById("star1");
			ui.results.stars.two = document.getElementById("star2");
			ui.results.stars.three = document.getElementById("star3");
			ui.results.score = document.getElementById("score");
			ui.results.newGame = document.getElementById("newGame");
			ui.results.newGame.addEventListener("click", start);
    }
		// Muestra UI
		function showUI() {
			ui.timeleftbar.classList.remove("hidden");
			ui.timeleft.classList.remove("hidden");
			ui.carousel.classList.remove("hidden");
		}
		// Oculta UI
		function hideUI() {
			ui.timeleftbar.classList.add("hidden");
			ui.timeleft.classList.add("hidden");
			ui.carousel.classList.add("hidden");
			ui.carousel.classList.remove("thumbnail");
		}
		// Game loop
    var stopMain, lastFrameTime = 0;
    function gameLoop(time) {
			if (!gameOver) {	// paramos el gameloop cuando el juego esta acabado
	      stopMain = window.requestAnimationFrame(gameLoop);
	      if (timeleft > 0) {
	        update({
	          time: time,
	          delta: time - lastFrameTime
	        });
	        updateTimer();
	      }
	      lastFrameTime = time;
			}
    }
    function update(time) {
			timeleft -= time.delta;
			if (timeleft <= 0) {
				timeleft = 0;
				end(false);
			}
    }
		// Funcion auxiliar para calcular los bounds de una feature de la capa Data
		function getFeatureBounds(feature) {
			var bounds = new google.maps.LatLngBounds();
			feature.getGeometry().forEachLatLng(function(latlng){
				bounds.extend(latlng);
			});
			return bounds;
		}
		// Mostrar el lugar actual (solo si esta descubierto)
		function showCurrentPlace() {
			if (locations.features[0].properties.found) {
				var feature = map.data.getFeatureById(locations.features[0].properties.id);
				// Hacer zoom a la posicion del lugar
				var bounds = getFeatureBounds(feature);
				map.fitBounds(bounds);
				// Mostrar cartelito con el nombre del lugar
				if (!infowindow) {
					infowindow = new google.maps.InfoWindow();
				}
				infowindow.setContent(locations.features[0].properties.name);
				infowindow.setPosition(bounds.getCenter());
				infowindow.open(map);
			} else {
				infowindow && infowindow.close();
			}
		}
		// Ir al lugar anterior
		function next() {
			var first = locations.features.shift();
			locations.features.push(first);
			updatePhotos();
			showCurrentPlace();
		}
		// Ir al siguiente lugar
		function prev() {
			var last = locations.features.pop();
			locations.features.unshift(last);
			updatePhotos();
			showCurrentPlace();
		}
		// Alternar entre foto a tamano completo y foto en miniatura
		function zoom() {
			ui.carousel.classList.toggle("thumbnail");
		}
		// Calcular score por bonus de tiempo
		function getTimeBonus(remainingTimeRatio) {
			return scoreTimeBonus * (Math.log(1.01 - remainingTimeRatio) * -(locationsToGuess));
		}
    function end(winstate) {
			// TODO: Manejar winstate -> Mensaje de tiempo o terminado
			// Establecer juego acabado
			gameOver = true;
			// Eliminar control clic del mapa y features
			mapClick.remove();
			featureClick.remove();
			// Calcular bounds de los lugares encotnrados
			var bounds = new google.maps.LatLngBounds();
			map.data.forEach(function(f) {
				if (f.getProperty("found")) {
					bounds.union(getFeatureBounds(f));
				}
			});
			!bounds.isEmpty() && map.fitBounds(bounds);
			// Esconder interfaz de juego (y mostrar la interfaz de resumen)
			hideUI();
			// Estrellas (1 -> la mitad de los lugares (redondeo hacia arriba), 2 -> todos los lugares, 3 -> en menos de la mitad del tiempo)
			var remainingTimeRatio = timeleft / (timePerLocation * locationsToGuess);
			var foundLocationsCount = locations.features.filter(function(location) { return location.properties.found; }).length;
			var allFound = foundLocationsCount === locationsToGuess;
			var starRating = allFound ? (remainingTimeRatio > 0.5 ? 3 : 2) : (foundLocationsCount >= Math.ceil(locationsToGuess / 2) ? 1 : 0);
			switch(starRating) {
				case 3:
					ui.results.stars.three.classList.add("active");
				case 2:
					ui.results.stars.two.classList.add("active");
				case 1:
					ui.results.stars.one.classList.add("active");
				break;
			}
			// Puntuacion (por cada acierto + (bonus por acertar todas y bonus de tiempo))
			var score = Math.round((foundLocationsCount * scorePerLocation) + (allFound ? (scoreCompletionBonus + getTimeBonus(remainingTimeRatio)) : 0));
			// Contador
			window.setTimeout(function() {
				new CountUp(ui.results.score, 0, score, 0, 2.5).start();
			}, 1000)
			// TODO: mostrar y resaltar sitios nuevos y los no averiguados en b/n

			// TODO: mostrar en el resumen el conocimiento de Pamplona (xx de 38)

			// TODO: enviar puntuacion a DB y mostrar los mejores del dia (recuerda descartar puntuaciones meh)
			// TODO: {time:xxxx,locations:[1:true,2:false,3:true,4:false,5:true],score:xxxx,localidad:xxxxx}
    }
		// Procesar fallo
    function fail() {
			// Restar al tiempo restante n, minimo 0
			timeleft = Math.max(timeleft - failpenalty, 0.0000001);
			// Agitar la pantalla
      document.body.classList.remove("shake-freeze");
      window.setTimeout(function() {
        document.body.classList.add("shake-freeze");
      }, 300);
    }
		// Inicializar el juego, se llama en el momento en el que se carga la biblioteca GMaps
		function setup() {
			// Obtener la localidad donde se va a lugar
			localidad = localidades.find(function(l) { return l.names.indexOf(luke.html.queryString("localidad")) !== -1; }) || localidadPorDefecto;
			// Obtener los lugares de la localidad
      luke.ajax("data/{0}/locations.json".format(localidad.id), function (data) {
        allLocations = JSON.parse(data);
				// Inicializar interfaz
				initUI();
				// inicializar mapa
				initMap();
				start();
			});
		}
    function start() {
			// Aleatorizar
			// TODO: no mostrar las que ya ha acertado
      allLocations.features.shuffle();
			// Quedarse con las n primeras
      locations = JSON.parse(JSON.stringify({"type":"FeatureCollection","features": allLocations.features.slice(0, locationsToGuess) }));
			// Actualizar
			updateMap();
			updatePhotos();
			// Calcular tiempo de juego (en ms)
      timeleft = (timePerLocation * locationsToGuess);
      updateTimer();
			// Mostrar interfaz
			showUI();
			// Iniciar loop
			// TODO: Iniciar el loop al cerrar por primera vez las fotos?
			gameOver = false;
      gameLoop(0);
    }
		var gameObj = {
			setup: setup,
			// TODO: eliminar estos metodos publicos (son usados para depurar)
			start: start,
			next: next,
			prev: prev,
			end: end,
			map: function() {
				return map;
			},
			locations: function() {
				return locations;
			},
			completar: function() {
				locations.features.forEach(function(location) {
					location.properties.found = true;
				});
				end(true);
			}
		};
		return gameObj;

	})();

	global.game = game;

})(this);
