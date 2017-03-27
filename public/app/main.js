var map;
var infowindow;
var API_KEY = 'AIzaSyCYkwznWr3dQvuDCnyANwYMJfpaZCMa--w';
var g_places = [];

function init() {

    google.maps.event.addDomListener(window, "resize", function() {
        if (map !== null && map !== undefined) {
            var center = map.getCenter();
            google.maps.event.trigger(map, "resize");
            map.setCenter(center);
        }
    });

    currentPosition();
    createHistoryList();

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
    $('#search').on('click', function() {
        var q = $('#search_text').val();
        if (q === null || q === undefined || q === '') {
            // console.log('no word');
            return;
        }
        var service = new google.maps.places.PlacesService(map);
        service.textSearch({
            location: map.getCenter(),
            radius: get_range(),
            types: ['restaurant', 'food', 'cafe', 'meal_delivery', 'meal_takeaway'],
            rankby: google.maps.places.RankBy.DISTANCE,
            query: q
        }, callback);
    });
}

function search_range(_search_range) {
    set_range(_search_range);
    if (map !== null) {
        loadMap(map.getCenter());
    }
}

function currentPosition() {
    var location = {};
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            location.lat = latlng.lat();
            location.lng = latlng.lng();
            //console.log(location);
            loadMap(location);
        }, function(e) {
            console.log(e);
            loadMap();
        });
    } else {
        loadMap();
    }
}

function loadMap(location) {

    // console.log(location);
    if (location === null || location === undefined) {
        location = {};
        // tokyo station
        location.lat = 35.684;
        location.lng = 139.760;
    }

    map = new google.maps.Map(document.getElementById('map'), {
        center: location,
        zoom: 15
    });

    infowindow = new google.maps.InfoWindow();

    $('#search_range').html(get_range() + ' m');

    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
        location: location,
        radius: get_range(),
        types: ['restaurant', 'food', 'cafe', 'meal_delivery', 'meal_takeaway'],
        rankby: google.maps.places.RankBy.DISTANCE
    }, callback);
}

function callback(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {

        createPlaceList(results);

        for (var i = 0; i < results.length; i++) {
            var poi = results[i];
            createMarker(poi, (i + 1));
        }

        window.location.hash = "";
        window.location.hash = "title_places";
    }
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
        tr.append($('<td></td>').append(name(poi)).append(" ").append(place_info(poi)));

        tbl.append(tr);

    }

}

function createPlaceList(places) {
    g_places = places; //一時保存

    var tbl = $('#places tbody');
    //    $('#places').$("tbody").html('');
    $('#places tbody tr').remove();
    for (var i = 0; i < places.length; i++) {
        var poi = places[i];
        //console.log(poi);
        var td = $('<td></td>');
        td.append(num(i + 1));
        td.append(recent_visit(poi));
        td.append(open_now(poi));
        td.append(name(poi));
        td.append(rating(poi));
        td.append(price_level(poi));
        td.append(poi_img(poi, i));
        td.append(vicinity(poi));
        td.append(place_info(poi));

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
        text: 'desciption',
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
    return info;
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
        var carousel_id = 'carousel-img-' + idx;
        var carousel = $('<div id="' + carousel_id + '" class="carousel slide" data-ride="carousel"></div>');
        var inner = $('<div class="carousel-inner" role="listbox"></div>');

        for (var p = 0; p < poi.photos.length; p++) {
            var photo = poi.photos[p];
            var img = $('<img></img>', {
                addClass: 'poi_img',
                src: photo.getUrl({ 'maxWidth': 240, 'maxHeight': 240 })
            });
            var active = (p === 0) ? ' active' : '';
            inner.append($('<div class="item' + active + '"></div>').append(img));
        }
        carousel.append(inner);
        if (poi.photos.length > 1) {
            carousel.append(btn_prev(carousel_id));
            carousel.append(btn_next(carousel_id));
        }
        return carousel;
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
    var placeLoc = place.geometry.location;
    var marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        icon: icon(label)
    });

    google.maps.event.addListener(marker, 'click', function() {
        infowindow.setContent(place.name);
        infowindow.open(map, this);
    });

    function icon(label) {
        var url = 'https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + label + '|FF6666|000000';
        return new google.maps.MarkerImage(url);
    }

}