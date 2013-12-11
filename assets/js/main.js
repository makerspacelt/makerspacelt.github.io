(function () {
    var seedElement = document.getElementById('logotype-seed'),
        seed = seedElement ? seedElement.innerHTML : 'Makerspace.lt',
        hue,
        mainColour,
        logotype,
        illustrations = {
            heatedMouse: undefined
        },
        initRubikus = function () {
            logotype = new Rubikus({
                canvas: document.getElementById('logotype'),
                hash: CryptoJS.SHA256(seed.toLowerCase()).toString()
            });

            var sheet = getMainStylesheet();

            hue = logotype.getHue();
            mainColour = "hsla(" + hue + ", 75%, 30%, 1)";

            insertRule(sheet, ".primary-color, .nav a, .control", "color:" + mainColour + ";", 1);
            insertRule(sheet, "html", "background-color: hsla(" + hue + ", 75%, 97%, 1) !important;", 1);

            initSmouldering();
        },

        getMainStylesheet = function () {
            for (var i = document.styleSheets.length - 1; i >= 0; i = i - 1) {
                var sheet = document.styleSheets[i];

                if (sheet.title == "main-stylesheet") {
                    return sheet;
                }
            }
        },

        insertRule = function (sheet, selector, rule, index) {
            if (sheet.insertRule) {
                sheet.insertRule(selector + "{" + rule + "}", index);
            } else {
                sheet.addRule(selector, rule, index);
            }
        },

        initSmouldering = function () {
            if ( Smouldering ) {
                illustrations.heatedMouse = new Smouldering({
                    container: document.getElementById('illustration--heated-mouse'),
                    colours: [
                        'hsla(' + hue +',80%,50%, .8)',
                        'hsla(' + (+hue + 20) +',80%,50%, .8)',
                        'hsla(' + (+hue - 20) +',80%,50%, .8)',
                    ]
                });

                document.getElementById('container').className = 'heated-mouse-workshop';
            }
        };

    try {
        Typekit.load({
            active: function () {
                initRubikus();
            }
        });
    } catch(e) {};
})();

function initializeGoogleMap () {
    var coordinates = new google.maps.LatLng(54.902536, 23.968917),
        mapOptions = {
            zoom: 15,
            center: coordinates,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            scrollwheel: false
        },
        map = new google.maps.Map(document.getElementById("google-map"), mapOptions),
        marker = new google.maps.Marker({
            position: coordinates,
            map: map,
            title: 'Kaunas Makerspace'
        });
}