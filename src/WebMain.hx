package ;
import haxe.DynamicAccess;
import js.Browser;
import js.Syntax;
import js.html.Element;
using StringTools;

/**
 * ...
 * @author YellowAfterlife
 */
class WebMain {
	public static function main() {
		var tippy = (cast Browser.window).tippy;
		if (tippy != null) tippy(".hex", {
			allowHTML: true,
			content: function(el:Element) {
				var tip = el.title;
				
				//
				var metaStr = el.getAttribute("data-hex-meta");
				var metaArr = metaStr != null ? metaStr.split(";") : [];
				
				// used for filtering:
				el.setAttribute('data-hex-text', tip.toLowerCase());
				
				// switch up ZWSP<->\n+ so that we have less trouble parsing
				tip = ~/(\n+)(\u200b)/g.replace(tip, "$2$1");
				
				var start = 0;
				var pos = 0;
				var b = "";
				var isList = false;
				var color:String = null;
				
				while (pos < tip.length) {
					var from = pos++;
					inline function flush():Void {
						if (from > start) {
							b += tip.substring(start, from);
						}
					}
					//
					var c = tip.fastCodeAt(from);
					if (c == 8203) {
						flush();
						var meta = metaArr.shift();
						if (meta == null) {
							trace("out of metas!");
						} else if (meta == "/") {
							if (color != null) {
								b += ('</span>');
								color = null;
							}
						} else if (meta.startsWith("rgb")) {
							if (color != null) b += '</span>';
							color = meta;
							b += '<span style="color:$color">';
						}
						start = pos;
					} else if (c == "◈".code) {
						var lineBreaks = 0;
						while (tip.fastCodeAt(from - 1) == "\n".code) { from--; lineBreaks++; }
						flush();
						if (color != null) b += '</span>';
						//
						if (!isList) {
							isList = true;
							b += "\n<ul><li>";
						} else if (lineBreaks > 1) {
							b += '</li><li style="margin-top:0.5em">';
						} else b += "</li><li>";
						//
						if (color != null) b += '<span style="color:$color">';
						start = pos;
					}
					//
				}
				b += tip.substring(start);
				if (color != null) b += "</span>";
				if (isList) b += "</li></ul>";
				var html = b;
				html = ~/<span[^>]*><\/span>/g.replace(html, "");
				html = ~/^(.+)/.replace(html, "<b>$1</b>");
				html = html.replace("\n", "\n<br/>");
				html = html.replace("</li><li>", "\n</li><li>\n");
				//
				el.title = "";
				el.setAttribute("data-hex-html", html);
				//
				return html;
			}
		});
	}
}