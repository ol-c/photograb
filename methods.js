function updateMasks() {
  if (Meteor.isServer) {
    var child_process = Npm.require('child_process');    
    var input = {
      foreground : [],
      background : [],
      path : '/home/jason/photograb/public/grasshopper.jpg',
      rectangle : [10,10,890,665]
    };
    //  prevent max buffer exceeded error
    var options = {maxBuffer: 1024 * 500};
    child_process.exec('python /home/jason/photograb/grabcut.py \'' + JSON.stringify(input) + '\'', options, function (err, stdout, stderr) {
      if (err) {
        console.log(err);
      }
      else {
        console.log(stdout);
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
    updateMasks();
  },
  removeMark : function (id) {
    Marks.remove(id);
    updateMasks();
  }
});
