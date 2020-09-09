package ;

/**
 * ...
 * @author YellowAfterlife
 */
class ModShortNames {
	
	static var abbrMap = new Map<Mod, Bool>();
	static var abbrMap2 = new Map<String, Bool>();
	public static function check(mod:Mod, title:String):Void {
		if (!abbrMap.exists(mod)) {
			abbrMap[mod] = true;
			var a = ~/[^A-Z]/g.replace(mod, "");
			if (abbrMap2.exists(a)) a += "#"; else abbrMap2[a] = true;
			Sys.println('add("$a", Mod.$mod); // $title');
		}
	}
	
	public static function print() {
		var shortenMap:Map<Mod, String> = new Map();
		var longenMap:Map<String, Mod> = new Map();
		var arr = [];
		function add(sh:String, mod:Mod) {
			if (shortenMap.exists(mod)) throw '$mod already added';
			if (longenMap.exists(sh)) throw '$sh for $mod is taken by ' + longenMap[sh];
			shortenMap[mod] = sh;
			longenMap[sh] = mod;
			arr.push('$sh=$mod');
		}
		add("ALY", Mod.Ally); // ALLY
		add("NTR", Mod.Nanotech); // NANOTECH RECONSTRUCTION
		add("EVA", Mod.Evasion); // EVASION
		add("EVO", Mod.Evolution); // EVOLUTION
		add("GUR", Mod.Guardian); // GUARDIAN
		add("ES", Mod.EchoStrike); // ECHO STRIKE
		add("DS", Mod.DecoySignal); // DECOY SIGNAL
		add("MC", Mod.MediCharge); // MEDI-CHARGE
		add("ITC", Mod.Interceptor); // INTERCEPTOR
		add("OMN", Mod.Outmaneuver); // OUTMANEUVER
		add("WNM", Mod.Wingman); // WINGMAN
		add("OV", Mod.Overpower); // OVERPOWER
		add("TUR", Mod.Turret); // TURRET
		add("PD", Mod.PointDefense); // POINT DEFENSE
		add("WM", Mod.WarMachine); // WAR MACHINE
		add("CA", Mod.CounterArtillery); // COUNTER ARTILLERY
		add("EC", Mod.ElegantConstruction); // ELEGANT CONSTRUCTION
		add("SD", Mod.SelfDestruction); // SELF DESTRUCTION
		add("SDR", Mod.ShieldedDrones); // SHIELDED CONSTRUCTS
		add("OVS", Mod.Overseer); // OVERSEER
		add("PZ", Mod.PriorityZero); // PRIORITY ZERO
		add("OVC", Mod.Overclock); // OVERCLOCK
		add("TL", Mod.TacticalLink); // TACTICAL LINK
		add("SS", Mod.SupportSpecialist); // SUPPORT SPECIALIST
		add("MIN", Mod.Mines); // MINES
		add("AM", Mod.AutoMines); // MINEFIELD
		add("LM", Mod.LoadedMines); // LOADED MINES
		add("RTB", Mod.Retribution); // RETRIBUTION
		add("D", Mod.Drones); // DRONES
		add("RKD", Mod.RocketDrones); // ROCKET DRONES
		add("RFD", Mod.ReinforcedDrones); // REINFORCED DRONES
		add("AE", Mod.AdvancedEngineering); // ADVANCED ENGINEERING
		add("AD", Mod.AssaultDrones); // ASSAULT DRONES
		add("PRD", Mod.PredatorDrones); // FORMATION: PURSUIT
		add("BD", Mod.BattalionDrones); // FORMATION: BATTALION
		add("FLT", Mod.Fleet); // FLEET
		add("DD", Mod.DefenseDrone); // DEFENSE DRONES
		add("FR", Mod.FormationRampart); // FORMATION: RAMPART
		add("CP", Mod.Counterpulse); // COUNTERPULSE
		add("FLO", Mod.Flotilla); // FLOTILLA
		add("IT", Mod.ImprovedThrusters); // IMPROVED THRUSTERS
		add("DW", Mod.DeadlyWake); // DEADLY WAKE
		add("SL", Mod.Streamline); // STREAMLINE
		add("BK", Mod.Blink); // BLINK
		add("KB", Mod.KineticBoost); // KINETIC BOOST
		add("AEG", Mod.Aegis); // AEGIS
		add("LN", Mod.Lance); // CELESTIAL LANCE
		add("ESY", Mod.EmergencySystems); // EMERGENCY SYSTEMS
		add("STB", Mod.Stabilization); // STABILIZATION
		add("AGI", Mod.Agility); // AGILITY
		add("PR", Mod.PowerReserves); // POWER RESERVES
		add("STF", Mod.Strafe); // STRAFE
		add("SKM", Mod.Skirmish); // SKIRMISH
		add("BLZ", Mod.Blitz); // BLITZ
		add("TMN", Mod.Terminate); // TERMINATE
		add("ESP", Mod.EssenceSap); // ESSENCE SAP
		add("VEL", Mod.Velocity); // VELOCITY
		add("SNP", Mod.Snipe); // SNIPE
		add("CAL", Mod.Calibrate); // CALIBRATE
		add("BRC", Mod.Breach); // INCENDIARY STRIKE
		add("RF", Mod.RapidFire); // RAPID FIRE
		add("BF", Mod.BurstFire); // BURST FIRE
		add("WP", Mod.Warpath); // WARPATH
		add("SW", Mod.SiegeWeaponry); // SIEGE WEAPONRY
		add("AP", Mod.AddedProjectiles); // VOLLEY
		add("FF", Mod.FocusFire); // FOCUS FIRE
		add("FA", Mod.FiringArray); // FIRING ARRAY
		add("FSL", Mod.Fusillade); // FUSILLADE
		add("MGT", Mod.Magnitude); // MAGNITUDE
		add("P", Mod.Payload); // PAYLOAD
		add("SSH", Mod.SplinterShot); // SPLINTER
		add("CS", Mod.ChargedShot); // CHARGED SHOT
		add("BR", Mod.BlastRadius); // BLAST RADIUS
		add("HE", Mod.HighExplosive); // HIGH EXPLOSIVE
		add("CB", Mod.ConcentratedBlast); // CONCENTRATED BLAST
		add("RUP", Mod.Rupture); // RUPTURE
		add("TS", Mod.TargettingSystems); // TARGETING
		add("HS", Mod.HeatSeeking); // GUIDANCE
		add("HST", Mod.HomingStrike); // HOMING STRIKE
		add("CVG", Mod.Convergence); // CONVERGENCE
		add("CDS", Mod.Candescence); // CANDESCENCE
		add("COR", Mod.Corrosion); // CORROSION
		add("PUG", Mod.Purge); // PURGE
		add("PUR", Mod.Purification); // PURIFICATION
		add("EF", Mod.Efficiency); // EFFICIENCY
		add("GP", Mod.Gemini); // GEMINI PROTOCOL
		add("CN", Mod.Conversion); // CONVERSION
		add("RG", Mod.Regression); // REGRESSION
		add("AA", Mod.AdaptiveArmor); // ADAPTIVE ARMOR
		add("CH", Mod.Channeling); // CHANNELING
		add("RB", Mod.Rebuke); // REBUKE
		add("CSH", Mod.CoreShielding); // CORE SHIELDING
		add("HUS", Mod.HullStrength); // HULL STRENGTH
		add("ABS", Mod.Absorption); // ABSORPTION
		add("JGR", Mod.Juggernaut); // JUGGERNAUT
		add("FAR", Mod.ForceArmor); // FORCE ARMOR
		add("HR", Mod.HullRegeneration); // REGENERATION
		add("RS", Mod.RegenerativeShields); // REGENERATIVE SHIELDS
		add("RR", Mod.RapidReconstruction); // RAPID RECONSTRUCTION
		add("AMD", Mod.AdrenalModule); // ADRENAL MODULE
		add("SHD", Mod.ShieldDurability); // SHIELD DURABILITY
		add("RTS", Mod.RetaliationShields); // REFLEXIVE SHIELDS
		add("BAR", Mod.Barrier); // BARRIER
		add("OS", Mod.OmniShield); // OMNI SHIELD
		add("SC", Mod.ShieldCooldown); // SHIELD COOLDOWN
		add("VS", Mod.VolatileShields); // VOLATILE SHIELDS
		add("FS", Mod.FlashShielding); // FLASH SHIELDING
		add("DSC", Mod.Discharge); // DISCHARGE
		add("SR", Mod.ShieldRadius); // SHIELD EFFECT RADIUS:
		add("RAS", Mod.RadiantShields); // RADIANT SHIELDS
		add("FOS", Mod.FocusedShields); // FOCUSED SHIELDS
		add("WS", Mod.WeaponizedShields); // WEAPONIZED SHIELDS
		add("MST", Mod.Mastery); // SUPER MOD: MASTERY
		add("MRT", Mod.Mortar); // SUPER MOD: MORTAR
		add("CM", Mod.ChargedMines); // SUPER MOD: CHARGED MINES
		add("LS", Mod.LastStand); // SUPER MOD: LAST STAND
		add("HP", Mod.HiddenPower); // SUPER MOD: HIDDEN POWER
		add("CLS", Mod.CelestialSurge); // SUPER MOD: CELESTIAL SURGE
		add("SF", Mod.SaturationFire); // SUPER MOD: SATURATION FIRE
		add("CMX", Mod.Max); // Final-tier Construct
		add("AMC", Mod.ApexMachinery); // SUPER MOD: APEX MACHINERY
		add("TB", Mod.TempestBreak); // SUPER MOD: TEMPEST BREAK
		add("SAN", Mod.Sanctuary); // SUPER MOD: SANCTUARY
		add("VTB", Mod.VitalBond); // SUPER MOD: VITAL BOND
		add("LTW", Mod.LeafOnTheWind); // SUPER MOD: LEAF ON THE WIND
		add("APO", Mod.Apotheosis); // SUPER MOD: APOTHEOSIS
		add("RAN", Mod.Rancor); // SUPER MOD: RANCOR
		add("DST", Mod.DyingStar); // SUPER MOD: DYING STAR
		add("WST", Mod.WarpStrike); // SUPER MOD: WARP STRIKE
		add("ANH", Mod.Annihilation); // SUPER MOD: ANTIMATTER ROUNDS
		add("ATX", Mod.Ataraxia); // SUPER MOD: ATARAXIA
		add("DSP", Mod.Displacement); // SUPER MOD: DISPLACEMENT
		add("BUR", Mod.BurnoutReactors); // SUPER MOD: BURNOUT REACTORS
		add("SSN", Mod.SingularStrikeNew); // SUPER MOD: SINGULAR STRIKE
		add("BRG", Mod.Barrage); // SUPER MOD: BARRAGE
		add("SLS", Mod.Slipstream); // WILD MOD: SLIPSTREAM
		add("GO", Mod.GalvanicOutburst); // WILD MOD: GALVANIC OUTBURST
		add("RM", Mod.Rampage); // WILD MOD: RAMPAGE
		add("H", Mod.Hypermetabolism); // WILD MOD: HYPERMETABOLISM
		add("DT", Mod.DoubleTap); // WILD MOD: DOUBLE TAP
		add("HC", Mod.HeavyCaliber); // WILD MOD: HEAVY CALIBER
		add("ENS", Mod.EnergizedShields); // WILD MOD: ENERGIZED SHIELDS
		add("SH", Mod.SolarHeart); // WILD MOD: SOLAR HEART
		add("PI", Mod.PolarInversion); // WILD MOD: POLAR INVERSION
		add("PM", Mod.PropulsiveMunitions); // WILD MOD: PROPULSIVE MUNITIONS
		add("SCW", Mod.ScorchingWake); // WILD MOD: SCORCHING WAKE
		add("SPM", Mod.SpecialistMine); // WILD MOD: MINE SPECIALIST
		add("SPD", Mod.SpecialistDrone); // WILD MOD: DRONE SPECIALIST
		add("ST", Mod.SpecialistTurret); // WILD MOD: TURRET SPECIALIST
		add("SA", Mod.SpecialistAlly); // WILD MOD: ALLY SPECIALIST
		add("MAS", Mod.Masochism); // WILD MOD: MASOCHISM
		add("CHA", Mod.ChaoticAmbition); // WILD MOD: CHAOTIC AMBITION
		add("DEF", Mod.Defiance); // WILD MOD: DEFIANCE
		add("S2", Mod.TwinStrike); // WILD MOD: TWIN STRIKE
		add("OM", Mod.OutrageModule); // WILD MOD: OUTRAGE MODULE
		add("PS", Mod.PhantomStrike); // WILD MOD: PHANTOM STRIKE
		add("DIS", Mod.Discord); // WILD MOD: DISCORD
		add("TRX", Mod.Transmogrification); // WILD MOD: TRANSMOGRIFICATION
		add("DHB", Mod.DeathBlossom); // WILD MOD: DEATH BLOSSOM
		add("RVL", Mod.Revelation); // WILD MOD: REVELATION
		add("WIN", Mod.Winnow); // WILD MOD: WINNOW
		add("OBS", Mod.Obsession); // WILD MOD: OBSESSION
		add("BVD", Mod.Bravado); // WILD MOD: BRAVADO
		add("WP0", Mod.DefaultWeapon); // WEAPON: BLASTER
		add("SPL", Mod.Split); // WEAPON: SPLIT SHOT
		add("RLG", Mod.Railgun); // WEAPON: RAILGUN
		add("GRD", Mod.Grenade); // WEAPON: GRENADE
		add("TRN", Mod.Torrent); // WEAPON: TORRENT
		add("PUL", Mod.Pulse); // WEAPON: PULSE
		add("FLK", Mod.Flak); // WEAPON: FLAK
		add("THL", Mod.ThermalLance); // WEAPON: THERMAL LANCE
		add("SLV", Mod.Salvo); // WEAPON: SALVO
		add("VTX", Mod.Vortex); // WEAPON: VORTEX
		add("BLD", Mod.BladeDrone); // WEAPON: BLADE
		add("DRT", Mod.Dart); // WEAPON: DART
		add("BD0", Mod.DefaultBody); // BODY: STANDARD
		add("AST", Mod.Assault); // BODY: ASSAULT
		add("STH", Mod.Stealth); // BODY: SPECTRE
		add("SNT", Mod.Sentinel); // BODY: SENTINEL
		add("ENG", Mod.Engineer); // BODY: ENGINEER
		add("FFL", Mod.Firefly); // BODY: FIREFLY
		add("CRR", Mod.Carrier); // BODY: CARRIER
		add("HLB", Mod.Hullbreaker); // BODY: HULLBREAKER
		add("BTR", Mod.Battery); // BODY: BATTERY
		add("ARC", Mod.Architect); // BODY: ARCHITECT
		add("RSC", Mod.Research); // BODY: RESEARCH
		add("VPR", Mod.Viper); // BODY: VIPER
		add("CUR", Mod.Courser); // BODY: COURSER
		add("SH0", Mod.DefaultShield); // SHIELD: STANDARD
		add("HAL", Mod.Halo); // SHIELD: HALO
		add("TMP", Mod.Temporal); // SHIELD: TEMPORAL
		add("RFL", Mod.Reflect); // SHIELD: REFLECT
		add("WRP", Mod.Warp); // SHIELD: WARP
		add("SWV", Mod.Shockwave); // SHIELD: SHOCKWAVE
		add("AMP", Mod.Amp); // SHIELD: AMP
		add("BST", Mod.Bastion); // SHIELD: BASTION
		add("HLX", Mod.Helix); // SHIELD: HELIX
		add("SPH", Mod.Siphon); // SHIELD: SIPHON
		return arr.join(";");
	}
}