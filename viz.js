var full_width=980
var full_height=615

var width = Math.round(full_width*0.65);
var height = Math.round(full_height*0.80);
var spider_wid = Math.round(full_width*0.2);
var spider_ht = Math.round(full_height*0.3);
var pad = Math.round(full_width/90);

var headline = "Year: ";
var init_year = 1923
var legendOptions
var colorscale
var size
var projection
var pins;
var arcs;
var div;
var vis;
var gauge;

function addElements() {
    vis = d3.select("svg")
        .attr("width", width).attr("height", height)
        .call(d3.behavior.zoom().on("zoom", function () {
            vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
        }))
        .append("g")
    d3.select("#maintable").style("border-spacing",pad + "px");
    d3.select("#yearrange").insert("h2").text("Operations");
    d3.select("#yearrange").insert("p").attr("class", "yearinput").text(headline + init_year);
    d3.select("#yearrange").insert("p").append("input")
        .attr("type", "range")
        .attr("min", init_year)
        .attr("max", "2009")
        .attr("value", init_year)
        .attr("id", "year");

    d3.select("#surv").insert("h2").text("Average survivability(%)");
    d3.select("#chart-radar").insert("h2").text("Spider chart of reasons for crash");
    d3.select("#map").attr("width", "200px").attr("height", height);
    d3.select("#map").insert("h2").text("Crash sites and routes");
    d3.select("#map").insert("p").attr("id","instr").text("Broken plane icon on map signifies location of the crash. Hover on top of the crash site to get more information on the crash. Use the Operations pane on the right to change the year or to filter the crashes based on the reasons for the crash.");
}

function plotMap(json) {
    // create a first guess for the projection
    var center = d3.geo.centroid(json)
    var scale = 150;
    var offset = [width / 2, height / 2];
    projection = d3.geo.mercator().scale(scale).center(center)
        .translate(offset);

    // create the path
    var path = d3.geo.path().projection(projection);

    // using the path determine the bounds of the current map and use 
    // these to determine better values for the scale and translation
    var bounds = path.bounds(json);
    var hscale = scale * width / (bounds[1][0] - bounds[0][0]);
    var vscale = scale * height / (bounds[1][1] - bounds[0][1]);
    var scale = (hscale < vscale) ? hscale : vscale;
    var offset = [width - (bounds[0][0] + bounds[1][0]) / 2,
                      height - (bounds[0][1] + bounds[1][1]) / 2];

    // new projection
    projection = d3.geo.mercator().center(center)
        .scale(scale).translate(offset);
    path = path.projection(projection);


    vis.selectAll("path").data(json.features).enter().append("path")
        .attr("d", path)
        .style("fill", "BlanchedAlmond")
        .style("stroke-width", "1")
        .style("stroke", "black")
}

function spider(pilotCount, sabotageCount, unknownCount, terrainCount, weatherCount, humanCount, mechanicalCount) {


    colorscale = d3.scale.category10();
    legendOptions = ['Crash reasons'];
    size = 1;

    if (size > 0) {
        json = [
            [{
                "axis": "Pilot Error",
                "value": pilotCount
            }, {
                "axis": "Sabotage",
                "value": sabotageCount
            }, {
                "axis": "Unknown",
                "value": unknownCount
            }, {
                "axis": "Terrain",
                "value": terrainCount
            }, {
                "axis": "Weather",
                "value": weatherCount
            }, {
                "axis": "Human Error",
                "value": humanCount
            }, {
                "axis": "Mechanical Error",
                "value": mechanicalCount
            }]
        ];
    }

    drawRadarChart('#chart-radar', spider_wid, spider_wid);
}

function plotFlightPaths(d, bend) {
    // If no bend is supplied, then do the plain square root
    bend = bend || 1;
    // `d[sourceName]` and `d[targetname]` are arrays of `[lng, lat]`
    // Note, people often put these in lat then lng, but mathematically we want x then y which is `lng,lat`

    var sourceLngLat = [d.src_lon, d.src_lat],
        targetLngLat = [d.dest_lon, d.dest_lat];

    if (targetLngLat && sourceLngLat) {
        var sourceXY = projection(sourceLngLat),
            targetXY = projection(targetLngLat);

        var sourceX = sourceXY[0],
            sourceY = sourceXY[1];

        var targetX = targetXY[0],
            targetY = targetXY[1];

        var dx = targetX - sourceX,
            dy = targetY - sourceY,
            dr = Math.sqrt(dx * dx + dy * dy) * bend;

        // To avoid a whirlpool effect, make the bend direction consistent regardless of whether the source is east or west of the target
        var west_of_source = (targetX - sourceX) < 0;
        if (west_of_source) return "M" + targetX + "," + targetY + "A" + dr + "," + dr + " 0 0,1 " + sourceX + "," + sourceY;
        return "M" + sourceX + "," + sourceY + "A" + dr + "," + dr + " 0 0,1 " + targetX + "," + targetY;

    } else {
        return "M0,0,l0,0z";
    }
}

