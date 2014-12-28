# -*- python -*-

from sage.all import *

#for each point on the line:
#calculate its tangent line T
#calculate the two points A and B of intersection of T with the outer circle 
#calculate the tangent lines Al and Bl to the circle at points A and B
#find the intersection of Al and Bl

r = radius = 6
num_points = 1000
shape_points = [0]
point_color = 'red'
tangent_color = 'blue'

class line_point:
    def __init__(self, x, y, projection_point = False):
        self.x = x
        self.y = y
        self.color = point_color
        self.changed = True
        self.derivative = 0
        if not projection_point:
            self.projected = line_point(0,0, True)
        
    def __repr__(self):
        if imag(self.x) or imag(self.y):
            print "self.x = ", self.x
            print "self.y = ", self.y
            print "real(self.x)", real(self.x)
            print "imag(self.x)", imag(self.x)
            print "real(self.y)", real(self.y)
            print "imag(self.y)", imag(self.y)
            return "<ipoint at ({0} + {1}I, {2} +{3}I)>".format(round(real(self.x),1), round(imag(self.x),1),round(real(self.y),1), round(imag(self.y),1))
        return "<point at ({0}, {1})>".format(round(self.x,1),round(self.y,1))

    def adjust(self,x,y):
        """<X, Y> is a vector. The amount by which this point is adjusted"""
        self.x = (self.x + x).n()
        self.y = (self.y + y).n()
        self.changed = True

    def tangent_line(self):
        x = self.x
        y = self.y
        m = self.derivative
        return lambda n: (m*(n - x) + y).n()

    def line_segment(self):
        fn = self.tangent_line();
        x1 = self.left.x
        x2 = self.right.x
        return line([(x1, fn(x1)), (x2, fn(x2))])

    def update_derivative(self):
        self.derivative = slope(self.left, self.right)
        self.changed = False

    def projection_point(self):
        r = radius
        #print p.projection_point()
        #fn = self.tangent_line()
        m = self.derivative
        x = self.x
        y = self.y
        b = y - m*x
        denom = 2*m*m + 2
        t1 = -2*m*b/denom
        t2 = sqrt(4*m*m*b*b - 4*(m*m + 1)*(b*b-r*r))/denom
        x1 = t1 + t2
        x2 = t1 - t2
        y1 = m*x1 + b
        y2 = m*x2 + b
        #p1, p2 = point((x1,y1),color='red',size=50), point((x2, y2),color='red',size=50)
        l1_m = circle_derivative(x1, y1)
        l2_m = circle_derivative(x2, y2)
        #fn2 = make_line_fn(line_point(x1,y1), l1_m)
        #fn3 = make_line_fn(line_point(x2,y2), l2_m)
        l1_b = y1 - l1_m*x1
        l2_b = y2 - l2_m*x2
        p_x = -(l1_b - l2_b)/(l1_m - l2_m)
        p_y = -(l1_b*l2_m - l2_b*l1_m)/(l1_m - l2_m)

        self.projected.x = p_x
        self.projected.y = p_y
        #p3 = point((p_x,p_y),color='red',size=50)
        #l1 = line([(x1,y1), (x2,y2)])
        #l2 = line([(x1,y1), (p_x,p_y)])
        #l3 = line([(x2,y2), (p_x,p_y)])
        #print("x = {0}, y = {0}".format(p_x.n(),p_y.n()))
        #print("m1 = {0}, m2 = {1}".format(l1_m.n(), l2_m.n()))
        #things += (l1+l2+l3+p1+p2+p3)
        #things += (p1+p2+p3)
        try:
            x = p_x.n()
            y = p_y.n()
        except:
            print("fail__")
            exit(1)
        return line_point(x, y)

