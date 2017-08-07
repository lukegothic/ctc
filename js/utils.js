// Language extensions
Math.getRandom = function(min, max) {
    if (!max) {
        max = min;
        min = 0;
    }
    return Math.random() * (max - min) + min;
};
Math.getRandomInt = function(min, max, inclusive) {
    if (!max) {
        max = min;
        min = 0;
    } else if (typeof max === "boolean") {
        inclusive = max;
        max = min;
        min = 0;
    }
    return Math.floor(Math.getRandom(Math.ceil(min), Math.floor(max + (inclusive ? 1 : 0))));
};
Math.dice = function(num, sides) {
    var r = 0;
    for (var i = 0; i < num; i++) {
        r += Math.getRandomInt(1, sides, true);
    }
    return r;
};
!Object.prototype.getIndex && (Object.defineProperty(Object.prototype, "getIndex", {
    value: function(idx) {
        if (idx !== undefined && typeof idx === "number") {
            var keys = Object.keys(this);
            keys.sort();
            return this[keys[idx]];
        }
    }
}));
!Object.prototype.length && (Object.defineProperty(Object.prototype, "length", {
    get: function() {
        return Object.keys(this).length;
    }
}));
/*
!Object.prototype.forEach && (Object.defineProperty(Object.prototype, "forEach", {
	value: function(fn, ctx) {
		if (fn !== undefined && typeof fn === "function") {
			for (var key in this) {
				if (this.hasOwnProperty(key)) {
					fn.call(ctx ? ctx : this, key, this[key]); // key, value
				}
			}
		}
	}
}));
*/
!Object.prototype.watch && (Object.defineProperty(Object.prototype, "watch", {
	enumerable: false,
	configurable: true,
	writable: false,
	value: function (prop, handler) {
		var oldval = this[prop],
			newval = oldval,
			getter = function () {
				return newval;
			},
			setter = function (val) {
				oldval = newval;
				return newval = handler.call(this, prop, oldval, val);
			};
		if (delete this[prop]) { // can't watch constants
			Object.defineProperty(this, prop, {
				get: getter,
				set: setter,
				enumerable: true,
				configurable: true
			});
		}
	}
}));
!Object.prototype.unwatch && (Object.defineProperty(Object.prototype, "unwatch", {
	enumerable: false,
	configurable: true,
	writable: false,
	value: function (prop) {
		var val = this[prop];
		delete this[prop]; // remove accessors
		this[prop] = val;
	}
}));
!Array.prototype.swap && (Array.prototype.swap = function(a, b) {
    if (a >= 0 && a < this.length && b >= 0 && b < this.length) {
        var tmp = this[a];
        this[a] = this[b];
        this[b] = tmp;
    } else {
        // TODO: Error params.
    }
    return this;
});
!Array.prototype.shuffle && (Array.prototype.shuffle = function() {
    for (var i = this.length - 1; i > 0; i--) {
        this.swap(i, Math.getRandomInt(0, i, true));
    }
    return this;
});
!String.prototype.format && (String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
        return typeof args[number] != 'undefined' ? args[number] : match;
    });
});
!String.prototype.padStart && (String.prototype.padStart = function padStart(targetLength,padString) {
    targetLength = targetLength>>0;
    padString = String(padString || ' ');
    if (this.length > targetLength) {
        return String(this);
    } else {
        targetLength = targetLength-this.length;
        if (targetLength > padString.length) {
            padString += padString.repeat(targetLength/padString.length);
        }
        return padString.slice(0,targetLength) + String(this);
    }
});
// Public functions
if (!window.luke) window.luke = {};
luke.ajax = function(url, callback, data, x) {
	try {
		x = new(window.XMLHttpRequest || ActiveXObject)("MSXML2.XMLHTTP.3.0");
		x.open(data ? "POST" : "GET", url, 1);
		x.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		x.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		x.onreadystatechange = function () {
			x.readyState > 3 && callback && callback(x.responseText, x);
		};
		x.send(data)
	} catch (e) {
		window.console && console.log(e);
	}
};
// HTML Functions
if (!window.luke.html) window.luke.html = {};
luke.html.getLinks = function(input, pattern, excludes) {
    // normalizar entrada
    if (!pattern || Array.isArray(pattern)) {
        excludes = pattern;
        pattern = input;
        input = document.documentElement.outerHTML;
    }
    excludes = (excludes || []);
    var re = new RegExp("<a.*?(" + pattern + ").*?>", "g");
    var m;
    var links = [];
    while ((m = re.exec(input))) {
        if (m.length > 1 && m[1] && excludes.indexOf(m[1]) === -1 && links.indexOf(m[1]) === -1) {
            links.push(m[1]);
        }
    }
    return links;
};
