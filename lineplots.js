
function readData(){

    // Read the data from the csv file and call the initialize function
    d3.csv("data.csv", d3.autoType).then(data => {
        initialize(data);
    });
}

function populateMetricDropdown(data){
    //Get unique values of the metric column 
    var unique_metrics = [...new Set(data.map(item => item.metric))];

    // Populate the 'metricdd' dropdown with the unique values
    var metricdd = d3.select("#metricdd");
    metricdd.selectAll("option")
        .data(unique_metrics)
        .enter()
        .append("option")
        .text(function(d) { return d; })
        .attr("value", function(d) { return d; });

    d3.select("#metricdd").on("change", function(){
        createLinePlot(data);
    });
}

function populateCheckboxes(data){
    //Get unique player names 
    var unique_players = [...new Set(data.map(item => item.Player_Name))];

    for(var i = 0; i < unique_players.length; i++){
        var checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.name = "player";
        checkbox.value = unique_players[i];
        checkbox.id = unique_players[i];
        if (unique_players[i] == 'Team'){
            checkbox.checked = true;
        }
        checkbox.onchange = function() {
            createLinePlot(data);
        }

        var label = document.createElement('label');
        label.htmlFor = unique_players[i];
        label.appendChild(document.createTextNode(unique_players[i]));

        var br = document.createElement('br');

        document.getElementById('player-checkboxes').appendChild(checkbox);
        document.getElementById('player-checkboxes').appendChild(label);
        document.getElementById('player-checkboxes').appendChild(br);
    }
}

function createLinePlot(data){

    // Remove the previous plot
    d3.select("#lineplot").remove();
    d3.select("#legend").selectAll("*").remove();

    const width = 928;
    const height = 400;
    const marginTop = 40;
    const marginRight = 30;
    const marginBottom = 30;
    const marginLeft = 40;

    // Create the SVG container.
    const svg = d3.create("svg")
        .attr("id", "lineplot")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");


    // Get colors for the players
    var color = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Get the selected players 
    var selected_players = $('input[name="player"]:checked').map(function(){ return this.value; }).get();
    
    // Get the selected metric from dropdown
    var selected_metric = $('#metricdd').val();

    //Filter the data based on the selected players
    var filtered = data.filter(function(d){ return selected_players.includes(d.Player_Name); })

    // Filter the data based on the selected metric
    filtered = filtered.filter(function(d){ return d.metric == selected_metric; });

    console.log(selected_players);

    // Declare the x (horizontal position) and y (vertical position) scales.
    const xscale = d3.scaleUtc(d3.extent(filtered, d => d.sheet_name), [marginLeft, width - marginRight]);
    const yscale = d3.scaleLinear([0, d3.max(filtered, d => d.val)], [height - marginBottom, marginTop]);

    // Add the x-axis.
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(xscale).ticks(width / 80).tickSizeOuter(0));

    // Add the y-axis, remove the domain line, add grid lines and a label.
    svg.append("g")
        .attr("transform", `translate(0, ${marginLeft})`)
        .call(d3.axisLeft(xscale).ticks(height / 40))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1));
        // .call(g => g.append("text")
        //     .attr("x", marginLeft)
        //     .attr("y", -20)
        //     .attr("fill", "black")
        //     .attr("text-anchor", "start")
            // .attr("font-size", "20px")
            // .text(selected_metric));
            

    selected_players.reverse().forEach(function(player, i){
        var playerdata = filtered.filter(function(d){ return d.Player_Name == player; });
        makePlayerLine(svg, playerdata, color(i), xscale, yscale);
    });


    // return svg.node();
    // Add svg to the body
    document.body.appendChild(svg.node());

    makeBarPlot(filtered);

}

function makePlayerLine(svg, playerdata, color, xscale, yscale){

    // Declare the line generator.
    const player_line = d3.line()
        .x(d => xscale(d.sheet_name))
        .y(d => yscale(d.val));

    // Append a path for the line.
    svg.append("path")
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 3)
        .attr("d", player_line(playerdata));


    // Add dots to the line
    svg.selectAll("dot")
        .data(playerdata)
        .enter().append("circle")
        .attr("r", 10)
        .attr("cx", function(d) { return xscale(d.sheet_name); })
        .attr("cy", function(d) { return yscale(parseFloat(d.val)); })
        .attr("fill", color);

    // Add to legend
    d3.select("#legend").append("div")
        .attr("class", "dot")
        .style("background-color", color);

    d3.select("#legend").append("text")
        .text(playerdata[0].Player_Name)
        .style("padding", "5px")
        .style("font-size", "18px");

    d3.select("#legend").append("br")

    // Add the tooltip
    svg.selectAll("dot")
        .data(playerdata)
        .enter().append("text")
        .attr("x", function(d) { return xscale(d.sheet_name); })
        .attr("y", function(d) { return yscale(parseFloat(d.val)); })
        .text(function(d) { return d.val.toFixed(2); })
        .style("font-size", "15px")
        .attr("alignment-baseline","middle");

}

function makeBarPlot(data){


    var aggdata = d3.rollup(data, v => d3.mean(v, d => d.val), d => d.Player_Name);

    newdata = [];
    var keys = Array.from(aggdata.keys());
    for (var i = 0; i < keys.length; i++){
        newdata.push({'name': keys[i], 'sum': aggdata.get(keys[i])});
    }

    console.log(newdata);

    //Sort newdata by sum
    newdata.sort((a, b) => (a.sum > b.sum) ? 1 : -1);

    d3.select("#barplot").remove();

    // Declare the chart dimensions and margins.
    const width = 928;
    const height = 200;
    const marginTop = 40;
    const marginRight = 30;
    const marginBottom = 30;
    const marginLeft = 40;

    // Create the SVG container.
    const svg = d3.create("svg")
        .attr("id", "barplot")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");
        
        //d3.groupSort(data, ([d]) => -d.frequency, (d) => d.letter)) // descending frequency
    // Declare the x (horizontal position) scale.
    const x = d3.scaleBand()
        .domain(newdata.map(d => d.name))
        .range([marginLeft, width - marginRight])
        .padding(0.1);

    // Declare the y (vertical position) scale.
    const y = d3.scaleLinear()
        .domain([0, d3.max(newdata, d => d.sum)]).nice()
        .range([height - marginBottom, marginTop]);

    // Add a rect for each bar.
    svg.append("g")
        .attr("fill", "steelblue")
    .selectAll()
    .data(newdata)
    .join("rect")
        .attr("x", (d) => x(d.name))
        .attr("y", (d) => y(d.sum))
        .attr("height", (d) => y(0) - y(d.sum))
        .attr("width", x.bandwidth());

    // Add the x-axis and label.
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));

    // Add the y-axis and label, and remove the domain line.
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).tickFormat((y) => (y * 100).toFixed()))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text("Average value of metric (%)"));

        // Return the SVG element.
        // return svg.node();
    document.body.appendChild(svg.node());

}

function initialize(data){
    populateMetricDropdown(data);
    populateCheckboxes(data);
    createLinePlot(data);
    makeBarPlot(data);
}

readData();