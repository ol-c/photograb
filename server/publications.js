Meteor.publish('photograbs', function (id) {
  return Photograbs.find({_id : id});
});

Meteor.publish('marks', function (photograbId) {
  return Marks.find({photograb : photograbId})
});
