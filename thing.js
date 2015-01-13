var width = 1200,
height = 600,
radius = 70, //radius of the projection circle
shape_radius = 50, //radius of inner shape
shape_point_radius = 3,
proj_point_radius = 1,
twopi = 2*Math.PI,
num_points = 1000,
shape_points = [],
id_to_shape_point = {},
id_to_proj_point = {},
moved_points = [],
changed_lines = [],
point_color = 'black'
proj_point_color = 'red',
tangent_color = 'blue';

var r = radius;
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function point (x, y, color, size){
    return {'x' : x,
            'y' : y,
            'color' : color || 'black',
            'size' : size || 1};
}
function line(x1, y1, x2, y2, color){
    return {'from' :{'x': x1, 'y': y1},
            'to' :{'x': x2, 'y': y2},
           'color': color};
}

var counter = -1;
function make_id(base, num){
    return (base || "_") + (num || ++counter);
}

function Line_point(x, y, proj_point){
    proj_point = proj_point || false
    this.x = x;
    this.y = y;
    this.color = point_color;
    this.changed = true;
    this.derivative = 0;
    this.id = make_id("point_");
    this.count = counter;
    id_to_shape_point[this.id] = this

    if (! proj_point){
        this.proj_point = new Line_point(0,0, true);
        id_to_proj_point[this.id] = this.proj_point;
    }
    shape_points.push(this);

    this.adjust = function (x,y){
        this.x = this.x + x;
        this.y = this.y + y;
        this.changed = true;
    }

    this.tangent_line = function(){
        var x = this.x;
        var y = this.y;
        var m = this.derivative;
        return function (n){m*(n - x) + y};
    }

    this.line_segment = function(){ //TODO: used anywhere?
        var fn = this.tangent_line();
        var x1 = this.left.x;
        var x2 = this.right.x;
        return line([x1, fn(x1), x2, fn(x2)]);
    }

    this.update_derivative = function(){
        this.derivative = slope(this.left, this.right);
        this.changed = false;
    }
    //c.nth_point(1).projection_point()
    this.projection_point = function(){
        var rl = this.right_line;
        var ll = this.left_line;
        if (! rl){
            //assert not this.right.left_line
            rl = line();
            this.right_line = this.right.left_line = rl;
            rl.id = make_id("proj_");

        }
        
        if (! ll){
            //assert not this.left.right_line
            ll = line();
            this.left_line = this.left.right_line = ll;
            ll.id = make_id("proj_");
        }
        var r = radius;
        var m = this.derivative;
        var x = this.x;
        var y = this.y;
        var b = y - m*x;
        var denom = 2*m*m + 2;
        var t1 = -2*m*b/denom;
        var t2 = Math.sqrt(4*m*m*b*b - 4*(m*m + 1)*(b*b-r*r))/denom;
        var x1 = t1 + t2;
        var x2 = t1 - t2;
        var y1 = m*x1 + b;
        var y2 = m*x2 + b;
        var l1_m = circle_derivative(x1, y1);
        var l2_m = circle_derivative(x2, y2);
        var l1_b = y1 - l1_m*x1;
        var l2_b = y2 - l2_m*x2;
        var p_x = -(l1_b - l2_b)/(l1_m - l2_m);
        var p_y = -(l1_b*l2_m - l2_b*l1_m)/(l1_m - l2_m);

        // this.projected.x = p_x;
        // this.projected.y = p_y;

        //TODO: better way to deal with bad points
        var err = (!p_x || !p_y);
        var x,y,color;
        if (err){
            x = y = 0;
            color = "white";
        }else{
            x = p_x;
            y = p_y;
            color = "gray";            
        }
        var p = point(x, y, proj_point_color);
        p.id = make_id("proj_", this.count);
        p.shape_point = this;
        this.proj_point = p;
        id_to_proj_point[this.id] = p;        
        rl.from.x = ll.to.x = x;
        rl.from.y = ll.to.y = y;
        rl.color = ll.color = color;
        rl.err = ll.err = err;
        changed_lines.push(rl);
        changed_lines.push(ll);
        return p;
    }
}

