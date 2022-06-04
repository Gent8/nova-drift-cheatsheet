package ;
import sys.io.File;

/**
 * ...
 * @author YellowAfterlife
 */
class ModGen {
	public static function main() {
		var css = File.getContent("docs/hex.css");
		var b = new StringBuf();
		b.add("enum abstract Mod(String) to String {");
		~/\.hex\.(\w+) {/g.map(css, function(rx:EReg) {
			b.add("\r\n\tvar ");
			b.add(rx.matched(1));
			b.add(";");
			return rx.matched(0);
		});
		b.add("\r\n}\r\n");
		File.saveContent("src/Mod.hx", b.toString());
	}
}