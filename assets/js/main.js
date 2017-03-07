(function () {
    var seedElement = document.getElementById('logotype-seed'),
        seed = seedElement ? seedElement.innerHTML : 'Makerspace.lt',
        hue,
        mainColour,
        logotype,
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
            insertRule(sheet, "#page-wrapper", "border-color: hsla(" + hue + ", 30%, 80%, 1);", 1);
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
    var coordinates = new google.maps.LatLng(54.89698, 23.955222),
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
