package;

import haxe.io.Path;
import format.csv.*;
import haxe.Utf8;
import sys.io.File;

using StringTools;

class Variables {
    static var input = "localization.csv";
    static var output = "variables_base.csv";

    static function parse(path:String) {
        var csv = Reader.parseCsv(File.getContent(path + input));
        var dest:UnicodeString = "";

        for ( row in csv )
        {
            var src:UnicodeString = row[1];
            var sub:UnicodeString = "";
            var start = src.indexOf("[$={");
            var end = src.indexOf("}]", start);

            while (start >= 0) {
                end = src.indexOf("]", start);
                sub = src.substring(start + 4, end - 1) + ",";

                if (dest.indexOf(sub) < 0) {
                    dest = dest + sub + "\n";
                }

                start = src.indexOf("[$={", end + 2);
            }
        }

        File.saveContent(path + output, dest);
    }

    static function main() {
        parse("docs/");
    }
}