function filterData(d) {
    if (new Date(d.Date).getFullYear() != d3.select("#year").node().value) {
        return false;
    }
    if (d3.select("#pilot").property("checked") && !!parseInt(d.pilot)) {
        return true;
    }
    if (d3.select("#human").property("checked") && !!parseInt(d.human)) {
        return true;
    }
    if (d3.select("#mechanical").property("checked") && !!parseInt(d.mechanical)) {
        return true;
    }
    if (d3.select("#unknown").property("checked") && !!parseInt(d.unknown)) {
        return true;
    }
    if (d3.select("#sabotage").property("checked") && !!parseInt(d.sabotage)) {
        return true;
    }
    if (d3.select("#terrain").property("checked") && !!parseInt(d.terrain)) {
        return true;
    }
    if (d3.select("#weather").property("checked") && !!parseInt(d.weather)) {
        return true;
    }
    return false;
}

function update(filteredData) {
    pins = vis.selectAll(".pin").data(filteredData);
    pins.enter().append("svg:image")
        .attr("xlink:href", "plane.png")
        .attr('width', Math.round(full_width/50))
        .attr('height', Math.round(full_height/20))
        .attr("transform", function (d) {
            return "translate(" + projection([d.Longitude, d.Latitude]) + ")";
        })
        .on("mouseover", function (d) {
            // Define the div for the tooltip
            div = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);
            div.transition()
                .duration(200)
                .style("opacity", .9);
            div.html(d.Route + "<br/>" + d.Date + "<br/>" + d.Operator + "<br/>On board:" + d.Aboard + "<br/>Fatalities:" + d.Fatalities)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            pins.attr("opacity", 0)
            arcs.attr("opacity", 0)
            d3.select(".i" + d.id).attr("opacity", 1.0);
            d3.select(this).attr("opacity", 1);
        })
        .on("mouseout", function (d) {
            div.remove()
            pins.attr("opacity", 1)
            arcs.attr("opacity", 1)
        });

    arcs = vis.append("g").attr("class", "arcs").selectAll("path").data(filteredData);

    arcs.enter()
        .append("path")
        .attr('d', function (d) {
            return plotFlightPaths(d, 1); // A bend of 5 looks nice and subtle, but this will depend on the length of your arcs and the visual look your visualization requires. Higher number equals less bend.
        })
        .attr("class", function (d) {
            return "i" + d.id
        });

    var unknownCount = 0;
    var humanCount = 0;
    var mechanicalCount = 0;
    var sabotageCount = 0;
    var pilotCount = 0;
    var terrainCount = 0;
    var weatherCount = 0;

    var num_onboard = 0;
    var num_survivors = 0;

    filteredData.forEach(function (d) {
        if (d3.select("#unknown").property("checked") && !!parseInt(d.unknown)) {
            unknownCount = unknownCount + 1;
        }
        if (d3.select("#human").property("checked") && !!parseInt(d.human)) {
            humanCount = humanCount + 1;
        }
        if (d3.select("#mechanical").property("checked") && !!parseInt(d.mechanical)) {
            mechanicalCount = mechanicalCount + 1;
        }
        if (d3.select("#sabotage").property("checked") && !!parseInt(d.sabotage)) {
            sabotageCount = sabotageCount + 1;
        }
        if (d3.select("#pilot").property("checked") && !!parseInt(d.pilot)) {
            pilotCount = pilotCount + 1;
        }
        if (d3.select("#terrain").property("checked") && !!parseInt(d.terrain)) {
            terrainCount = terrainCount + 1;
        }
        if (d3.select("#weather").property("checked") && !!parseInt(d.weather)) {
            weatherCount = weatherCount + 1;
        }
        num_onboard = num_onboard + (parseInt(d.Aboard) || 0)
        num_survivors = num_survivors + num_onboard - (parseInt(d.Fatalities) || 0);

    });
    gauge.update(Math.round(num_survivors / num_onboard));

    spider(pilotCount, sabotageCount, unknownCount, terrainCount, weatherCount, humanCount, mechanicalCount);
}

function plotData() {
    d3.csv("data_viz.csv", function (data) {
        if (pins != null) {
            pins.remove();
        }
        if (arcs != null) {
            arcs.remove();
        }
        return update(data.filter(filterData));
    });
}

function addListeners() {
    d3.select("#year").on("input",
        function () {
            d3.select(".yearinput").text(headline + d3.select("#year").node().value);
            return plotData();
        }
    );

    d3.selectAll(".chk").on("change", function () {
        return plotData();
    });
}

function configureLiquidFillGauge(level) {
    var config = liquidFillGaugeDefaultSettings();
    config.circleThickness = 0.4;
    config.circleColor = "#6DA398";
    config.textColor = "#0E5144";
    config.waveTextColor = "#6DA398";
    config.waveColor = "#246D5F";
    config.textVertPosition = 0.52;
    config.waveAnimateTime = 5000;
    config.waveHeight = 0;
    config.waveAnimate = false;
    config.waveCount = 2;
    config.waveOffset = 0;
    config.textSize = 1.2;
    config.minValue = 0;
    config.maxValue = 100
    config.displayPercent = false;
    gauge = loadLiquidFillGauge("fillgauge", level, config);
}

d3.json("custom.geo.json", function (json) {
    configureLiquidFillGauge(0);
    addElements();
    plotMap(json);
    plotData();
    addListeners();
});
