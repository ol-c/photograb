//  initialize the photograb
var photograbId = new ReactiveVar();

Meteor.call('initializePhotograb', function (error, id) {
  console.log(id);
  photograbId.set(id);
});

Template.registerHelper('currentPhotograb', function () {
  return Photograbs.findOne(photograbId.get());
});

var originalWidth = window.innerWidth;

function newMark(type, radius) {
  return {
    path : [],
    type : type,
    radius : radius,
    applied : false
  };
}

Template.photograb.onCreated(function () {
  // set radius according to zoom level
  var radius = 5;
  this.markUpdated = new ReactiveVar();
  this.currentMark = new ReactiveVar();
  this.imageData   = new ReactiveVar();
  this.outputData  = new ReactiveVar();
});

Template.photograb.helpers({
  currentMark : function () {
    Template.instance().markUpdated.get();
    return Template.instance().currentMark.get();
  },
  imageData : function () {
    return Template.instance().imageData.get();
  },
  outputData : function () {
    return Template.instance().outputData.get();
  },
  maskData : function () {
    return this.mask;
  },
  marks : function ()  {
    return Marks.find({photograb:this._id});
  },
  unappliedMarks : function () {
    return Marks.find({
      photograb : this._id,
      applied   : false
    });
  }
});

Template.photograb.events({
  'change input' : function (event, template) {
    var files = event.target.files;
    var reader = new FileReader();
    reader.onload = function(frEvent) {
      var imageData = frEvent.target.result;
      template.imageData.set(imageData);
      // send smaller image to process
      var image = new Image();
      image.onload = function () {
        var canvas = document.createElement('canvas');
        console.log(image.src.length);
        var context = canvas.getContext('2d');
        var scale = Math.min(1, Math.min(256/image.height, 256/image.width));
        canvas.width = image.width*scale;
        canvas.height = image.height*scale;
        Meteor.call('photograbScale', template.data._id, scale);
        context.drawImage(image,0,0, canvas.width, canvas.height);
        var compressedImageData = canvas.toDataURL('image/jpeg');
        console.log(compressedImageData.length)
        Meteor.call('photograbImage', template.data._id, compressedImageData);
      }
      image.src = imageData;
    }
    reader.readAsDataURL(files[0]);
  },
  'mousedown' : function (event, template) {event.preventDefault();},
  'load .photograb-original' : function (event, template) {
    Meteor.call('photograbDimensions', this._id, event.target.width, event.target.height);
  },
  'touch' : function (event, template) {
    template.markUpdated.set(new Date());
    var scale = window.innerWidth/originalWidth;
    template.currentMark.set(newMark(this.mode,Math.round(5*scale)));
  },
  'tap' : function (event, template) {
    Meteor.call('photograbMode', this._id, this.mode == 'foreground' ? 'background':'foreground');
  },
  'drag .photograb-input, drag .photograb-output' : function (event, template) {
    template.markUpdated.set(new Date());
    var off = $(event.currentTarget).offset();
    template.currentMark.get().path.push([event.x-off.left, event.y-off.top]);
  },
  'drop' : function (event, template) {
    Meteor.call('addMark', this._id, template.currentMark.get());
    template.markUpdated.set(new Date());
    template.currentMark.set();
  },
  'doubletap' : function () {
    Meteor.call('updateMask', this._id);
  }
});

Template.mark.helpers({
  stroke : function () {
    var typeToColor = {
      'probable_foreground'  : 'rgba(0,255,0,0.25)',
      'foreground'  : 'rgba(0,255,0,0.5)',
      'background'  : 'rgba(255,0,0,0.5)'
    }
    return typeToColor[this.type];
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
    event.stopPropagation();
  }
});
