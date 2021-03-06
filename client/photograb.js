//  initialize the photograb
var BRUSH_SIZE = 64;

function newMark(type, radius) {
  return {
    path : [],
    type : type,
    radius : radius,
    applied : false
  };
}

Template.photograb.onCreated(function () {
  this.currentPhotograb = new ReactiveVar();
});

Template.photograb.helpers({
  currentPhotograb : function () {
    return Template.instance().currentPhotograb.get();
  }
});

Template.photograbInner.onCreated(function () {
  var template = this;
  this.markUpdated = new ReactiveVar();
  this.currentMark = new ReactiveVar();
  this.imageData   = new ReactiveVar();
  this.outputData  = new ReactiveVar();
  
  this.x = new ReactiveVar(0);
  this.y = new ReactiveVar(0);
  this.scale = new ReactiveVar(1);
  this.fittingScale = new ReactiveVar(1);
  this.scaledWidth = new ReactiveVar(0);
  this.scaledHeight = new ReactiveVar(0);
  this.maxMaskDimension = new ReactiveVar(512);

  this.xMax = new ReactiveVar(Infinity);
  this.yMax = new ReactiveVar(Infinity);

  // mask update on delay loop
  var currentTimeout = null;
  this.updateMask = function () {
    if (currentTimeout) clearTimeout(currentTimeout);
    var thisTimeout = setTimeout(function () {
      Meteor.call('updateMask', template.data._id);
      currentTimeout = null;
    }, 1500);
    currentTimeout = thisTimeout;
  }
});

Template.photograbInner.onRendered(function () {
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
    template.fittingScale.set(scale);

    template.xMax.set(template.x.get());
    template.yMax.set(template.y.get());
  };

  $(window).on('resize', template.resetView);
});

Template.photograbInner.helpers({
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
  maskedImageData : function () {
    var imageData = Template.instance().imageData.get();
    if (this.rasterMask) {
      return getImageData(imageData, 1, 'png', this.rasterMask);
    }
    else {
      return imageData;
    }
  },
  outputData : function () {
    return Template.instance().outputData.get();
  },
  clipPath : function () {
    if (!this.vectorMask) return;
    var combinedPath = '';
    var template = Template.instance();
    var data = this;
    var threshold = Math.max(data.width, data.height)/template.maxMaskDimension.get() * 1.5;
    var smoothed = smoothCutout(data.vectorMask, threshold);
    smoothed.forEach(function (path) {
      path.forEach(function (point) {
        var separator = combinedPath.length? ',' : '';
        combinedPath += separator + point[0]+'px '+point[1]+'px';
      });
      if (combinedPath.length) {
        combinedPath += ',0px 0px';
      }
    });
    return 'polygon(' + combinedPath + ')';
  },
  maskPath : function () {
    var combinedPath = '';
    if (!this.vectorMask) return;
    var pathStringGenerator = d3.svg.line().interpolate('linear');
    var data = this;
    var template = Template.instance();
    var threshold = Math.max(data.width, data.height)/template.maxMaskDimension.get() * 1.5;
    var smoothed = smoothCutout(data.vectorMask, threshold);
    smoothed.forEach(function (path) {
      combinedPath += pathStringGenerator(path);
    });
    combinedPath += 'Z';
    return combinedPath;
  },
  maskAttributes : function () {
    return {
      'stroke-width' : 2/Template.instance().scale.get(),
      'stroke' : 'yellow',
      'fill' : "rgba(255,255,255,0.5)"
    }
  },
  marks : function ()  {
    return Marks.find({photograb:this._id});
  },
  unappliedMarks : function () {
    return Marks.find({
      photograb : this._id,
      applied   : false
    });
  },
  appliedMarks : function () {
    return Marks.find({
      photograb : this._id,
      applied   : true
    });
  }

});


function getImageData(imageData, scale, format, maskData, asBuffer) {
  var canvas  = document.createElement('canvas');
  var context = canvas.getContext('2d');
  var image = imageData;

  //  if imageData is string, make it an object
  if (typeof imageData == typeof '') {
    image = new Image();
    image.src = imageData;
  }
  canvas.width  = image.width *scale;
  canvas.height = image.height*scale;

  if (maskData) {
    if (typeof maskData == 'string') {
      var mask = new Image();
      mask.src = maskData;
      context.drawImage(mask,0,0,canvas.width,canvas.height);
    }
    else {
      //  assume it is an array of paths
      context.beginPath();
      maskData.forEach(function (path) {
        path = path.concat([]);
        context.moveTo(path[0][0], path[0][1]);
        //  end on first
        path.push(path.shift());
        path.forEach(function (point) {
          context.lineTo(point[0], point[1]);
        });
      });
      context.closePath();
      //  set drawn image as clipping mask
      context.clip();
      context.drawImage(image,0,0);
      // context.restore();
    }
    context.globalCompositeOperation = 'source-in';
  }

  context.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/'+format);
}

