var app = $(function($) {

    var map;
    var infowindow;
    var g_places = [];
    var markers = [];

    $.fn.init_event = function() {
        //map & event init

        var location = new google.maps.LatLng(35.684, 139.760); // tokyo station
        map = new google.maps.Map(document.getElementById('map'), {
            center: location,
            zoom: 15
        });

        google.maps.event.addDomListener(window, "resize", function() {
            if (map !== null && map !== undefined) {
                var center = map.getCenter();
                google.maps.event.trigger(map, "resize");
                map.setCenter(center);
            }
        });

        google.maps.event.addListener(map, 'tilesloaded', function() {
            // 起動時の初回のみ発動
            google.maps.event.clearListeners(map, 'tilesloaded');
            // console.log('tilesloaded');
            map_loaded();
        });

        infowindow = new google.maps.InfoWindow();

        $('#center_position').on('click', function() {
            //console.log('#map_center');
            if (map !== null) {
                loadMap(map.getCenter());
            }
        });
        $('#current_position').on('click', function() {
            //console.log('current_position');
            if (map !== null) {
                currentPosition();
            }
        });
        $('#clear_history').on('click', function() {
            clear_history();
        });
        $('#search').on('submit', function() {
            var q = $('#search_text').val();
            console.log('search test : ' + q);
            if (q === null || q === undefined || q === '') {
                // console.log('no word');
                return;
            }

            $('#loading_view').attr('style', 'display:block;');

            var service = new google.maps.places.PlacesService(map);
            var center = map.getCenter();
            var request = {
                query: q,
                location: center,
                radius: String(get_range()),
                types: ['restaurant', 'food', 'cafe', 'meal_delivery', 'meal_takeaway'],
                rankby: google.maps.places.RankBy.DISTANCE
            };
            service.textSearch(request, callback);

            if (window.innerWidth < 768) {
                $('.navbar-toggle').click(); //bootstrap 3.x by Richard
            }

        });

        $('.nav a').on('click', function() {
            if (window.innerWidth < 768) {
                $('.navbar-toggle').click(); //bootstrap 3.x by Richard
            }
        });

    }

    function map_loaded() {
        currentPosition();
        createHistoryList();
    }

    function search_range(_search_range) {
        set_range(_search_range);
        if (map !== null) {
            loadMap(map.getCenter());
        }
    }

    function currentPosition() {
        if (navigator.geolocation) {
            var options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            navigator.geolocation.getCurrentPosition(function(position) {
                var location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                loadMap(location);
            }, function(error) {
                console.log(error.message);
                loadMap();
            }, options);
        } else {
            loadMap();
        }
    }

    function loadMap(location) {

        // console.log(location);
        if (location === null || location === undefined) {
            location = new google.maps.LatLng(35.684, 139.760); // tokyo station
        }

        map.setCenter(location);

        $('#search_range').html(get_range() + ' m');

        $('#loading_view').attr('style', 'display:block;');
        var service = new google.maps.places.PlacesService(map);
        var request = {
            location: location,
            radius: get_range(),
            types: ['restaurant', 'food', 'cafe', 'meal_delivery', 'meal_takeaway'],
            rankby: google.maps.places.RankBy.DISTANCE
        };
        service.nearbySearch(request, callback);
    }

    function callback(results, status) {
        // clear message
        $('#message').attr('style', 'display:none;');

        $('#loading_view').attr('style', 'display:none;');

        var places = [];
        var from = map.getCenter();
        var range = get_range();
        for (var i = 0; i < results.length; i++) {
            var to = results[i].geometry.location;
            if (range > distance(from, to)) {
                places.push(results[i]);
            }
            //console.log(distance(from, to));
        }

        if (places.length === 0) {
            $('#message').attr('style', 'display:block;');

            window.location.hash = "";
            window.location.hash = "title_places";

            return;
        }

        if (status === google.maps.places.PlacesServiceStatus.OK) {

            g_places = places; //一時保存

            createPlaceList(places);
            createMarkers(places);

            window.location.hash = "";
            window.location.hash = "title_places";
        }
    }

    function distance(from, to) {
        return google.maps.geometry.spherical.computeDistanceBetween(from, to);
    }

    function createMarkers(places) {
        for (var p in markers) {
            var m = markers[p];
            m.setMap(null);
        }
        markers = [];

        for (var i = 0; i < places.length; i++) {
            var poi = places[i];
            createMarker(poi, (i + 1));
        }

        bounds_map();
    }

    function bounds_map() {
        var bounds = new google.maps.LatLngBounds();
        for (var p in markers) {
            var m = markers[p];
            bounds.extend(m.getPosition());
        }
        map.fitBounds(bounds);
    }

    function createHistoryList() {
        var history = get_history().reverse();

        var tbl = $('#history tbody');
        $('#history tbody tr').remove();
        for (var i = 0; i < history.length; i++) {
            if (i > 100 - 1) {
                break;
            }
            var poi = history[i];
            var tr = $('<tr></tr>');
            tr.append($('<td></td>').append(num(i + 1)));
            tr.append($('<td></td>').append(visit_date(poi)));
            tr.append($('<td></td>').append(place_info(poi)).append(" ").append(name(poi)));

            tbl.append(tr);

        }

    }

    function createPlaceList(places) {

        var from = map.getCenter();

        var tbl = $('#places');
        tbl.html('');
        var col_size = 3;
        var rows = Math.floor(places.length / col_size) + 1;
        var i = 0;
        var max = places.length;
        for (var r = 0; r < rows; r++) {
            var row = $('<div class="row"></div>');
            for (var c = 0; c < col_size; c++) {
                console.log(places.length + "\t" + i + "\t" + (i < max));
                if (i < max) {
                    var poi = places[i];
                    var to = places[i].geometry.location;

                    var recent_poi = get_recent(poi);
                    var visit = (recent_poi === null) ? 'panel-primary' : 'panel-success';

                    var p = $('<div></div>', { addClass: 'panel ' + visit });
                    var h = $('<div class="panel-heading"></div>');
                    var b = $('<div class="panel-body"></div>');
                    var f = $('<div class="panel-footer"></div>');

                    h.append(num(i + 1));
                    h.append(recent_visit(poi));
                    h.append(name(poi));

                    b.append(open_now(poi));
                    b.append(rating(poi));
                    b.append(price_level(poi));
                    b.append(poi_img(poi, i));

                    f.append(place_info(poi));
                    f.append(vicinity(poi));
                    f.append($('<span>(' + Math.round(distance(from, to)) + ' m)</span>'));

                    p.append(h).append(b).append(f);

                    row.append($('<div class="col-sm-4"></div>').append(p));
                }
                i++;
            }
            var container = $('<div class="container"></div>');
            container.append(row);
            tbl.append(container);
        }

    }

    function createPlaceList2(places) {

        var from = map.getCenter();

        var tbl = $('#places tbody');
        //    $('#places').$("tbody").html('');
        $('#places tbody tr').remove();
        for (var i = 0; i < places.length; i++) {
            var poi = places[i];
            var to = places[i].geometry.location;
            //console.log(poi);
            var td = $('<td></td>');
            td.append(num(i + 1));
            td.append(recent_visit(poi));
            td.append(place_info(poi));
            td.append(open_now(poi));
            td.append(name(poi));
            td.append($('<span>(' + Math.round(distance(from, to)) + ' m)</span>'));
            td.append(rating(poi));
            td.append(price_level(poi));
            td.append(vicinity(poi));
            td.append(poi_img(poi, i));

            var tr = $('<tr></tr>');
            tr.append(td);

            tbl.append(tr);
        }

    }

    function num(n) {
        return $('<div class="poi_number">' + n + '</div>');
    }

    function open_now(poi) {
        if (poi.hasOwnProperty("opening_hours") && poi.opening_hours !== undefined) {
            if (poi.opening_hours.open_now) {
                return $('<div class="poi_open_now" title="open now"></div>');
            }
        }
        return $('');
    }

    function recent_visit(poi) {

        var recent_poi = get_recent(poi);
        var label = (recent_poi === null) ? 'Visit' : 'Visited';
        var btn_style = (recent_poi === null) ? 'btn-primary' : 'btn-success';
        var visit = $('<a></a>', {
            addClass: 'btn btn-xs ' + btn_style,
            text: label,
            on: {
                click: function(event) {
                    set_history(poi);
                    createPlaceList(g_places);
                    createMarkers(g_places);
                }
            }
        });

        var recent = $('<div></div>', {
            addClass: 'poi_recent',
        });
        var vdate = (recent === null) ? '' : visit_date(recent_poi);
        recent.append(vdate);
        recent.append(visit);
        return recent;
    }

    function visit_date(poi) {
        if (poi !== null && poi.hasOwnProperty("visit_date") && poi.visit_date !== undefined) {
            var d = new Date(poi.visit_date);
            return $('<div class="poi_visit_date">' + d.toLocaleDateString() + '</div>');
        }
        return $('');
    }

    function place_info(poi) {
        var info = $('<a></a>', {
            addClass: 'btn btn-default btn-xs',
            css: 'display:inline-block;',
            text: 'Map',
            on: {
                click: function(event) {

                    var request = {
                        placeId: poi.place_id
                    };

                    service = new google.maps.places.PlacesService(map);
                    service.getDetails(request, callback);
                    var place_info_win = window.open('about:blank');

                    function callback(place, status) {
                        if (status == google.maps.places.PlacesServiceStatus.OK) {
                            //console.log(place.url);
                            place_info_win.location.href = place.url;
                            place_info_win = null;
                        }
                    }

                }
            }
        });
        var place_info = $('<div class="poi_place_info"></div>').append(info);
        return place_info;
    }

    function name(poi) {
        return $('<div class="poi_name">' + poi.name + '</div>');
    }

    function rating(poi) {
        if (poi.hasOwnProperty("rating") && poi.rating !== undefined) {
            return $('<div class="poi_rating">' + poi.rating + '</div>');
        } else {
            return $('');
        }
    }

    function price_level(poi) {
        if (poi.hasOwnProperty("price_level") && poi.price_level !== undefined) {
            return $('<div class="poi_price_level">' + poi.price_level + '</div>');
        } else {
            return $('');
        }
    }

    function vicinity(poi) {
        if (poi.hasOwnProperty("vicinity") && poi.price_level !== undefined) {
            return $('<div class="poi_vicinity">' + poi.vicinity + '</div>');
        } else {
            return $('');
        }
    }

    function poi_img(poi, idx) {

        if (poi.hasOwnProperty("photos")) {
            for (var p = 0; p < poi.photos.length; p++) {
                var photo = poi.photos[p];
                var img = $('<img></img>', {
                    addClass: 'img-thumbnail poi_img',
                    src: photo.getUrl({ 'maxWidth': 240, 'maxHeight': 240 })
                });
                return img;
            }
        }
        return $('');
    }

    function btn_prev(id) {
        var b = $('<a class="left carousel-control" href="#' + id + '" role="button" data-slide="prev"><span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span><span class="sr-only">Previous</span></a>');
        return b;
    }

    function btn_next(id) {
        var b = $('<a class="right carousel-control" href="#' + id + '" role="button" data-slide="next"><span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span><span class="sr-only">Next</span></a>');
        return b;
    }


    function poi_img2(poi, idx) {
        if (poi.hasOwnProperty("photos")) {
            var ul = $('<div class="main-carousel"></div>');
            ul.append('<div class="main-carousel" data-flickity=\' { "cellAlign": "left", "contain": true }\'></div>');
            for (var p = 0; p < poi.photos.length; p++) {
                var photo = poi.photos[p];
                var img = $('<img></img>', {
                    //        addClass: 'poi_img',
                    src: photo.getUrl({ 'maxWidth': 240, 'maxHeight': 240 })
                });
                ul.append($('<div class="carousel-cell"></div>').append(img));
            }
            ul.append($('<div class="carousel-cell"></div>').append('<img src="https://lh4.googleusercontent.com/-Y0KWkZ2XCMo/VqBVJuCyhZI/AAAAAAAAABk/zvp3dJ-8_qo2CiHD0JEtQAenCRqG9KZbQCJkC/w240-h240-k/">'));
            return ul;
        }
        return $('');
    }

    function get_history() {
        var history = JSON.parse(window.localStorage.getItem('history'));
        if (history === null || history === undefined) {
            history = [];
        }
        //console.log(history);
        return history;
    }

    function set_history(poi) {
        set_recent(poi);
        var history = get_history();
        var key = poi.place_id;
        poi.visit_date = new Date();
        history.push(poi);
        window.localStorage.setItem('history', JSON.stringify(history));
        createHistoryList();
    }

    function clear_history() {
        window.localStorage.removeItem('history');
        window.localStorage.removeItem('recent');
        createHistoryList();
        createPlaceList(g_places);
    }

    function get_recent(poi) {
        var recent = JSON.parse(window.localStorage.getItem('recent'));
        if (recent === null || recent === undefined) {
            recent = {};
        }
        //console.log(recent);

        if (recent.hasOwnProperty(poi.place_id)) {
            return recent[poi.place_id];
        } else {
            return null;
        }
    }

    function set_recent(poi) {
        var recent = JSON.parse(window.localStorage.getItem('recent'));
        if (recent === null || recent === undefined) {
            recent = {};
        }
        var key = poi.place_id;
        poi.visit_date = new Date();
        recent[key] = poi;
        window.localStorage.setItem('recent', JSON.stringify(recent));
    }

    function get_option() {
        var option = JSON.parse(window.localStorage.getItem('option'));
        // console.log(option);
        if (option === null || option === undefined) {
            option = {};
        }
        return option;
    }

    function get_range() {
        var option = get_option();
        if (option.hasOwnProperty('range')) {
            return option.range;
        } else {
            return 400;
        }
    }

    function set_range(range) {
        var option = get_option();
        option.range = range;
        window.localStorage.setItem('option', JSON.stringify(option));
    }


    function createMarker(place, label) {

        var visited = (get_recent(place) !== null);
        var icon_type = icon(label, visited);
        var placeLoc = place.geometry.location;
        var marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location,
            icon: icon_type
        });

        markers.push(marker);

        google.maps.event.addListener(marker, 'click', function() {
            infowindow.setContent(place.name);
            infowindow.open(map, this);
        });

        function icon(label, visited) {
            var color = visited ? '19B902' : '167CF4';
            var url = 'https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + label + '|' + color + '|FFFFFF';
            return new google.maps.MarkerImage(url);
        }

    }

});

function init_event() {
    console.log('callback from google map api');
    app.init_event();
}