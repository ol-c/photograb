function grabcut(input, callback) {
  var child_process = Npm.require('child_process');
  var exec = Meteor.wrapAsync(child_process.exec);
  var options = {maxBuffer: 1024 * 10000};
  exec("python /home/jason/photograb/grabcut.py '" + JSON.stringify(input) + "'", options, callback);
}

Meteor.methods({
  initializePhotograb : function () {
    var id =  Photograbs.insert({
      width : 0,
      height : 0,
      scale : 1,
      mode : 'foreground'
    });
    return id;
  },
  photograbMode : function (photograbId, mode) {
    Photograbs.update(photograbId, {$set:{mode:mode}});
  },
  photograbDimensions : function (photograbId, width, height) {
    Photograbs.update(photograbId, {$set:{width:width,height:height}});
  },
  photograbScale : function (photograbId, scale) {
    Photograbs.update(photograbId, {$set:{scale:scale}});
  },
  photograbImage : function (photograbId, image) {
    if (Meteor.isServer) {
      var type = /^data:image\/(\w+);base64,/.exec(image)[1];
      var base64Data = image.replace(new RegExp('^data:image/' + type + ';base64,'), "");
      Npm.require("fs").writeFile("/home/jason/tmp/" + photograbId, base64Data, 'base64', function(err) {
        console.log(err, 'DONE');
      });
    }
  },
  addMark : function (photograbId, mark) {
    mark.photograb = photograbId,
    Marks.insert(mark);
  },
  removeMark : function (id) {
    Marks.remove(id);
  },
  updateMask : function (photograbId) {
    if (Meteor.isServer) {
      var photograb = Photograbs.findOne(photograbId);
      var marks = Marks.find({photograb:photograbId}).fetch();
      var input = {
        marks : marks,
        scale : photograb.scale,
        path : '/home/jason/tmp/' + photograbId
      };
      //  prevent max buffer exceeded error
      console.log('grabcutting...');
      grabcut(input, function (err, stdout, stderr) {
        if (err) {console.log(stdout);console.log(err);}
        else {
          console.log('grabcut.');
          //  set marks used as applied
          marks.forEach(function (mark) {
            Marks.update(mark._id, {$set : {applied : true}});
          });
          //  set photograb mask
          Photograbs.update(photograbId, {$set:{mask:'data:image/png;base64,'+stdout}});
        }
      });
    }
  }
});
