if (Meteor.isServer) {
  var AWS = Npm.require('aws-sdk'); 
  AWS.config.region = 'us-east-1';
}

uploadS3 = function (bucket, filePath) {
  var s3bucket = new AWS.S3({params: {Bucket: bucket}});

  s3bucket.upload({
    Key : filePath.split('/').pop(),
    Body : Npm.require('fs').readFileSync(filePath)
  }, function (error, data) {
    console.log(error, data)
  })
}