Template.photograbInner.events({
  'change input' : function (event, template) {
    Meteor.call('resetPhotograb', this._id);
    template.currentMark.set();
    var files = event.target.files;

    // if no files, don't try to read it
    if (!files[0]) {
      return;
    }

    var reader = new FileReader();
    template.$('.photograb-inner').hide();
    reader.onloadend = function(frEvent) {
      var imageData = frEvent.target.result;
      template.imageData.set(imageData);
      // send smaller image to process
      var image = new Image();
      image.src = imageData;
        
      var widthScale = template.maxMaskDimension.get()/image.width;
      var heightScale = template.maxMaskDimension.get()/image.height;
      var scale = Math.min(1, Math.min(widthScale, heightScale));
      var compressedImageData = getImageData(image, scale, 'jpeg');
      
      Meteor.call('photograbScale', template.data._id, scale);
      Meteor.call('photograbImage', template.data._id, compressedImageData);
      template.$('.photograb-inner').fadeIn(500);
      Meteor.setTimeout(template.resetView);
    }
    reader.readAsDataURL(files[0]);
    upload(files[0], function (error, uploadId) {
      Meteor.call('photograbUpload', template.data._id, uploadId);
    });
  },
  'touch .photograb-input-controls' : function (event, template) {
    template.$('input').trigger('click');
  },
  'tap .photograb-done-button' : function (event, template) {
    
  },
  'tap .photograb-cancel' : function (event, template) {
    console.log('reset to no photograb')
  },
  'touchmove' : function (event, template) {event.preventDefault();},
  'load .photograb-original' : function (event, template) {
    Meteor.call('photograbDimensions', template.data._id, event.target.width, event.target.height);
  },
  'touch' : function (event, template) {
    if (event.fingers == 1) {
      template.markUpdated.set(new Date());
      var newCurrent = newMark(template.data.mode,Math.round(BRUSH_SIZE/2/template.scale.get()))
      newCurrent.current = true;
      template.currentMark.set(newCurrent);
    }
    else {
      template.markUpdated.set(new Date());
      template.currentMark.set();
    }
  },
  'pinch' : function (event, template) {
    var off = $(template.firstNode).offset();
    var x = template.x.get();
    var y = template.y.get();
    var scale = event.scale;
    //  set max scale as scale when the width of 1 downsampled mask pixel on screen = BRUSH_SIZE*2
    var nextScale = template.scale.get()*event.scale;
    //  adust by fitting scale to normalize for screen pixels
    var maxScale = template.maxMaskDimension.get()/BRUSH_SIZE;
    if (nextScale > maxScale) {
      nextScale = maxScale;
      scale = maxScale / template.scale.get();
    }
    template.scale.set(nextScale);

    template.x.set(x + (event.x-(off.left+x))*(1-scale));
    template.y.set(y + (event.y-(off.top +y))*(1-scale));
  },
  'tap .photograb-background-brush' : function (event, template) {
    Meteor.call('photograbMode', this._id, 'background');
  },
  'tap .photograb-foreground-brush' : function (event, template) {
    Meteor.call('photograbMode', this._id, 'foreground');
  },
  'drag .photograb-input, drag .photograb-output' : function (event, template) {
    //  drag mark if current mark, else drag view
    if (template.currentMark.get()) {
      template.markUpdated.set(new Date());
      var off = $(event.currentTarget).offset();
      var x = (event.x-off.left)/template.scale.get();
      var y = (event.y-off.top)/template.scale.get();
      template.currentMark.get().path.push([x,y]);
      template.updateMask();
    }
  },
  drag : function (event, template) {
    if (!template.currentMark.get()) {
      template.x.set(template.x.get() + event.dx);
      template.y.set(template.y.get() + event.dy);
    }
  },
  'drop' : function (event, template) {
    if (template.currentMark.get()) {
      var current = template.currentMark.get();
      delete current.current;
      if (current.path.length > 1) {
        Meteor.call('addMark', template.data._id, current);
        template.updateMask();
      }
      template.markUpdated.set(new Date());
      template.currentMark.set();
    }
    if (template.scale.get() < template.fittingScale.get()) {
      template.resetView();
    }
    else {
      var xMax = template.xMax.get();
      var yMax = template.yMax.get();

      var scale = template.scale.get();
      var fittingScale = template.fittingScale.get();

      var inner = template.$('.photograb-inner');
      var xMin = xMax - inner.width() *scale + inner.width() *fittingScale;
      var yMin = yMax - inner.height()*scale + inner.height()*fittingScale;

      template.x.set(Math.min(xMax, Math.max(xMin, template.x.get())));
      template.y.set(Math.min(yMax, Math.max(yMin, template.y.get())));
    }
  }
});
