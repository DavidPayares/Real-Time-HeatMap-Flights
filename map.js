(function () {

    L.Control.MagnifyingGlass = L.Control.extend({

        _magnifyingGlass: false,

        options: {
            position: 'topleft',
            title: 'Toggle Magnifying Glass',
            forceSeparateButton: false
        },

        initialize: function (magnifyingGlass, options) {
            this._magnifyingGlass = magnifyingGlass;
            // Override default options
            for (var i in options)
                if (options.hasOwnProperty(i) && this.options.hasOwnProperty(i)) this.options[i] = options[i];
        },

        onAdd: function (map) {
            var className = 'leaflet-control-magnifying-glass',
                container;

            if (map.zoomControl && !this.options.forceSeparateButton) {
                container = map.zoomControl._container;
            } else {
                container = L.DomUtil.create('div', 'leaflet-bar');
            }

            this._createButton(this.options.title, className, container, this._clicked, map, this._magnifyingGlass);
            return container;
        },

        _createButton: function (title, className, container, method, map, magnifyingGlass) {
            var link = L.DomUtil.create('a', className, container);
            link.href = '#';
            link.title = title;

            L.DomEvent
                .addListener(link, 'click', L.DomEvent.stopPropagation)
                .addListener(link, 'click', L.DomEvent.preventDefault)
                .addListener(link, 'click', function () {
                    method(map, magnifyingGlass);
                }, map);

            return link;
        },

        _clicked: function (map, magnifyingGlass) {
            if (!magnifyingGlass) {
                return;
            }

            if (map.hasLayer(magnifyingGlass)) {
                map.removeLayer(magnifyingGlass);
            } else {
                magnifyingGlass.addTo(map);
            }
        }
    });

    L.control.magnifyingglass = function (magnifyingGlass, options) {
        return new L.Control.MagnifyingGlass(magnifyingGlass, options);
    };

})();


function init() {
    //Adding the map
    let map = L.map('map').setView([30, 25], 2),
        realtime = L.realtime(getCustomData, {
            interval: 5 * 1000
        });

    var basemaps = [
        L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=2f9ce19135c54c998af40f6324c17769', {
            attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            apikey: '2f9ce19135c54c998af40f6324c17769',
            maxZoom: 22
        }),
        L.tileLayer('https://{s}.tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=2f9ce19135c54c998af40f6324c17769', {
            attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            apikey: '2f9ce19135c54c998af40f6324c17769',
            maxZoom: 22
        }),
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
        }),
        L.tileLayer("//stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.png", {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            subdomains: "abcd",
            maxZoom: 20,
            minZoom: 0,
            label: "Toner"
        })
    ];

    map.addControl(L.control.basemaps({
        basemaps: basemaps,
        tileX: 0, // tile X coordinate
        tileY: 0, // tile Y coordinate
        tileZ: 1 // tile zoom level
    }));

    let cfg = {
        "radius": 2,
        "maxOpacity": .8,
        "scaleRadius": true,
        "useLocalExtrema": true,
        latField: 'lat',
        lngField: 'lng',
        valueField: 'count'
    };

    let heatmapLayer = new HeatmapOverlay(cfg);

    realtime.on('update', function (e) {

        let flightsData = {
            max: 8,
            data: []
        }

        function heatMap(Id) {
            let feature = e.features[Id];
            flightsData.data.push({
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0],
                count: 1
            })
        }

        Object.keys(e.enter).forEach(heatMap);
        Object.keys(e.update).forEach(heatMap);

        heatmapLayer.setData(flightsData);
        heatmapLayer.addTo(map);


    });


    //Data for real time
    function getCustomData(success, error) {
        console.log("realtime started")
        let url = `https://opensky-network.org/api/states/all`; //url of service
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onload = function () {
            if (xhr.status === 200) {
                var res = convertToGeoJSON(xhr.responseText);
                console.log("got geojson data");
                console.log(res);
                success(res);
            } else {
                var e = new Error("HTTP Rquest")
                error(e, xhr.status);
            }
        };
        xhr.send();

        function convertToGeoJSON(input) {
            //convert input to Object, if it is of type string
            if (typeof (input) == "string") {
                input = JSON.parse(input);
            }

            var fs = {
                "type": "FeatureCollection",
                "features": []
            };
            for (var i = 0; i < input.states.length; i++) {
                var ele = input.states[i];
                var feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [ele[5], ele[6]]
                    }
                };
                feature.properties = ele;
                //set the id
                feature.properties["id"] = i;

                //check that the elements are numeric and only then insert
                if (isNumeric(ele[5]) && isNumeric(ele[6])) {
                    //add this feature to the features array
                    fs.features.push(feature)
                }
            }
            //return the GeoJSON FeatureCollection
            return fs;
        }

        function isNumeric(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }

    }

}


window.onload = init;