class curve():
    def __init__(self, init_points):
        self.num_points = init_points

    def init_circle(self, r, x=0, y=0):
        t = 0
        twopi = 2*pi
        step = twopi/self.num_points
        first = line_point(r*cos(t), r*sin(t))
        p = first
        while t < twopi:
            t+=step
            rt = line_point(r*cos(t).n(), r*sin(t).n())
            p.right = rt
            rt.left = p
            p = p.right
        p.right = first
        first.left = p
        check_for_imag(p)

        self.first_point = first
        self.init_derivatives()
        check_for_imag(p)


    def init_derivatives(self):
        fp = self.first_point
        p = fp
        p.update_derivative()
        p = p.right
        while p != fp:
            p.update_derivative()
            p = p.right
    def make_point_list(self):
        fp = self.first_point
        p = fp
        points = [point((p.x, p.y),color=p.color)]
        p = p.right
        while p != fp:
            points.append(point((p.x, p.y),color=p.color))
            p = p.right
        return points

    def graphics(self):
        fp = self.first_point
        p = fp
        pieces = point((p.x, p.y),color=p.color)
        pieces += p.line_segment()
        p = p.right
        while p != fp:
            pieces += point((p.x, p.y),color=p.color)
            pieces += p.line_segment()
            p = p.right
        return pieces

    def move(self, point, new_point):
        """move the POINT on the line to NEW_POINT
        POINT must be a point on `this` line"""
        #TODO: check that POINT is really on this line

        #decay_factor = lambda n: 1/n
        #decay_factor = lambda n: e^(-n^2/(self.num_points))
        decay_factor = lambda n: 1.5^(-float(n)^2.0/(self.num_points))

        diff_x = new_point.x - point.x
        diff_y = new_point.y - point.y
        s = slope(point, new_point)
        point.adjust(diff_x, diff_y)
        count = d = 1
        lp = rp = point
        disp = diff_x*diff_x + diff_y*diff_y
        while disp > 0.0001:
            count+=2
            rp = rp.right
            lp = lp.left
            d = decay_factor(count)
            d_x, d_y = (diff_x*d).n(), (diff_y*d).n()
            rp.adjust(d_x, d_y)
            lp.adjust(d_x, d_y)
            rp.color = lp.color = "green"
            disp = d_x*d_x + d_y*d_y
        self.update_derivatives_from(point)
        print("moved {0} points".format(count))

    def update_derivatives_from(self, p):
        """update all the derivatives around P that have been changed.
        P must be a point on this line"""
        if (p.changed):
            p.update_derivative()
        start = p
        p = p.left
        while p.changed:
            p.update_derivative()
            p = p.left
        p = start.right
        while p.changed:
            p.update_derivative()
            p = p.right

    def nth_point(self, n):
        if n > self.num_points:
            n %= self.num_points
        p = self.first_point
        while n > 0:
            p = p.right
            n -= 1
        return p

    def projection_points(self):
        fp = self.first_point
        p = fp
        error_point = point((0,0),color='yellow')
        error_count = 0;
        proj = p.projection_point()
        points = point((proj.x, proj.y),color='red')
        p = p.right
        #c = 2
        count = 1
        while p != fp:
            #print("nth = {0}, point = {1}".format(c,p))

            proj = p.projection_point()
            if count < 10:
                #print "x = {0}, y = {1}".format(proj.x, proj.y)
                count+=1
            points += point((proj.x, proj.y),color='red')
            p = p.right
            #c+=1
            #print("there was {0} exceptions".format(error_count))
        return points

    def projection_graphics(self):
        d=50
        r = radius
        things = circle((0,0),r)
        first = self.first_point
        p = first.right
        count = 1
        while p != first:
            fn = p.tangent_line()
            m = p.derivative
            x = p.x
            y = p.y
            b = y - m*x
            denom = 2*m*m + 2
            t1 = -2*m*b/denom
            t2 = sqrt(4*m*m*b*b - 4*(m*m + 1)*(b*b-r*r))/denom
            x1 = t1 + t2
            x2 = t1 - t2
            y1 = m*x1 + b
            y2 = m*x2 + b
            l1_m = circle_derivative(x1, y1)
            l2_m = circle_derivative(x2, y2)
            l1_b = y1 - l1_m*x1
            l2_b = y2 - l2_m*x2
            p_x = -(l1_b - l2_b)/(l1_m - l2_m)
            p_y = -(l1_b*l2_m - l2_b*l1_m)/(l1_m - l2_m)
            if count < 10:
                #print "x = {0}, y = {1}".format(p_x, p_y)
                count+=1
            p3 = point((p_x,p_y),color='red',size=50)
            things+=p3
            p = p.right
        return things
        
def slope(p1, p2):
    return ((p2.y - p1.y)/((p2.x - p1.x) or 0.0001)).n()

def make_line_fn(point, slope):
    x1 = point.x
    y1 = point.y
    return lambda x: (slope*(x - x1) + y1).n()

def check_for_imag(point):
    is_imag = False
    if imag(point.x) or imag(point.y):
        is_imag = True
    p = point.right
    while p != point and not is_imag:
        if imag(p.x) or imag(p.y):
            is_imag = True
        p = p.right
    if is_imag:
        #print("is imaginary")
        return True
    #print("NOT imaginary")
    return False

c = curve(num_points)
c.init_circle(r-1)

#c.move(c.nth_point(15), line_point(2,2))
#c.move(c.nth_point(500), line_point(2,2))
c.move(c.nth_point(250), line_point(0,4))
#c.move(c.nth_point(750), line_point(0,-5.5))
#c.move(c.nth_point(500), line_point(2,-4))

def circle_derivative(x, y):
    """returns the derivative on"""
    return -x/y
    return - x/(sqrt(r*r - x*x) * sign(y))

plot(circle((0,0),radius)+c.projection_points()+c.graphics(),xmin=-10,xmax=10,ymin=-10,ymax=10)
