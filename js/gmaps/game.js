/*jshint esversion: 6 */
(function(global) {
	var game = (function() {
    // CONSTS
    var timePerLocation = 30000;
    var locationsToGuess = 5;
    // VARS
    var locations, map, timeleft, ui;
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
      map.data.addGeoJson(locations);
      map.data.setStyle({
        fillColor: 'transparent',
        strokeColor: "transparent",
        cursor: "url('https://maps.gstatic.com/mapfiles/openhand_8_8.cur') 8 8, default;"
      });
      // Si hacemos clic en una feature comprobamos que sea la correcta
      map.data.addListener('click', function(event) {
        console.log(event);
        // opcional al descubrir -- eliminar del mapa
        if (!locations.features[0].properties.found) {
          if (event.feature.getProperty("id") === locations.features[0].properties.id) {
              locations.features[0].properties.found = true;
              //map.data.overrideStyle(event.feature, {fillColor: 'red'});
              var infowindow = new google.maps.InfoWindow({
                content: locations.features[0].properties.name,
                position: event.latLng
              });
              infowindow.open(map);
          } else {
            fail();
          }
        }
      });
    }
    function updateUI() {
      ui.remainingtimebar.style.width = ((timeleft * 100) / (timePerLocation * locationsToGuess)) + "%";
      var seconds = Math.round(timeleft / 1000);
      ui.timeleft.innerHTML = "{0}{1}".format((seconds >= 60 ? Math.floor(seconds / 60) + ":" : ""), Math.ceil(seconds % 60).toString().padStart((seconds >= 60 ? 2 : 1), "0"));
    }
    function initUI() {
      ui = {};
      ui.carousel = document.getElementById("carousel");
      ui.timeleftbar = document.getElementById("timeleftbar");
      ui.remainingtimebar = ui.timeleftbar.querySelector(".bar");
      ui.timeleft = document.getElementById("timeleft");
      var photo = document.createElement("div");
      photo.classList.add("photo");
      photo.style.backgroundImage = "url(img/locations/{0}.jpg)".format(locations.features[0].properties.id.toString().padStart(8,"0"));
      ui.carousel.appendChild(photo);
      ui.timeleftbar.classList.remove("hidden");
      ui.timeleft.classList.remove("hidden");
      updateUI();
    }
    var stopMain, lastFrameTime = 0;
    function gameLoop(time) {
      stopMain = window.requestAnimationFrame(gameLoop);
      if (timeleft > 0) {
        update({
          time: time,
          delta: time - lastFrameTime
        });
        updateUI();
      }
      lastFrameTime = time;
    }
    function update(time) {
			timeleft -= time.delta;
			if (timeleft <= 0) {
				timeleft = 0;
				end();
			}
    }
    function end() {

    }
    function fail() {
        document.body.classList.remove("shake-freeze");
        window.setTimeout(function() {
          document.body.classList.add("shake-freeze");
        }, 300);
    }
    function start() {
      luke.ajax("data/locations.json", function (data) {
        // computar las localizaciones donde vamos a jugar
        locations = JSON.parse(data);
        locations.features.shuffle();
        locations.features.splice(locationsToGuess);
        timeleft = timePerLocation * locationsToGuess;
        initUI();
        initMap();
        gameLoop(0);
      });
    }
		var gameObj = {
      start: start
		};
		return gameObj;

	})();

	global.game = game;

})(this);
