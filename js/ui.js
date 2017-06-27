/*jshint esversion: 6 */
(function(global) {
	var UI = (function() {
		var elements = {
			container: $("header"),
			timer: $(".timer"),
			score: $("#score"),
			map: $(".map"),
			location: {
				list: $("#locations"),
				template: $("#locations .template").removeClass("hidden template").remove()
			},
			friocaliente: {
				button: $("#friocalientePowerup"),
				cooldown: $("#friocalientePowerup .cooldown")
			},
			radar: {
				button: $("#radarPowerup"),
				cooldown: $("#radarPowerup .cooldown")
			}
		};
		elements.radar.button.click(function() {
			Game.radar.use();
		});
		var humanizeTime = function(seconds) {
			return "{0}:{1}".format(Math.floor(seconds / 60), (seconds % 60).toString().padStart(2, "0"));
		};
		var updateScore = function() {
			elements.score.html(Game.score);
		};
		return {
			draw: function(game) {
				game.locations.forEach(function(location) {
					var node = elements.location.template.clone();
					if (location.finished()) { // TODO: REFACTORIZAR CON *2
						node.addClass(location.found ? "found" : "failed");
					}
					var attemptList = node.find(".attemptlist");
					// TODO: REFACTORIZAR CON *1
					for (var a = 1; a <= game.cfg.maxAttempts; a++) {
						var attemptCls = "";
						if (a < location.attempts) {
							attemptCls = " bad";
						} else if (a == location.attempts) {
							attemptCls = location.found ? " good" : " bad";
						}
						attemptList.append($("<li>").addClass("attempt" + attemptCls));
					}
					node.find(".photo").css("background-image", "url(img/locations/{0}.jpg)".format(location.id.toString().padStart(8, "0")));
					node.click(function() {
						if (!location.found && location.id !== Game.selectedLocation.id) {
							Game.selectedLocation = location;
						}
					});
					location.node = node;
					elements.location.list.append(node);
				});
				updateScore();
			},
			updateCurrentLocation: function() {
				if (Game.selectedLocation) {
					// TODO: REFACTORIZAR CON *1
					Game.selectedLocation.node.find(".attempt").eq(Game.selectedLocation.attempts - 1).addClass(Game.selectedLocation.found ? " good" : " bad");
					if (Game.selectedLocation.finished()) { // TODO: REFACTORIZAR CON *2
						Game.selectedLocation.node.addClass(Game.selectedLocation.found ? "found" : "failed");
					}
				}
			},
			endUnknownLocations: function() {
				Game.locations.filter(function(l) {
					return !l.found
				}).forEach(function(l) {
					l.node.addClass("failed");
				})
			},
			showMessage: function(message, state) {
				$(".message").html(message).removeClass("animate").removeClass(function(i, className) {
					var m = className.match(/message\-\d/, "");
					return m && m[0];
				}).addClass("message-" + state);
				window.setTimeout(function() {
					$(".message").addClass("animate");
				}, 50);
			},
			updateScore: updateScore,
			selectCurrentLocation: function() {
				$(".location.selected").removeClass("selected");
				if (Game.selectedLocation) Game.selectedLocation.node.addClass("selected");
			},
			update: function() {
				elements.timer.html(humanizeTime(Math.ceil(Game.remainingTime / 1000)));
				if (Game.remainingTime < 60000) {
					if (!elements.container.hasClass("danger")) {
						elements.container.addClass("danger");
					}
				}
				if (Game.radar.cooldown > 0) {
					elements.radar.cooldown.html(Math.ceil(Game.radar.cooldown / 1000));
				} else {
					elements.radar.cooldown.html("");
				}
			},
			showScoreScreen: function() {
				// TODO: cambiar scene a score y esperar a la puntuacion
			},
			loadScoreScreen: function() {
				// TODO: mostrar resultado final
				console.log(Game.score);
			}
		};
	})();

	global.UI = UI;

})(this);
