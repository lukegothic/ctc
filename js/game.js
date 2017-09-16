/*jshint esversion: 6 */
(function(global) {
	var game = (function() {
    // CONSTS
		var states = {
			"RUNNING": 1,
			"PAUSED": 2,
			"GAMEOVER": 3
		};
		var localidades = [{
			"id": 31201,
			"names": ["Pamplona", "Iruña", "Iruñea"],
			"center": {lat: 42.81577003943018, lng: -1.6500215999999455},
			"zoom": 14
		},{
			"id": 48000,
			"names": ["Bilbao", "Bilbo"],
			"center": {lat: 43.26288229341335, lng: -2.9340414415282856},
			"zoom": 14
		},{
			"id": 01000,
			"names": ["Vitoria", "Gasteiz"],
			"center": {lat: 42.81577003943018, lng: -1.6500215999999455},
			"zoom": 14
		},{
			"id": 20000,
			"names": ["San Sebastian", "Sanse", "Donostia", "Donosti"],
			"center": {lat: 43.30747867294754, lng: -1.972252256469682},
			"zoom": 14
		}];
		var localidadPorDefecto = localidades[0];
    var timePerLocation = 30000;
    var locationsToGuess = 4;
		var failpenalty = 10000;
		// scores
		var scorePerLocation = 100;
		var scoreCompletionBonus = 300;
		var scoreTimeBonus = locationsToGuess * scorePerLocation;
    // VARS
    var localidad, allLocations, locations, map, timeleft, ui, infowindow, state, mapClick, featureClick;
		// Inicializar GMap
    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        center: localidad.center,
        maxZoom: 20,
        minZoom: localidad.zoom,
        zoom: localidad.zoom,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        labels: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
				fullscreenControl: false,
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
    "featureType": "road.arterial",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
  "featureType": "road.local",
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
      map.data.setStyle({
        fillColor: 'transparent',
        strokeColor: "transparent",
        cursor: "url('https://maps.gstatic.com/mapfiles/openhand_8_8.cur') 8 8, default;"
      });
			// TODO: MEJORA: CARGAR SOLO LA FEATURE CON LA QUE SE ESTA JUGANDO? Simplificaria esta funcion
      // Comprobar cuando hacemos clic en una feature si es la misma que esta activa
      featureClick = map.data.addListener('click', function(event) {
        if (!locations.features[0].properties.found) {
          if (event.feature.getProperty("id") === locations.features[0].properties.id) {
						// Establecemos que se ha encontrado la feature
            locations.features[0].properties.found = true;
						event.feature.setProperty("found", true);
						// Mostrar la feature descubierta (desactivado)
            //map.data.overrideStyle(event.feature, { fillColor: "#0000ff", strokeColor: "#0000ff" });
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
			map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(new HomeButton());
    }
		function HomeButton() {
			// TODO: STYLES EN CSS
			var controlDiv = document.createElement('div');
			// Set CSS for the control border.
		  var controlUI = document.createElement('div');
		  controlUI.style.backgroundColor = '#fff';
		  controlUI.style.border = '2px solid #fff';
		  controlUI.style.borderRadius = '3px';
		  controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
		  controlUI.style.cursor = 'pointer';
		  controlUI.style.marginBottom = '22px';
		  controlUI.style.textAlign = 'center';
		  controlUI.title = 'Click to recenter the map';
		  controlDiv.appendChild(controlUI);

		  // Set CSS for the control interior.
		  var controlText = document.createElement('div');
		  controlText.style.color = 'rgb(25,25,25)';
		  controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
		  controlText.style.fontSize = '16px';
		  controlText.style.lineHeight = '38px';
		  controlText.style.paddingLeft = '5px';
		  controlText.style.paddingRight = '5px';
		  controlText.innerHTML = 'Home';
		  controlUI.appendChild(controlText);

		  controlUI.addEventListener('click', goHome);

			controlDiv.index = 1;
			return controlDiv;
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
      var timeInSeconds = Math.round(timeleft / 1000);
      var timeAsText = "";
      var minutes = Math.floor(timeInSeconds / 60);
      var seconds = timeInSeconds % 60;
      if (minutes) {
        timeAsText += minutes + ":";
      }
      timeAsText += ((seconds < 10 && minutes > 0) ? "0" : "") + seconds;
      ui.timeleft.innerHTML = timeAsText;
    }
		function showPlaceFoundState() {
			locations.features[0].properties.found ? ui.centralphoto.classList.add("found") : ui.centralphoto.classList.remove("found");
		}
		// Actualizar las fotos
		function updatePhotos() {
			var dataDir = "data/{0}".format(localidad.id);
			var imageUrl = "url({0}/locations/{1}.jpg)".format(dataDir, "{0}");
			ui.leftphoto.style.backgroundImage = imageUrl.format(locations.features[locations.features.length - 1].properties.id.toString().padStart(8,"0"));
			ui.centralphoto.style.backgroundImage = imageUrl.format(locations.features[0].properties.id.toString().padStart(8,"0"));
			ui.rightphoto.style.backgroundImage = imageUrl.format(locations.features[1].properties.id.toString().padStart(8,"0"));
			showPlaceFoundState();
		}
    // resetea los resultados
    function resetResults() {
      // reiniciar estilos
      ui.results.stars.one.classList.remove("active");
      ui.results.stars.two.classList.remove("active");
      ui.results.stars.three.classList.remove("active");
      ui.results.locations.one.classList.remove("found");
      ui.results.locations.two.classList.remove("found");
      ui.results.locations.three.classList.remove("found");
      ui.results.locations.four.classList.remove("found");
    }
    function updateResults(starRating, perf) {
      switch(starRating) {
        case 3:
          ui.results.stars.three.classList.add("active");
        case 2:
          ui.results.stars.two.classList.add("active");
        case 1:
          ui.results.stars.one.classList.add("active");
        break;
      }
      ui.results.performance.innerHTML = "" + perf + "%";
      // TODO: generar automaticamente en funcion de numero de locations
      // asignar fotos y nombres a panel de resultados
			var dataDir = "data/{0}".format(localidad.id);
			var imageUrl = "url({0}/locations/{1}.jpg)".format(dataDir, "{0}");
      ui.results.locations.one.style.backgroundImage = imageUrl.format(locations.features[0].properties.id.toString().padStart(8,"0"));
      if (locations.features[0].properties.found) {
        ui.results.locations.one.classList.add("found");
        ui.results.locations.one.querySelector(".name").innerHTML = locations.features[0].properties.name;
      }
      ui.results.locations.two.style.backgroundImage = imageUrl.format(locations.features[1].properties.id.toString().padStart(8,"0"));
      if (locations.features[1].properties.found) {
        ui.results.locations.two.classList.add("found");
        ui.results.locations.two.querySelector(".name").innerHTML = locations.features[1].properties.name;
      }
      ui.results.locations.three.style.backgroundImage = imageUrl.format(locations.features[2].properties.id.toString().padStart(8,"0"));
      if (locations.features[2].properties.found) {
        ui.results.locations.three.classList.add("found");
        ui.results.locations.three.querySelector(".name").innerHTML = locations.features[2].properties.name;
      }
      ui.results.locations.four.style.backgroundImage = imageUrl.format(locations.features[3].properties.id.toString().padStart(8,"0"));
      if (locations.features[3].properties.found) {
        ui.results.locations.four.classList.add("found");
        ui.results.locations.four.querySelector(".name").innerHTML = locations.features[3].properties.name;
      }
    }
		// Inicializar interfaz
    function initUI() {
      ui = {};
			// HUD
			ui.escudociudad	= document.querySelector("h2 img");
			var escudoUrl = "data/{0}/escudo_small.png".format(localidad.id);
			//var img = new Image();
			//img.src = escudoUrl;
			ui.escudociudad.src = escudoUrl;
			ui.nombreciudad = document.querySelector("h2 span");
			ui.nombreciudad.innerHTML = luke.html.queryString("localidad") || localidad.names[0];
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
			// Panel de resultados y textos
      ui.endGameText = document.querySelector("#gameendtext .content");
			ui.results = {};
			ui.results.stars = {
        one: document.getElementById("star1"),
        two: document.getElementById("star2"),
        three: document.getElementById("star3")
      };
			ui.results.score = document.getElementById("score");
			ui.results.scoreComparison = document.getElementById("scoreComparison");
			ui.results.newGame = document.getElementById("newGame");
			ui.results.newGame.addEventListener("click", start);
			ui.results.who = document.querySelector(".LI-profile-badge");
			ui.results.whoIam = document.getElementById("whoIam");
			ui.results.whoIam.addEventListener("click", showMe);
      ui.results.locations = {
        one: document.getElementById("location1"),
        two: document.getElementById("location2"),
        three: document.getElementById("location3"),
        four: document.getElementById("location4")
      };
      ui.results.performance = document.querySelector("#performance strong");
			ui.results.collectionprogress = document.getElementById("collectionprogress");
    }
		function goHome() {
			map.setZoom(localidad.zoom);
			map.setCenter(localidad.center);
		}
    function showMe() {
			if (ui.results.who.classList.contains("hide")) {
				ui.results.who.classList.remove("hide");
			} else {
				ui.results.who.classList.add("hide");
			}
    }
		// Muestra UI
		function showUI() {
			ui.timeleftbar.classList.remove("hide");
			ui.timeleft.classList.remove("hide");
			ui.carousel.classList.remove("hide");
		}
		// Oculta UI
		function hideUI() {
			ui.timeleftbar.classList.add("hide");
			ui.timeleft.classList.add("hide");
			ui.carousel.classList.add("hide");
			ui.carousel.classList.remove("thumbnail");
		}
		// Game loop
    var stopMain, lastFrameTime = 0;
    function gameLoop(time) {
      stopMain = window.requestAnimationFrame(gameLoop);
      if (state === states.RUNNING && timeleft > 0) {
        update({
          time: time,
          delta: time - lastFrameTime
        });
        updateTimer();
      }
      lastFrameTime = time;
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
			// Mensaje de tiempo o terminado
      ui.endGameText.innerHTML = winstate ? "TERMINADO" : "TIEMPO";
			// Establecer juego acabado
			state = states.GAMEOVER;
			// Eliminar control clic del mapa y features
      infowindow && infowindow.close();
			//mapClick.remove();
			//featureClick.remove();
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
			// Guardar las locations encontradas y mostrar progreso
			var storeLocationIds = localStorage.getItem("guessedLocations");
			storeLocationIds = storeLocationIds && storeLocationIds.split(";") || [];
			var foundLocations = locations.features.filter(function(location) { return location.properties.found; }).map(function(location) { return ""+location.properties.id; });
			storeLocationIds = storeLocationIds.concatUnique(foundLocations);
			localStorage.setItem("guessedLocations", storeLocationIds.join(";"));
			ui.results.collectionprogress.value = storeLocationIds.length;
			ui.results.collectionprogress.max = allLocations.features.length;
			ui.results.collectionprogress.innerHTML = Math.round(storeLocationIds.length * 100 / allLocations.features.length) + " %";
			// Estrellas (1 -> la mitad de los lugares (redondeo hacia arriba), 2 -> todos los lugares, 3 -> en menos de la mitad del tiempo)
			var remainingTimeRatio = timeleft / (timePerLocation * locationsToGuess);
			var foundLocationsCount = foundLocations.length;
			var allFound = foundLocationsCount === locationsToGuess;
			var starRating = allFound ? (remainingTimeRatio > 0.5 ? 3 : 2) : (foundLocationsCount >= Math.ceil(locationsToGuess / 2) ? 1 : 0);
			// Puntuacion (por cada acierto + (bonus por acertar todas y bonus de tiempo))
			var score = Math.round((foundLocationsCount * scorePerLocation) + (allFound ? (scoreCompletionBonus + getTimeBonus(remainingTimeRatio)) : 0));
			// TODO: calcular score maximo y porcentaje de performance, lo de ahora es un poco chunguele
      var medianScore = 1800;
      var maxScore = 8000;
      var perf = score / medianScore;
      if (perf >= 1) {
        perf = 1;
        perf += (score - medianScore) / (maxScore - medianScore);
      }
      perf *= 50;
      updateResults(starRating, Math.round(perf));
			// Por ultimo, guardar puntuacion y mostrar si estamos por encima o por debajo de nuestra media
			var myScores = localStorage.getItem("myScores");
			myScores = myScores && myScores.split(";") || [];
			if (myScores.length > 0) {
				var betterScore = score >= myScores.reduce(function(sum, item) { return sum + item; }, 0) / myScores.length;
				// TODO: fontawesome
				ui.results.scoreComparison.classList.remove(!betterScore ? "fa-better" : "fa-worse");
				ui.results.scoreComparison.classList.add(betterScore ? "fa-better" : "fa-worse");
			}
			myScores.push(score);
			localStorage.setItem("myScores", myScores.join(";"));
			// Contador
			window.setTimeout(function() {
				new CountUp(ui.results.score, 0, score, 0, 2.5).start();
			}, 2100)
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
        gameLoop(0);
				start();
			});
		}
    function start() {
			// Aleatorizar
			// TODO: mejora_ no mostrar las que ya ha acertado
			var guessedLocationIds = localStorage.getItem("guessedLocations");
			guessedLocationIds = guessedLocationIds && guessedLocationIds.split(";") || [];
			var guessedLocations = [], unknownLocations = [];
      allLocations.features.shuffle().forEach(function(location) {
				if (guessedLocationIds.indexOf(""+location.properties.id) === -1) {
					unknownLocations.push(location);
				} else {
					guessedLocations.push(location);
				}
			});
			// anadir desconocidas
			locations = unknownLocations.slice(0, locationsToGuess);
			// anadir las que faltan
			locations = locations.concat(guessedLocations.slice(0, locationsToGuess - locations.length));
			// Quedarse con las n primeras
			locations = { "type": "FeatureCollection", "features": JSON.parse(JSON.stringify(locations)) };
			// Actualizar
			updateMap();
			updatePhotos();
      resetResults();
			// Calcular tiempo de juego (en ms)
      timeleft = (timePerLocation * locationsToGuess);
      updateTimer();
			// Mostrar interfaz
			showUI();
			// Iniciar loop
			// TODO: mejora: Iniciar el loop al cerrar por primera vez las fotos?
			state = states.RUNNING;
    }
		var gameObj = {
			setup: setup,
			// TODO: eliminar estos metodos publicos (son usados para depurar)
			start: start,
			next: next,
			prev: prev,
			end: end,
			goHome: goHome,
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
			},
			setState: function (s) {
				state = s;
			}
		};
		return gameObj;

	})();

	global.game = game;

})(this);