function Curve(init_points){
    this.num_points = init_points;

    this.init_circle = function(r, x, y){
        x = x || 0;
        y = y || 0;
        var t = 0;
        var step = twopi/this.num_points;
        var first = new Line_point(r*Math.cos(t), r*Math.sin(t));
        var p = first;
        var rt;
        while (t < twopi){
            t+=step;
            rt = new Line_point(r*Math.cos(t), r*Math.sin(t));
            p.right = rt;
            rt.left = p;
            p = p.right;
        }
        p.right = first;
        first.left = p;
        check_for_imag(p);

        this.first_point = first;
        this.init_derivatives();
        check_for_imag(p);
    }

    this.init_derivatives = function(){
        var fp = this.first_point;
        var p = fp;
        p.update_derivative();
        p = p.right;
        while (p != fp){
            p.update_derivative();
            p = p.right;
        }
    }

    this.make_point_list = function(){
        var fp = this.first_point;
        var p = fp;
        var points = [point(p.x, p.y,p.color)]
        p = p.right
        while (p != fp){
            points.push(point(p.x, p.y,p.color))
            p = p.right
        }
        return points
    }

    this.graphics = function(){ //TODO: unused?
        var fp = this.first_point;
        var p = fp;
        var pieces = [point(p.x, p.y,p.color), p.line_segment()];
        p = p.right;
        while (p != fp){
            pieces.push(point(p.x, p.y,p.color));
            pieces.push(p.line_segment()); //TODO: fix
            //         should have lists for projection_points and projection_lines
            p = p.right;
        }
        return pieces;
    }

    this.move = function(point, new_point){
        var decay_factor = function (n) {
            return Math.pow(1.5,(-Math.pow(n,2)/(this.num_points)));
        };

        var diff_x = new_point.x - point.x;
        var diff_y = new_point.y - point.y;
        var s = slope(point, new_point);
        point.adjust(diff_x, diff_y);
        var count = d = 1;
        var lp = rp = point;
        moved_points = [point];
        var disp = diff_x*diff_x + diff_y*diff_y;
        while (disp > 0.0001){
            //say(disp);

            count+=2;
            rp = rp.right;
            lp = lp.left;
            d = decay_factor(count);
            //console.log("decay_factor = ", d);
            d_x = diff_x*d;
            d_y = diff_y*d;
            rp.adjust(d_x, d_y);
            lp.adjust(d_x, d_y);
            rp.color = lp.color = "green";
            disp = d_x*d_x + d_y*d_y;
            moved_points.push(rp);
            moved_points.push(lp);
        }
        this.update_derivatives_from(point);
        //console.log("moved {0} points".format(count))
        //console.log("points moved: ", count);
    }

    this.update_derivatives_from = function(p){
        if (p.changed){
            p.update_derivative();
        }
        start = p;
        var p = p.left;
        while (p.changed){
            p.update_derivative();
            p = p.left;
        }
        p = start.right;
        while (p.changed){
            p.update_derivative();
            p = p.right;
        }
    }

    this.nth_point = function(n){
        if (n > this.num_points){
            n %= this.num_points;
        }
        p = this.first_point;
        while (n > 0){
            p = p.right;
            n -= 1;
        }
        return p
    }

    this.projection_points = function(){
        changed_lines = [];
        var fp = this.first_point;
        var p = fp;
        var error_point = point(0,0,'yellow');
        var error_count = 0;
        var points = [p.projection_point()];
        p = p.right;
        count = 1;
        while (p != fp){
            points.push(p.projection_point());
            if (count < 10){ //????
                count+=1;
            }
            p = p.right;
        }
        return points;
    }

    this.projection_graphics = function(){
        var d=50;
        var r = radius;
        var things = [circle(0,0,r)];
        var first = this.first_point;
        var p = first.right;
        var count = 1;
        while (p != first){
            var fn = p.tangent_line();
            var m = p.derivative;
            var x = p.x;
            var y = p.y;
            var b = y - m*x;
            var denom = 2*m*m + 2;
            var t1 = -2*m*b/denom;
            var t2 = sqrt(4*m*m*b*b - 4*(m*m + 1)*(b*b-r*r))/denom;
            var x1 = t1 + t2;
            var x2 = t1 - t2;
            var y1 = m*x1 + b;
            var y2 = m*x2 + b;
            var l1_m = circle_derivative(x1, y1);
            var l2_m = circle_derivative(x2, y2);
            var l1_b = y1 - l1_m*x1;
            var l2_b = y2 - l2_m*x2;
            var p_x = -(l1_b - l2_b)/(l1_m - l2_m);
            var p_y = -(l1_b*l2_m - l2_b*l1_m)/(l1_m - l2_m);
            if (count < 10){
                count+=1 ///????
            }
            var p3 = point(p_x, p_y,'red',50)
            things.push(p3)
            p = p.right

        }
        return things
    }
}

function slope(p1, p2){
    return ((p2.y - p1.y)/((p2.x - p1.x) || 0.0001));
}

function make_line_fn(point, slope){
    var x1 = point.x;
    var y1 = point.y;
    return function (x){return (slope*(x - x1) + y1);};
}

function check_for_imag(point){
    return true;
    var is_imag = false;
    if (imag(point.x) || imag(point.y)){
        is_imag = true
    }
    p = point.right;
    while (p != point && ! is_imag){
        if (imag(p.x) || imag(p.y)){
            is_imag = true;
        }
        p = p.right;
    }
    if (is_imag){
        return true;
    }
    return false;
}

function circle_derivative(x, y){
    return -x/y;
    return - x/(sqrt(r*r - x*x) * sign(y));
}

function say (words){console.log(words)}

c = new Curve(num_points);
say('initializing circle');
c.init_circle(shape_radius);

say('moving...');

