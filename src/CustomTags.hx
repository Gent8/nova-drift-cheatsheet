package ;
import haxe.DynamicAccess;

/**
 * ...
 * @author YellowAfterlife
 */
class CustomTags {
	public static function getModsByTag():DynamicAccess<Array<String>> {
		return {
			"global damage": [
				Mod.KineticBoost, Mod.AdrenalModule,
				Mod.Slipstream, Mod.Rampage, Mod.Masochism,
				Mod.HiddenPower, Mod.LeafOnTheWind, Mod.Ataraxia,
			],
			"ignite": [
				Mod.ThermalLance, Mod.Vortex, Mod.Dart,
				Mod.Firefly, Mod.Viper,
				Mod.Halo, Mod.Helix,
				Mod.Lance, Mod.DeadlyWake, Mod.Breach,
				Mod.CelestialSurge, Mod.Purge, Mod.Purification, Mod.Discharge,
				Mod.ScorchingWake,
				Mod.DyingStar, Mod.BurnoutReactors,
			],
			"burn": [
				Mod.ThermalLance, Mod.Vortex, Mod.Dart,
				Mod.Firefly, Mod.Viper,
				Mod.Halo, Mod.Helix,
				Mod.Lance, Mod.DeadlyWake, Mod.Candescence, Mod.Purge, Mod.Purification, Mod.Absorption, Mod.Discharge,
				Mod.GalvanicOutburst, Mod.SolarHeart, Mod.ScorchingWake,
				Mod.DyingStar, Mod.BurnoutReactors, Mod.CelestialSurge,
			],
			// corrections:
			"rate of fire": [Mod.Warpath, Mod.SiegeWeaponry],
		}
	}
	public static function getTagsByMod():DynamicAccess<Array<String>> {
		var q = new DynamicAccess();
		q[Mod.EvolutionaryNiche] = [Tag.Hull];
		q[Mod.Grandeur] = [Tag.CrashDamage];
		q[Mod.Maelstrom] = [Tag.Shield];
		return q;
	}
}
enum abstract Tag(String) from String to String {
	var Shield = "shield";
	var RateOfFire = "rate of fire";
	var Hull = "hull";
	var GlobalDamage = "global damage";
	var CrashDamage = "crash damage";
}