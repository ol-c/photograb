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
  var template = this;
  // set radius according to zoom level
  var radius = 5;
  this.markUpdated = new ReactiveVar();
  this.currentMark = new ReactiveVar();
  this.imageData   = new ReactiveVar();
  this.outputData  = new ReactiveVar();
  
  this.x = new ReactiveVar(0);
  this.y = new ReactiveVar(0);
  this.scale = new ReactiveVar(1);
  this.scaledWidth = new ReactiveVar(0);
  this.scaledHeight = new ReactiveVar(0);
});

Template.photograb.onRendered(function () {
  var template = this;
  var container = $('.photograb');
  var inner = $('.photograb-inner');
  template.resetView = function () {
    var w = container.width();
    var h = container.height();
    var iw = inner.width();
    var ih = inner.height();

    var scale = Math.min(w/iw, h/ih);
    template.x.set((w-iw*scale)/2),
    template.y.set((h-ih*scale)/2),
    template.scale.set(scale);
    template.scaledWidth.set(iw/2*scale);
    template.scaledHeight.set(ih*scale);
  };
});

Template.photograb.helpers({
  x            : function () {return Template.instance().x.get();},
  y            : function () {return Template.instance().y.get();},
  scale        : function () {return Template.instance().scale.get();},
  scaledWidth  : function () {return Template.instance().scaledWidth.get();},
  scaledHeight : function () {return Template.instance().scaledHeight.get();},
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
  maskPath : function () {
    var combinedPath = '';
    if (!this.mask) return;
    var pathStringGenerator = d3.svg.line().interpolate('monotone');
    this.mask.forEach(function (path) {
      //  end on the first
      path.push(path[0]);
      var pathPart = pathStringGenerator(path);
      console.log(pathPart);
      combinedPath += pathPart;
    });
    combinedPath += 'Z';
    return combinedPath;
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
        var context = canvas.getContext('2d');
        var scale = Math.min(1, Math.min(256/image.height, 256/image.width));
        canvas.width = image.width*scale;
        canvas.height = image.height*scale;
        Meteor.call('photograbScale', template.data._id, scale);
        context.drawImage(image,0,0, canvas.width, canvas.height);
        var compressedImageData = canvas.toDataURL('image/jpeg');
        Meteor.call('photograbImage', template.data._id, compressedImageData);
        
        template.resetView();
      }
      image.src = imageData;
    }
    reader.readAsDataURL(files[0]);
  },
  'mousedown, touchstart' : function (event, template) {event.preventDefault();},
  'load .photograb-original' : function (event, template) {
    Meteor.call('photograbDimensions', this._id, event.target.width, event.target.height);
  },
  'touch' : function (event, template) {
    template.markUpdated.set(new Date());
    template.currentMark.set(newMark(this.mode,Math.round(5/template.scale.get())));
  },
  'pinch' : function (event, template) {
    var off = $(template.firstNode).offset();
    var x = template.x.get();
    var y = template.y.get();
    template.scale.set(template.scale.get()*event.scale);
    template.x.set(x + (event.x-(off.left+x))*(1-event.scale));
    template.y.set(y + (event.y-(off.top +y))*(1-event.scale));
  },
  'tap .photograb-inner' : function (event, template) {
    Meteor.call('photograbMode', this._id, this.mode == 'foreground' ? 'background':'foreground');
  },
  'drag .photograb-input, drag .photograb-output' : function (event, template) {
    template.markUpdated.set(new Date());
    var off = $(event.currentTarget).offset();
    var x = (event.x-off.left)/template.scale.get();
    var y = (event.y-off.top)/template.scale.get();
    template.currentMark.get().path.push([x,y]);
  },
  'drop' : function (event, template) {
    Meteor.call('addMark', this._id, template.currentMark.get());
    template.markUpdated.set(new Date());
    template.currentMark.set();
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