//c.move(c.nth_point(15), new Line_point(2,2));
//c.move(c.nth_point(500), new Line_point(2,2));
//c.move(c.nth_point(250), new Line_point(0,radius/2));
//c.move(c.nth_point(750), new Line_point(0,-5.5));
//c.move(c.nth_point(500), new Line_point(2,-4));

say('done moving');



////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function X(x) {return width/2 + x}
function Y(y) {return height/2 - y}

var svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);


var drag = d3.behavior.drag()
    .on("drag", function(d,i) {
        // d.x += d3.event.dx;
        // d.y -= d3.event.dy;
        // d3.select(this)
        //     .attr("cx", X(d.x))
        //     .attr("cy", Y(d.y));
        //c.move(id_to_shape_point[this.id], {'x' : d.x, 'y' : d.y});
        var x = d3.event.x;
        var y = d3.event.y;
        //c.move(id_to_shape_point[this.id], {'x' : width/2-x, 'y' : height/2+ y});

        c.move(id_to_shape_point[this.id], {'x' : x-width/2, 'y' : -y + height/2});

        update_points(moved_points);
        //console.log(moved_points);
        moved_points = [];
        //TODO: only projection points of moved points
        update_proj_points(c.projection_points())
        //TODO: projection points should be put into a list of changed points
        update_lines(changed_lines);
    });

var circles;
function update_points(points){
    circles = svg.selectAll(".shape_point")
        .data(points, function (d) {return d.id});

    circles.enter().append("circle")
        .attr("class", "shape_point")
        .attr("id", function (d) {return d.id })
        .attr("cx", function (point) {return X(point.x) })
        .attr("cy", function (point) {return Y(point.y) })
        .attr("r", shape_point_radius)
        .style("fill", "black")
        // .on("mouseover", function (d) {
        //     d3.select("#" + d.id).style("fill", "red");
        // })
        // .on("mouseout", function (d) {
        //     d3.select("#" + d.id).style("fill", "black")
        // })
        .call(drag);

    circles.attr("cx", function (point) {return X(point.x) })
        .attr("cy", function (point) {return Y(point.y) });

    // .on("mousedown", function (){console.log("DOWN")})
    // .on("mouseup", function (){console.log("UP")})
    // .on("drag", function (){console.log("dragging")});
}

function update_proj_points(points){
    //console.log("update_proj_points: len(points) = ", points.length);
    circles = svg.selectAll(".proj_point")
        .data(points, function (d) {return d.id});

    circles.enter().append("circle")
        .attr("class", "proj_point")
        .attr("id", function (d) {return d.id })
        .attr("cx", function (d) {return X(d.x) })
        .attr("cy", function (d) {return Y(d.y) })
        .attr("r", proj_point_radius);


    circles.attr("cx", function (point) {return X(point.x) })
        .attr("cy", function (point) {return Y(point.y) });
}


function update_lines(points){
    //console.log("update_proj_points: len(points) = ", points.length);
    lines = svg.selectAll(".proj_line")
        .data(points, function (d) {return d.id});

    lines.enter().append("line")
        .attr("class", "proj_line")
        .attr("id", function (d) {return d.id })
        .attr("x1", function (d) {return X(d.from.x) })
        .attr("y1", function (d) {return Y(d.from.y) })
        .attr("x2", function (d) {return X(d.to.x) })
        .attr("y2", function (d) {return Y(d.to.y) })
        .style("stroke", function (d) {return d.color })
        .attr('stroke-opacity', function (d) {return d.err ? 0 : 1});
    //TODO: color
    
    lines.attr("x1", function (d) {return X(d.from.x) })
        .attr("y1", function (d) {return Y(d.from.y) })
        .attr("x2", function (d) {return X(d.to.x) })
        .attr("y2", function (d) {return Y(d.to.y) })
        .style("stroke", function (d) {return d.color })
        .attr('stroke-opacity', function (d) {return d.err ? 0 : 1});

    lines.exit().remove();
}


update_points(shape_points);

pp = c.projection_points()
update_proj_points(pp)
update_lines(changed_lines);

d3.select("#proj_circle")
    .attr("r", radius)
    .attr('fill-opacity', 0)
    .attr("cx", X(0))
    .attr("cy", Y(0))
    .style('stroke', 'blue')
    .on("mouseover", function (d) {
        d3.select("#proj_circle")
            .style('stroke', 'red')
    })
    .on("mouseout", function (d) {
        d3.select("#proj_circle")
        d3.select("#proj_circle")
            .style('stroke', 'blue')
    })
    .call(d3.behavior.drag()
          .on("drag", function(d,i) {
              console.log("dragging proj circle");
              var x = d3.event.x-width/2;
              var y = - d3.event.y + height/2;
              radius = Math.sqrt(x*x + y*y);
              //TODO: check that we don't make the radius to small
              d3.select("#proj_circle").attr("r", radius)
              update_proj_points(c.projection_points());
              update_lines(changed_lines);
          }));

say("end")
