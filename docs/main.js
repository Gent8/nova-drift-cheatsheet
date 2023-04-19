(function () {
    function NavigatorGetLanguage() {
        var navigator_obj = window.navigator;
        if (navigator_obj.language !== undefined) return navigator_obj.language;
        if (navigator_obj.browserLanguage !== undefined) return navigator_obj.browserLanguage;
        if (navigator_obj.userLanguage !== undefined) return navigator_obj.userLanguage;
        return 'en';
    }

    var language = NavigatorGetLanguage();

    // Currently supported: en, ja
    if (language == 'en' || language == 'ja') {
        document.getElementById('langswitch-' + language).classList.add('clicked');
        document.getElementsByTagName('html')[0].className = language;
    } else {
        document.getElementById('langswitch-en').classList.add('clicked');
        document.getElementsByTagName('html')[0].className = 'en';
    }

    var style = document.getElementById('match-style');

    var cssActive = ' { filter: brightness(125%) }';
    var activeSlider = document.getElementById('active-brightness');
    var keyActive = 'nova-drift-sheet:active-brightness';
    function syncActiveBrightness() {
        cssActive = ' { filter: brightness(' + activeSlider.value + '%) }';
    }
    activeSlider.addEventListener('change', function (_) {
        syncActiveBrightness();
        localStorage.setItem(keyActive, activeSlider.value);
    });
    if (localStorage.getItem(keyActive)) {
        activeSlider.value = 0 | localStorage.getItem(keyActive);
        syncActiveBrightness();
    }

    var cssInactive = ' { filter: brightness(50%) }';
    var inactiveSlider = document.getElementById('inactive-brightness');
    var keyInactive = 'nova-drift-sheet:inactive-brightness';
    function syncInactiveBrightness() {
        cssInactive = ' { filter: brightness(' + inactiveSlider.value + '%) }';
    }
    inactiveSlider.addEventListener('change', function () {
        syncInactiveBrightness();
        localStorage.setItem(keyInactive, inactiveSlider.value);
    });
    if (localStorage.getItem(keyInactive)) {
        inactiveSlider.value = 0 | localStorage.getItem(keyInactive);
        syncInactiveBrightness();
    }

    function onModEnter(e) {
        var hex = e.target;
        var name = hex.getAttribute('data-hex-name');
        if (!name) return;
        var css = [];
        // if (!hex.parentElement.classList.contains("single")) {
        css.push('.hex:not(.' + name + ')' + cssInactive);
        css.push('.hex.' + name + cssActive);
        // }
        style.innerHTML = css.join('\n');
    }

    var listConstructMax = [
        'Retribution',
        'AdvancedEngineering',
        'FleetCommander',
        'Reconstitution',
        'CounterArtillery',
        'Evolution',
        'MediCharge',
        'Overpower',
        'Overseer',
        'SupportSpecialist',
        'Max',
    ];

    function onMaxEnter(e) {
        var hex = e.target;
        var name = hex.getAttribute('data-hex-name');
        if (!name) return;

        var css = [];
        var inactiveList = '.hex';
        var activeList = '';

        for (var i = 0; i < listConstructMax.length; i++) {
            inactiveList = inactiveList + ':not(.' + listConstructMax[i] + ')';
            if (i == 0) activeList = activeList + '.hex.' + listConstructMax[i];
            else activeList = activeList + ',.hex.' + listConstructMax[i];
        }

        css.push(inactiveList + cssInactive);
        css.push(activeList + cssActive);

        style.innerHTML = css.join('\n');
    }

    var modShorten = Object.create(null);
    var modLongen = Object.create(null);
    var modPrefab = Object.create(null);
    var modName = Object.create(null);
    var modSlPairs = 'ABS=Absorption;AA=AdaptiveArmor;AP=AddedProjectiles;AMD=AdrenalModule;AE=AdvancedEngineering;AEG=Aegis;AGI=Agility;ALY=Ally;AMP=Amp;ANH=Annihilation;AMC=ApexMachinery;APO=Apotheosis;ARB=ArcBarrier;ARC=Architect;AST=Assault;AD=AssaultDrones;ATX=Ataraxia;AM=AutoMines;BRG=Barrage;BAR=Barrier;BST=Bastion;BD=BattalionDrones;BTR=Battery;BLD=BladeDrone;BR=BlastRadius;BK=Blink;BLZ=Blitz;BVD=Bravado;BRC=Breach;BUR=BurnoutReactors;BF=BurstFire;CAL=Calibrate;CDS=Candescence;CRR=Carrier;CLS=CelestialSurge;CHL=Challenger;CH=Channeling;CHA=ChaoticAmbition;CM=ChargedMines;CHS=ChargedShields;CS=ChargedShot;CB=ConcentratedBlast;CVG=Convergence;CN=Conversion;CSH=CoreShielding;COR=Corrosion;CA=CounterArtillery;CP=Counterpulse;CUR=Courser;DRT=Dart;DW=DeadlyWake;DHB=DeathBlossom;DS=DecoySignal;BD0=DefaultBody;SH0=DefaultShield;WP0=DefaultWeapon;DD=DefenseDrone;DEF=Defiance;DFL=Deflagration;DSC=Discharge;DIS=Discord;DSP=Displacement;DT=DoubleTap;D=Drones;DST=DyingStar;ES=EchoStrike;EF=Efficiency;EC=ElegantConstruction;URL=Element;ESY=EmergencySystems;ENS=EnergizedShields;ENG=Engineer;ESP=EssenceSap;EVA=Evasion;EVO=Evolution;EVN=EvolutionaryNiche;EXG=ExplosiveGrowth;FRS=Farsight;FFL=Firefly;FA=FiringArray;FLK=Flak;FS=FlashShielding;FLT=Fleet;FLC=FleetCommander;FLO=Flotilla;FOS=FocusedShields;FF=FocusFire;FAR=ForceArmor;FR=FormationRampart;FSL=Fusillade;GO=GalvanicOutburst;GP=Gemini;GRP=GraceProtocol;GDR=Grandeur;GRD=Grenade;GUR=Guardian;HAL=Halo;HS=HeatSeeking;HC=HeavyCaliber;HLX=Helix;HP=HiddenPower;HE=HighExplosive;HST=HomingStrike;HLB=Hullbreaker;HR=HullRegeneration;HUS=HullStrength;H=Hypermetabolism;IT=ImprovedThrusters;IF=Infuse;ITW=IntegratedWeaponry;JGR=Juggernaut;KB=KineticBoost;LN=Lance;LS=LastStand;LTW=LeafOnTheWind;LV=Leviathan;LM=LoadedMines;MAE=Maelstrom;MGT=Magnitude;MAS=Masochism;MST=Mastery;CMX=Max;MC=MediCharge;MIN=Mines;MRT=Mortar;NTR=Nanotech;NTD=NanotechDissemination;OBS=Obsession;OS=OmniShield;OMN=Outmaneuver;OM=OutrageModule;OVC=Overclock;OV=Overpower;OVS=Overseer;P=Payload;PS=PhantomStrike;PD=PointDefense;PI=PolarInversion;PR=PowerReserves;PWS=PowerSpike;PRD=PredatorDrones;PZ=PriorityZero;PM=PropulsiveMunitions;PUL=Pulse;PUG=Purge;PUR=Purification;RAS=RadiantShields;RLG=Railgun;RM=Rampage;RAN=Rancor;RF=RapidFire;RR=RapidReconstruction;RB=Rebuke;RCS=Reconstitution;RFL=Reflect;RS=RegenerativeShields;RG=Regression;RFD=ReinforcedDrones;RSC=Research;RTS=RetaliationShields;RTB=Retribution;RVL=Revelation;RC=Ricochet;RKD=RocketDrones;RUP=Rupture;SLV=Salvo;SAN=Sanctuary;SF=SaturationFire;SCW=ScorchingWake;SD=SelfDestruction;SNT=Sentinel;SC=ShieldCooldown;SHD=ShieldDurability;SDR=ShieldedDrones;SR=ShieldRadius;SWV=Shockwave;SW=SiegeWeaponry;SSN=SingularStrikeNew;SPH=Siphon;SKM=Skirmish;SLS=Slipstream;SNP=Snipe;SH=SolarHeart;SA=SpecialistAlly;SPD=SpecialistDrone;SPM=SpecialistMine;ST=SpecialistTurret;SSH=SplinterShot;SPL=Split;SPG=SpontaneousGeneration;STB=Stabilization;STH=Stealth;STF=Strafe;SRS=StrafingStrikes;SL=Streamline;SBS=Subsumption;SS=SupportSpecialist;TL=TacticalLink;TS=TargettingSystems;TB=TempestBreak;TMP=Temporal;TMD=TerminalDirective;TMN=Terminate;THL=ThermalLance;TRN=Torrent;TRX=Transmogrification;TUR=Turret;S2=TwinStrike;VEL=Velocity;VPR=Viper;VTB=VitalBond;VS=VolatileShields;VTX=Vortex;WM=WarMachine;WRP=Warp;WP=Warpath;WST=WarpStrike;WS=WeaponizedShields;WNM=Wingman;WIN=Winnow'.split(';');
    var modPrPairs = 'mAbsorption=Absorption;mAdaptiveArmor=AdaptiveArmor;mAddedProjectiles=AddedProjectiles;mAdrenalModule=AdrenalModule;mAdvancedEngineering=AdvancedEngineering;mAegis=Aegis;mAgility=Agility;mAlly=Ally;gAmp=Amp;mAnnihilation=Annihilation;mApexMachinery=ApexMachinery;mApotheosis=Apotheosis;mArcBarrier=ArcBarrier;gArchitect=Architect;gAssault=Assault;mAssaultDrones=AssaultDrones;mAtaraxia=Ataraxia;mMinefield=AutoMines;mBarrage=Barrage;mBarrier=Barrier;gBastion=Bastion;mFormationBattalion=BattalionDrones;gBattery=Battery;gBlade=BladeDrone;mBlastRadius=BlastRadius;mBlink=Blink;mBlitz=Blitz;mBravado=Bravado;mIncendiaryStrike=Breach;mBurnoutReactors=BurnoutReactors;mBurstFire=BurstFire;mCalibrate=Calibrate;mCandescence=Candescence;gCarrier=Carrier;mCelestialSurge=CelestialSurge;mChallenger=Challenger;mChanneling=Channeling;mChaoticAmbition=ChaoticAmbition;mChargedMines=ChargedMines;mChargedShields=ChargedShields;mChargedShot=ChargedShot;mConcentratedBlast=ConcentratedBlast;mConvergence=Convergence;mConversion=Conversion;mCoreShielding=CoreShielding;mCorrosion=Corrosion;mCounterArtillery=CounterArtillery;mCounterpulse=Counterpulse;gCourser=Courser;gDart=Dart;mDeadlyWake=DeadlyWake;mDeathBlossom=DeathBlossom;mDecoySignal=DecoySignal;gDefault=DefaultBody;gShieldDefault=DefaultShield;gBlaster=DefaultWeapon;mDefenseDrones=DefenseDrone;mDefiance=Defiance;mDeflagration=Deflagration;mDischarge=Discharge;mDiscord=Discord;mDisplacement=Displacement;mDoubleTap=DoubleTap;mDrones=Drones;mDyingStar=DyingStar;mEchoStrike=EchoStrike;mEfficiency=Efficiency;mElegantConstruction=ElegantConstruction;ModString=Element;mEmergencySystems=EmergencySystems;mEnergizedShields=EnergizedShields;gEngineer=Engineer;mEssenceSap=EssenceSap;mEvasion=Evasion;mEvolution=Evolution;mEvolutionaryNiche=EvolutionaryNiche;mExplosiveGrowth=ExplosiveGrowth;mFarsight=Farsight;gFirefly=Firefly;mFiringArray=FiringArray;gFlak=Flak;mFlashShielding=FlashShielding;deleted_6=Fleet;mFleetCommander=FleetCommander;deleted_1=Flotilla;mFocusedShields=FocusedShields;mFocusFire=FocusFire;mForceArmor=ForceArmor;deleted_2=FormationRampart;mFusillade=Fusillade;mGalvanicOutburst=GalvanicOutburst;mGemini=Gemini;mGraceProtocol=GraceProtocol;mGrandeur=Grandeur;gGrenade=Grenade;mGuardian=Guardian;gHalo=Halo;mGuidance=HeatSeeking;mHeavyCaliber=HeavyCaliber;gOrbital=Helix;mHiddenPower=HiddenPower;mHighExplosive=HighExplosive;mHomingStrike=HomingStrike;gHullbreaker=Hullbreaker;mHullRegeneration=HullRegeneration;mHullStrength=HullStrength;mHypermetabolism=Hypermetabolism;mImprovedThrusters=ImprovedThrusters;mInfuse=Infuse;mInterceptor=IntegratedWeaponry;mJuggernaut=Juggernaut;mKineticBoost=KineticBoost;mCelestialLance=Lance;mLastStand=LastStand;mLeafOnTheWind=LeafOnTheWind;gLeviathan=Leviathan;mLoadedMines=LoadedMines;mMaelstrom=Maelstrom;mMagnitude=Magnitude;mMasochism=Masochism;mMastery=Mastery;deleted_3=Max;mMediCharge=MediCharge;mMines=Mines;mMortar=Mortar;mNanotechReconstruction=Nanotech;mNanotechDissemination=NanotechDissemination;mObsession=Obsession;mOmniShield=OmniShield;mOutmaneuver=Outmaneuver;mOutrageModule=OutrageModule;mOverclock=Overclock;mOverpower=Overpower;mOverseer=Overseer;mPayload=Payload;mPhantomStrike=PhantomStrike;mPointDefense=PointDefense;mPolarInversion=PolarInversion;mPowerReserves=PowerReserves;mPowerSpike=PowerSpike;deleted_4=PredatorDrones;mPriorityZero=PriorityZero;mPropulsiveMunitions=PropulsiveMunitions;gPulse=Pulse;mPurge=Purge;mPurification=Purification;mRadiantShields=RadiantShields;gRailgun=Railgun;mRampage=Rampage;mRancor=Rancor;mRapidFire=RapidFire;mRapidReconstruction=RapidReconstruction;mRebuke=Rebuke;mReconstitution=Reconstitution;gReflect=Reflect;mRegenerativeShields=RegenerativeShields;mRegression=Regression;deleted_5=ReinforcedDrones;gResearch=Research;mRetaliationShields=RetaliationShields;mRetribution=Retribution;mRevelation=Revelation;mRicochet=Ricochet;deleted_0=RocketDrones;mRupture=Rupture;gSalvo=Salvo;mSanctuary=Sanctuary;mSaturationFire=SaturationFire;mScorchingWake=ScorchingWake;mSelfDestruction=SelfDestruction;gSentinel=Sentinel;mShieldCooldown=ShieldCooldown;mShieldDurability=ShieldDurability;mShieldedDrones=ShieldedDrones;mShieldRadius=ShieldRadius;gShockwave=Shockwave;mSiegeWeaponry=SiegeWeaponry;mSingularStrike=SingularStrikeNew;gSiphon=Siphon;mSkirmish=Skirmish;mSlipstream=Slipstream;mSnipe=Snipe;mSolarHeart=SolarHeart;mSpecialistAlly=SpecialistAlly;mSpecialistDrone=SpecialistDrone;mSpecialistMine=SpecialistMine;mSpecialistTurret=SpecialistTurret;mSplinter=SplinterShot;gSplitShot=Split;mSpontaneousGeneration=SpontaneousGeneration;mStabilization=Stabilization;gStealth=Stealth;mStrafe=Strafe;mStrafingStrikes=StrafingStrikes;mStreamline=Streamline;mSubsumption=Subsumption;mSupportSpecialist=SupportSpecialist;mTacticalLink=TacticalLink;mTargetting=TargettingSystems;mTempestBreak=TempestBreak;gTemporal=Temporal;mTerminalDirective=TerminalDirective;mTerminate=Terminate;gThermalLance=ThermalLance;gTorrent=Torrent;mTransmogrification=Transmogrification;mTurret=Turret;mTwinStrike=TwinStrike;mVelocity=Velocity;gViper=Viper;mVitalBond=VitalBond;mVolatileShields=VolatileShields;gVortex=Vortex;mWarMachine=WarMachine;gWarp=Warp;mWarpath=Warpath;mWarpStrike=WarpStrike;mWeaponizedShields=WeaponizedShields;mWingman=Wingman;mWinnow=Winnow'.split(';');
    for (var i = 0; i < modSlPairs.length; i++) {
        var pair = modSlPairs[i];
        var sep = pair.indexOf('=');
        var sh = pair.substring(0, sep);
        var lg = pair.substring(sep + 1);
        modShorten[lg] = sh;
        modLongen[sh] = lg;
    }
    for (var i = 0; i < modPrPairs.length; i++) {
        var pair = modPrPairs[i];
        var sep = pair.indexOf('=');
        var pr = pair.substring(0, sep);
        var nm = pair.substring(sep + 1);
        modPrefab[nm] = pr;
        modName[pr] = nm;
    }

    var hexFilter = document.getElementById('hex-filter');
    var hexCheckCount = 0;
    var hexCheckCountSpan = document.getElementById('hex-select-count');
    var hexFilterUpdate;
    function clearMatch(e) {
        if (document.activeElement == hexFilter) {
            hexFilterUpdate(true);
        } else if (hexCheckCount > 0) {
            style.innerHTML = ['.hex:not([checked]) ' + cssInactive, '.hex[checked] ' + cssActive].join('\n');
        } else style.innerHTML = '';
    }
    document.getElementById('reset-selection').addEventListener('click', function (_) {
        var els = document.querySelectorAll('.hex[checked]');
        for (var i = 0; i < els.length; i++) {
            els[i].removeAttribute('checked');
            if (els[i].classList.contains('rc')) {
                els[i].nextElementSibling.textContent = '';
            }
        }
        hexCheckCount = 0;
        hexCheckCountSpan.innerHTML = '0';
        clearMatch();
    });
    document.getElementById('copy-link').addEventListener('click', function (_) {
        var els = document.querySelectorAll('.hex[checked]');
        var arr = [],
            found = Object.create(null);
        for (var i = 0; i < els.length; i++) {
            var mod = els[i].getAttribute('data-hex-name');
            var rcChr = '';
            if (found[mod]) continue;
            else found[mod] = true;
            if (els[i].classList.contains('rc')) {
                var rcNum = parseInt(els[i].nextElementSibling.textContent);
                if (els[i].nextElementSibling.textContent == '9+') rcChr = '_10';
                else if (0 < rcNum && rcNum < 10) rcChr = '_' + rcNum.toString();
                else rcChr = '_0';
            }
            arr.push((modShorten[mod] || mod) + rcChr);
        }
        var href = location.href;
        var sep = href.indexOf('?');
        var sep2 = href.indexOf('#');
        if (sep < 0 || (sep2 >= 0 && sep2 < sep)) sep = sep2;
        if (sep >= 0) href = href.substring(0, sep);
        if (arr.length > 0) href += '?mods=' + arr.join('+');
        prompt('Copy your link:', href);
    });
    document.getElementById('copy-prefab').addEventListener('click', function (_) {
        var els = document.querySelectorAll('.hex[checked]');
        var arr = [],
            found = Object.create(null);
        for (var i = 0; i < els.length; i++) {
            var mod = els[i].getAttribute('data-hex-name');
            var rcChr = '';
            var rcNum = 1;

            if (found[mod])
                continue;
            else
                found[mod] = true;

            if ((mod == "ExplosiveGrowth") || (mod == "Revelation") || (mod == "Obsession"))
                continue;

            if (els[i].classList.contains('rc')) {
                rcNum = parseInt(els[i].nextElementSibling.textContent);
                if (els[i].nextElementSibling.textContent == '9+') {
                    rcChr = '_10';
                    rcNum = 10;
                } else if (0 < rcNum && rcNum < 10) {
                    rcChr = '_' + rcNum.toString();
                } else {
                    rcChr = '_0';
                    rcNum = 1;
                }
            }

            for (var i = 0; i < rcNum; i++) {
                arr.push(modPrefab[mod]);
            }
        }
        var prefabLine = '"n) xxxx",';
        if (arr.length > 0) prefabLine += arr.join(',');
        prompt('Copy your prefab build:', prefabLine);
    });

    document.getElementById('langswitch-ja').addEventListener('click', function (_) {
        document.getElementById('langswitch-ja').classList.add('clicked');
        document.getElementById('langswitch-en').classList.remove('clicked');
        document.getElementsByTagName('html')[0].className = 'ja';
    });

    document.getElementById('langswitch-en').addEventListener('click', function (_) {
        document.getElementById('langswitch-ja').classList.remove('clicked');
        document.getElementById('langswitch-en').classList.add('clicked');
        document.getElementsByTagName('html')[0].className = 'en';
    });
    function onHexToggle(e) {
        var hex = e.target;
        var els = document.querySelectorAll('.hex.' + hex.getAttribute('data-hex-name'));
        if (hex.hasAttribute('checked')) {
            for (var i = 0; i < els.length; i++) els[i].removeAttribute('checked');
            if (--hexCheckCount == 0) clearMatch();
        } else {
            for (var i = 0; i < els.length; i++) els[i].setAttribute('checked', '');
            if (++hexCheckCount == 1) clearMatch();
        }
        hexCheckCountSpan.innerHTML = '' + hexCheckCount;
    }
    function onMaxToggle(e) {
        var hex = e.target;
        var els = document.querySelectorAll('.hex.' + hex.getAttribute('data-hex-name'));
        var elsMax = document.querySelectorAll('.hex.Max');
        var checkedMax = 0;
        if (hex.hasAttribute('checked')) {
            for (var i = 0; i < els.length; i++) els[i].removeAttribute('checked');
            for (var i = 0; i < listConstructMax.length - 1; i++)
                if (document.querySelector('.hex.' + listConstructMax[i]).hasAttribute('checked'))
                    ++checkedMax;
            if (checkedMax == 0)
                for (var i = 0; i < elsMax.length; i++) elsMax[i].removeAttribute('checked');
            if (--hexCheckCount == 0) clearMatch();
        } else {
            for (var i = 0; i < els.length; i++) els[i].setAttribute('checked', '');
            for (var i = 0; i < elsMax.length; i++) elsMax[i].setAttribute('checked', '');
            if (++hexCheckCount == 1) clearMatch();
        }
        hexCheckCountSpan.innerHTML = '' + hexCheckCount;
    }
    function onHexRcPlus(e) {
        var hex = e.target;
        var els = document.querySelectorAll('.hex.' + hex.getAttribute('data-hex-name'));
        var countDiff = 0;

        if (hex.hasAttribute('checked')) {
            for (var i = 0; i < els.length; i++) {
                var rcDisp = els[i].parentElement.querySelector('.rcNum');
                if (rcDisp != null) {
                    if (rcDisp.textContent == '9+') {
                        rcDisp.textContent = '';
                        els[i].removeAttribute('checked');
                        countDiff = -10;
                    } else if (parseInt(rcDisp.textContent) == 9) {
                        rcDisp.textContent = '9+';
                        countDiff = 1;
                    } else if (parseInt(rcDisp.textContent) > 0) {
                        rcDisp.textContent = '' + (parseInt(rcDisp.textContent) + 1);
                        countDiff = 1;
                    } else {
                        rcDisp.textContent = '1';
                    }
                }
            }
        } else {
            for (var i = 0; i < els.length; i++) {
                var rcDisp = els[i].parentElement.querySelector('.rcNum');
                els[i].setAttribute('checked', '');
                if (rcDisp != null) {
                    rcDisp.textContent = '↻';
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
        hexCheckCountSpan.innerHTML = '' + hexCheckCount;
    }

    var hexagons = document.getElementsByClassName('hex');
    for (var i = 0; i < hexagons.length; i++) {
        var hex = hexagons[i];
        for (var k = 0; k < hex.classList.length; k++) {
            if (hex.classList[k] == 'hex') continue;
            hex.setAttribute('data-hex-name', hex.classList[k]);
            break;
        }

        hex.addEventListener('mouseleave', clearMatch);

        if (hex.classList[k] == 'Max') {
            hex.addEventListener('mouseenter', onMaxEnter);
            continue;
        }
        else {
            hex.addEventListener('mouseenter', onModEnter);
        }

        var isMax = listConstructMax.indexOf(hex.classList[k])
        if (hex.classList.contains('rc')) {
            hex.addEventListener('click', onHexRcPlus);
            hex.parentElement.insertAdjacentHTML('beforeend', '<div class="rcNum"></div>');
        }
        else if (isMax != -1) {
            hex.addEventListener('click', onMaxToggle);
        }
        else {
            hex.addEventListener('click', onHexToggle);
        }
    }

    if (location.search.charAt(0) == '?') {
        var args = location.search.substring(1).split('&');
        for (var i = 0; i < args.length; i++) {
            var pair = args[i],
                key,
                val;
            var sep = pair.indexOf('=');
            var isRecursive = false;
            if (sep >= 0) {
                key = pair.substr(0, sep);
                val = pair.substr(sep + 1);
            } else {
                key = pair;
                val = '';
            }
            if (key == 'mods') {
                var modArr = val.split('+');
                for (var i = 0; i < modArr.length; i++)
                    try {
                        var mod = modArr[i].split('_');
                        var els = document.querySelectorAll('.hex.' + (modLongen[mod[0]] || mod[0]));
                        if (els.length == 0) continue;
                        for (var k = 0; k < els.length; k++) {
                            els[k].setAttribute('checked', '');
                            if (els[k].classList.contains('rc')) {
                                isRecursive = true;
                                if (parseInt(mod[1]) >= 10) {
                                    els[k].nextElementSibling.textContent = '9+';
                                } else if (10 > parseInt(mod[1]) && parseInt(mod[1]) > 0) {
                                    els[k].nextElementSibling.textContent = parseInt(mod[1]);
                                } else {
                                    els[k].nextElementSibling.textContent = '↻';
                                }
                            }
                        }
                        if (mod.length == 1 || parseInt(mod[1]) <= 0 || !isRecursive) mod[1] = '1';
                        if (parseInt(mod[1]) >= 10) mod[1] = 10;
                        if (mod[0] != 'CMX') hexCheckCount = hexCheckCount + parseInt(mod[1]);
                    } catch (e) {
                        console.log(e);
                    }
                hexCheckCountSpan.innerHTML = '' + hexCheckCount;
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
        ].join('\n');
    }
    var hextags = document.getElementsByClassName('hextag');
    for (var i = 0; i < hextags.length; i++) {
        var tag = hextags[i];
        tag.addEventListener('mouseenter', onTagEnter);
        tag.addEventListener('mouseleave', clearMatch);
    }

    var hexFilterValue = null;
    hexFilterUpdate = function (force) {
        var val = hexFilter.value;
        if (!force && val == hexFilterValue) return;
        hexFilterValue = val;

        var words = val.split(' ');
        var wordsOr = [];
        var wordsAnd = [];
        var wordsNot = [];
        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            if (!word) continue;
            word = word.toLowerCase();
            if (word.charAt(0) == '-') {
                wordsNot.push(word.substr(1));
            } else if (word.charAt(0) == '+') {
                wordsAnd.push(word.substr(1));
            } else {
                var wordParts = word.split('+');
                wordsOr.push(wordParts[0]);
                for (var k = 1; k < wordParts.length; k++) {
                    wordsAnd.push(wordParts[k]);
                }
            }
        }
        var cssLines = ['.hex ' + cssInactive];
        for (var i = 0; i < wordsOr.length; i++) {
            var cssLine = '.hex[data-hex-text*="' + wordsOr[i] + '"]';
            for (var k = 0; k < wordsAnd.length; k++) {
                cssLine += '[data-hex-text*="' + wordsAnd[k] + '"]';
            }
            for (var k = 0; k < wordsNot.length; k++) {
                cssLine += ':not([data-hex-text*="' + wordsNot[k] + '"])';
            }
            cssLine += cssActive;
            cssLines.push(cssLine);
        }
        style.innerHTML = cssLines.join('\n');
    };
    hexFilter.addEventListener('focus', hexFilterUpdate);
    hexFilter.addEventListener('keydown', hexFilterUpdate);
    hexFilter.addEventListener('keyup', hexFilterUpdate);
    hexFilter.addEventListener('blur', function () {
        style.innerHTML = '';
        hexFilterValue = null;
    });
})();
