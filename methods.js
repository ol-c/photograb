function grabcut(input, callback) {
  var child_process = Npm.require('child_process');
  var exec = Meteor.wrapAsync(child_process.exec);
  var options = {maxBuffer: 1024 * 10000};
  return exec("python /home/jason/photograb/grabcut.py '" + JSON.stringify(input) + "'", options, callback);
}

function cutout(input, callback) {
  var child_process = Npm.require('child_process');
  var exec = Meteor.wrapAsync(child_process.exec);
  var options = {maxBuffer: 1024 * 10000};
  return exec("python /home/jason/photograb/cutout.py '" + JSON.stringify(input) + "'", options, callback);
}

Meteor.methods({
  initializePhotograb : function () {
    var id =  Photograbs.insert({
      started : new Date(),
      width : 0,
      height : 0,
      scale : 1,
      mode : 'foreground',
      upload : null
    });
    return id;
  },
  photograbUpload : function (photograbId, uploadId) {
    Photograbs.update(photograbId, {$set : {upload : uploadId}});
  },
  resetPhotograb : function (_id) {
    Photograbs.update(_id, {$set : {
      width : 0,
      height : 0,
      scale : 1,
      mode : 'foreground'
    }});
    Marks.remove({photograb : _id});
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
    var photograbId = Marks.findOne(id).photograb;
    Marks.remove(id);
  },
  updateMask : function (photograbId) {
    if (Meteor.isServer) {
      var photograb = Photograbs.findOne(photograbId);
      if (photograb.grabcutPID) {
        try {
          var child_process = Npm.require('child_process');
          var exec = Meteor.wrapAsync(child_process.exec);
          exec('kill -9 ' + photograb.grabcutPID);
        }
        catch (error) {
          console.log(error);
          //  in case process exited at odd time/between updates
        }
      }
      var marks = Marks.find({photograb:photograbId}).fetch();
      var input = {
        marks : marks,
        width : photograb.width,
        height : photograb.height,
        scale : photograb.scale,
        path : '/home/jason/tmp/' + photograbId
      };
      //  prevent max buffer exceeded error
      console.log('grabcutting...');
      var child_process = grabcut(input, function (err, stdout, stderr) {
        Photograbs.update({grabcutId : child_process}, {$set : {grabcutPID : null}})
        if (err) {
          // might be terminated if another grabcut was requested
          console.log(err);
        }
        else {
          console.log('grabcut.');
          //  set marks used as applied
          marks.forEach(function (mark) {
            Marks.update(mark._id, {$set : {applied : true}});
          });
          //  set photograb mask
          var result = JSON.parse(stdout);
          Photograbs.update(photograbId, {$set:{
            vectorMask:result.vector,
            rasterMask:result.raster
          }});
        }
      });
      Photograbs.update(photograbId, {$set : {grabcutPID : child_process.pid}});
    }
  },
  photograbSave : function (photograbId) {
    if (Meteor.isServer) {
      var photograb = Photograbs.findOne(photograbId);
      var input = {
        filepath : '/home/jason/uploads/' + photograb.upload,
        cutoutFilepath : '/home/jason/cutouts/' + photograb._id + '.png',
        maskPaths : photograb.vectorMask
      };
      cutout(input, function (error, stdout, stderr) {
        if (error) {
          console.log(stdout, error);
        }
        else {
          uploadS3('photograb', input.cutoutFilepath);
        }
      });
    }
  }
});
