Uploads = new Meteor.Collection('uploads');

if (Meteor.isServer) {
  Meteor.publish('uploads', function () {
    return Uploads.find();
  });
}
else if (Meteor.isClient) {
  upload = function (file, callback) {
    var currentChunk = 0;
    var chunkSize = Math.pow(2, 16);
    var uploadId;
    function uploadNextPart(error) {
      if (error) {} //  error will appear on upload object shortly
      else {
        var position = currentChunk * chunkSize;
        if (position < file.size) {
          var part = file.slice(position, position+chunkSize);

          var reader = new window.FileReader();
          reader.onloadend = function () {
            var progress = (position+part.size)/file.size;
            Meteor.call('continueUpload', uploadId, reader.result, progress, uploadNextPart);
          };
          reader.readAsDataURL(part);
          currentChunk += 1;
        }
        else {
          console.log('upload complete!');
        }
      }
    }
    Meteor.call('startUpload', file.size, file.type, file.name, function (error, _id) {
      uploadId = _id;
      uploadNextPart();
      // TODO: subscribe to all requested uploads
      Meteor.subscribe('uploads', uploadId);
      callback(error, _id);
    });
  }
}


Meteor.methods({
  'startUpload' : function (size, name, type) {
    var start = new Date();
    var uploadId = Uploads.insert({
      size : size,
      started : start,
      last : start,
      progress : 0,
      state : 'uploading'
    });
    return uploadId;
  },
  'continueUpload' : function (id, chunk, progress) {
    if (Meteor.isServer) {
      var upload = Uploads.findOne(id);
      var appendFile = Meteor.wrapAsync(Npm.require('fs').appendFile);
      appendFile('/home/jason/uploads/' + upload._id, chunk, function (err) {
        if (err) {
          Uploads.update(upload._id, {$set : {state : 'error'}});
        }
        else {
          var update = {
            $set : {
              last : new Date(),
              progress : progress
            }
          };
          var newState = 'uploading';
          if (progress == 1) {
            update.$set.state = 'complete';
          }
          Uploads.update(upload._id, update);
        }
      });
    }
  }
});
