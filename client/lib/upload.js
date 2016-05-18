upload = function (file) {
  var currentChunk = 0;
  var chunkSize = 128;
  function uploadNextPart() {
    var position = currentChunk * chunkSize;
    if (position < file.size) {
      Meteor.call('continueUpload', uploadId, file.slice(position, position+chunkSize), uploadNextPart)
      currentChunk += 1;
    }
    else {
      console.log('upload complete!');
    }
  }
  var uploadId =  Meteor.call('startUpload', file.size, file.type, file.name, uploadNexPart);
  return uploadId;
}
