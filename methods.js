function updateForeground() {
  if (Meteor.isServer) {
    var child_process = Npm.require('child_process');    
    var input = {
      marks : Marks.find({}).fetch(),
      path : '/home/jason/photograb/public/grasshopper.jpg'
    };
    //  prevent max buffer exceeded error
    var options = {maxBuffer: 1024 * 500};
    var exec = Meteor.wrapAsync(child_process.exec);
console.log('grabcutting...');
    exec('python /home/jason/photograb/grabcut.py \'' + JSON.stringify(input) + '\'', options, function (err, stdout, stderr) {
console.log('grabcut.')
      if (err) {
        console.log(err);
      }
      else {
        Masks.remove({});
      }
    });
  }
  else if (Meteor.isClient) {
   //  TODO: some notification that work is happening...
  }
}

Meteor.methods({
  addMark : function (mark) {
    Marks.insert(mark);
  },
  removeMark : function (id) {
    Marks.remove(id);
  },
  updateForeground : updateForeground
});
