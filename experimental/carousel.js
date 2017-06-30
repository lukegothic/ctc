/*
Asunciones:
- esta enlazada la biblioteca hammer.js
- la estructura del elemento a carouselizar es ul -> li
- los estilos estan definidos para tener una lista horizontal: (TODO: meter los estilos por JS?)
	|- Lista: white-space: nowrap; overflow: hidden; position: fixed;
	|- items: display: inline-block; width: NUMpx
- el elemento tiene una clase animate que define la animacion de los items (opc)
*/
(function(global) {
	// CONST
	var reTranslate3d = /translate3d\((-?\d+(?:\.\d*)?)px, (-?\d+(?:\.\d*)?)px, (-?\d+(?:\.\d*)?)px\)/;
	// PROPS
	var items, itemHeights, currentIndex = 0;
	var offset, minoffset, maxoffset, startoffset, hammertime;
	// FUNCTS
	function getTranslate3d(element) {
		var translate3d = element.style.transform.match(reTranslate3d);
		return (translate3d && [parseInt(translate3d[1]),parseInt(translate3d[2]),parseInt(translate3d[3])]) || [0,0,0];
	}
	function setTranslate3d(element, translate3d) {
		element.style.transform = "translate3d(" + translate3d[0] + "px," + translate3d[1] + "px," + translate3d[2] + "px)";
	}
	function setItem(idx) {
		items[currentIndex].classList.remove("carousel-active");
		currentIndex = Math.max(Math.min(currentIndex + idx, itemHeights.length - 1), 0)
		items[currentIndex].classList.add("carousel-active")
		var targetx = itemHeights.filter((itemH, i) => i < currentIndex).reduce((sum, itemH) => sum - itemH, 0);
		setTranslate3d(hammertime.element, [targetx,0,0]);
	}
	function prev() {
		setItem(-1);
	}
	function next() {
		setItem(1);
	}
	function restore() {
		setItem(0);
	}
	function reset(keepSelection) {
		currentIndex = (keepSelection && currentIndex) || 0;
		setTranslate3d(hammertime.element, [0,0,0]);
	}
	function panstart(e) {
		startoffset = getTranslate3d(hammertime.element);
	}
	function pan(e) {
		var targetx = Math.max(Math.min(minoffset, startoffset[0] + e.deltaX), maxoffset)
		setTranslate3d(hammertime.element, [targetx,0,0]);
	}
	function panend(e) {
		if (Math.abs(e.deltaX) >= itemHeights[currentIndex] / 2) {
			if (e.direction === Hammer.DIRECTION_RIGHT) {
				prev();
			} else {
				next();
			}
		} else {
			restore();
		}
	}
	function disable() {
		hammertime.off("panstart");
		hammertime.off("panleft panright");
		hammertime.off("panend");
	}
	function enable() {
		!hammertime.handlers.panstart && hammertime.on("panstart", panstart);
		!hammertime.handlers.panleft && hammertime.on("panleft panright", pan);
		!hammertime.handlers.panend && hammertime.on("panend", panend);
	}
	function updateSize() {
		items = hammertime.element.querySelectorAll("li");
		itemHeights = Array.from(items).map(li => li.getBoundingClientRect().width);
		minoffset = offset;
		maxoffset = -(hammertime.element.getBoundingClientRect().width - document.body.getBoundingClientRect().width) - offset;
	}
	// CTOR
	var Carousel = function(item, off) {
		offset = off || 0;
		hammertime = (item instanceof Hammer.Manager && item) || new Hammer(item);
		updateSize();
		enable();
		restore();
		/*
		TODO:SWIPE
		hammertime.on("swipeleft", next);
		hammertime.on("swiperight", prev);
		*/
		return {
			reset: reset,
			restore: restore,
			updateSize: updateSize,
			enable: enable,
			disable: disable
		};
	};
	global.Carousel = Carousel;
})(this);