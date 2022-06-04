(function ($global) { "use strict";
var StringTools = function() { };
StringTools.startsWith = function(s,start) {
	if(s.length >= start.length) {
		return s.lastIndexOf(start,0) == 0;
	} else {
		return false;
	}
};
StringTools.replace = function(s,sub,by) {
	return s.split(sub).join(by);
};
var WebMain = function() { };
WebMain.main = function() {
	var tippy = window.tippy;
	if(tippy != null) {
		tippy(".hex",{ allowHTML : true, content : function(el) {
			var tip = el.title;
			var metaStr = el.getAttribute("data-hex-meta");
			var metaArr = metaStr != null ? metaStr.split(";") : [];
			el.setAttribute("data-hex-text",tip.toLowerCase());
			var _this_r = new RegExp("(\n+)(\\u200b)","g".split("u").join(""));
			tip = tip.replace(_this_r,"$2$1");
			var start = 0;
			var pos = 0;
			var b = "";
			var isList = false;
			var color = null;
			while(pos < tip.length) {
				var from = pos++;
				var c = tip.charCodeAt(from);
				if(c == 8203) {
					if(from > start) {
						b += tip.substring(start,from);
					}
					var meta = metaArr.shift();
					if(meta == null) {
						console.log("src/WebMain.hx:49:","out of metas!");
					} else if(meta == "/") {
						if(color != null) {
							b += "</span>";
							color = null;
						}
					} else if(StringTools.startsWith(meta,"rgb")) {
						if(color != null) {
							b += "</span>";
						}
						color = meta;
						b += "<span style=\"color:" + color + "\">";
					}
					start = pos;
				} else if(c == 9672) {
					var lineBreaks = 0;
					while(tip.charCodeAt(from - 1) == 10) {
						--from;
						++lineBreaks;
					}
					if(from > start) {
						b += tip.substring(start,from);
					}
					if(color != null) {
						b += "</span>";
					}
					if(!isList) {
						isList = true;
						b += "\n<ul><li>";
					} else if(lineBreaks > 1) {
						b += "</li><li style=\"margin-top:0.5em\">";
					} else {
						b += "</li><li>";
					}
					if(color != null) {
						b += "<span style=\"color:" + color + "\">";
					}
					start = pos;
				}
			}
			b += tip.substring(start);
			if(color != null) {
				b += "</span>";
			}
			if(isList) {
				b += "</li></ul>";
			}
			var html = b;
			var _this_r = new RegExp("<span[^>]*></span>","g".split("u").join(""));
			html = html.replace(_this_r,"");
			var _this_r = new RegExp("^(.+)","".split("u").join(""));
			html = html.replace(_this_r,"<b>$1</b>");
			html = StringTools.replace(html,"\n","\n<br/>");
			html = StringTools.replace(html,"</li><li>","\n</li><li>\n");
			el.title = "";
			el.setAttribute("data-hex-html",html);
			return html;
		}});
	}
};
var haxe_iterators_ArrayIterator = function(array) {
	this.current = 0;
	this.array = array;
};
haxe_iterators_ArrayIterator.prototype = {
	hasNext: function() {
		return this.current < this.array.length;
	}
	,next: function() {
		return this.array[this.current++];
	}
};
WebMain.main();
})({});
