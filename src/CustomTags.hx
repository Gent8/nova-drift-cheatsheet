package ;
import haxe.DynamicAccess;

/**
 * ...
 * @author YellowAfterlife
 */
class CustomTags {
	public static function getModsByTag():DynamicAccess<Array<String>> {
		return {
			"MaxConstruct":
			[
				Mod.Retribution,
				Mod.Fleet,
				Mod.Flotilla,
				Mod.CounterArtillery,
				Mod.MediCharge,
				Mod.Overpower,
				Mod.Overseer,
				Mod.SupportSpecialist
			],
		}
	}

	public static function getTagsByMod():DynamicAccess<Array<String>> {
		var q = new DynamicAccess();
		return q;
	}
}