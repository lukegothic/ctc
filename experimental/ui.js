(function(global) {
	var SCENES = {
		CAROUSEL: 1,
		MAP: 2
	};
	var photoht, photocarousel, container;
	function showCarousel() {
		photocarousel.restore();
		photoht.element.classList.remove("compact");
		photocarousel.enable();
		container.classList.remove("map");
		setView(SCENES.CAROUSEL);
	}
	function showMap() {
		photoht.element.classList.add("compact");
		photocarousel.reset(true);
		photocarousel.disable();
		container.classList.add("map");
		setView(SCENES.MAP);
	}
	function setView(scene) {
		if (scene === SCENES.CAROUSEL) {
			photoht.on("swipedown", showMap);
			photoht.off("swipeup");
		} else {
			photoht.on("swipeup", showCarousel);
			photoht.off("swipedown");
		}
	}
	var UI = function() {
		photoht = new Hammer(document.querySelector(".carousel"));
		photoht.get("swipe").set({ direction: Hammer.DIRECTION_VERTICAL });
		photocarousel = new Carousel(photoht, 50);
		container = document.getElementById("container");
		setView(SCENES.CAROUSEL);
	};
	global.UI = UI;
})(this);
