(function () {
  function NavigatorGetLanguage() {
    var navigator_obj = window.navigator;
    if (navigator_obj.language !== undefined) return navigator_obj.language;
    if (navigator_obj.browserLanguage !== undefined)
      return navigator_obj.browserLanguage;
    if (navigator_obj.userLanguage !== undefined)
      return navigator_obj.userLanguage;
    return "en";
  }

  var language = NavigatorGetLanguage();

  // Currently supported: en, ja
  if (language == "en" || language == "ja") {
    document.getElementById("langswitch-" + language).classList.add("clicked");
    document.getElementsByTagName("html")[0].className = language;
  } else {
    document.getElementById("langswitch-en").classList.add("clicked");
    document.getElementsByTagName("html")[0].className = "en";
  }

  var style = document.getElementById("match-style");

  var cssActive = " { filter: brightness(125%) }";
  var activeSlider = document.getElementById("active-brightness");
  var keyActive = "nova-drift-sheet:active-brightness";
  function syncActiveBrightness() {
    cssActive = " { filter: brightness(" + activeSlider.value + "%) }";
  }
  activeSlider.addEventListener("change", function (_) {
    syncActiveBrightness();
    localStorage.setItem(keyActive, activeSlider.value);
  });
  if (localStorage.getItem(keyActive)) {
    activeSlider.value = 0 | localStorage.getItem(keyActive);
    syncActiveBrightness();
  }

  var cssInactive = " { filter: brightness(50%) }";
  var inactiveSlider = document.getElementById("inactive-brightness");
  var keyInactive = "nova-drift-sheet:inactive-brightness";
  function syncInactiveBrightness() {
    cssInactive = " { filter: brightness(" + inactiveSlider.value + "%) }";
  }
  inactiveSlider.addEventListener("change", function () {
    syncInactiveBrightness();
    localStorage.setItem(keyInactive, inactiveSlider.value);
  });
  if (localStorage.getItem(keyInactive)) {
    inactiveSlider.value = 0 | localStorage.getItem(keyInactive);
    syncInactiveBrightness();
  }

  function onModEnter(e) {
    var hex = e.target;
    var name = hex.getAttribute("data-hex-name");
    if (!name) return;
    var css = [];
    // if (!hex.parentElement.classList.contains("single")) {
    css.push(".hex:not(." + name + ")" + cssInactive);
    css.push(".hex." + name + cssActive);
    // }
    style.innerHTML = css.join("\n");
  }

  var listWeapon = [
    "DefaultWeapon",
    "Split",
    "Railgun",
    "Grenade",
    "Torrent",
    "Pulse",
    "Flak",
    "ThermalLance",
    "Salvo",
    "Vortex",
    "BladeDrone",
    "Dart",
  ];

  var listBody = [
    "DefaultBody",
    "Assault",
    "Stealth",
    "Sentinel",
    "Engineer",
    "Firefly",
    "Carrier",
    "Hullbreaker",
    "Battery",
    "Architect",
    "Research",
    "Viper",
    "Courser",
    "Leviathan",
  ];

  var listShield = [
    "DefaultShield",
    "Halo",
    "Temporal",
    "Reflect",
    "Warp",
    "Shockwave",
    "Amp",
    "Bastion",
    "Helix",
    "Siphon",
  ];

  var listConstructMax = [
    "Retribution",
    "AdvancedEngineering",
    "FleetCommander",
    "Reconstitution",
    "CounterArtillery",
    "Evolution",
    "MediCharge",
    "Overpower",
    "Overseer",
    "SupportSpecialist",
    "Max",
  ];

  var listDefaultLoadout = ["DefaultWeapon", "DefaultBody", "DefaultShield"];

  function onMaxEnter(e) {
    var hex = e.target;
    var name = hex.getAttribute("data-hex-name");
    if (!name) return;

    var css = [];
    var inactiveList = ".hex";
    var activeList = "";

    for (var i = 0; i < listConstructMax.length; i++) {
      inactiveList = inactiveList + ":not(." + listConstructMax[i] + ")";
      if (i == 0) activeList = activeList + ".hex." + listConstructMax[i];
      else activeList = activeList + ",.hex." + listConstructMax[i];
    }

    css.push(inactiveList + cssInactive);
    css.push(activeList + cssActive);

    style.innerHTML = css.join("\n");
  }

  var modShorten = Object.create(null);
  var modLongen = Object.create(null);
  var modPrefab = Object.create(null);
  var modName = Object.create(null);
  var modSlPairs =
    "ABS=Absorption;AA=AdaptiveArmor;AP=AddedProjectiles;AMD=AdrenalModule;AE=AdvancedEngineering;AEG=Aegis;AGI=Agility;ALY=Ally;AMP=Amp;ANH=Annihilation;AMC=ApexMachinery;APO=Apotheosis;ARB=ArcBarrier;ARC=Architect;AST=Assault;AD=AssaultDrones;ATX=Ataraxia;AM=AutoMines;BRG=Barrage;BAR=Barrier;BST=Bastion;BD=BattalionDrones;BTR=Battery;BLD=BladeDrone;BR=BlastRadius;BK=Blink;BLZ=Blitz;BVD=Bravado;BRC=Breach;BUR=BurnoutReactors;BF=BurstFire;CAL=Calibrate;CDS=Candescence;CRR=Carrier;CLS=CelestialSurge;CHL=Challenger;CH=Channeling;CHA=ChaoticAmbition;CM=ChargedMines;CHS=ChargedShields;CS=ChargedShot;CB=ConcentratedBlast;CVG=Convergence;CN=Conversion;CSH=CoreShielding;COR=Corrosion;CA=CounterArtillery;CP=Counterpulse;CUR=Courser;DRT=Dart;DW=DeadlyWake;DHB=DeathBlossom;DS=DecoySignal;BD0=DefaultBody;SH0=DefaultShield;WP0=DefaultWeapon;DD=DefenseDrone;DEF=Defiance;DFL=Deflagration;DSC=Discharge;DIS=Discord;DSP=Displacement;DT=DoubleTap;D=Drones;DST=DyingStar;ES=EchoStrike;EF=Efficiency;EC=ElegantConstruction;URL=Element;ESY=EmergencySystems;ENS=EnergizedShields;ENG=Engineer;ESP=EssenceSap;EVA=Evasion;EVO=Evolution;EVN=EvolutionaryNiche;EXG=ExplosiveGrowth;FRS=Farsight;FFL=Firefly;FA=FiringArray;FLK=Flak;FS=FlashShielding;FLT=Fleet;FLC=FleetCommander;FLO=Flotilla;FOS=FocusedShields;FF=FocusFire;FAR=ForceArmor;FR=FormationRampart;FSL=Fusillade;GO=GalvanicOutburst;GP=Gemini;GRP=GraceProtocol;GDR=Grandeur;GRD=Grenade;GUR=Guardian;HAL=Halo;HS=HeatSeeking;HC=HeavyCaliber;HLX=Helix;HP=HiddenPower;HE=HighExplosive;HST=HomingStrike;HLB=Hullbreaker;HR=HullRegeneration;HUS=HullStrength;H=Hypermetabolism;IT=ImprovedThrusters;IF=Infuse;ITW=IntegratedWeaponry;JGR=Juggernaut;KB=KineticBoost;LN=Lance;LS=LastStand;LTW=LeafOnTheWind;LV=Leviathan;LM=LoadedMines;MAE=Maelstrom;MGT=Magnitude;MAS=Masochism;MST=Mastery;CMX=Max;MC=MediCharge;MIN=Mines;MRT=Mortar;NTR=Nanotech;NTD=NanotechDissemination;OBS=Obsession;OS=OmniShield;OMN=Outmaneuver;OM=OutrageModule;OVC=Overclock;OV=Overpower;OVS=Overseer;P=Payload;PS=PhantomStrike;PD=PointDefense;PI=PolarInversion;PR=PowerReserves;PWS=PowerSpike;PRD=PredatorDrones;PZ=PriorityZero;PM=PropulsiveMunitions;PUL=Pulse;PUG=Purge;PUR=Purification;RAS=RadiantShields;RLG=Railgun;RM=Rampage;RAN=Rancor;RF=RapidFire;RR=RapidReconstruction;RB=Rebuke;RCS=Reconstitution;RFL=Reflect;RS=RegenerativeShields;RG=Regression;RFD=ReinforcedDrones;RSC=Research;RTS=RetaliationShields;RTB=Retribution;RVL=Revelation;RC=Ricochet;RKD=RocketDrones;RUP=Rupture;SLV=Salvo;SAN=Sanctuary;SF=SaturationFire;SCW=ScorchingWake;SD=SelfDestruction;SNT=Sentinel;SC=ShieldCooldown;SHD=ShieldDurability;SDR=ShieldedDrones;SR=ShieldRadius;SWV=Shockwave;SW=SiegeWeaponry;SSN=SingularStrikeNew;SPH=Siphon;SKM=Skirmish;SLS=Slipstream;SNP=Snipe;SH=SolarHeart;SA=SpecialistAlly;SPD=SpecialistDrone;SPM=SpecialistMine;ST=SpecialistTurret;SSH=SplinterShot;SPL=Split;SPG=SpontaneousGeneration;STB=Stabilization;STH=Stealth;STF=Strafe;SRS=StrafingStrikes;SL=Streamline;SBS=Subsumption;SS=SupportSpecialist;SWD=Swords;TL=TacticalLink;TS=TargettingSystems;TB=TempestBreak;TMP=Temporal;TMD=TerminalDirective;TMN=Terminate;THL=ThermalLance;TRN=Torrent;TRX=Transmogrification;TUR=Turret;S2=TwinStrike;VEL=Velocity;VPR=Viper;VTB=VitalBond;VOS=VoidSlice;VS=VolatileShields;VTX=Vortex;WM=WarMachine;WRP=Warp;WP=Warpath;WST=WarpStrike;WS=WeaponizedShields;WNM=Wingman;WIN=Winnow".split(
      ";"
    );
  var modPrPairs =
    "mAbsorption=Absorption;mAdaptiveArmor=AdaptiveArmor;mAddedProjectiles=AddedProjectiles;mAdrenalModule=AdrenalModule;mAdvancedEngineering=AdvancedEngineering;mAegis=Aegis;mAgility=Agility;mAlly=Ally;gAmp=Amp;mAnnihilation=Annihilation;mApexMachinery=ApexMachinery;mApotheosis=Apotheosis;mArcBarrier=ArcBarrier;gArchitect=Architect;gAssault=Assault;mAssaultDrones=AssaultDrones;mAtaraxia=Ataraxia;mMinefield=AutoMines;mBarrage=Barrage;mBarrier=Barrier;gBastion=Bastion;mFormationBattalion=BattalionDrones;gBattery=Battery;gBlade=BladeDrone;mBlastRadius=BlastRadius;mBlink=Blink;mBlitz=Blitz;mBravado=Bravado;mIncendiaryStrike=Breach;mBurnoutReactors=BurnoutReactors;mBurstFire=BurstFire;mCalibrate=Calibrate;mCandescence=Candescence;gCarrier=Carrier;mCelestialSurge=CelestialSurge;mChallenger=Challenger;mChanneling=Channeling;mChaoticAmbition=ChaoticAmbition;mChargedMines=ChargedMines;mChargedShields=ChargedShields;mChargedShot=ChargedShot;mConcentratedBlast=ConcentratedBlast;mConvergence=Convergence;mConversion=Conversion;mCoreShielding=CoreShielding;mCorrosion=Corrosion;mCounterArtillery=CounterArtillery;mCounterpulse=Counterpulse;gCourser=Courser;gDart=Dart;mDeadlyWake=DeadlyWake;mDeathBlossom=DeathBlossom;mDecoySignal=DecoySignal;gDefault=DefaultBody;gShieldDefault=DefaultShield;gBlaster=DefaultWeapon;mDefenseDrones=DefenseDrone;mDefiance=Defiance;mDeflagration=Deflagration;mDischarge=Discharge;mDiscord=Discord;mDisplacement=Displacement;mDoubleTap=DoubleTap;mDrones=Drones;mDyingStar=DyingStar;mEchoStrike=EchoStrike;mEfficiency=Efficiency;mElegantConstruction=ElegantConstruction;ModString=Element;mEmergencySystems=EmergencySystems;mEnergizedShields=EnergizedShields;gEngineer=Engineer;mEssenceSap=EssenceSap;mEvasion=Evasion;mEvolution=Evolution;mEvolutionaryNiche=EvolutionaryNiche;mExplosiveGrowth=ExplosiveGrowth;mFarsight=Farsight;gFirefly=Firefly;mFiringArray=FiringArray;gFlak=Flak;mFlashShielding=FlashShielding;deleted_6=Fleet;mFleetCommander=FleetCommander;deleted_1=Flotilla;mFocusedShields=FocusedShields;mFocusFire=FocusFire;mForceArmor=ForceArmor;deleted_2=FormationRampart;mFusillade=Fusillade;mGalvanicOutburst=GalvanicOutburst;mGemini=Gemini;mGraceProtocol=GraceProtocol;mGrandeur=Grandeur;gGrenade=Grenade;mGuardian=Guardian;gHalo=Halo;mGuidance=HeatSeeking;mHeavyCaliber=HeavyCaliber;gOrbital=Helix;mHiddenPower=HiddenPower;mHighExplosive=HighExplosive;mHomingStrike=HomingStrike;gHullbreaker=Hullbreaker;mHullRegeneration=HullRegeneration;mHullStrength=HullStrength;mHypermetabolism=Hypermetabolism;mImprovedThrusters=ImprovedThrusters;mInfuse=Infuse;mInterceptor=IntegratedWeaponry;mJuggernaut=Juggernaut;mKineticBoost=KineticBoost;mCelestialLance=Lance;mLastStand=LastStand;mLeafOnTheWind=LeafOnTheWind;gLeviathan=Leviathan;mLoadedMines=LoadedMines;mMaelstrom=Maelstrom;mMagnitude=Magnitude;mMasochism=Masochism;mMastery=Mastery;deleted_3=Max;mMediCharge=MediCharge;mMines=Mines;mMortar=Mortar;mNanotechReconstruction=Nanotech;mNanotechDissemination=NanotechDissemination;mObsession=Obsession;mOmniShield=OmniShield;mOutmaneuver=Outmaneuver;mOutrageModule=OutrageModule;mOverclock=Overclock;mOverpower=Overpower;mOverseer=Overseer;mPayload=Payload;mPhantomStrike=PhantomStrike;mPointDefense=PointDefense;mPolarInversion=PolarInversion;mPowerReserves=PowerReserves;mPowerSpike=PowerSpike;deleted_4=PredatorDrones;mPriorityZero=PriorityZero;mPropulsiveMunitions=PropulsiveMunitions;gPulse=Pulse;mPurge=Purge;mPurification=Purification;mRadiantShields=RadiantShields;gRailgun=Railgun;mRampage=Rampage;mRancor=Rancor;mRapidFire=RapidFire;mRapidReconstruction=RapidReconstruction;mRebuke=Rebuke;mReconstitution=Reconstitution;gReflect=Reflect;mRegenerativeShields=RegenerativeShields;mRegression=Regression;deleted_5=ReinforcedDrones;gResearch=Research;mRetaliationShields=RetaliationShields;mRetribution=Retribution;mRevelation=Revelation;mRicochet=Ricochet;deleted_0=RocketDrones;mRupture=Rupture;gSalvo=Salvo;mSanctuary=Sanctuary;mSaturationFire=SaturationFire;mScorchingWake=ScorchingWake;mSelfDestruction=SelfDestruction;gSentinel=Sentinel;mShieldCooldown=ShieldCooldown;mShieldDurability=ShieldDurability;mShieldedDrones=ShieldedDrones;mShieldRadius=ShieldRadius;gShockwave=Shockwave;mSiegeWeaponry=SiegeWeaponry;mSingularStrike=SingularStrikeNew;gSiphon=Siphon;mSkirmish=Skirmish;mSlipstream=Slipstream;mSnipe=Snipe;mSolarHeart=SolarHeart;mSpecialistAlly=SpecialistAlly;mSpecialistDrone=SpecialistDrone;mSpecialistMine=SpecialistMine;mSpecialistTurret=SpecialistTurret;mSplinter=SplinterShot;gSplitShot=Split;mSpontaneousGeneration=SpontaneousGeneration;mStabilization=Stabilization;gStealth=Stealth;mStrafe=Strafe;mStrafingStrikes=StrafingStrikes;mStreamline=Streamline;mSubsumption=Subsumption;mSupportSpecialist=SupportSpecialist;gSwords=Swords;mTacticalLink=TacticalLink;mTargetting=TargettingSystems;mTempestBreak=TempestBreak;gTemporal=Temporal;mTerminalDirective=TerminalDirective;mTerminate=Terminate;gThermalLance=ThermalLance;gTorrent=Torrent;mTransmogrification=Transmogrification;mTurret=Turret;mTwinStrike=TwinStrike;mVelocity=Velocity;gViper=Viper;mVitalBond=VitalBond;mVoidSlice=VoidSlice;mVolatileShields=VolatileShields;gVortex=Vortex;mWarMachine=WarMachine;gWarp=Warp;mWarpath=Warpath;mWarpStrike=WarpStrike;mWeaponizedShields=WeaponizedShields;mWingman=Wingman;mWinnow=Winnow".split(
      ";"
    );
  for (var i = 0; i < modSlPairs.length; i++) {
    var pair = modSlPairs[i];
    var sep = pair.indexOf("=");
    var sh = pair.substring(0, sep);
    var lg = pair.substring(sep + 1);
    modShorten[lg] = sh;
    modLongen[sh] = lg;
  }
  for (var i = 0; i < modPrPairs.length; i++) {
    var pair = modPrPairs[i];
    var sep = pair.indexOf("=");
    var pr = pair.substring(0, sep);
    var nm = pair.substring(sep + 1);
    modPrefab[nm] = pr;
    modName[pr] = nm;
  }

  var hexFilter = document.getElementById("hex-filter");
  var hexFilterJa = document.getElementById("hex-filter-ja");
  var hexCheckCount = 0;
  var hexCheckCountSpan = document.getElementById("hex-select-count");
  var hexFilterUpdate;
  function clearMatch(e) {
    if (
      document.activeElement == hexFilter ||
      document.activeElement == hexFilterJa
    ) {
      hexFilterUpdate(true);
    } else if (hexCheckCount > 0) {
      style.innerHTML = [
        ".hex:not([checked]) " + cssInactive,
        ".hex[checked] " + cssActive,
      ].join("\n");
    } else style.innerHTML = "";
  }
  document
    .getElementById("reset-selection")
    .addEventListener("click", function (_) {
      var els = document.querySelectorAll(".hex[checked]");
      for (var i = 0; i < els.length; i++) {
        els[i].removeAttribute("checked");
        if (els[i].classList.contains("rc")) {
          els[i].nextElementSibling.textContent = "";
        }
      }
      hexCheckCount = 0;
      hexCheckCountSpan.innerHTML = "0";
      clearMatch();
    });
  document.getElementById("copy-link").addEventListener("click", function (_) {
    var els = document.querySelectorAll(".hex[checked]");
    var arr = [],
      found = Object.create(null);
    for (var i = 0; i < els.length; i++) {
      var mod = els[i].getAttribute("data-hex-name");
      var rcChr = "";
      if (found[mod]) continue;
      else found[mod] = true;
      if (els[i].classList.contains("rc")) {
        var rcNum = parseInt(els[i].nextElementSibling.textContent);
        if (els[i].nextElementSibling.textContent == "9+") rcChr = "_10";
        else if (0 < rcNum && rcNum < 10) rcChr = "_" + rcNum.toString();
        else rcChr = "_0";
      }
      arr.push((modShorten[mod] || mod) + rcChr);
    }
    var href = location.href;
    var sep = href.indexOf("?");
    var sep2 = href.indexOf("#");
    if (sep < 0 || (sep2 >= 0 && sep2 < sep)) sep = sep2;
    if (sep >= 0) href = href.substring(0, sep);
    if (arr.length > 0) href += "?mods=" + arr.join("+");
    prompt("Copy your link:", href);
  });
  document
    .getElementById("copy-prefab")
    .addEventListener("click", function (_) {
      var els = document.querySelectorAll(".hex[checked]");
      var arr = [],
        found = Object.create(null);
      for (var i = 0; i < els.length; i++) {
        var mod = els[i].getAttribute("data-hex-name");
        var rcChr = "";
        var rcNum = 1;

        if (found[mod]) continue;
        else found[mod] = true;

        if (
          mod == "ExplosiveGrowth" ||
          mod == "Revelation" ||
          mod == "Obsession"
        )
          continue;

        if (els[i].classList.contains("rc")) {
          rcNum = parseInt(els[i].nextElementSibling.textContent);
          if (els[i].nextElementSibling.textContent == "9+") {
            rcChr = "_10";
            rcNum = 10;
          } else if (0 < rcNum && rcNum < 10) {
            rcChr = "_" + rcNum.toString();
          } else {
            rcChr = "_0";
            rcNum = 1;
          }
        }

        for (var i = 0; i < rcNum; i++) {
          arr.push(modPrefab[mod]);
        }
      }
      var prefabLine = '"n) xxxx",';
      if (arr.length > 0) prefabLine += arr.join(",");
      prompt("Copy your prefab build:", prefabLine);
    });

  document
    .getElementById("langswitch-ja")
    .addEventListener("click", function (_) {
      document.getElementById("langswitch-ja").classList.add("clicked");
      document.getElementById("langswitch-en").classList.remove("clicked");
      document.getElementsByTagName("html")[0].className = "ja";
    });

  document
    .getElementById("langswitch-en")
    .addEventListener("click", function (_) {
      document.getElementById("langswitch-ja").classList.remove("clicked");
      document.getElementById("langswitch-en").classList.add("clicked");
      document.getElementsByTagName("html")[0].className = "en";
    });
  function onHexToggle(e) {
    var hex = e.target;
    var els = document.querySelectorAll(
      ".hex." + hex.getAttribute("data-hex-name")
    );
    if (hex.hasAttribute("checked")) {
      for (var i = 0; i < els.length; i++) els[i].removeAttribute("checked");
      if (--hexCheckCount == 0) clearMatch();
    } else {
      for (var i = 0; i < els.length; i++) els[i].setAttribute("checked", "");
      if (++hexCheckCount == 1) clearMatch();
    }
    hexCheckCountSpan.innerHTML = "" + hexCheckCount;
  }
  function onMaxToggle(e) {
    var hex = e.target;
    var els = document.querySelectorAll(
      ".hex." + hex.getAttribute("data-hex-name")
    );
    var elsMax = document.querySelectorAll(".hex.Max");
    var checkedMax = 0;
    if (hex.hasAttribute("checked")) {
      for (var i = 0; i < els.length; i++) els[i].removeAttribute("checked");
      for (var i = 0; i < listConstructMax.length - 1; i++)
        if (
          document
            .querySelector(".hex." + listConstructMax[i])
            .hasAttribute("checked")
        )
          ++checkedMax;
      if (checkedMax == 0)
        for (var i = 0; i < elsMax.length; i++)
          elsMax[i].removeAttribute("checked");
      if (--hexCheckCount == 0) clearMatch();
    } else {
      for (var i = 0; i < els.length; i++) els[i].setAttribute("checked", "");
      for (var i = 0; i < elsMax.length; i++)
        elsMax[i].setAttribute("checked", "");
      if (++hexCheckCount == 1) clearMatch();
    }
    hexCheckCountSpan.innerHTML = "" + hexCheckCount;
  }
  function onDefaultToggle(e) {
    var hex = e.target;
    var els = document.querySelectorAll(
      ".hex." + hex.getAttribute("data-hex-name")
    );
    if (hex.hasAttribute("checked")) {
      for (var i = 0; i < els.length; i++) els[i].removeAttribute("checked");
    } else {
      for (var i = 0; i < els.length; i++) els[i].setAttribute("checked", "");
    }
  }
  function onHexRcPlus(e) {
    var hex = e.target;
    var els = document.querySelectorAll(
      ".hex." + hex.getAttribute("data-hex-name")
    );
    var countDiff = 0;

    if (hex.hasAttribute("checked")) {
      for (var i = 0; i < els.length; i++) {
        var rcDisp = els[i].parentElement.querySelector(".rcNum");
        if (rcDisp != null) {
          if (rcDisp.textContent == "9+") {
            rcDisp.textContent = "";
            els[i].removeAttribute("checked");
            countDiff = -10;
          } else if (parseInt(rcDisp.textContent) == 9) {
            rcDisp.textContent = "9+";
            countDiff = 1;
          } else if (parseInt(rcDisp.textContent) > 0) {
            rcDisp.textContent = "" + (parseInt(rcDisp.textContent) + 1);
            countDiff = 1;
          } else {
            rcDisp.textContent = "1";
          }
        }
      }
    } else {
      for (var i = 0; i < els.length; i++) {
        var rcDisp = els[i].parentElement.querySelector(".rcNum");
        els[i].setAttribute("checked", "");
        if (rcDisp != null) {
          rcDisp.textContent = "↻";
        }
      }
      countDiff = 1;
    }

    if (hexCheckCount == 0) {
      hexCheckCount += countDiff;
      if (hexCheckCount == 1) clearMatch();
    } else {
      hexCheckCount += countDiff;
      if (hexCheckCount == 0) clearMatch();
    }
    hexCheckCountSpan.innerHTML = "" + hexCheckCount;
  }

  var hexagons = document.getElementsByClassName("hex");
  for (var i = 0; i < hexagons.length; i++) {
    var hex = hexagons[i];
    for (var k = 0; k < hex.classList.length; k++) {
      if (hex.classList[k] == "hex") continue;
      hex.setAttribute("data-hex-name", hex.classList[k]);
      break;
    }

    hex.addEventListener("mouseleave", clearMatch);

    if (hex.classList[k] == "Max") {
      hex.addEventListener("mouseenter", onMaxEnter);
      continue;
    } else {
      hex.addEventListener("mouseenter", onModEnter);
    }

    var isMax = listConstructMax.indexOf(hex.classList[k]);
    var isDefault = listDefaultLoadout.indexOf(hex.classList[k]);
    if (hex.classList.contains("rc")) {
      hex.addEventListener("click", onHexRcPlus);
      hex.parentElement.insertAdjacentHTML(
        "beforeend",
        '<div class="rcNum"></div>'
      );
    } else if (isMax != -1) {
      hex.addEventListener("click", onMaxToggle);
    } else if (isDefault != -1) {
      hex.addEventListener("click", onDefaultToggle);
    } else {
      hex.addEventListener("click", onHexToggle);
    }
  }

  if (location.search.charAt(0) == "?") {
    var args = location.search.substring(1).split("&");
    for (var i = 0; i < args.length; i++) {
      var pair = args[i],
        key,
        val;
      var sep = pair.indexOf("=");
      var isRecursive = false;
      if (sep >= 0) {
        key = pair.substr(0, sep);
        val = pair.substr(sep + 1);
      } else {
        key = pair;
        val = "";
      }
      if (key == "mods") {
        var modArr = val.split("+");
        for (var i = 0; i < modArr.length; i++)
          try {
            var mod = modArr[i].split("_");
            var els = document.querySelectorAll(
              ".hex." + (modLongen[mod[0]] || mod[0])
            );
            if (els.length == 0) continue;
            for (var k = 0; k < els.length; k++) {
              els[k].setAttribute("checked", "");
              if (els[k].classList.contains("rc")) {
                isRecursive = true;
                if (parseInt(mod[1]) >= 10) {
                  els[k].nextElementSibling.textContent = "9+";
                } else if (10 > parseInt(mod[1]) && parseInt(mod[1]) > 0) {
                  els[k].nextElementSibling.textContent = parseInt(mod[1]);
                } else {
                  els[k].nextElementSibling.textContent = "↻";
                }
              }
            }
            if (mod.length == 1 || parseInt(mod[1]) <= 0 || !isRecursive)
              mod[1] = "1";
            if (parseInt(mod[1]) >= 10) mod[1] = 10;
            if (
              mod[0] != "CMX" &&
              mod[0] != "WP0" &&
              mod[0] != "BD0" &&
              mod[0] != "SH0"
            )
              hexCheckCount = hexCheckCount + parseInt(mod[1]);
          } catch (e) {
            console.log(e);
          }
        hexCheckCountSpan.innerHTML = "" + hexCheckCount;
        clearMatch();
        break;
      }
    }
  }

  function onTagEnter(e) {
    var tag = e.target;
    var name = tag.innerText || tag.textContent;
    style.innerHTML = [
      '.hex:not([data-hex-tags*="' + name + ';"]) ' + cssInactive,
      '.hex[data-hex-tags*="' + name + ';"] ' + cssActive,
    ].join("\n");
  }
  var hextags = document.getElementsByClassName("hextag");
  for (var i = 0; i < hextags.length; i++) {
    var tag = hextags[i];
    tag.addEventListener("mouseenter", onTagEnter);
    tag.addEventListener("mouseleave", clearMatch);
  }

  var hexFilterValue = null;
  hexFilterUpdate = function (force) {
    var val = hexFilter.value;
    var valJa = hexFilterJa.value;
    var combinedVal = val + " " + valJa;
    if (!force && combinedVal == hexFilterValue) return;
    hexFilterValue = combinedVal;

    var words = combinedVal.split(" ");
    var wordsAll = [];
    var wordsNot = [];
    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      if (!word) continue;
      word = word.toLowerCase();
      if (word.charAt(0) == "-") {
        wordsNot.push(word.substr(1));
      } else {
        wordsAll.push(word);
      }
    }

    if (wordsAll.length === 0 && wordsNot.length === 0) {
      style.innerHTML = "";
      return;
    }

    var cssLine = ".hex";

    for (var i = 0; i < wordsAll.length; i++) {
      cssLine += '[data-hex-text*="' + wordsAll[i] + '"]';
    }

    for (var i = 0; i < wordsNot.length; i++) {
      cssLine += ':not([data-hex-text*="' + wordsNot[i] + '"])';
    }

    var cssLines = [".hex " + cssInactive];
    if (wordsAll.length > 0 || wordsNot.length > 0) {
      cssLines.push(cssLine + cssActive);
    }
    style.innerHTML = cssLines.join("\n");
  };
  hexFilter.addEventListener("focus", hexFilterUpdate);
  hexFilter.addEventListener("keydown", hexFilterUpdate);
  hexFilter.addEventListener("keyup", hexFilterUpdate);
  hexFilter.addEventListener("blur", function () {
    style.innerHTML = "";
    hexFilterValue = null;
  });

  hexFilterJa.addEventListener("focus", hexFilterUpdate);
  hexFilterJa.addEventListener("keydown", hexFilterUpdate);
  hexFilterJa.addEventListener("keyup", hexFilterUpdate);
  hexFilterJa.addEventListener("blur", function () {
    style.innerHTML = "";
    hexFilterValue = null;
  });

  // Screenshot Build Importer
  var isOpenCvReady = false;
  var hexTemplates = {};
  var hexTemplatePositions = {};

  window.onOpenCvReady = function() {
    isOpenCvReady = true;
    console.log('OpenCV.js is ready');
    extractHexTemplates();
  };

  function extractHexTemplates() {
    if (!isOpenCvReady) return;
    
    console.log('Starting template extraction...');
    
    // Load and parse hex.css directly to get sprite positions
    fetch('hex.css')
      .then(response => response.text())
      .then(cssText => {
        console.log('Loaded hex.css, parsing sprite positions...');
        
        // Parse CSS to extract background positions
        var hexPositions = {};
        var lines = cssText.split('\n');
        var currentClass = null;
        
        lines.forEach(function(line) {
          line = line.trim();
          
          // Match .hex.ClassName {
          var classMatch = line.match(/\.hex\.(\w+)\s*\{/);
          if (classMatch) {
            currentClass = classMatch[1];
            return;
          }
          
          // Match background-position: -XXXpx -YYYpx;
          if (currentClass && line.includes('background-position:')) {
            var posMatch = line.match(/background-position:\s*(-?\d+)px\s*(-?\d+)px/);
            if (posMatch) {
              var x = Math.abs(parseInt(posMatch[1]));
              var y = Math.abs(parseInt(posMatch[2]));
              hexPositions[currentClass] = { x: x, y: y };
              console.log('Found position for', currentClass, ':', x, y);
            }
          }
        });
        
        console.log('Parsed', Object.keys(hexPositions).length, 'sprite positions');
        
        // Load sprite sheet and extract templates
        var spriteImg = new Image();
        spriteImg.crossOrigin = "anonymous";
        spriteImg.onload = function() {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          canvas.width = spriteImg.width;
          canvas.height = spriteImg.height;
          ctx.drawImage(spriteImg, 0, 0);
          
          console.log('Sprite loaded, dimensions:', spriteImg.width, 'x', spriteImg.height);
          
          var spriteMat = cv.imread(canvas);
          
          // Extract each hexagon template (42x48 pixels as per hex.css)
          Object.keys(hexPositions).forEach(function(className) {
            var pos = hexPositions[className];
            try {
              // Ensure we don't go out of bounds
              if (pos.x + 42 <= spriteImg.width && pos.y + 48 <= spriteImg.height) {
                var rect = new cv.Rect(pos.x, pos.y, 42, 48);
                var template = spriteMat.roi(rect);
                
                // Ensure template is properly cloned before storing
                var clonedTemplate = new cv.Mat();
                template.copyTo(clonedTemplate);
                hexTemplates[className] = clonedTemplate;
                hexTemplatePositions[className] = pos;
                
                template.delete();
                console.log('Extracted template for', className, 'at', pos.x, pos.y);
              } else {
                console.warn('Skipping', className, '- position out of bounds:', pos.x, pos.y);
              }
            } catch (error) {
              console.error('Error extracting template for', className, ':', error);
            }
          });
          
          spriteMat.delete();
          console.log('Successfully extracted', Object.keys(hexTemplates).length, 'hex templates');
          
          // Verify templates are valid
          var validTemplates = 0;
          Object.keys(hexTemplates).forEach(function(className) {
            if (hexTemplates[className] && !hexTemplates[className].empty()) {
              validTemplates++;
            } else {
              console.warn('Invalid template for', className);
              delete hexTemplates[className];
            }
          });
          console.log('Verified', validTemplates, 'valid templates ready for matching');
        };
        
        spriteImg.onerror = function() {
          console.error('Failed to load sprite image');
        };
        
        spriteImg.src = 'hex.png';
      })
      .catch(error => {
        console.error('Failed to load hex.css:', error);
      });
  }

  function processScreenshot(imageFile) {
    if (!isOpenCvReady) {
      showStatus('OpenCV.js is still loading. Please try again in a moment.', 'error');
      return;
    }
    
    showStatus('Processing screenshot...', 'loading');
    
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        try {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          var src = cv.imread(canvas);
          var matches = findHexMatches(src);
          src.delete();
          
          applyMatches(matches);
          showStatus('Screenshot processed successfully!', 'success');
          
        } catch (error) {
          console.error('Screenshot processing error:', error);
          showStatus('Error processing screenshot. Please try a different image.', 'error');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(imageFile);
  }

  function preprocessImage(srcMat, isTemplate = false) {
    // Create a processed version for better template matching
    var processed = new cv.Mat();
    
    // Convert to grayscale for more consistent matching
    if (srcMat.channels() === 3) {
      cv.cvtColor(srcMat, processed, cv.COLOR_RGB2GRAY);
    } else if (srcMat.channels() === 4) {
      cv.cvtColor(srcMat, processed, cv.COLOR_RGBA2GRAY);
    } else {
      processed = srcMat.clone();
    }
    
    if (isTemplate) {
      // For templates, apply minimal processing to preserve details
      var enhanced = new cv.Mat();
      cv.GaussianBlur(processed, enhanced, new cv.Size(1, 1), 0, 0, cv.BORDER_DEFAULT);
      processed.delete();
      return enhanced;
    }
    
    // For screenshots, apply more aggressive preprocessing
    // Apply bilateral filter to reduce noise while preserving edges
    var filtered = new cv.Mat();
    cv.bilateralFilter(processed, filtered, 9, 75, 75, cv.BORDER_DEFAULT);
    processed.delete();
    
    // Enhance contrast using CLAHE
    var enhanced = new cv.Mat();
    var clahe = new cv.CLAHE(3.0, new cv.Size(8, 8));
    clahe.apply(filtered, enhanced);
    filtered.delete();
    clahe.delete();
    
    // Apply morphological operations to clean up the image
    var morphed = new cv.Mat();
    var kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
    cv.morphologyEx(enhanced, morphed, cv.MORPH_CLOSE, kernel);
    enhanced.delete();
    kernel.delete();
    
    return morphed;
  }

  function createEdgeMap(srcMat) {
    // Create edge map for more robust matching
    var gray = new cv.Mat();
    if (srcMat.channels() === 1) {
      gray = srcMat.clone();
    } else {
      cv.cvtColor(srcMat, gray, cv.COLOR_RGBA2GRAY);
    }
    
    var edges = new cv.Mat();
    cv.Canny(gray, edges, 50, 150, 3, false);
    gray.delete();
    
    return edges;
  }

  function findHexMatches(srcMat) {
    var matches = { confident: [], uncertain: [] };
    var confidenceThreshold = 0.45;  // Lower confident threshold due to edge validation
    var uncertainThreshold = 0.32;   // Lower uncertain threshold for better detection
    
    console.log('Starting template matching with', Object.keys(hexTemplates).length, 'templates');
    console.log('Source image size:', srcMat.cols, 'x', srcMat.rows);
    
    // Preprocess both source image and templates
    var processedSrc = preprocessImage(srcMat, false); // isTemplate = false
    
    // Debug visualization
    var debugContainer = document.getElementById('debug-container');
    if (debugContainer) {
      debugContainer.innerHTML = '';
      var title = document.createElement('h4');
      title.textContent = 'Debug Visualization';
      title.style.color = '#fff';
      title.style.margin = '0 0 10px 0';
      debugContainer.appendChild(title);
    }
    
    showDebugCanvas(srcMat, 'Original Screenshot', 300);
    showDebugCanvas(processedSrc, 'Processed Screenshot', 300);
    
    // Also create edge maps for additional validation
    var srcEdges = createEdgeMap(srcMat);
    showDebugCanvas(srcEdges, 'Edge Map', 300);
    
    var allCandidates = [];
    var confidenceStats = { min: 1.0, max: 0.0, samples: [] };
    
    // Prioritize more distinctive templates for better matching
    var priorityTemplates = ['Assault', 'Stealth', 'Sentinel', 'Engineer', 'Firefly', 'Carrier', 'Hullbreaker', 'Battery', 'Architect', 'Research', 'Viper', 'Courser', 'Leviathan'];
    var templateKeys = Object.keys(hexTemplates);
    var orderedTemplates = priorityTemplates.filter(name => templateKeys.includes(name))
                          .concat(templateKeys.filter(name => !priorityTemplates.includes(name)));
    
    // Try multiple matching approaches
    var matchMethods = [cv.TM_CCOEFF_NORMED, cv.TM_CCORR_NORMED, cv.TM_SQDIFF_NORMED];
    var scales = [1.0, 0.9, 1.1, 0.8, 1.2]; // More scale options, starting with closer to original
    
    // Enable debugging for first few templates
    var debugMode = true;
    var debugCount = 0;
    
    orderedTemplates.forEach(function(className) {
      var template = hexTemplates[className];
      if (!template) return;
      
      var processedTemplate = preprocessImage(template, true); // isTemplate = true
      var bestConfidence = 0;
      var bestLocation = null;
      var bestMethod = null;
      var bestScale = 1.0;
      
      // Show debug visualization for first few templates
      if (debugMode && debugCount < 3) {
        console.log('Debug: Processing template', className);
        showDebugCanvas(template, 'Original ' + className, 100);
        showDebugCanvas(processedTemplate, 'Processed ' + className, 100);
        debugCount++;
      }
      
      // Try different scales and methods
      scales.forEach(function(scale) {
        var scaledTemplate = new cv.Mat();
        if (scale !== 1.0) {
          var newSize = new cv.Size(
            Math.round(processedTemplate.cols * scale),
            Math.round(processedTemplate.rows * scale)
          );
          cv.resize(processedTemplate, scaledTemplate, newSize, 0, 0, cv.INTER_LINEAR);
        } else {
          scaledTemplate = processedTemplate.clone();
        }
        
        // Skip if template becomes too small or too large
        if (scaledTemplate.cols < 10 || scaledTemplate.rows < 10 || 
            scaledTemplate.cols > processedSrc.cols || scaledTemplate.rows > processedSrc.rows) {
          scaledTemplate.delete();
          return;
        }
        
        matchMethods.forEach(function(method) {
          var result = new cv.Mat();
          var mask = new cv.Mat();
          
          try {
            cv.matchTemplate(processedSrc, scaledTemplate, result, method, mask);
            var minMaxLoc = cv.minMaxLoc(result);
            var confidence;
            
            // TM_SQDIFF_NORMED uses minimum (lower is better), others use maximum
            if (method === cv.TM_SQDIFF_NORMED) {
              confidence = 1.0 - minMaxLoc.minVal; // Convert to 0-1 scale where higher is better
            } else {
              confidence = minMaxLoc.maxVal;
            }
            
            // Apply method-specific adjustments
            if (method === cv.TM_CCORR_NORMED) {
              confidence *= 0.9; // CCORR tends to give inflated scores
            }
            
            // Apply scale penalty for non-standard scales
            if (scale !== 1.0) {
              confidence *= (1.0 - Math.abs(scale - 1.0) * 0.1);
            }
            
            if (confidence > bestConfidence) {
              bestConfidence = confidence;
              bestLocation = method === cv.TM_SQDIFF_NORMED ? minMaxLoc.minLoc : minMaxLoc.maxLoc;
              bestMethod = method;
              bestScale = scale;
            }
          } catch (error) {
            console.error('Error with method', method, 'scale', scale, 'for', className, ':', error);
          }
          
          result.delete();
          mask.delete();
        });
        
        scaledTemplate.delete();
      });
      
      processedTemplate.delete();
      
      // Track confidence statistics
      confidenceStats.min = Math.min(confidenceStats.min, bestConfidence);
      confidenceStats.max = Math.max(confidenceStats.max, bestConfidence);
      if (confidenceStats.samples.length < 15) {
        confidenceStats.samples.push({ className: className, confidence: bestConfidence });
      }
      
      if (bestConfidence >= uncertainThreshold) {
        // Additional validation using edge matching for higher confidence candidates
        var finalConfidence = bestConfidence;
        
        if (bestConfidence > 0.4) {
          try {
            var templateEdges = createEdgeMap(template);
            var scaledTemplateEdges = new cv.Mat();
            
            if (bestScale !== 1.0) {
              var newSize = new cv.Size(
                Math.round(templateEdges.cols * bestScale),
                Math.round(templateEdges.rows * bestScale)
              );
              cv.resize(templateEdges, scaledTemplateEdges, newSize, 0, 0, cv.INTER_LINEAR);
            } else {
              scaledTemplateEdges = templateEdges.clone();
            }
            
            var edgeResult = new cv.Mat();
            var edgeMask = new cv.Mat();
            cv.matchTemplate(srcEdges, scaledTemplateEdges, edgeResult, cv.TM_CCOEFF_NORMED, edgeMask);
            var edgeMatch = cv.minMaxLoc(edgeResult);
            var edgeConfidence = edgeMatch.maxVal;
            
            // Combine regular and edge confidence
            finalConfidence = (bestConfidence * 0.7) + (edgeConfidence * 0.3);
            
            templateEdges.delete();
            scaledTemplateEdges.delete();
            edgeResult.delete();
            edgeMask.delete();
            
            console.log('Edge validation for', className, '- original:', bestConfidence.toFixed(3), 'edge:', edgeConfidence.toFixed(3), 'combined:', finalConfidence.toFixed(3));
          } catch (error) {
            console.warn('Edge validation failed for', className, ':', error);
            // Use original confidence if edge validation fails
          }
        }
        
        allCandidates.push({
          className: className,
          confidence: finalConfidence,
          location: bestLocation,
          method: bestMethod,
          scale: bestScale,
          originalConfidence: bestConfidence
        });
        console.log('Candidate:', className, 'confidence:', finalConfidence.toFixed(3), 'scale:', bestScale, 'at', bestLocation.x, bestLocation.y);
      }
    });
    
    processedSrc.delete();
    srcEdges.delete();
    
    console.log('Confidence stats - Min:', confidenceStats.min.toFixed(3), 'Max:', confidenceStats.max.toFixed(3));
    console.log('Sample confidences:', confidenceStats.samples.map(s => s.className + ':' + s.confidence.toFixed(3)).join(', '));
    console.log('Total candidates above', uncertainThreshold + ':', allCandidates.length);
    
    // Dynamic threshold adjustment based on actual data
    if (allCandidates.length < 8 && confidenceStats.max > 0.25) {
      var adaptiveThreshold = Math.max(0.25, confidenceStats.max * 0.6);
      console.log('Applying adaptive threshold:', adaptiveThreshold.toFixed(3));
      
      Object.keys(hexTemplates).forEach(function(className) {
        var template = hexTemplates[className];
        var processedTemplate = preprocessImage(template);
        var result = new cv.Mat();
        var mask = new cv.Mat();
        
        try {
          cv.matchTemplate(srcMat, processedTemplate, result, cv.TM_CCOEFF_NORMED, mask);
          var minMaxLoc = cv.minMaxLoc(result);
          var confidence = minMaxLoc.maxVal;
          
          if (confidence >= adaptiveThreshold && !allCandidates.some(c => c.className === className)) {
            allCandidates.push({
              className: className,
              confidence: confidence,
              location: minMaxLoc.maxLoc,
              method: 'adaptive'
            });
            console.log('Adaptive threshold candidate:', className, confidence.toFixed(3));
          }
        } catch (error) {
          // ignore
        }
        
        processedTemplate.delete();
        result.delete();
        mask.delete();
      });
    }
    
    // Sort all candidates by confidence
    allCandidates.sort((a, b) => b.confidence - a.confidence);
    console.log('Top 10 candidates:', allCandidates.slice(0, 10).map(c => c.className + ':' + c.confidence.toFixed(3)).join(', '));
    
    // Improved spatial filtering with adaptive distance
    var filteredCandidates = [];
    var baseDistance = 35; // Base minimum distance
    
    allCandidates.forEach(function(candidate) {
      var tooClose = filteredCandidates.some(function(existing) {
        var dx = candidate.location.x - existing.location.x;
        var dy = candidate.location.y - existing.location.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        
        // Use adaptive distance based on confidence difference
        var confidenceDiff = Math.abs(candidate.confidence - existing.confidence);
        var adaptiveDistance = baseDistance * (1 + confidenceDiff * 0.5);
        
        return distance < adaptiveDistance;
      });
      
      if (!tooClose) {
        filteredCandidates.push(candidate);
      } else {
        console.log('Filtered out', candidate.className, 'due to spatial overlap');
      }
    });
    
    // Categorize filtered candidates with refined thresholds
    filteredCandidates.forEach(function(candidate) {
      if (candidate.confidence >= confidenceThreshold) {
        matches.confident.push(candidate);
        console.log('CONFIDENT match:', candidate.className, candidate.confidence.toFixed(3));
      } else {
        matches.uncertain.push(candidate);
        console.log('UNCERTAIN match:', candidate.className, candidate.confidence.toFixed(3));
      }
    });
    
    console.log('After spatial filtering - Confident:', matches.confident.length, 'Uncertain:', matches.uncertain.length);
    
    // Limit results to reasonable numbers
    if (matches.confident.length > 20) {
      matches.confident = matches.confident.slice(0, 20);
    }
    if (matches.uncertain.length > 12) {
      matches.uncertain = matches.uncertain.slice(0, 12);
    }
    
    return matches;
  }

  function applyMatches(matches) {
    console.log('Applying matches - Confident:', matches.confident.length, 'Uncertain:', matches.uncertain.length);
    
    var appliedConfident = 0;
    
    // Apply confident matches automatically
    matches.confident.forEach(function(match) {
      console.log('Applying confident match:', match.className, '(confidence:', match.confidence.toFixed(3) + ')');
      var elements = document.querySelectorAll('.hex.' + match.className + ':not(.uncertain-hex)');
      console.log('Found', elements.length, 'elements for', match.className);
      
      if (elements.length > 0) {
        elements.forEach(function(el) {
          if (!el.hasAttribute('checked')) {
            el.setAttribute('checked', '');
            hexCheckCount++;
            appliedConfident++;
            console.log('Set checked attribute on element:', el.className);
          }
        });
      } else {
        console.warn('No valid elements found for confident match:', match.className);
      }
    });
    
    // Display uncertain matches for user review
    displayUncertainMatches(matches.uncertain);
    
    console.log('Applied', appliedConfident, 'confident matches, final hexCheckCount:', hexCheckCount);
    
    // Update status message with results
    var statusMsg = 'Found ' + matches.confident.length + ' confident matches';
    if (matches.uncertain.length > 0) {
      statusMsg += ' and ' + matches.uncertain.length + ' uncertain matches for review';
    }
    showStatus(statusMsg, 'success');
    
    // Update UI
    hexCheckCountSpan.innerHTML = '' + hexCheckCount;
    if (hexCheckCount > 0) clearMatch();
  }

  function displayUncertainMatches(uncertainMatches) {
    var container = document.getElementById('uncertain-hexagons');
    var list = document.getElementById('uncertain-list');
    
    if (uncertainMatches.length === 0) {
      container.style.display = 'none';
      return;
    }
    
    list.innerHTML = '';
    
    uncertainMatches.forEach(function(match) {
      // Create container section to match existing hex structure
      var section = document.createElement('section');
      section.className = 'single';
      section.style.position = 'relative';
      section.style.width = '42px';
      section.style.height = '48px';
      section.style.margin = '4px';
      
      var hexDiv = document.createElement('div');
      hexDiv.className = 'hex ' + match.className + ' uncertain-hex';
      hexDiv.setAttribute('data-hex-name', match.className);
      hexDiv.title = 'Confidence: ' + (match.confidence * 100).toFixed(1) + '% - Click to add';
      hexDiv.style.width = '42px';
      hexDiv.style.height = '48px';
      hexDiv.style.cursor = 'pointer';
      
      hexDiv.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Find the actual hex elements in the main grid (not uncertain ones)
        var elements = document.querySelectorAll('.hex.' + match.className + ':not(.uncertain-hex)');
        console.log('Clicking uncertain hex:', match.className, 'found', elements.length, 'elements');
        
        elements.forEach(function(el) {
          if (!el.hasAttribute('checked')) {
            el.setAttribute('checked', '');
            hexCheckCount++;
            console.log('Added', match.className, 'to selection');
          }
        });
        
        hexCheckCountSpan.innerHTML = '' + hexCheckCount;
        section.remove();
        
        // Hide container if no more uncertain hexes
        if (list.children.length === 0) {
          container.style.display = 'none';
        }
        
        if (hexCheckCount > 0) clearMatch();
      });
      
      section.appendChild(hexDiv);
      list.appendChild(section);
    });
    
    container.style.display = 'block';
  }

  function showDebugCanvas(mat, title, maxWidth = 200) {
    // Create debug canvas to visualize what OpenCV sees
    var canvas = document.createElement('canvas');
    cv.imshow(canvas, mat);
    canvas.title = title;
    canvas.style.border = '1px solid #ccc';
    canvas.style.margin = '5px';
    canvas.style.maxWidth = maxWidth + 'px';
    
    // Scale down if too large
    if (canvas.width > maxWidth) {
      var scale = maxWidth / canvas.width;
      canvas.style.width = (canvas.width * scale) + 'px';
      canvas.style.height = (canvas.height * scale) + 'px';
    }
    
    var debugContainer = document.getElementById('debug-container');
    if (!debugContainer) {
      debugContainer = document.createElement('div');
      debugContainer.id = 'debug-container';
      debugContainer.style.background = 'rgba(0,0,0,0.8)';
      debugContainer.style.padding = '10px';
      debugContainer.style.margin = '10px 0';
      debugContainer.style.borderRadius = '5px';
      debugContainer.style.overflow = 'auto';
      debugContainer.style.maxHeight = '300px';
      document.body.appendChild(debugContainer);
      
      var title = document.createElement('h4');
      title.textContent = 'Debug Visualization';
      title.style.color = '#fff';
      title.style.margin = '0 0 10px 0';
      debugContainer.appendChild(title);
    }
    
    var label = document.createElement('div');
    label.textContent = title;
    label.style.color = '#ccc';
    label.style.fontSize = '12px';
    label.style.marginBottom = '5px';
    
    debugContainer.appendChild(label);
    debugContainer.appendChild(canvas);
  }

  function showStatus(message, type) {
    var statusDiv = document.getElementById('screenshot-status');
    statusDiv.innerHTML = message;
    statusDiv.className = 'status-' + type;
    statusDiv.style.display = 'block';
    
    if (type === 'success' || type === 'error') {
      setTimeout(function() {
        statusDiv.style.display = 'none';
      }, 3000);
    }
  }

  // Event listeners for screenshot upload
  document.getElementById('upload-screenshot').addEventListener('click', function() {
    document.getElementById('screenshot-file').click();
  });

  document.getElementById('screenshot-file').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        processScreenshot(file);
      } else {
        showStatus('Please select a valid image file.', 'error');
      }
    }
  });

})();
