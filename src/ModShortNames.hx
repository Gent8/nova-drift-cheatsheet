package;
import sys.io.File;
import format.csv.*;

/**
 * ...
 * @author YellowAfterlife
 */
class ModShortNames {
	static var abbrMap = new Map<Mod, Bool>();
	static var abbrMap2 = new Map<String, Bool>();
	static var csv = Reader.parseCsv(File.getContent("src/ModName.csv"));

	/**
	 * Returns (MODALIAS1)=(MODNAME1);(MODALIAS2)=(MODNAME2);...
	 * @param csvCol Column number of CSV for alias acquisition
	 */
	public static function print(csvCol:Int)
	{
		var fromMap:Map<String, String> = new Map();
		var toMap:Map<String, String> = new Map();
		var arr = [];

		for (row in csv)
		{
			if (fromMap.exists(row[0]))
				throw row[0] + ' already added';
			if (toMap.exists(row[csvCol]))
				throw row[0] + ' is taken by ' + toMap[row[csvCol]];
			fromMap[row[0]] = row[csvCol];
			toMap[row[csvCol]] = row[0];
			arr.push(row[csvCol] + '=' + row[0]);
		}

		return arr.join(";");
	}
}
