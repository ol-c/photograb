Template.registerHelper('imageSrc', function () {
  return '/grasshopper.jpg'
});

function newMark(type, radius) {
  return {
    path : [],
    type : type,
    radius : radius
  };
}

$(window).on('keypress', function (event) {
  if (event.keyCode == 13) {
    Meteor.call('updateForeground');
  }
});

var currentMark = new ReactiveVar();
var markUpdated = new ReactiveVar();

Template.registerHelper('currentMark', function () {
  markUpdated.get();
  return currentMark.get();
});

Template.photograb.onCreated(function () {
  this.width = new ReactiveVar(0);
  this.height = new ReactiveVar(0);

  this.mode = new ReactiveVar("probable_foreground");
  this.probable_foreground_radius = new ReactiveVar(32);
  this.foreground_radius = new ReactiveVar(4);
  this.background_radius = new ReactiveVar(4);
});

Template.photograb.events({
  'load img' : function (event, template) {
    template.width.set(event.target.width);
    template.height.set(event.target.height);
  },
  'touch' : function (event, template) {
    markUpdated.set(new Date());
    var mode = template.mode.get();
    currentMark.set(newMark(mode,template[mode+'_radius'].get()));
  },
  'drag' : function (event, template) {
    markUpdated.set(new Date());
    currentMark.get().path.push([event.x, event.y]);
  },
  'drop' : function (event, template) {
    Meteor.call('addMark', currentMark.get());
    markUpdated.set(new Date());
    currentMark.set();
  }
});

Template.photograb.helpers({
  marks : function () {
    return Marks.find();
  },
  masks : function () {
    return Masks.find();
  },
  width : function () {
    return Template.instance().width.get();
  },
  height : function () {
    return Template.instance().height.get();
  }
});

Template.mask.helpers({
  stroke : function () {
    return 'none';
  },
  fill : function () {
    return 'rgba(0,0,255,0.5)';
  },
  strokeWidth : function () {
    return 1;
  },
  path : function () {
    if (this.path[0]) {
      var path = "M" + this.path[0][0] + ' ' + this.path[0][1];
      this.path.forEach(function (point) {
        path += 'L' + point[0] + ' ' + point[1];
      });
      return path + 'Z';
    }
  }
});


Template.mark.helpers({
  stroke : function () {
    return 'rgba(0,255,0,0.1)';
  },
  strokeWidth : function () {
    return this.radius*2;
  },
  path : function () {
    if (this.path[0]) {
      var path = "M" + this.path[0][0] + ' ' + this.path[0][1];
      this.path.forEach(function (point) {
        path += 'L' + point[0] + ' ' + point[1];
      });
      return path;
    }
  }
});

Template.mark.events({
  tap : function (event, template) {
    Meteor.call('removeMark', this._id);
  },
 
});
