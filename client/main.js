Template.registerHelper('imageSrc', function () {
  return '/grasshopper.jpg'
});

function newMark() {
  return {
    path : [],
    type : 'foreground'
  }
}

var currentMark = new ReactiveVar(newMark());
var markUpdated = new ReactiveVar();

Template.registerHelper('currentMark', function () {
  markUpdated.get();
  return currentMark.get();
});

Template.photograb.onCreated(function () {
  this.width = new ReactiveVar(0);
  this.height = new ReactiveVar(0);
})

Template.photograb.events({
  'load img' : function (event, template) {
    template.width.set(event.target.width);
    template.height.set(event.target.height);
  },
  'touch' : function (event, template) {
    markUpdated.set(new Date());
    currentMark.set(newMark());
  },
  'drag' : function (event, template) {
    markUpdated.set(new Date());
    currentMark.get().path.push([event.x, event.y]);
  },
  'drop' : function () {
    Meteor.call('addMark', currentMark.get());
    markUpdated.set(new Date());
    currentMark.set(newMark());
  }
});

Template.photograb.helpers({
  marks : function () {
    return Marks.find();
  },
  width : function () {
    return Template.instance().width.get();
  },
  height : function () {
    return Template.instance().height.get();
  }
});


Template.mark.helpers({
  targetStroke : function () {
    return 'rgba(0,0,0,0.01)';
  },
  targetStrokeWidth : function () {
    return 16;
  },
  stroke : function () {
    return 'red';
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
      return path;
    }
  }
});

Template.mark.events({
  tap : function (event, template) {
    Meteor.call('removeMark', this._id);
  } 
});
