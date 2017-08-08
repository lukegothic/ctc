/*jshint esversion: 6 */
(function(global) {
	var game = (function() {
    // CONSTS
		// TODO: no mostrar las que ya ha acertado
		// TODO: contemplar otros lugares (pamplona.ctc.com...)
    var timePerLocation = 30000;
    var locationsToGuess = 5;
		var failpenalty = 10000;
		// scores
		var scorePerLocation = 100;
		var scoreCompletionBonus = 300;
		var scoreTimeBonus = locationsToGuess * scorePerLocation;
    // VARS
    var locations, map, timeleft, ui, infowindow, gameOver;
    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 42.81577003943018, lng: -1.6500215999999455},
        maxZoom: 20,
        minZoom: 14,
        zoom: 14,
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
      map.setTilt(45);
      // Si hacemos clic en el mapa es un fallo si la feature no esta encontrada
      map.addListener('click', function(e) {
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
      map.data.addGeoJson(locations, { "idPropertyName": "id" });
      map.data.setStyle({
        fillColor: 'transparent',
        strokeColor: "transparent",
        cursor: "url('https://maps.gstatic.com/mapfiles/openhand_8_8.cur') 8 8, default;"
      });
      // Si hacemos clic en una feature comprobamos que sea la correcta
      map.data.addListener('click', function(event) {
        // opcional al descubrir -- eliminar del mapa si no se va a mostrar, o mostrarla
        if (!locations.features[0].properties.found) {
          if (event.feature.getProperty("id") === locations.features[0].properties.id) {
              locations.features[0].properties.found = true;
              //map.data.overrideStyle(event.feature, {fillColor: 'red'});
							//showCurrentPlaceName(event.latLng);
							showCurrentPlace();
							ui.centralphoto.classList.add("found");
							if (locations.features.every(function(location) { return location.found; })) {
								end(true);
							}
          } else {
            fail();
          }
        } else {
					//showCurrentPlaceName(event.latLng);
				}
      });
    }
		/*
		function showCurrentPlaceName(position) {
			if (!infowindow) {
				infowindow = new google.maps.InfoWindow({
					content: locations.features[0].properties.name,
					position: position
				});
			} else {
				infowindow.setContent(locations.features[0].properties.name);
				infowindow.setPosition(position);
			}
			infowindow.open(map);
		}
		*/
    function updateTimer() {
      ui.remainingtimebar.style.width = ((timeleft * 100) / (timePerLocation * locationsToGuess)) + "%";
      var seconds = Math.round(timeleft / 1000);
      ui.timeleft.innerHTML = "{0}{1}".format((seconds >= 60 ? Math.floor(seconds / 60) + ":" : ""), Math.ceil(seconds % 60).toString().padStart((seconds >= 60 ? 2 : 1), "0"));
    }
		function updatePhotos() {
			ui.leftphoto.style.backgroundImage = "url(img/locations/{0}.jpg)".format(locations.features[locations.features.length - 1].properties.id.toString().padStart(8,"0"));
			ui.centralphoto.style.backgroundImage = "url(img/locations/{0}.jpg)".format(locations.features[0].properties.id.toString().padStart(8,"0"));
			locations.features[0].properties.found ? ui.centralphoto.classList.add("found") : ui.centralphoto.classList.remove("found");
			ui.rightphoto.style.backgroundImage = "url(img/locations/{0}.jpg)".format(locations.features[1].properties.id.toString().padStart(8,"0"));
		}
    function initUI() {
      ui = {};
      ui.carousel = document.getElementById("carousel");
      //var photo = docment.createElement("div");
      //photo.classList.add("photo");
      //photo.style.backgroundImage = "url(img/locations/{0}.jpg)".format(locations.features[0].properties.id.toString().padStart(8,"0"));
      //ui.carousel.appendChild(photo);
			ui.leftphoto = ui.carousel.querySelector(".photo.left");
			ui.leftphoto.addEventListener("click", prev);
			ui.centralphoto = ui.carousel.querySelector(".photo.central");
			ui.centralphoto.addEventListener("click", zoom);
			ui.rightphoto = ui.carousel.querySelector(".photo.right");
			ui.rightphoto.addEventListener("click", next);
			updatePhotos();
			ui.timeleftbar = document.getElementById("timeleftbar");
			ui.remainingtimebar = ui.timeleftbar.querySelector(".bar");
			ui.timeleft = document.getElementById("timeleft");
      ui.timeleftbar.classList.remove("hidden");
      ui.timeleft.classList.remove("hidden");
      updateTimer();
    }
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
		function showCurrentPlace() {
			if (locations.features[0].properties.found) {
				var feature = map.data.getFeatureById(locations.features[0].properties.id);
				var bounds = new google.maps.LatLngBounds();
				feature.getGeometry().forEachLatLng(function(latlng){
		      bounds.extend(latlng);
		    });
				map.fitBounds(bounds);
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
		function next() {
			var first = locations.features.shift();
			locations.features.push(first);
			updatePhotos();
			showCurrentPlace();
		}
		function prev() {
			var last = locations.features.pop();
			locations.features.unshift(last);
			updatePhotos();
			showCurrentPlace();
		}
		function zoom() {
			ui.carousel.classList.toggle("thumbnail");
		}
		function getLocationScore() {
			return locations.features.reduce(function(sum, location) { return sum + (location.properties.found ? scorePerLocation : 0) }, 0);
		}
		function getCompletionBonus() {
			return locations.features.every(function	(location) { return location.properties.found; }) ? scoreCompletionBonus : 0;
		}
		function getTimeBonus() {
			return scoreTimeBonus * (Math.log(1.01 - (timeleft / (timePerLocation * locationsToGuess))) * -(locationsToGuess));
		}
    function end(winstate) {
			console.log("end",winstate);
			gameOver = true;
			ui.timeleftbar.classList.add("hidden");
			ui.timeleft.classList.add("hidden");
			ui.carousel.classList.remove("thumbnail");
			ui.carousel.classList.add("hidden");
			var score = getLocationScore() + getCompletionBonus() + getTimeBonus();
			console.log(score);
			// TODO: mostrar en el resumen el conocimiento de Pamplona (xx de 38)
			// TODO: mostrar y resaltar sitios nuevos y los no averiguados en b/n
			// TODO: mostrar estrellas (1 -> la mitad de los lugares (redondeo hacia arriba), 2 -> todos los lugares, 3 -> en menos de la mitad del tiempo)
			// TODO: enviar puntuacion a DB y mostrar los mejores del dia (recuerda descartar puntuaciones meh)
    }
    function fail() {
				timeleft = Math.max(timeleft - failpenalty, 0.0000001);
        document.body.classList.remove("shake-freeze");
        window.setTimeout(function() {
          document.body.classList.add("shake-freeze");
        }, 300);
    }
    function start() {
      luke.ajax("data/locations.json", function (data) {
        // obtener las localizaciones y seleccionar un subconjunto
        locations = JSON.parse(data);
        locations.features.shuffle();
        locations.features.splice(locationsToGuess);
        timeleft = (timePerLocation * locationsToGuess);
        initUI();
        initMap();
				gameOver = false;
        gameLoop(0);
      });
    }
		var gameObj = {
      start: start,
			// TODO: eliminar estos metodos publicos
			next: next,
			prev: prev,
			end: end,
			locations: function() {
				return locations;
			}
		};
		return gameObj;

	})();

	global.game = game;

})(this);
