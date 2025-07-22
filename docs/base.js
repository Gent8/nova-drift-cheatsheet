(function () {
    function NavigatorGetLanguage() {
        var navigator_obj = window.navigator;
        if (navigator_obj.language !== undefined) return navigator_obj.language;
        if (navigator_obj.browserLanguage !== undefined) return navigator_obj.browserLanguage;
        if (navigator_obj.userLanguage !== undefined) return navigator_obj.userLanguage;
        return 'en';
    }

    var language = NavigatorGetLanguage();

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
        css.push('.hex:not(.' + name + ')' + cssInactive);
        css.push('.hex.' + name + cssActive);
        style.innerHTML = css.join('\n');
    }

    var listWeapon = [
        'DefaultWeapon',
        'Split',
        'Railgun',
        'Grenade',
        'Torrent',
        'Pulse',
        'Flak',
        'ThermalLance',
        'Salvo',
        'Vortex',
        'BladeDrone',
        'Dart'
    ]

    var listBody = [
        'DefaultBody',
        'Assault',
        'Stealth',
        'Sentinel',
        'Engineer',
        'Firefly',
        'Carrier',
        'Hullbreaker',
        'Battery',
        'Architect',
        'Research',
        'Viper',
        'Courser',
        'Leviathan'
    ]

    var listShield = [
        'DefaultShield',
        'Halo',
        'Temporal',
        'Reflect',
        'Warp',
        'Shockwave',
        'Amp',
        'Bastion',
        'Helix',
        'Siphon'
    ]

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

    var listDefaultLoadout = [
        'DefaultWeapon',
        'DefaultBody',
        'DefaultShield'
    ]

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
    var modSlPairs = '[[shorten_data]]'.split(';');
    var modPrPairs = '[[prefab_data]]'.split(';');
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
    function onDefaultToggle(e) {
        var hex = e.target;
        var els = document.querySelectorAll('.hex.' + hex.getAttribute('data-hex-name'));
        if (hex.hasAttribute('checked')) {
            for (var i = 0; i < els.length; i++) els[i].removeAttribute('checked');
        } else {
            for (var i = 0; i < els.length; i++) els[i].setAttribute('checked', '');
        }
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
        var isDefault = listDefaultLoadout.indexOf(hex.classList[k])
        if (hex.classList.contains('rc')) {
            hex.addEventListener('click', onHexRcPlus);
            hex.parentElement.insertAdjacentHTML('beforeend', '<div class="rcNum"></div>');
        }
        else if (isMax != -1) {
            hex.addEventListener('click', onMaxToggle);
        }
        else if (isDefault != -1) {
            hex.addEventListener('click', onDefaultToggle)
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
                        if (mod[0] != 'CMX' && mod[0] != 'WP0' && mod[0] != 'BD0' && mod[0] != 'SH0')
                            hexCheckCount = hexCheckCount + parseInt(mod[1]);
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
